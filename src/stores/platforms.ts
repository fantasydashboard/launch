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
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import type { ConnectedPlatform, Platform, Sport, LeagueInsert } from '@/types/supabase'

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

  // Check if ESPN has credentials stored (for private leagues)
  const hasEspnCredentials = computed(() => {
    const espnConnection = connectedPlatforms.value.find(p => p.platform === 'espn')
    return !!(espnConnection?.access_token && espnConnection?.refresh_token)
  })

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
  function connectYahoo() {
    // Redirect to Yahoo OAuth Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    window.location.href = `${supabaseUrl}/functions/v1/yahoo-auth`
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

  // Fetch Yahoo leagues and save to database
  async function syncYahooLeagues(sport: Sport) {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated', leagues: [] }
    }

    try {
      loading.value = true
      error.value = null

      // Initialize Yahoo service
      const initialized = await yahooService.initialize(authStore.user.id)
      if (!initialized) {
        throw new Error('Failed to initialize Yahoo connection')
      }

      // Fetch leagues from Yahoo
      const yahooLeagues = await yahooService.getLeagues(sport)
      console.log(`Found ${yahooLeagues.length} Yahoo ${sport} leagues`)

      const savedLeagues: any[] = []

      // Save each league to database
      for (const league of yahooLeagues) {
        // Get user's team in this league
        const myTeam = await yahooService.getMyTeam(league.league_key)

        const leagueData: LeagueInsert = {
          user_id: authStore.user.id,
          platform: 'yahoo',
          sport,
          platform_league_id: league.league_key,
          league_name: league.name,
          season: league.season,
          team_name: myTeam?.name || null,
          team_id: myTeam?.team_key || null,
          scoring_type: league.scoring_type,
          league_size: league.num_teams,
          is_active: !league.is_finished,
          last_synced_at: new Date().toISOString(),
          settings: {
            league_type: league.league_type,
            current_week: league.current_week,
            start_week: league.start_week,
            end_week: league.end_week
          }
        }

        const { data, error: upsertError } = await supabase
          .from('leagues')
          .upsert(leagueData, {
            onConflict: 'user_id,platform,platform_league_id,season'
          })
          .select()
          .single()

        if (upsertError) {
          console.error('Error saving league:', upsertError)
        } else {
          savedLeagues.push(data)
        }
      }

      return { success: true, leagues: savedLeagues }
    } catch (err: any) {
      console.error('Error syncing Yahoo leagues:', err)
      error.value = err.message
      return { success: false, error: err.message, leagues: [] }
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // ESPN Methods
  // ============================================================

  /**
   * Connect ESPN for a public league (no cookies needed)
   * This just validates the league exists and saves the connection
   */
  async function connectEspnPublic(leagueId: string, sport: Sport, season: number): Promise<{
    success: boolean
    error?: string
    league?: any
  }> {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      // Initialize ESPN service
      await espnService.initialize(authStore.user.id)

      // Validate the league exists and is accessible
      const validation = await espnService.validateLeague(sport, leagueId, season)
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid league')
      }

      if (validation.isPrivate) {
        return { 
          success: false, 
          error: 'This is a private league. Please provide ESPN cookies (espn_s2 and SWID).' 
        }
      }

      // Save the ESPN connection (without credentials for public leagues)
      const { data, error: upsertError } = await supabase
        .from('connected_platforms')
        .upsert({
          user_id: authStore.user.id,
          platform: 'espn' as Platform,
          platform_user_id: null,
          platform_username: null,
          access_token: null,  // No cookies needed for public leagues
          refresh_token: null,
          token_expires_at: null,
          scopes: 'public'
        }, {
          onConflict: 'user_id,platform'
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      await fetchConnectedPlatforms()

      return { success: true, league: validation.league }
    } catch (err: any) {
      console.error('Error connecting ESPN:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Store ESPN credentials for private league access
   * ESPN uses cookies (espn_s2 and SWID) instead of OAuth
   */
  async function storeEspnCredentials(credentials: {
    espn_s2: string
    swid: string
    leagueId?: string
    sport?: Sport
    season?: number
  }): Promise<{ success: boolean; error?: string; league?: any }> {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      // Initialize ESPN service with credentials
      await espnService.initialize(authStore.user.id)
      espnService.setCredentials(credentials.espn_s2, credentials.swid)

      // If league info provided, validate access
      let league = null
      if (credentials.leagueId && credentials.sport && credentials.season) {
        const validation = await espnService.validateLeague(
          credentials.sport, 
          credentials.leagueId, 
          credentials.season
        )
        
        if (!validation.valid) {
          throw new Error(validation.error || 'Could not access league with provided credentials')
        }
        
        league = validation.league
      }

      // ESPN cookies typically last about 2 years, but we'll set a conservative expiry
      // Users can re-authenticate if needed
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year

      // Store credentials - we use access_token for espn_s2 and refresh_token for SWID
      const { data, error: upsertError } = await supabase
        .from('connected_platforms')
        .upsert({
          user_id: authStore.user.id,
          platform: 'espn' as Platform,
          platform_user_id: credentials.swid, // SWID is the user identifier
          platform_username: null,
          access_token: credentials.espn_s2,   // Store espn_s2 cookie
          refresh_token: credentials.swid,      // Store SWID cookie
          token_expires_at: expiresAt,
          scopes: 'private'
        }, {
          onConflict: 'user_id,platform'
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      await fetchConnectedPlatforms()

      return { success: true, league }
    } catch (err: any) {
      console.error('Error storing ESPN credentials:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Get ESPN credentials for API calls
   */
  function getEspnCredentials(): { espn_s2: string; swid: string } | null {
    const espnConnection = getConnection('espn')
    if (!espnConnection?.access_token || !espnConnection?.refresh_token) {
      return null
    }
    
    return {
      espn_s2: espnConnection.access_token,
      swid: espnConnection.refresh_token
    }
  }

  /**
   * Sync an ESPN league to the database
   */
  async function syncEspnLeague(
    leagueId: string,
    sport: Sport,
    season: number
  ): Promise<{ success: boolean; error?: string; league?: any }> {
    const authStore = useAuthStore()
    if (!supabase || !authStore.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      loading.value = true
      error.value = null

      // Initialize ESPN service
      await espnService.initialize(authStore.user.id)
      
      // Load credentials if available
      const credentials = getEspnCredentials()
      if (credentials) {
        espnService.setCredentials(credentials.espn_s2, credentials.swid)
      }

      // Fetch league data
      const espnLeague = await espnService.getLeague(sport, leagueId, season)
      if (!espnLeague) {
        throw new Error('Could not fetch league data')
      }

      // Try to find user's team
      const myTeam = await espnService.getMyTeam(sport, leagueId, season)

      // Map ESPN scoring type to our format
      const scoringType = espnLeague.scoringType === 'H2H_POINTS' ? 'head' :
                          espnLeague.scoringType === 'H2H_CATEGORY' ? 'headcategory' :
                          espnLeague.scoringType === 'ROTO' ? 'roto' : 'points'

      // Save to database
      const leagueData: LeagueInsert = {
        user_id: authStore.user.id,
        platform: 'espn',
        sport,
        platform_league_id: leagueId,
        league_name: espnLeague.name,
        season: season.toString(),
        team_name: myTeam ? `${myTeam.location} ${myTeam.nickname}`.trim() : null,
        team_id: myTeam?.id?.toString() || null,
        scoring_type: scoringType,
        league_size: espnLeague.size,
        is_active: espnLeague.status.isActive,
        last_synced_at: new Date().toISOString(),
        settings: {
          scoring_type: espnLeague.scoringType,
          current_week: espnLeague.status.currentMatchupPeriod,
          playoff_team_count: espnLeague.settings.playoffTeamCount,
          regular_season_weeks: espnLeague.settings.regularSeasonMatchupPeriodCount,
          is_public: espnLeague.isPublic
        }
      }

      const { data, error: upsertError } = await supabase
        .from('leagues')
        .upsert(leagueData, {
          onConflict: 'user_id,platform,platform_league_id,season'
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      return { success: true, league: data }
    } catch (err: any) {
      console.error('Error syncing ESPN league:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate ESPN credentials are still working
   */
  async function validateEspnCredentials(
    leagueId: string,
    sport: Sport,
    season: number
  ): Promise<{ valid: boolean; error?: string }> {
    const credentials = getEspnCredentials()
    if (!credentials) {
      return { valid: false, error: 'No ESPN credentials stored' }
    }

    try {
      const authStore = useAuthStore()
      await espnService.initialize(authStore.user!.id)
      espnService.setCredentials(credentials.espn_s2, credentials.swid)
      
      const validation = await espnService.validateLeague(sport, leagueId, season)
      
      if (!validation.valid) {
        return { valid: false, error: validation.error }
      }
      
      return { valid: true }
    } catch (err: any) {
      return { valid: false, error: err.message }
    }
  }

  // ============================================================
  // General Methods
  // ============================================================

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

      // If disconnecting ESPN, clear credentials from service
      if (platform === 'espn') {
        espnService.clearCredentials()
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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/yahoo-refresh`, {
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
    espnService.clearCredentials()
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
    hasEspnCredentials,
    getConnection,

    // Actions - General
    fetchConnectedPlatforms,
    disconnectPlatform,
    clearState,

    // Actions - Sleeper
    connectSleeper,

    // Actions - Yahoo
    connectYahoo,
    storeYahooTokens,
    syncYahooLeagues,
    isYahooTokenExpired,
    getYahooAccessToken,

    // Actions - ESPN
    connectEspnPublic,
    storeEspnCredentials,
    getEspnCredentials,
    syncEspnLeague,
    validateEspnCredentials
  }
})
