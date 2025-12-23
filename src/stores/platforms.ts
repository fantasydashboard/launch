/**
 * Connected Platforms Store
 * 
 * Manages connections to fantasy platforms (Sleeper, Yahoo, ESPN, Fantrax).
 * Handles OAuth tokens and platform-specific user data.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import type { ConnectedPlatform, Platform } from '@/types/supabase'

export const usePlatformsStore = defineStore('platforms', () => {
  // State
  const connectedPlatforms = ref<ConnectedPlatform[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isSleeperConnected = computed(() => 
    connectedPlatforms.value.some(p => p.platform === 'sleeper')
  )
  
  const isYahooConnected = computed(() => 
    connectedPlatforms.value.some(p => p.platform === 'yahoo')
  )
  
  const isEspnConnected = computed(() => 
    connectedPlatforms.value.some(p => p.platform === 'espn')
  )

  const getConnection = (platform: Platform) => 
    connectedPlatforms.value.find(p => p.platform === platform)

  // Fetch all connected platforms for the current user
  async function fetchConnectedPlatforms() {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) return

    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('connected_platforms')
        .select('*')
        .eq('user_id', authStore.user.id)

      if (fetchError) throw fetchError

      connectedPlatforms.value = data || []
    } catch (err: any) {
      console.error('Error fetching connected platforms:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Connect Sleeper account (no OAuth needed - just username lookup)
  async function connectSleeper(username: string) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      // Fetch Sleeper user ID from their API
      const response = await fetch(`https://api.sleeper.app/v1/user/${username}`)
      if (!response.ok) {
        throw new Error('Sleeper username not found')
      }
      
      const sleeperUser = await response.json()
      if (!sleeperUser?.user_id) {
        throw new Error('Invalid Sleeper user data')
      }

      // Upsert the connection
      const { data, error: upsertError } = await supabase
        .from('connected_platforms')
        .upsert({
          user_id: authStore.user.id,
          platform: 'sleeper' as Platform,
          platform_user_id: sleeperUser.user_id,
          platform_username: sleeperUser.username || username,
          // Sleeper doesn't need OAuth tokens
          access_token: null,
          refresh_token: null,
          token_expires_at: null
        }, {
          onConflict: 'user_id,platform'
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      // Also update the profile's sleeper_user_id for backwards compatibility
      await authStore.updateProfile({ sleeper_user_id: sleeperUser.user_id })

      // Refresh the list
      await fetchConnectedPlatforms()

      return { success: true, data }
    } catch (err: any) {
      console.error('Error connecting Sleeper:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Initiate Yahoo OAuth flow
  // Note: Yahoo OAuth requires a backend to handle the token exchange
  async function connectYahoo() {
    const authStore = useAuthStore()
    if (!authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      // Yahoo OAuth flow will redirect to our backend
      // The backend will handle the OAuth dance and store tokens
      const redirectUrl = `${window.location.origin}/auth/yahoo/callback`
      const state = btoa(JSON.stringify({ 
        userId: authStore.user.id,
        returnTo: window.location.pathname
      }))

      // This URL will be handled by a Supabase Edge Function or backend API
      const yahooAuthUrl = `/api/auth/yahoo?redirect_uri=${encodeURIComponent(redirectUrl)}&state=${state}`
      
      window.location.href = yahooAuthUrl
      
      return { success: true }
    } catch (err: any) {
      console.error('Error initiating Yahoo OAuth:', err)
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  // Store Yahoo tokens after OAuth callback (called by the callback handler)
  async function storeYahooTokens(tokens: {
    access_token: string
    refresh_token: string
    expires_in: number
    yahoo_user_id?: string
    yahoo_username?: string
  }) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      const { data, error: upsertError } = await supabase
        .from('connected_platforms')
        .upsert({
          user_id: authStore.user.id,
          platform: 'yahoo' as Platform,
          platform_user_id: tokens.yahoo_user_id || null,
          platform_username: tokens.yahoo_username || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          scopes: 'fspt-r' // Yahoo Fantasy Sports read scope
        }, {
          onConflict: 'user_id,platform'
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      await fetchConnectedPlatforms()

      return { success: true, data }
    } catch (err: any) {
      console.error('Error storing Yahoo tokens:', err)
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  // Disconnect a platform
  async function disconnectPlatform(platform: Platform) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('connected_platforms')
        .delete()
        .eq('user_id', authStore.user.id)
        .eq('platform', platform)

      if (deleteError) throw deleteError

      // If disconnecting Sleeper, also clear from profile
      if (platform === 'sleeper') {
        await authStore.updateProfile({ sleeper_user_id: null })
      }

      await fetchConnectedPlatforms()

      return { success: true }
    } catch (err: any) {
      console.error('Error disconnecting platform:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Check if Yahoo token needs refresh
  function isYahooTokenExpired(): boolean {
    const yahooConnection = getConnection('yahoo')
    if (!yahooConnection?.token_expires_at) return true
    
    // Consider expired if less than 5 minutes remaining
    const expiresAt = new Date(yahooConnection.token_expires_at)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
    
    return expiresAt < fiveMinutesFromNow
  }

  // Get valid Yahoo access token (refreshing if needed)
  async function getYahooAccessToken(): Promise<string | null> {
    const yahooConnection = getConnection('yahoo')
    if (!yahooConnection) return null

    if (isYahooTokenExpired() && yahooConnection.refresh_token) {
      // Call backend to refresh token
      try {
        const response = await fetch('/api/auth/yahoo/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            refresh_token: yahooConnection.refresh_token 
          })
        })

        if (!response.ok) {
          throw new Error('Failed to refresh Yahoo token')
        }

        const tokens = await response.json()
        await storeYahooTokens(tokens)
        
        return tokens.access_token
      } catch (err) {
        console.error('Error refreshing Yahoo token:', err)
        return null
      }
    }

    return yahooConnection.access_token
  }

  // Clear all state (on logout)
  function clearState() {
    connectedPlatforms.value = []
    error.value = null
  }

  return {
    // State
    connectedPlatforms,
    loading,
    error,

    // Computed
    isSleeperConnected,
    isYahooConnected,
    isEspnConnected,
    getConnection,

    // Actions
    fetchConnectedPlatforms,
    connectSleeper,
    connectYahoo,
    storeYahooTokens,
    disconnectPlatform,
    isYahooTokenExpired,
    getYahooAccessToken,
    clearState
  }
})
