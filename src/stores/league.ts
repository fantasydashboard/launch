import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { supabase } from '@/lib/supabase'
import type {
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
  SleeperMatchup,
  SleeperPlayer
} from '@/types/sleeper'

// Saved league interface - supports both Sleeper and Yahoo
interface SavedLeague {
  id?: string
  user_id?: string
  league_id: string
  league_name: string
  platform: 'sleeper' | 'yahoo'
  sport: 'football' | 'baseball' | 'basketball' | 'hockey'
  season: string
  sleeper_username?: string
  yahoo_league_key?: string
  yahoo_historical_seasons?: Array<{ league_key: string; season: string }>
  is_primary: boolean
  league_type?: number // 0 = redraft, 1 = keeper, 2 = dynasty
  num_teams?: number
  scoring_type?: string
}

// Cache interface for storing league data
interface LeagueCache {
  league: SleeperLeague
  rosters: SleeperRoster[]
  users: SleeperUser[]
  historicalSeasons: SleeperLeague[]
  historicalRosters: Map<string, SleeperRoster[]>
  historicalUsers: Map<string, SleeperUser[]>
  historicalMatchups: Map<string, Map<number, SleeperMatchup[]>>
  historicalDrafts: Map<string, any>
  historicalBrackets: Map<string, any[]>
  loadedAt: number
}

// LocalStorage keys
const STORAGE_KEYS = {
  SAVED_LEAGUES: 'fd_saved_leagues',
  LEAGUE_CACHE: 'fd_league_cache',
  CURRENT_USERNAME: 'fd_current_username',
  ACTIVE_LEAGUE: 'fd_active_league'
}

export const useLeagueStore = defineStore('league', () => {
  // State
  const activeLeagueId = ref<string | null>(null)
  const activePlatform = ref<'sleeper' | 'yahoo'>('sleeper')
  const leagues = ref<SleeperLeague[]>([])
  const savedLeagues = ref<SavedLeague[]>([])
  const currentLeague = ref<SleeperLeague | null>(null)
  const rosters = ref<SleeperRoster[]>([])
  const users = ref<SleeperUser[]>([])
  const players = ref<Record<string, SleeperPlayer>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isDemoMode = ref(false)
  
  // Yahoo-specific state
  const yahooLeague = ref<any>(null)
  const yahooTeams = ref<any[]>([])
  const yahooStandings = ref<any[]>([])
  const yahooMatchups = ref<any[]>([])

  // Historical data
  const historicalSeasons = ref<SleeperLeague[]>([])
  const historicalRosters = ref<Map<string, SleeperRoster[]>>(new Map())
  const historicalUsers = ref<Map<string, SleeperUser[]>>(new Map())
  const historicalMatchups = ref<Map<string, Map<number, SleeperMatchup[]>>>(new Map())
  const historicalDrafts = ref<Map<string, any>>(new Map())
  const historicalBrackets = ref<Map<string, any[]>>(new Map())

  // Cache for multiple leagues (in memory)
  const leagueCache = ref<Map<string, LeagueCache>>(new Map())

  // Computed
  const currentSeason = computed(() => currentLeague.value?.season || new Date().getFullYear().toString())
  const playoffWeekStart = computed(() => currentLeague.value?.settings?.playoff_week_start || 15)
  const currentWeek = computed(() => currentLeague.value?.settings?.leg || 1)
  
  // Current user info
  const currentUserId = ref<string | null>(null)
  const currentUsername = ref<string | null>(null)
  
  // Active sport for filtering (will be synced from sport store)
  const activeSport = ref<'football' | 'baseball' | 'basketball' | 'hockey'>('football')

  // Check if user has any saved leagues
  const hasSavedLeagues = computed(() => savedLeagues.value.length > 0)
  
  // Filter saved leagues by active sport
  const filteredLeaguesBySport = computed(() => {
    return savedLeagues.value.filter(league => {
      // If league doesn't have sport set, assume football for backwards compatibility
      const leagueSport = league.sport || 'football'
      return leagueSport === activeSport.value
    })
  })
  
  // Set active sport (called from App.vue when sport changes)
  function setActiveSport(sport: 'football' | 'baseball' | 'basketball' | 'hockey') {
    activeSport.value = sport
  }

  // ============================================
  // LOCAL STORAGE FUNCTIONS
  // ============================================

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_LEAGUES, JSON.stringify(savedLeagues.value))
      if (currentUsername.value) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USERNAME, currentUsername.value)
      }
      if (activeLeagueId.value) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_LEAGUE, activeLeagueId.value)
      }
      if (currentUserId.value) {
        localStorage.setItem('ufd_current_user_id', currentUserId.value)
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  }

  function loadFromLocalStorage() {
    try {
      const savedLeaguesData = localStorage.getItem(STORAGE_KEYS.SAVED_LEAGUES)
      if (savedLeaguesData) {
        savedLeagues.value = JSON.parse(savedLeaguesData)
      }
      
      const username = localStorage.getItem(STORAGE_KEYS.CURRENT_USERNAME)
      if (username) {
        currentUsername.value = username
      }
      
      const activeLeague = localStorage.getItem(STORAGE_KEYS.ACTIVE_LEAGUE)
      if (activeLeague) {
        activeLeagueId.value = activeLeague
      }
      
      const userId = localStorage.getItem('ufd_current_user_id')
      if (userId) {
        currentUserId.value = userId
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e)
    }
  }

  function saveCacheToLocalStorage(leagueId: string, cache: LeagueCache) {
    try {
      // Convert Maps to arrays for JSON serialization
      const serializable = {
        league: cache.league,
        rosters: cache.rosters,
        users: cache.users,
        historicalSeasons: cache.historicalSeasons,
        historicalRosters: Array.from(cache.historicalRosters.entries()),
        historicalUsers: Array.from(cache.historicalUsers.entries()),
        historicalMatchups: Array.from(cache.historicalMatchups.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
        historicalDrafts: Array.from(cache.historicalDrafts.entries()),
        historicalBrackets: Array.from(cache.historicalBrackets.entries()),
        loadedAt: cache.loadedAt
      }
      localStorage.setItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`, JSON.stringify(serializable))
    } catch (e) {
      console.warn('Failed to save cache to localStorage:', e)
    }
  }

  function loadCacheFromLocalStorage(leagueId: string): LeagueCache | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`)
      if (!data) return null
      
      const parsed = JSON.parse(data)
      
      // Check if cache is still valid (24 hours)
      if (Date.now() - parsed.loadedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`)
        return null
      }
      
      // Convert arrays back to Maps
      return {
        league: parsed.league,
        rosters: parsed.rosters,
        users: parsed.users,
        historicalSeasons: parsed.historicalSeasons,
        historicalRosters: new Map(parsed.historicalRosters),
        historicalUsers: new Map(parsed.historicalUsers),
        historicalMatchups: new Map(parsed.historicalMatchups.map(([k, v]: [string, any]) => [k, new Map(v)])),
        historicalDrafts: new Map(parsed.historicalDrafts),
        historicalBrackets: new Map(parsed.historicalBrackets),
        loadedAt: parsed.loadedAt
      }
    } catch (e) {
      console.warn('Failed to load cache from localStorage:', e)
      return null
    }
  }

  // ============================================
  // SUPABASE SYNC FUNCTIONS
  // ============================================

  async function loadSavedLeagues(userId: string) {
    // First, load from localStorage for instant display
    loadFromLocalStorage()
    
    if (!supabase) return
    
    try {
      const { data, error: fetchError } = await supabase
        .from('user_leagues')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
      
      if (fetchError) throw fetchError
      
      if (data && data.length > 0) {
        savedLeagues.value = data
        saveToLocalStorage()
      }
      
      // If there's a primary league and no active league, load it
      const primaryLeague = savedLeagues.value.find(l => l.is_primary)
      if (primaryLeague && !activeLeagueId.value) {
        currentUsername.value = primaryLeague.sleeper_username
        await setActiveLeague(primaryLeague.league_id)
      } else if (activeLeagueId.value) {
        // Load the previously active league
        await setActiveLeague(activeLeagueId.value)
      }
    } catch (e) {
      console.error('Failed to load saved leagues from Supabase:', e)
    }
  }

  async function saveLeague(league: SleeperLeague, username: string, userId: string, sport: 'football' | 'baseball' | 'basketball' | 'hockey' = 'football'): Promise<SavedLeague | undefined> {
    // Check if this league is already saved
    const existing = savedLeagues.value.find(l => l.league_id === league.league_id)
    if (existing) return existing
    
    const isPrimary = savedLeagues.value.length === 0
    
    const newLeague: SavedLeague = {
      league_id: league.league_id,
      league_name: league.name,
      platform: 'sleeper',
      sport: sport,
      season: league.season,
      sleeper_username: username,
      is_primary: isPrimary,
      league_type: league.settings?.type ?? 0 // 0 = redraft, 1 = keeper, 2 = dynasty
    }
    
    // Add to local state immediately
    savedLeagues.value.push(newLeague)
    saveToLocalStorage()
    
    // Sync to Supabase in background
    if (supabase) {
      try {
        const { data, error: saveError } = await supabase
          .from('user_leagues')
          .insert({
            user_id: userId,
            ...newLeague
          })
          .select()
          .single()
        
        if (saveError) throw saveError
        
        // Update with server ID
        const index = savedLeagues.value.findIndex(l => l.league_id === league.league_id)
        if (index !== -1 && data) {
          savedLeagues.value[index] = data
          saveToLocalStorage()
        }
        
        return data
      } catch (e) {
        console.error('Failed to save league to Supabase:', e)
      }
    }
    
    return newLeague
  }

  async function saveYahooLeague(league: any, userId: string, sport: 'football' | 'baseball' | 'basketball' | 'hockey'): Promise<SavedLeague | undefined> {
    // Use the league name as a more stable identifier for grouping
    // Check if this league is already saved by name
    const existingIndex = savedLeagues.value.findIndex(l => 
      l.platform === 'yahoo' && 
      l.league_name === league.name
    )
    
    // If exists, check if incoming season is newer and update it
    if (existingIndex !== -1) {
      const existing = savedLeagues.value[existingIndex]
      const existingSeason = parseInt(existing.season || '0')
      const newSeason = parseInt(league.season || '0')
      
      // If the new season is newer (or same but different key), update the league
      if (newSeason > existingSeason || (newSeason === existingSeason && existing.league_id !== league.league_key)) {
        console.log(`Updating Yahoo league "${league.name}" from season ${existingSeason} to ${newSeason}`)
        
        // Build updated historical seasons
        const existingHistorical = existing.yahoo_historical_seasons || []
        const newHistorical = league.all_seasons || [{ league_key: league.league_key, season: league.season }]
        
        // Merge historical seasons, avoiding duplicates
        const mergedHistorical = [...existingHistorical]
        for (const season of newHistorical) {
          if (!mergedHistorical.some(s => s.league_key === season.league_key)) {
            mergedHistorical.push(season)
          }
        }
        // Sort by season descending
        mergedHistorical.sort((a, b) => parseInt(b.season) - parseInt(a.season))
        
        // Update the existing league
        savedLeagues.value[existingIndex] = {
          ...existing,
          league_id: league.league_key, // Update to new season's key
          season: league.season,
          yahoo_league_key: league.league_key,
          yahoo_historical_seasons: mergedHistorical,
          num_teams: league.num_teams,
          scoring_type: league.scoring_type
        }
        saveToLocalStorage()
        
        // Update in Supabase
        if (supabase && existing.id) {
          try {
            await supabase
              .from('user_leagues')
              .update({
                league_id: league.league_key,
                season: league.season,
                yahoo_league_key: league.league_key,
                num_teams: league.num_teams,
                scoring_type: league.scoring_type
              })
              .eq('id', existing.id)
          } catch (e) {
            console.error('Failed to update Yahoo league in Supabase:', e)
          }
        }
        
        return savedLeagues.value[existingIndex]
      }
      
      // Existing league is same or newer season, return it as-is
      return existing
    }
    
    const isPrimary = savedLeagues.value.length === 0
    
    // league.all_seasons contains all historical season keys for this league
    const historicalSeasons = league.all_seasons || [{ league_key: league.league_key, season: league.season }]
    
    const newLeague: SavedLeague = {
      league_id: league.league_key, // Most recent season's key
      league_name: league.name,
      platform: 'yahoo',
      sport: sport,
      season: league.season, // Most recent season
      yahoo_league_key: league.league_key,
      yahoo_historical_seasons: historicalSeasons,
      is_primary: isPrimary,
      num_teams: league.num_teams,
      scoring_type: league.scoring_type
    }
    
    // Add to local state immediately
    savedLeagues.value.push(newLeague)
    saveToLocalStorage()
    
    // Sync to Supabase in background (store historical seasons as JSON)
    if (supabase) {
      try {
        const { data, error: saveError } = await supabase
          .from('user_leagues')
          .insert({
            user_id: userId,
            league_id: newLeague.league_id,
            league_name: newLeague.league_name,
            platform: newLeague.platform,
            sport: newLeague.sport,
            season: newLeague.season,
            yahoo_league_key: newLeague.yahoo_league_key,
            is_primary: newLeague.is_primary,
            num_teams: newLeague.num_teams,
            scoring_type: newLeague.scoring_type
            // Note: yahoo_historical_seasons stored in localStorage only for now
          })
          .select()
          .single()
        
        if (saveError) throw saveError
        
        // Update with server ID but keep historical seasons
        const index = savedLeagues.value.findIndex(l => l.league_id === league.league_key)
        if (index !== -1 && data) {
          savedLeagues.value[index] = {
            ...data,
            yahoo_historical_seasons: historicalSeasons
          }
          saveToLocalStorage()
        }
        
        return savedLeagues.value[index]
      } catch (e) {
        console.error('Failed to save Yahoo league to Supabase:', e)
      }
    }
    
    return newLeague
  }

  async function removeLeague(leagueId: string, userId?: string) {
    // Remove from local state immediately
    savedLeagues.value = savedLeagues.value.filter(l => l.league_id !== leagueId)
    saveToLocalStorage()
    
    // Remove from localStorage cache
    localStorage.removeItem(`${STORAGE_KEYS.LEAGUE_CACHE}_${leagueId}`)
    
    // Clear memory cache
    leagueCache.value.delete(leagueId)
    
    // If we removed the active league, clear it
    if (activeLeagueId.value === leagueId) {
      activeLeagueId.value = null
      currentLeague.value = null
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_LEAGUE)
      
      // Switch to another league or demo mode
      if (savedLeagues.value.length > 0) {
        await setActiveLeague(savedLeagues.value[0].league_id)
      } else {
        enableDemoMode()
      }
    }
    
    // Sync to Supabase in background
    if (supabase && userId) {
      try {
        await supabase
          .from('user_leagues')
          .delete()
          .eq('user_id', userId)
          .eq('league_id', leagueId)
      } catch (e) {
        console.error('Failed to remove league from Supabase:', e)
      }
    }
  }

  async function setPrimaryLeague(leagueId: string, userId?: string) {
    // Update local state immediately
    savedLeagues.value = savedLeagues.value.map(l => ({
      ...l,
      is_primary: l.league_id === leagueId
    }))
    saveToLocalStorage()
    
    // Sync to Supabase in background
    if (supabase && userId) {
      try {
        await supabase
          .from('user_leagues')
          .update({ is_primary: false })
          .eq('user_id', userId)
        
        await supabase
          .from('user_leagues')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('league_id', leagueId)
      } catch (e) {
        console.error('Failed to set primary league in Supabase:', e)
      }
    }
  }

  // ============================================
  // LEAGUE DATA FUNCTIONS
  // ============================================

  async function fetchUserLeagues(username: string) {
    isLoading.value = true
    error.value = null
    try {
      const user = await sleeperService.getUser(username)
      currentUserId.value = user.user_id
      currentUsername.value = username
      saveToLocalStorage()
      
      const fetchedLeagues = await sleeperService.getUserLeagues(user.user_id, currentSeason.value)
      
      // Merge with saved leagues (avoid duplicates)
      const savedIds = new Set(savedLeagues.value.map(l => l.league_id))
      const newLeagues = fetchedLeagues.filter(l => !savedIds.has(l.league_id))
      
      leagues.value = [
        ...savedLeagues.value.map(sl => ({
          league_id: sl.league_id,
          name: sl.league_name,
          season: sl.season,
          status: 'in_season',
          sport: 'nfl',
          settings: {},
          scoring_settings: {},
          roster_positions: [],
          total_rosters: 12
        } as SleeperLeague)),
        ...newLeagues
      ]
      
      return fetchedLeagues
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch leagues'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function setActiveLeague(leagueId: string) {
    isLoading.value = true
    error.value = null
    activeLeagueId.value = leagueId
    isDemoMode.value = false
    saveToLocalStorage()
    
    // Check if this is a Yahoo league
    const savedLeague = savedLeagues.value.find(l => l.league_id === leagueId)
    
    // Detect Yahoo league by ID format (e.g., "431.l.136233" or "nfl.l.123456")
    const isYahooLeagueId = /^\d+\.l\.\d+$/.test(leagueId) || /^[a-z]+\.l\.\d+$/.test(leagueId)
    
    if (savedLeague?.platform === 'yahoo' || isYahooLeagueId) {
      // Handle Yahoo league
      activePlatform.value = 'yahoo'
      await loadYahooLeagueData(leagueId)
      return
    }
    
    // Handle Sleeper league (existing logic)
    activePlatform.value = 'sleeper'
    
    try {
      // Get the saved league to find the username
      if (savedLeague?.sleeper_username && !currentUserId.value) {
        // Fetch the Sleeper user ID if we don't have it
        try {
          const user = await sleeperService.getUser(savedLeague.sleeper_username)
          currentUserId.value = user.user_id
          currentUsername.value = savedLeague.sleeper_username
        } catch (e) {
          console.warn('Failed to fetch Sleeper user ID:', e)
        }
      }
      
      // First, check localStorage cache for instant loading
      const localCache = loadCacheFromLocalStorage(leagueId)
      
      // Then check memory cache
      const memCache = leagueCache.value.get(leagueId)
      const cacheAge = memCache ? Date.now() - memCache.loadedAt : Infinity
      const memCacheValid = cacheAge < 5 * 60 * 1000 // 5 minutes for memory cache
      
      if (localCache && !memCache) {
        // Use localStorage cache immediately
        console.log(`Loading league ${leagueId} from localStorage cache`)
        currentLeague.value = localCache.league
        rosters.value = localCache.rosters
        users.value = localCache.users
        historicalSeasons.value = localCache.historicalSeasons
        historicalRosters.value = localCache.historicalRosters
        historicalUsers.value = localCache.historicalUsers
        historicalMatchups.value = localCache.historicalMatchups
        historicalDrafts.value = localCache.historicalDrafts
        historicalBrackets.value = localCache.historicalBrackets
        
        // Store in memory cache too
        leagueCache.value.set(leagueId, localCache)
        
        // Load players if needed
        if (Object.keys(players.value).length === 0) {
          players.value = await sleeperService.getPlayers()
        }
        
        isLoading.value = false
        
        // Refresh data in background
        refreshLeagueData(leagueId)
        return
      }
      
      if (memCache && memCacheValid) {
        console.log(`Loading league ${leagueId} from memory cache`)
        currentLeague.value = memCache.league
        rosters.value = memCache.rosters
        users.value = memCache.users
        historicalSeasons.value = memCache.historicalSeasons
        historicalRosters.value = memCache.historicalRosters
        historicalUsers.value = memCache.historicalUsers
        historicalMatchups.value = memCache.historicalMatchups
        historicalDrafts.value = memCache.historicalDrafts
        historicalBrackets.value = memCache.historicalBrackets
        
        if (Object.keys(players.value).length === 0) {
          players.value = await sleeperService.getPlayers()
        }
        
        return
      }
      
      // No valid cache, fetch fresh data
      console.log(`Fetching fresh data for league ${leagueId}`)
      await loadFreshLeagueData(leagueId)
      
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load league'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function loadFreshLeagueData(leagueId: string) {
    const [league, leagueRosters, leagueUsers, playersData] = await Promise.all([
      sleeperService.getLeague(leagueId),
      sleeperService.getLeagueRosters(leagueId),
      sleeperService.getLeagueUsers(leagueId),
      sleeperService.getPlayers()
    ])

    currentLeague.value = league
    rosters.value = leagueRosters
    users.value = leagueUsers
    players.value = playersData

    // Fetch historical data
    await fetchHistoricalData(leagueId)
    
    // Cache this league's data
    const cache: LeagueCache = {
      league,
      rosters: leagueRosters,
      users: leagueUsers,
      historicalSeasons: historicalSeasons.value,
      historicalRosters: historicalRosters.value,
      historicalUsers: historicalUsers.value,
      historicalMatchups: historicalMatchups.value,
      historicalDrafts: historicalDrafts.value,
      historicalBrackets: historicalBrackets.value,
      loadedAt: Date.now()
    }
    
    leagueCache.value.set(leagueId, cache)
    saveCacheToLocalStorage(leagueId, cache)
  }

  async function refreshLeagueData(leagueId: string) {
    try {
      // Background refresh - don't set loading state
      const [league, leagueRosters, leagueUsers] = await Promise.all([
        sleeperService.getLeague(leagueId),
        sleeperService.getLeagueRosters(leagueId),
        sleeperService.getLeagueUsers(leagueId)
      ])
      
      // Only update if this is still the active league
      if (activeLeagueId.value === leagueId) {
        currentLeague.value = league
        rosters.value = leagueRosters
        users.value = leagueUsers
        
        // Update cache
        const existingCache = leagueCache.value.get(leagueId)
        if (existingCache) {
          const updatedCache = {
            ...existingCache,
            league,
            rosters: leagueRosters,
            users: leagueUsers,
            loadedAt: Date.now()
          }
          leagueCache.value.set(leagueId, updatedCache)
          saveCacheToLocalStorage(leagueId, updatedCache)
        }
      }
    } catch (e) {
      console.warn('Background refresh failed:', e)
    }
  }

  async function fetchHistoricalData(leagueId: string) {
    try {
      const histData = await sleeperService.getHistoricalData(leagueId)
      historicalSeasons.value = histData.seasons
      historicalRosters.value = histData.rosters
      historicalUsers.value = histData.users
      historicalMatchups.value = histData.matchups
      historicalDrafts.value = histData.drafts || new Map()
      
      // Fetch brackets for each season
      const brackets = new Map<string, any[]>()
      for (const season of histData.seasons) {
        try {
          const bracket = await sleeperService.getWinnersBracket(season.league_id)
          brackets.set(season.season, bracket)
        } catch (e) {
          console.warn(`Could not fetch bracket for ${season.season}`)
        }
      }
      historicalBrackets.value = brackets
    } catch (e) {
      console.error('Failed to load historical data:', e)
    }
  }

  function getTeamInfo(roster: SleeperRoster) {
    const user = users.value.find(u => u.user_id === roster.owner_id)
    return {
      name: sleeperService.getTeamName(roster, user),
      avatar: sleeperService.getAvatarUrl(roster, user, currentLeague.value!),
      user
    }
  }

  // ============================================
  // DEMO MODE FUNCTIONS
  // ============================================

  function enableDemoMode() {
    isDemoMode.value = true
    activeLeagueId.value = null
    currentLeague.value = null
  }

  function disableDemoMode() {
    isDemoMode.value = false
  }

  // ============================================
  // RESET FUNCTION
  // ============================================

  function reset() {
    activeLeagueId.value = null
    leagues.value = []
    savedLeagues.value = []
    currentLeague.value = null
    rosters.value = []
    users.value = []
    players.value = {}
    historicalSeasons.value = []
    historicalRosters.value = new Map()
    historicalUsers.value = new Map()
    historicalMatchups.value = new Map()
    historicalDrafts.value = new Map()
    historicalBrackets.value = new Map()
    error.value = null
    isDemoMode.value = false
    
    // Clear Yahoo state
    yahooLeague.value = null
    yahooTeams.value = []
    yahooStandings.value = []
    yahooMatchups.value = []
    
    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    
    // Clear all league caches
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_KEYS.LEAGUE_CACHE)) {
        localStorage.removeItem(key)
      }
    }
  }
  
  // Load Yahoo league data
  async function loadYahooLeagueData(leagueKey: string) {
    isLoading.value = true
    error.value = null
    
    try {
      // Import Yahoo service dynamically to avoid circular dependencies
      const { yahooService } = await import('@/services/yahoo')
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      
      if (!authStore.user?.id) {
        throw new Error('Not authenticated')
      }
      
      // Initialize Yahoo service
      const initialized = await yahooService.initialize(authStore.user.id)
      if (!initialized) {
        throw new Error('Failed to initialize Yahoo connection')
      }
      
      // Fetch league metadata (includes current week)
      const metadata = await yahooService.getLeagueMetadata(leagueKey)
      
      // Fetch league details
      const leagueDetails = await yahooService.getLeagueDetails(leagueKey)
      yahooLeague.value = leagueDetails
      
      // Fetch teams with standings info
      const teams = await yahooService.getTeams(leagueKey)
      yahooTeams.value = teams
      
      // Fetch standings
      const standings = await yahooService.getStandings(leagueKey)
      yahooStandings.value = standings
      
      // Fetch current week matchups
      const matchups = await yahooService.getMatchups(leagueKey, metadata.currentWeek)
      yahooMatchups.value = matchups
      
      // Create a currentLeague object that's compatible with the UI
      const savedLeague = savedLeagues.value.find(l => l.league_id === leagueKey)
      currentLeague.value = {
        league_id: leagueKey,
        name: savedLeague?.league_name || leagueDetails?.[0]?.name || 'Yahoo League',
        season: savedLeague?.season || new Date().getFullYear().toString(),
        status: metadata.isFinished ? 'complete' : 'in_season',
        sport: 'nfl',
        settings: {
          leg: metadata.currentWeek,
          playoff_week_start: 15, // TODO: Get from Yahoo settings
          start_week: metadata.startWeek,
          end_week: metadata.endWeek
        },
        scoring_settings: {},
        roster_positions: [],
        total_rosters: savedLeague?.num_teams || teams.length || 12
      } as any
      
      console.log('Yahoo league loaded:', {
        metadata,
        league: yahooLeague.value,
        teams: yahooTeams.value,
        standings: yahooStandings.value,
        matchups: yahooMatchups.value
      })
      
    } catch (e) {
      console.error('Failed to load Yahoo league data:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load Yahoo league'
    } finally {
      isLoading.value = false
    }
  }

  // Refresh all saved Yahoo leagues to ensure they have the latest season
  async function refreshYahooLeagues(userId: string) {
    try {
      const { yahooService } = await import('@/services/yahoo')
      
      const initialized = await yahooService.initialize(userId)
      if (!initialized) {
        console.warn('Yahoo not connected, skipping league refresh')
        return
      }
      
      // Get saved Yahoo leagues
      const yahooLeagues = savedLeagues.value.filter(l => l.platform === 'yahoo')
      if (yahooLeagues.length === 0) {
        console.log('No saved Yahoo leagues to refresh')
        return
      }
      
      console.log(`Found ${yahooLeagues.length} saved Yahoo leagues to check:`, yahooLeagues.map(l => `${l.league_name} (${l.league_id}, sport: ${l.sport})`))
      
      // Always check both baseball and football
      // We fetch leagues from Yahoo for these sports regardless of what's saved
      const sportsToCheck: Array<'football' | 'baseball' | 'basketball' | 'hockey'> = ['baseball', 'football']
      
      console.log('Will check sports:', sportsToCheck)
      
      // Fetch all current leagues from Yahoo for each sport using Promise.all for speed
      const results = await Promise.allSettled(
        sportsToCheck.map(async sport => {
          console.log(`Fetching ${sport} leagues from Yahoo...`)
          const leagues = await yahooService.getLeagues(sport)
          console.log(`Found ${leagues.length} ${sport} leagues`)
          return { sport, leagues }
        })
      )
      
      const allCurrentLeagues: any[] = []
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allCurrentLeagues.push(...result.value.leagues)
        } else {
          console.warn('Failed to fetch leagues:', result.reason)
        }
      }
      
      console.log(`Total leagues fetched from Yahoo: ${allCurrentLeagues.length}`)
      
      if (allCurrentLeagues.length === 0) {
        console.log('No leagues found from Yahoo API')
        return
      }
      
      // Group by league name to find the latest season for each
      const latestByName = new Map<string, any>()
      for (const league of allCurrentLeagues) {
        const existing = latestByName.get(league.name)
        if (!existing || parseInt(league.season) > parseInt(existing.season)) {
          latestByName.set(league.name, league)
        }
      }
      
      console.log('Latest leagues by name:', Array.from(latestByName.entries()).map(([name, l]) => `${name}: ${l.season} (${l.league_key})`))
      
      // Update saved leagues if needed
      let updatedCount = 0
      for (const savedLeague of savedLeagues.value) {
        if (savedLeague.platform !== 'yahoo') continue
        
        const latest = latestByName.get(savedLeague.league_name)
        if (!latest) {
          console.log(`No matching Yahoo league found for "${savedLeague.league_name}"`)
          continue
        }
        
        const savedSeason = parseInt(savedLeague.season || '0')
        const latestSeason = parseInt(latest.season || '0')
        
        console.log(`Checking "${savedLeague.league_name}": saved=${savedSeason} (${savedLeague.league_id}), latest=${latestSeason} (${latest.league_key})`)
        
        if (latestSeason > savedSeason || savedLeague.league_id !== latest.league_key) {
          console.log(`🔄 Auto-updating "${savedLeague.league_name}" from ${savedSeason} (${savedLeague.league_id}) to ${latestSeason} (${latest.league_key})`)
          
          // Update the saved league
          savedLeague.league_id = latest.league_key
          savedLeague.season = latest.season
          savedLeague.yahoo_league_key = latest.league_key
          savedLeague.num_teams = latest.num_teams
          savedLeague.scoring_type = latest.scoring_type
          updatedCount++
          
          // Update Supabase if we have an ID
          if (supabase && savedLeague.id) {
            try {
              await supabase
                .from('user_leagues')
                .update({
                  league_id: latest.league_key,
                  season: latest.season,
                  yahoo_league_key: latest.league_key,
                  num_teams: latest.num_teams,
                  scoring_type: latest.scoring_type
                })
                .eq('id', savedLeague.id)
            } catch (e) {
              console.error('Failed to update league in Supabase:', e)
            }
          }
        }
      }
      
      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} Yahoo league(s) to latest season`)
        saveToLocalStorage()
        
        // If the active league was updated, reload its data
        if (activeLeagueId.value && activePlatform.value === 'yahoo') {
          const activeLeague = savedLeagues.value.find(l => l.league_name === savedLeagues.value.find(sl => sl.league_id === activeLeagueId.value)?.league_name)
          if (activeLeague && activeLeague.league_id !== activeLeagueId.value) {
            console.log('Active league was updated, reloading data...')
            activeLeagueId.value = activeLeague.league_id
            await loadYahooLeagueData(activeLeague.league_id)
          }
        }
      } else {
        console.log('All Yahoo leagues are already up to date')
      }
      
    } catch (e) {
      console.error('Failed to refresh Yahoo leagues:', e)
    }
  }

  // Initialize from localStorage on store creation
  loadFromLocalStorage()

  return {
    // State
    activeLeagueId,
    activePlatform,
    activeSport,
    leagues,
    savedLeagues,
    currentLeague,
    rosters,
    users,
    players,
    isLoading,
    error,
    isDemoMode,
    historicalSeasons,
    historicalRosters,
    historicalUsers,
    historicalMatchups,
    historicalDrafts,
    historicalBrackets,
    currentUserId,
    currentUsername,
    
    // Yahoo state
    yahooLeague,
    yahooTeams,
    yahooStandings,
    yahooMatchups,
    
    // Computed
    currentSeason,
    playoffWeekStart,
    currentWeek,
    hasSavedLeagues,
    filteredLeaguesBySport,
    
    // Actions
    loadSavedLeagues,
    saveLeague,
    saveYahooLeague,
    removeLeague,
    setPrimaryLeague,
    fetchUserLeagues,
    setActiveLeague,
    setActiveSport,
    loadYahooLeagueData,
    refreshYahooLeagues,
    getTeamInfo,
    reset,
    enableDemoMode,
    disableDemoMode
  }
})
