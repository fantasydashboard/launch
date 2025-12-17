import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { supabase } from '@/lib/supabase'
import type {
  SleeperLeague,
  SleeperRoster,
  SleeperUser,
  SleeperMatchup,
  SleeperPlayer
} from '@/types/sleeper'

// Saved league interface for Supabase
interface SavedLeague {
  id?: string
  league_id: string
  league_name: string
  platform: 'sleeper'
  season: string
  sleeper_username: string
  is_primary: boolean
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

  // Cache for multiple leagues
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

  // Load saved leagues from Supabase
  async function loadSavedLeagues(userId: string) {
    if (!supabase) return
    
    try {
      const { data, error: fetchError } = await supabase
        .from('user_leagues')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
      
      if (fetchError) throw fetchError
      
      savedLeagues.value = data || []
      
      // Convert to SleeperLeague format for the dropdown
      leagues.value = savedLeagues.value.map(sl => ({
        league_id: sl.league_id,
        name: sl.league_name,
        season: sl.season,
        // Add minimal required fields
        status: 'in_season',
        sport: 'nfl',
        settings: {},
        scoring_settings: {},
        roster_positions: [],
        total_rosters: 12
      } as SleeperLeague))
      
      // If there's a primary league, load it automatically
      const primaryLeague = savedLeagues.value.find(l => l.is_primary)
      if (primaryLeague) {
        currentUsername.value = primaryLeague.sleeper_username
        await setActiveLeague(primaryLeague.league_id)
      }
    } catch (e) {
      console.error('Failed to load saved leagues:', e)
    }
  }

  // Save a league to Supabase
  async function saveLeague(league: SleeperLeague, username: string, userId: string) {
    if (!supabase) return
    
    try {
      // Check if this league is already saved
      const existing = savedLeagues.value.find(l => l.league_id === league.league_id)
      if (existing) return existing
      
      const isPrimary = savedLeagues.value.length === 0 // First league is primary
      
      const { data, error: saveError } = await supabase
        .from('user_leagues')
        .insert({
          user_id: userId,
          league_id: league.league_id,
          league_name: league.name,
          platform: 'sleeper',
          season: league.season,
          sleeper_username: username,
          is_primary: isPrimary
        })
        .select()
        .single()
      
      if (saveError) throw saveError
      
      savedLeagues.value.push(data)
      
      // Also add to leagues array if not present
      if (!leagues.value.find(l => l.league_id === league.league_id)) {
        leagues.value.push(league)
      }
      
      return data
    } catch (e) {
      console.error('Failed to save league:', e)
    }
  }

  // Remove a saved league
  async function removeLeague(leagueId: string, userId: string) {
    if (!supabase) return
    
    try {
      const { error: deleteError } = await supabase
        .from('user_leagues')
        .delete()
        .eq('user_id', userId)
        .eq('league_id', leagueId)
      
      if (deleteError) throw deleteError
      
      savedLeagues.value = savedLeagues.value.filter(l => l.league_id !== leagueId)
      leagues.value = leagues.value.filter(l => l.league_id !== leagueId)
      
      // If we removed the active league, clear it
      if (activeLeagueId.value === leagueId) {
        activeLeagueId.value = null
        currentLeague.value = null
      }
    } catch (e) {
      console.error('Failed to remove league:', e)
    }
  }

  // Set primary league
  async function setPrimaryLeague(leagueId: string, userId: string) {
    if (!supabase) return
    
    try {
      // First, unset all as primary
      await supabase
        .from('user_leagues')
        .update({ is_primary: false })
        .eq('user_id', userId)
      
      // Then set the selected one as primary
      await supabase
        .from('user_leagues')
        .update({ is_primary: true })
        .eq('user_id', userId)
        .eq('league_id', leagueId)
      
      // Update local state
      savedLeagues.value = savedLeagues.value.map(l => ({
        ...l,
        is_primary: l.league_id === leagueId
      }))
    } catch (e) {
      console.error('Failed to set primary league:', e)
    }
  }

  // Actions
  async function fetchUserLeagues(username: string) {
    isLoading.value = true
    error.value = null
    try {
      const user = await sleeperService.getUser(username)
      currentUserId.value = user.user_id
      currentUsername.value = username
      const fetchedLeagues = await sleeperService.getUserLeagues(user.user_id, currentSeason.value)
      
      // Merge with saved leagues (avoid duplicates)
      const savedIds = new Set(savedLeagues.value.map(l => l.league_id))
      const newLeagues = fetchedLeagues.filter(l => !savedIds.has(l.league_id))
      
      leagues.value = [
        ...leagues.value,
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
    
    try {
      // Check if we have this league cached
      const cached = leagueCache.value.get(leagueId)
      const cacheAge = cached ? Date.now() - cached.loadedAt : Infinity
      const cacheValid = cacheAge < 5 * 60 * 1000 // 5 minutes
      
      if (cached && cacheValid) {
        console.log(`Loading league ${leagueId} from cache`)
        // Restore from cache
        currentLeague.value = cached.league
        rosters.value = cached.rosters
        users.value = cached.users
        historicalSeasons.value = cached.historicalSeasons
        historicalRosters.value = cached.historicalRosters
        historicalUsers.value = cached.historicalUsers
        historicalMatchups.value = cached.historicalMatchups
        historicalDrafts.value = cached.historicalDrafts
        historicalBrackets.value = cached.historicalBrackets || new Map()
        
        // Still fetch players if not loaded
        if (Object.keys(players.value).length === 0) {
          players.value = await sleeperService.getPlayers()
        }
      } else {
        console.log(`Fetching fresh data for league ${leagueId}`)
        // Fetch current league data
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
        leagueCache.value.set(leagueId, {
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
        })
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load league'
      throw e
    } finally {
      isLoading.value = false
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
          console.log(`✓ Fetched bracket for ${season.season}`)
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

  function reset() {
    activeLeagueId.value = null
    leagues.value = []
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
  }

  // Enable demo mode
  function enableDemoMode() {
    isDemoMode.value = true
  }

  // Disable demo mode
  function disableDemoMode() {
    isDemoMode.value = false
  }

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
