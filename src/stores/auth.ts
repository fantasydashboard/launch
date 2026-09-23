/**
 * Authentication Store
 * 
 * Handles user authentication state using Supabase Auth.
 * Supports email/password, Google, and Discord login.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { readStoredSession } from '@/lib/authSession'
import { retryWithTimeout } from '@/lib/withTimeout'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/supabase'

/**
 * Safely extract a human-readable message from any thrown value.
 * Handles AuthError, Error, plain strings, and mystery objects like {}.
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (typeof err === 'string' && err.trim()) return err
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    // Supabase AuthError shape
    if (typeof e.message === 'string' && e.message.trim()) return e.message
    // Some Supabase errors nest under .error_description (OAuth)
    if (typeof e.error_description === 'string' && (e.error_description as string).trim())
      return e.error_description as string
    // Proxy returned a JSON body with an error field
    if (typeof e.error === 'string' && (e.error as string).trim())
      return e.error as string
    // Last resort: try JSON stringifying — at least shows something useful in dev
    try {
      const s = JSON.stringify(err)
      if (s && s !== '{}') return `Auth error: ${s}`
    } catch {}
  }
  return fallback
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  /**
   * Whether we have actually ASKED and got an answer.
   *
   * Distinct from `profile === null`, which conflates "no answer yet" with "no such row" —
   * and that conflation is what showed a paywall to an admin. Anything gating paid features
   * has to be able to tell "we do not know" from "you have not paid".
   */
  const profileStatus = ref<'unknown' | 'ready' | 'failed'>('unknown')
  const session = ref<Session | null>(null)
  const loading = ref(true)
  const initialized = ref(false)  // flips true once, never goes back
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => !!user.value)
  const isConfigured = computed(() => isSupabaseConfigured())
  const subscriptionTier = computed(() => profile.value?.subscription_tier || 'free')
  const isPro = computed(() => ['pro', 'premium'].includes(subscriptionTier.value))
  const isPremium = computed(() => subscriptionTier.value === 'premium')

  // A single in-flight initialization, shared by every caller. The app boot and a
  // callback view both call initialize(); letting them run concurrently made them
  // contend for supabase-js's navigator lock, which is how a valid session ended up
  // losing the race below and reporting the user as signed out.
  let initPromise: Promise<void> | null = null

  // Initialize auth state
  function initialize(): Promise<void> {
    if (!initPromise) initPromise = runInitialize()
    return initPromise
  }

  async function runInitialize() {
    console.log('[Auth] Starting initialization...')

    if (!supabase) {
      console.error('[Auth] Supabase client is NULL - check env variables')
      loading.value = false
      return
    }

    console.log('[Auth] Supabase client exists, getting session...')

    // Set initialized immediately so the app never hangs on the spinner
    initialized.value = true

    try {
      // getSession() normally reads localStorage, but it serializes behind a navigator
      // lock and can stall well past a second under contention or a blocked network.
      let currentSession = null
      let timedOut = false

      try {
        const TIMEOUT_MS = 5000
        const sessionPromise = supabase.auth.getSession()
        const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), TIMEOUT_MS))
        const result = await Promise.race([sessionPromise, timeout]) as any
        if (result === 'timeout') {
          timedOut = true
          console.warn(`[Auth] getSession did not settle in ${TIMEOUT_MS}ms — falling back to stored session`)
        } else if (result && result.data) {
          currentSession = result.data.session
        }
      } catch (err) {
        console.error('[Auth] getSession failed:', err)
      }

      // A timeout means "unknown", NOT "signed out". Reporting no session here would
      // sign the user out of a flow they are correctly authenticated for (this is what
      // broke the Yahoo connect: a valid, unexpired token sat in localStorage the whole
      // time). Read it directly — synchronous, lock-free, and expiry-checked.
      if (!currentSession) {
        const stored = readStoredSession(
          import.meta.env.VITE_SUPABASE_URL,
          typeof localStorage !== 'undefined' ? localStorage : undefined,
        )
        if (stored.session) {
          console.log('[Auth] Recovered session from storage (reason:', stored.reason + ')')
          currentSession = stored.session as any
        } else if (timedOut) {
          console.warn('[Auth] No usable stored session after timeout (reason:', stored.reason + ')')
        }
      }

      console.log('[Auth] Session result:', currentSession ? `User: ${currentSession.user?.email}` : 'No session')

      if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        console.log('[Auth] User set, isAuthenticated should be:', !!user.value)
        
        try {
          await fetchProfile()
          console.log('[Auth] Profile fetched successfully')
        } catch (profileErr) {
          console.error('[Auth] Profile fetch failed (non-fatal):', profileErr)
          // Don't throw - user is still authenticated even if profile fails
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('[Auth] State changed:', event, newSession?.user?.email || 'no user')
        session.value = newSession
        user.value = newSession?.user || null

        if (newSession?.user) {
          try {
            await fetchProfile()
          } catch (err) {
            console.error('[Auth] Profile fetch on state change failed:', err)
          }
        } else {
          profile.value = null
          profileStatus.value = 'ready'   // signed out: genuinely no profile, not an unknown
        }
      })
      
      console.log('[Auth] Initialization complete. isAuthenticated:', !!user.value)
    } catch (err) {
      console.error('[Auth] Initialization error:', err)
      error.value = 'Failed to initialize authentication'
    } finally {
      loading.value = false
      console.log('[Auth] Loading set to false')
    }
  }

  // Fetch user profile
  async function fetchProfile() {
    if (!supabase || !user.value) return

    try {
      /*
       * Bounded and retried, because this call can hang rather than fail.
       *
       * Supabase's client wedges: getSession stops settling — the warning above already
       * handles that — and every query queued behind it hangs with it, resolving and
       * rejecting never. `await fetchProfile()` then never returns, the profile stays null,
       * and a null tier reads as 'free'. An admin account was served the Season Pass wall
       * that way, and clearing cookies could not fix it because the cookies were fine.
       *
       * Three attempts: a fresh call usually gets through even when the previous one is
       * still hanging.
       */
      const { data, error: fetchError } = await retryWithTimeout(
        () => supabase!.from('profiles').select('*').eq('id', user.value!.id).single(),
        { attempts: 3, ms: 6000, label: 'Profile fetch' },
      )

      if (fetchError) {
        // Profile might not exist yet, create it
        if (fetchError.code === 'PGRST116') {
          await createProfile()
          return
        }
        throw fetchError
      }

      profile.value = data
      profileStatus.value = 'ready'

      /*
       * Tag a brand-new OAuth account with the product that created it.
       *
       * signUp() carries `product` in its metadata, but signInWithOAuth cannot — the provider
       * owns that payload — so a Google signup would arrive untagged and stay NULL forever.
       *
       * Strictly bounded to accounts created in the last few minutes, and only ever fills a
       * NULL. Stamping any untagged profile on sight would be worse than leaving it blank:
       * The League Beat shares this table, so a user of theirs opening this app would be
       * relabelled as ours and quietly corrupt both products' numbers.
       */
      /* Read through a local shape: the generated Database type resolves this table to
         `never`, a pre-existing defect, and inheriting it here would add type noise without
         adding safety. */
      const row = data as unknown as { product?: string | null; created_at?: string } | null
      if (row && !row.product && row.created_at) {
        const ageMs = Date.now() - new Date(row.created_at).getTime()
        if (ageMs >= 0 && ageMs < 5 * 60 * 1000) {
          const { error: tagErr } = await supabase
            .from('profiles')
            .update({ product: 'ufd' } as never)
            .eq('id', user.value.id)
            .is('product', null)
          if (!tagErr) profile.value = { ...(data as object), product: 'ufd' } as typeof profile.value
        }
      }
    } catch (err) {
      /* Failed is not free. The gates read this and show "checking" rather than a purchase
         button, because telling a paying customer to buy what they own is the worse error. */
      profileStatus.value = 'failed'
      console.error('Error fetching profile:', err)
    }
  }

  // Create initial profile
  async function createProfile() {
    if (!supabase || !user.value) return

    try {
      const newProfile = {
        id: user.value.id,
        email: user.value.email!,
        full_name: user.value.user_metadata?.full_name || null,
        avatar_url: user.value.user_metadata?.avatar_url || null,
        /*
         * Only when this account is genuinely new.
         *
         * This is the fallback for a MISSING profile row, not for a new signup — the trigger
         * normally creates it. So it also fires when an established user's row has gone
         * astray, and an unconditional tag there would relabel a The League Beat
         * user as ours the first time they opened this app. Same five-minute bound as the
         * OAuth hook, for the same reason: absent is not ours.
         */
        product: (Date.now() - new Date(user.value.created_at ?? 0).getTime()) < 5 * 60 * 1000
          ? 'ufd'
          : null,
        subscription_tier: 'free' as const
      }

      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()

      if (insertError) throw insertError
      profile.value = data
    } catch (err) {
      console.error('Error creating profile:', err)
    }
  }

  // Sign up with email/password
  async function signUp(email: string, password: string, fullName?: string) {
    if (!supabase) {
      error.value = 'Authentication not configured'
      return { success: false, error: error.value }
    }

    try {
      error.value = null
      loading.value = true

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            /*
             * Which product this account came from.
             *
             * Ultimate Fantasy Dashboard and its sibling share one Supabase project, one profiles
             * table and one auth schema, and until now nothing recorded which site created
             * an account. That made every signup and conversion number a blend of two
             * businesses, and — worse — let one product consume the other's trial, because
             * both read the same profiles.trial_expires_at while disagreeing about whether
             * it grants access.
             *
             * handle_new_user() copies this onto profiles.product. Accounts created before
             * this shipped stay NULL: unknown, which is the truth, rather than assumed ours.
             */
            product: 'ufd'
          }
        }
      })

      if (signUpError) throw signUpError

      // Meta Pixel - Account Created
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'CompleteRegistration')
      }

      return { success: true, data }
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'Sign up failed')
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Sign in with email/password
  async function signIn(email: string, password: string) {
    if (!supabase) {
      error.value = 'Authentication not configured'
      return { success: false, error: error.value }
    }

    try {
      error.value = null
      loading.value = true

      console.log('[Auth] signIn attempt, supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      console.log('[Auth] signIn result:', { data: !!data, error: signInError })

      if (signInError) throw signInError

      return { success: true, data }
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'Sign in failed')
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Sign in with OAuth (Google, Discord)
  async function signInWithOAuth(provider: 'google' | 'discord') {
    if (!supabase) {
      error.value = 'Authentication not configured'
      return { success: false, error: error.value }
    }

    try {
      error.value = null

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (oauthError) throw oauthError

      return { success: true, data }
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'OAuth sign in failed')
      return { success: false, error: error.value }
    }
  }

  // Sign out
  async function signOut() {
    if (!supabase) return

    try {
      loading.value = true
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError

      user.value = null
      profile.value = null
      session.value = null
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'Sign out failed')
    } finally {
      loading.value = false
    }
  }

  // Reset password
  async function resetPassword(email: string) {
    if (!supabase) {
      error.value = 'Authentication not configured'
      return { success: false, error: error.value }
    }

    try {
      error.value = null

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (resetError) throw resetError

      return { success: true }
    } catch (err: any) {
      error.value = extractErrorMessage(err, 'Password reset failed')
      return { success: false, error: error.value }
    }
  }

  // Update profile
  async function updateProfile(updates: Partial<Profile>) {
    if (!supabase || !user.value) return { success: false, error: 'Not authenticated' }

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (updateError) throw updateError

      profile.value = data
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: extractErrorMessage(err, 'Profile update failed') }
    }
  }

  // Link Sleeper account
  async function linkSleeperAccount(sleeperUserId: string) {
    return updateProfile({ sleeper_user_id: sleeperUserId })
  }

  return {
    profileStatus,
    // State
    user,
    profile,
    session,
    loading,
    initialized,
    error,
    
    // Computed
    isAuthenticated,
    isConfigured,
    subscriptionTier,
    isPro,
    isPremium,
    
    // Actions
    initialize,
    /* Exposed so a page that finds a valid session and no profile can ask again, rather
       than telling the reader to reload and hope. */
    fetchProfile,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updateProfile,
    linkSleeperAccount
  }
})
