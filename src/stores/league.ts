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

// Saved league interface
interface SavedLeague {
  id?: string
  user_id?: string
  league_id: string
  league_name: string
  platform: 'sleeper'
  season: string
  sleeper_username: string
  is_primary: boolean
  league_type?: number // 0 = redraft, 1 = keeper, 2 = dynasty
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
  const leagues = ref<SleeperLeague[]>([])
  const savedLeagues = ref<SavedLeague[]>([])
  const currentLeague = ref<SleeperLeague | null>(null)
  const rosters = ref<SleeperRoster[]>([])
  const users = ref<SleeperUser[]>([])
  const players = ref<Record<string, SleeperPlayer>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isDemoMode = ref(false)

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

  // Check if user has any saved leagues
  const hasSavedLeagues = computed(() => savedLeagues.value.length > 0)

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

  async function saveLeague(league: SleeperLeague, username: string, userId: string): Promise<SavedLeague | undefined> {
    // Check if this league is already saved
    const existing = savedLeagues.value.find(l => l.league_id === league.league_id)
    if (existing) return existing
    
    const isPrimary = savedLeagues.value.length === 0
    
    const newLeague: SavedLeague = {
      league_id: league.league_id,
      league_name: league.name,
      platform: 'sleeper',
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
    
    try {
      // Get the saved league to find the username
      const savedLeague = savedLeagues.value.find(l => l.league_id === leagueId)
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

  // Initialize from localStorage on store creation
  loadFromLocalStorage()

  return {
    // State
    activeLeagueId,
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
    
    // Computed
    currentSeason,
    playoffWeekStart,
    currentWeek,
    hasSavedLeagues,
    
    // Actions
    loadSavedLeagues,
    saveLeague,
    removeLeague,
    setPrimaryLeague,
    fetchUserLeagues,
    setActiveLeague,
    getTeamInfo,
    reset,
    enableDemoMode,
    disableDemoMode
  }
})
