/**
 * Authentication Store
 * 
 * Handles user authentication state using Supabase Auth.
 * Supports email/password, Google, and Discord login.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/supabase'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  // Computed
  const isAuthenticated = computed(() => !!user.value)
  const isConfigured = computed(() => isSupabaseConfigured())
  const subscriptionTier = computed(() => profile.value?.subscription_tier || 'free')
  const isPro = computed(() => ['pro', 'premium'].includes(subscriptionTier.value))
  const isPremium = computed(() => subscriptionTier.value === 'premium')

  // Initialize auth state
  async function initialize() {
    if (!supabase) {
      loading.value = false
      return
    }

    try {
      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        await fetchProfile()
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event)
        session.value = newSession
        user.value = newSession?.user || null

        if (newSession?.user) {
          await fetchProfile()
        } else {
          profile.value = null
        }
      })
    } catch (err) {
      console.error('Auth initialization error:', err)
      error.value = 'Failed to initialize authentication'
    } finally {
      loading.value = false
    }
  }

  // Fetch user profile
  async function fetchProfile() {
    if (!supabase || !user.value) return

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (fetchError) {
        // Profile might not exist yet, create it
        if (fetchError.code === 'PGRST116') {
          await createProfile()
          return
        }
        throw fetchError
      }

      profile.value = data
    } catch (err) {
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
            full_name: fullName
          }
        }
      })

      if (signUpError) throw signUpError

      return { success: true, data }
    } catch (err: any) {
      error.value = err.message || 'Sign up failed'
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

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      return { success: true, data }
    } catch (err: any) {
      error.value = err.message || 'Sign in failed'
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
      error.value = err.message || 'OAuth sign in failed'
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
      error.value = err.message || 'Sign out failed'
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
      error.value = err.message || 'Password reset failed'
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
      return { success: false, error: err.message }
    }
  }

  // Link Sleeper account
  async function linkSleeperAccount(sleeperUserId: string) {
    return updateProfile({ sleeper_user_id: sleeperUserId })
  }

  return {
    // State
    user,
    profile,
    session,
    loading,
    error,
    
    // Computed
    isAuthenticated,
    isConfigured,
    subscriptionTier,
    isPro,
    isPremium,
    
    // Actions
    initialize,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
    updateProfile,
    linkSleeperAccount
  }
})
