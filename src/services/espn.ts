/**
 * ESPN Fantasy API Service
 * 
 * Handles all interactions with ESPN's unofficial Fantasy API (v3).
 * Supports Football, Baseball, Basketball, and Hockey.
 * 
 * IMPORTANT: ESPN does not have an official public API. This service
 * uses the community-documented v3 API endpoints.
 * 
 * Authentication:
 * - Public leagues: No auth needed, just league ID
 * - Private leagues: Requires espn_s2 and SWID cookies from user's browser
 * 
 * All requests go through Supabase Edge Function proxy to avoid CORS.
 */

import { supabase } from '@/lib/supabase'
import type { Sport } from '@/types/supabase'
import { cache, CACHE_TTL, CACHE_KEYS } from './cache'

// ESPN sport codes (different from Yahoo)
const ESPN_SPORT_CODES: Record<Sport, string> = {
  football: 'ffl',
  baseball: 'flb',
  basketball: 'fba',
  hockey: 'fhl'
}

// ESPN sport IDs (used in some API responses)
const ESPN_SPORT_IDS: Record<Sport, number> = {
  football: 1,
  baseball: 2,
  basketball: 3,
  hockey: 4
}

// View parameters for different data requests
const ESPN_VIEWS = {
  // Core views
  SETTINGS: 'mSettings',
  TEAM: 'mTeam',
  ROSTER: 'mRoster',
  MATCHUP: 'mMatchup',
  MATCHUP_SCORE: 'mMatchupScore',
  SCOREBOARD: 'mScoreboard',
  STANDINGS: 'mStandings',
  
  // Draft views
  DRAFT_DETAIL: 'mDraftDetail',
  
  // Transaction views
  TRANSACTIONS: 'mTransactions2',
  PENDING_TRANSACTIONS: 'mPendingTransactions',
  
  // Player views
  PLAYERS: 'players_wl',
  PLAYER_INFO: 'kona_player_info',
  
  // Scoring views  
  LIVE_SCORING: 'mLiveScoring',
  POSITIONAL_RATINGS: 'mPositionalRatings',
  
  // Navigation/metadata
  NAV: 'mNav',
  STATUS: 'mStatus',
  MODULAR: 'modular'
} as const

// Lineup slot IDs (ESPN uses numeric IDs)
const LINEUP_SLOTS: Record<number, string> = {
  0: 'QB',
  1: 'TQB',   // Team QB
  2: 'RB',
  3: 'RB/WR',
  4: 'WR',
  5: 'WR/TE',
  6: 'TE',
  7: 'OP',    // Offensive Player
  8: 'DT',
  9: 'DE',
  10: 'LB',
  11: 'DL',
  12: 'CB',
  13: 'S',
  14: 'DB',
  15: 'DP',   // Defensive Player
  16: 'D/ST',
  17: 'K',
  18: 'P',
  19: 'HC',   // Head Coach
  20: 'BE',   // Bench
  21: 'IR',
  23: 'FLEX',
  24: 'ER',   // Edge Rusher
  25: 'Rookie' // For dynasty
}

// Pro team IDs to abbreviations (NFL)
const PRO_TEAMS: Record<number, string> = {
  0: 'FA',
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE',
  6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GB', 10: 'TEN',
  11: 'IND', 12: 'KC', 13: 'OAK', 14: 'LAR', 15: 'MIA',
  16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ',
  21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF',
  26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX',
  33: 'BAL', 34: 'HOU'
}

// MLB Pro team IDs to abbreviations
const MLB_TEAMS: Record<number, string> = {
  0: 'FA',
  1: 'BAL', 2: 'BOS', 3: 'LAA', 4: 'CWS', 5: 'CLE',
  6: 'DET', 7: 'KC', 8: 'MIL', 9: 'MIN', 10: 'NYY',
  11: 'OAK', 12: 'SEA', 13: 'TEX', 14: 'TOR', 15: 'ATL',
  16: 'CHC', 17: 'CIN', 18: 'HOU', 19: 'LAD', 20: 'WSH',
  21: 'NYM', 22: 'PHI', 23: 'PIT', 24: 'STL', 25: 'SD',
  26: 'SF', 27: 'COL', 28: 'MIA', 29: 'ARI', 30: 'TB'
}

// ============================================================
// Type Definitions
// ============================================================

export interface EspnCredentials {
  visibleToPublic: boolean
  espn_s2?: string
  swid?: string
}

export interface EspnLeague {
  id: number
  seasonId: number
  scoringPeriodId: number
  segmentId: number
  name: string
  size: number
  isPublic: boolean
  scoringType: 'H2H_POINTS' | 'H2H_CATEGORY' | 'ROTO' | 'TOTAL_POINTS'
  currentMatchupPeriod: number
  status: {
    currentMatchupPeriod: number
    isActive: boolean
    latestScoringPeriod: number
    finalScoringPeriod: number
    firstScoringPeriod: number
  }
  settings: {
    name: string
    playoffMatchupPeriodLength: number
    playoffSeedingRule: string
    playoffTeamCount: number
    regularSeasonMatchupPeriodCount: number
    rosterSettings: any
    scheduleSettings: any
    scoringSettings: any
    tradeSettings: any
  }
}

export interface EspnTeam {
  id: number
  abbrev: string
  name: string
  location: string  // First part of team name
  nickname: string  // Second part of team name
  logo: string
  owners: string[]
  primaryOwner: string
  ownerName?: string  // Display name of primary owner
  points: number
  pointsFor: number
  pointsAgainst: number
  wins: number
  losses: number
  ties: number
  rank: number
  playoffSeed: number
  divisionId: number
  roster?: EspnPlayer[]
  record?: {
    overall: { wins: number; losses: number; ties: number; percentage: number }
    home: { wins: number; losses: number; ties: number }
    away: { wins: number; losses: number; ties: number }
    division: { wins: number; losses: number; ties: number }
  }
}

export interface EspnPlayer {
  id: number
  playerId: number
  fullName: string
  firstName: string
  lastName: string
  proTeam: string
  proTeamId: number
  position: string
  positionId: number
  lineupSlotId: number
  lineupSlot: string
  injuryStatus: string
  projectedPoints: number
  actualPoints: number
  percentOwned: number
  percentStarted: number
  stats: Record<string, number>
}

export interface EspnMatchup {
  id: number
  matchupPeriodId: number
  homeTeamId: number
  awayTeamId: number
  homeTeam?: EspnTeam
  awayTeam?: EspnTeam
  homeScore: number
  awayScore: number
  winner: 'HOME' | 'AWAY' | 'TIE' | 'UNDECIDED'
  playoffTierType: string
}

export interface EspnDraftPick {
  id: number
  roundId: number
  roundPickNumber: number
  overallPickNumber: number
  playerId: number
  playerName: string
  position?: string
  positionId?: number
  proTeam?: string
  teamId: number
  keeper: boolean
  bidAmount?: number
}

export interface EspnMember {
  id: string
  displayName: string
  firstName: string
  lastName: string
  isLeagueManager: boolean
}

// ============================================================
// ESPN Fantasy Service Class
// ============================================================

export class EspnFantasyService {
  private userId: string | null = null
  private supabaseUrl: string
  private credentials: EspnCredentials | null = null

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  }

  /**
   * Initialize the service with user ID and load stored credentials
   */
  async initialize(userId: string): Promise<boolean> {
    this.userId = userId
    console.log('[ESPN] Service initialized for user:', userId)
    // Credentials are loaded from localStorage via platformsStore.getEspnCredentials()
    // No need to query Supabase here (which can hang)
    return true
  }

  /**
   * Set credentials for private league access
   */
  setCredentials(espn_s2: string, swid: string): void {
    this.credentials = {
      visibleToPublic: false,
      espn_s2,
      swid
    }
  }

  /**
   * Clear credentials
   */
  clearCredentials(): void {
    this.credentials = null
  }

  /**
   * Check if we have credentials for private leagues
   */
  hasCredentials(): boolean {
    return !!(this.credentials?.espn_s2 && this.credentials?.swid)
  }

  // ============================================================
  // Core API Request Method
  // ============================================================

  /**
   * Make a request to ESPN Fantasy API via proxy
   * 
   * @param sport - Sport type
   * @param leagueId - ESPN league ID
   * @param season - Season year
   * @param views - Array of view parameters to request
   * @param scoringPeriod - Optional scoring period (week)
   * @param historical - If true, use leagueHistory endpoint (for pre-2018)
   */
  private async apiRequest(
    sport: Sport,
    leagueId: string | number,
    season: number,
    views: string[] = [],
    scoringPeriod?: number,
    historical: boolean = false
  ): Promise<any> {
    // Get access token - try multiple methods
    let accessToken: string | null = null
    
    // Method 1: Try localStorage (fast)
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      
      if (authKey) {
        const stored = localStorage.getItem(authKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          accessToken = parsed?.access_token
          if (accessToken) {
            console.log('[ESPN] Got token from localStorage')
          }
        }
      }
    } catch (e) {
      console.warn('[ESPN] localStorage access failed:', e)
    }
    
    // Method 2: Try Supabase client (slower but more reliable)
    if (!accessToken) {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          accessToken = session?.access_token || null
          if (accessToken) {
            console.log('[ESPN] Got token from Supabase client')
          }
        }
      } catch (e) {
        console.warn('[ESPN] Supabase getSession failed:', e)
      }
    }
    
    if (!accessToken) {
      console.error('[ESPN] No access token found')
      throw new Error('Not authenticated - please sign in')
    }

    const sportCode = ESPN_SPORT_CODES[sport]
    
    // Build endpoint URL
    let endpoint: string
    if (historical || season < 2018) {
      // Historical endpoint for older seasons
      endpoint = `/games/${sportCode}/leagueHistory/${leagueId}?seasonId=${season}`
    } else {
      // Current endpoint for 2018+
      endpoint = `/games/${sportCode}/seasons/${season}/segments/0/leagues/${leagueId}`
    }

    // Add view parameters
    if (views.length > 0) {
      const viewParams = views.map(v => `view=${v}`).join('&')
      endpoint += endpoint.includes('?') ? `&${viewParams}` : `?${viewParams}`
    }

    // Add scoring period if specified
    if (scoringPeriod !== undefined) {
      endpoint += endpoint.includes('?') ? `&scoringPeriodId=${scoringPeriod}` : `?scoringPeriodId=${scoringPeriod}`
    }

    const proxyUrl = `${this.supabaseUrl}/functions/v1/espn-api`
    
    const requestBody: any = { endpoint }
    
    // Include credentials for private leagues
    if (this.credentials?.espn_s2 && this.credentials?.swid) {
      requestBody.espn_s2 = this.credentials.espn_s2
      requestBody.swid = this.credentials.swid
    }

    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('ESPN API proxy error:', response.status, errorData)
        
        // Provide helpful error messages
        if (response.status === 401) {
          throw new Error('ESPN credentials expired or invalid. Please reconnect your ESPN account.')
        } else if (response.status === 404) {
          throw new Error('League not found. Please check the league ID.')
        } else if (response.status === 403) {
          throw new Error('This is a private league. Please provide ESPN cookies (espn_s2 and SWID).')
        }
        
        throw new Error(errorData.error || `ESPN API error: ${response.status}`)
      }

      return response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. ESPN API may be slow or unavailable.')
      }
      throw error
    }
  }

  // ============================================================
  // League Methods
  // ============================================================

  /**
   * Fetch basic league information
   */
  async getLeague(sport: Sport, leagueId: string | number, season: number): Promise<EspnLeague | null> {
    const cacheKey = `espn_league_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnLeague>('espn_league', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN league ${leagueId}`)
      return cached
    }

    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.SETTINGS, ESPN_VIEWS.STATUS])
      
      const league = this.parseLeague(data, sport)
      
      // Cache for metadata duration
      cache.set('espn_league', league, CACHE_TTL.METADATA, cacheKey)
      
      return league
    } catch (error) {
      console.error('Error fetching ESPN league:', error)
      throw error
    }
  }

  /**
   * Validate a league ID (check if accessible)
   */
  async validateLeague(sport: Sport, leagueId: string | number, season: number): Promise<{
    valid: boolean
    isPrivate: boolean
    league?: EspnLeague
    error?: string
  }> {
    try {
      const league = await this.getLeague(sport, leagueId, season)
      return {
        valid: true,
        isPrivate: !league?.isPublic,
        league: league || undefined
      }
    } catch (error: any) {
      const message = error.message || 'Unknown error'
      
      if (message.includes('private league') || message.includes('403')) {
        return {
          valid: true,
          isPrivate: true,
          error: 'This league is private. Please provide ESPN cookies.'
        }
      }
      
      return {
        valid: false,
        isPrivate: false,
        error: message
      }
    }
  }

  // ============================================================
  // Team Methods
  // ============================================================

  /**
   * Get all teams in a league
   */
  async getTeams(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam[]> {
    const cacheKey = `espn_teams_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnTeam[]>('espn_teams', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN teams for ${leagueId}`)
      return cached
    }

    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TEAM, ESPN_VIEWS.STANDINGS])
      
      const teams = this.parseTeams(data)
      
      cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
      
      return teams
    } catch (error) {
      console.error('Error fetching ESPN teams:', error)
      throw error
    }
  }

  /**
   * Get teams for a historical season - tries both regular and leagueHistory endpoints
   */
  async getHistoricalTeams(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam[]> {
    const cacheKey = `espn_hist_teams_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnTeam[]>('espn_teams', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN historical teams for ${leagueId} ${season}`)
      return cached
    }

    // Try regular endpoint first
    try {
      console.log(`[ESPN] Trying regular endpoint for ${season}...`)
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TEAM, ESPN_VIEWS.STANDINGS])
      
      if (data && data.teams && data.teams.length > 0) {
        const teams = this.parseTeams(data)
        cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
        console.log(`[ESPN] Regular endpoint worked for ${season}`)
        return teams
      }
    } catch (error: any) {
      console.log(`[ESPN] Regular endpoint failed for ${season}:`, error?.message)
    }

    // Try leagueHistory endpoint
    try {
      console.log(`[ESPN] Trying leagueHistory endpoint for ${season}...`)
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TEAM, ESPN_VIEWS.STANDINGS], undefined, true)
      
      if (data && data.teams && data.teams.length > 0) {
        const teams = this.parseTeams(data)
        cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
        console.log(`[ESPN] leagueHistory endpoint worked for ${season}`)
        return teams
      }
      
      // leagueHistory returns array format
      if (Array.isArray(data) && data.length > 0 && data[0].teams) {
        const teams = this.parseTeams(data[0])
        cache.set('espn_teams', teams, CACHE_TTL.STANDINGS, cacheKey)
        console.log(`[ESPN] leagueHistory endpoint (array) worked for ${season}`)
        return teams
      }
    } catch (error: any) {
      console.log(`[ESPN] leagueHistory endpoint failed for ${season}:`, error?.message)
    }

    console.log(`[ESPN] No data available for ${season}`)
    return []
  }

  /**
   * Get teams with full rosters
   */
  async getTeamsWithRosters(sport: Sport, leagueId: string | number, season: number, week?: number): Promise<EspnTeam[]> {
    try {
      const views = [ESPN_VIEWS.TEAM, ESPN_VIEWS.ROSTER]
      const data = await this.apiRequest(sport, leagueId, season, views, week)
      
      return this.parseTeamsWithRosters(data, sport)
    } catch (error) {
      console.error('Error fetching ESPN teams with rosters:', error)
      throw error
    }
  }

  /**
   * Get the current user's team in a league
   */
  async getMyTeam(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam | null> {
    if (!this.credentials?.swid) {
      console.log('No SWID available to identify user team')
      return null
    }

    try {
      const teams = await this.getTeams(sport, leagueId, season)
      const myTeam = teams.find(team => 
        team.owners.some(owner => owner === `{${this.credentials!.swid}}` || owner === this.credentials!.swid)
      )
      return myTeam || null
    } catch (error) {
      console.error('Error finding user team:', error)
      return null
    }
  }

  // ============================================================
  // Matchup Methods
  // ============================================================

  /**
   * Get matchups for a specific week
   */
  async getMatchups(sport: Sport, leagueId: string | number, season: number, week: number): Promise<EspnMatchup[]> {
    const cacheKey = `espn_matchups_${sport}_${leagueId}_${season}_${week}`
    const cached = cache.get<EspnMatchup[]>('espn_matchups', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN matchups for ${leagueId} week ${week}`)
      return cached
    }

    try {
      const data = await this.apiRequest(
        sport, 
        leagueId, 
        season, 
        [ESPN_VIEWS.MATCHUP, ESPN_VIEWS.MATCHUP_SCORE],
        week
      )
      
      const matchups = this.parseMatchups(data, week)
      
      // Determine cache TTL based on week status
      const league = await this.getLeague(sport, leagueId, season)
      const currentWeek = league?.status?.currentMatchupPeriod || 1
      const isCompletedWeek = week < currentWeek
      const ttl = isCompletedWeek ? CACHE_TTL.COMPLETED : CACHE_TTL.CURRENT
      
      cache.set('espn_matchups', matchups, ttl, cacheKey)
      
      return matchups
    } catch (error) {
      console.error('Error fetching ESPN matchups:', error)
      throw error
    }
  }

  /**
   * Get matchups for a historical season - tries both regular and leagueHistory endpoints
   */
  async getHistoricalMatchups(sport: Sport, leagueId: string | number, season: number, week: number): Promise<EspnMatchup[]> {
    const cacheKey = `espn_hist_matchups_${sport}_${leagueId}_${season}_${week}`
    const cached = cache.get<EspnMatchup[]>('espn_matchups', cacheKey)
    if (cached) {
      return cached
    }

    // Try regular endpoint first
    try {
      const data = await this.apiRequest(
        sport, 
        leagueId, 
        season, 
        [ESPN_VIEWS.MATCHUP, ESPN_VIEWS.MATCHUP_SCORE],
        week
      )
      
      const matchups = this.parseMatchups(data, week)
      if (matchups.length > 0) {
        cache.set('espn_matchups', matchups, CACHE_TTL.COMPLETED, cacheKey)
        return matchups
      }
    } catch (error: any) {
      // Silent fail, try historical endpoint
    }

    // Try leagueHistory endpoint
    try {
      const data = await this.apiRequest(
        sport, 
        leagueId, 
        season, 
        [ESPN_VIEWS.MATCHUP, ESPN_VIEWS.MATCHUP_SCORE],
        week,
        true // historical flag
      )
      
      // leagueHistory returns array format
      const scheduleData = Array.isArray(data) ? data[0] : data
      const matchups = this.parseMatchups(scheduleData, week)
      
      if (matchups.length > 0) {
        cache.set('espn_matchups', matchups, CACHE_TTL.COMPLETED, cacheKey)
        return matchups
      }
    } catch (error: any) {
      // Silent fail
    }

    return []
  }

  /**
   * Get all matchups for the season
   */
  async getAllMatchups(sport: Sport, leagueId: string | number, season: number): Promise<Map<number, EspnMatchup[]>> {
    const league = await this.getLeague(sport, leagueId, season)
    if (!league) throw new Error('Could not fetch league info')

    const totalWeeks = league.settings.regularSeasonMatchupPeriodCount + 
                       (league.settings.playoffTeamCount > 0 ? 3 : 0)
    
    const allMatchups = new Map<number, EspnMatchup[]>()
    
    for (let week = 1; week <= totalWeeks; week++) {
      try {
        const weekMatchups = await this.getMatchups(sport, leagueId, season, week)
        allMatchups.set(week, weekMatchups)
      } catch (error) {
        console.warn(`Could not fetch matchups for week ${week}`)
        break
      }
    }
    
    return allMatchups
  }

  // ============================================================
  // Standings Methods
  // ============================================================

  /**
   * Get current standings
   */
  async getStandings(sport: Sport, leagueId: string | number, season: number): Promise<EspnTeam[]> {
    const teams = await this.getTeams(sport, leagueId, season)
    
    // Sort by rank or calculate from record
    return teams.sort((a, b) => {
      // First by wins
      if (b.wins !== a.wins) return b.wins - a.wins
      // Then by points for
      return b.pointsFor - a.pointsFor
    })
  }

  // ============================================================
  // Draft Methods
  // ============================================================

  /**
   * Get draft results
   */
  async getDraft(sport: Sport, leagueId: string | number, season: number): Promise<EspnDraftPick[]> {
    const cacheKey = `espn_draft_${sport}_${leagueId}_${season}_v2`
    const cached = cache.get<EspnDraftPick[]>('espn_draft', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN draft for ${leagueId}`)
      return cached
    }

    try {
      // Request draft detail with player info view
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.DRAFT_DETAIL, ESPN_VIEWS.PLAYER_INFO])
      
      console.log('[ESPN getDraft] Response keys:', Object.keys(data))
      if (data.draftDetail) {
        console.log('[ESPN getDraft] Draft picks count:', data.draftDetail.picks?.length)
      }
      if (data.players) {
        console.log('[ESPN getDraft] Players in response:', data.players.length)
      }
      
      const picks = this.parseDraft(data, sport)
      
      // Draft data is permanent
      cache.set('espn_draft', picks, CACHE_TTL.PERMANENT, cacheKey)
      
      return picks
    } catch (error) {
      console.error('Error fetching ESPN draft:', error)
      throw error
    }
  }
  
  /**
   * Get draft picks with player names resolved
   * This combines draft data with player info lookup
   */
  async getDraftWithPlayers(sport: Sport, leagueId: string | number, season: number): Promise<EspnDraftPick[]> {
    const cacheKey = `espn_draft_full_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnDraftPick[]>('espn_draft_full', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN draft with players for ${leagueId}`)
      return cached
    }

    try {
      // Get basic draft picks
      const picks = await this.getDraft(sport, leagueId, season)
      
      // Get team mapping based on sport
      const teamMapping = sport === 'baseball' ? MLB_TEAMS : PRO_TEAMS
      
      // Extract all player IDs
      const playerIds = picks.map(p => p.playerId)
      console.log('[ESPN getDraftWithPlayers] Need to resolve', playerIds.length, 'players')
      
      // Try to get player info
      const playerMap = await this.getPlayersByIds(sport, leagueId, season, playerIds)
      console.log('[ESPN getDraftWithPlayers] Resolved', playerMap.size, 'players from getPlayersByIds')
      
      // Also get roster data as fallback
      try {
        const teamsWithRosters = await this.getTeamsWithRosters(sport, leagueId, season)
        for (const team of teamsWithRosters) {
          if (team.roster) {
            for (const player of team.roster) {
              if (!playerMap.has(player.playerId) || playerMap.get(player.playerId)?.name.startsWith('Player ')) {
                playerMap.set(player.playerId, {
                  name: player.fullName || `Player ${player.playerId}`,
                  position: player.position || 'Unknown',
                  team: player.proTeam || teamMapping[player.proTeamId] || 'FA'
                })
              }
            }
          }
        }
        console.log('[ESPN getDraftWithPlayers] After roster fallback:', playerMap.size, 'players resolved')
      } catch (e) {
        console.log('[ESPN getDraftWithPlayers] Roster fallback failed:', e)
      }
      
      // Enrich picks with player info
      const enrichedPicks = picks.map(pick => {
        const playerInfo = playerMap.get(pick.playerId)
        if (playerInfo) {
          return {
            ...pick,
            playerName: pick.playerName.startsWith('Player ') ? playerInfo.name : pick.playerName,
            position: pick.position === 'Unknown' ? playerInfo.position : pick.position,
            proTeam: playerInfo.team
          }
        }
        return pick
      })
      
      // Log unresolved players
      const unresolved = enrichedPicks.filter(p => p.playerName.startsWith('Player '))
      if (unresolved.length > 0) {
        console.log('[ESPN getDraftWithPlayers] Still unresolved:', unresolved.length, 'players. IDs:', unresolved.slice(0, 10).map(p => p.playerId))
      }
      
      // Cache the enriched data
      cache.set('espn_draft_full', enrichedPicks, CACHE_TTL.PERMANENT, cacheKey)
      
      return enrichedPicks
    } catch (error) {
      console.error('Error fetching ESPN draft with players:', error)
      throw error
    }
  }

  /**
   * Get player info by player IDs
   * Uses the kona_player_info view with a filter to get player details
   */
  async getPlayersByIds(sport: Sport, leagueId: string | number, season: number, playerIds: number[]): Promise<Map<number, { name: string; position: string; team: string }>> {
    if (playerIds.length === 0) {
      return new Map()
    }

    const cacheKey = `espn_players_${sport}_${leagueId}_${season}_${playerIds.slice(0, 5).join('_')}_v2`
    // Cache stores plain objects, not Maps (JSON doesn't support Maps)
    const cached = cache.get<Record<string, { name: string; position: string; team: string }>>('espn_players', cacheKey)
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      console.log(`[Cache HIT] ESPN players for ${leagueId}`)
      // Convert plain object back to Map
      const map = new Map<number, { name: string; position: string; team: string }>()
      for (const [key, value] of Object.entries(cached)) {
        map.set(parseInt(key), value)
      }
      return map
    }

    // Get correct team mapping based on sport
    const teamMapping = sport === 'baseball' ? MLB_TEAMS : PRO_TEAMS

    try {
      // Batch player IDs into chunks of 50 to avoid URL length limits
      const playerMap = new Map<number, { name: string; position: string; team: string }>()
      const chunkSize = 50
      
      for (let i = 0; i < playerIds.length; i += chunkSize) {
        const chunk = playerIds.slice(i, i + chunkSize)
        
        // Use kona_player_info view with filter
        // ESPN requires the filter to be passed as x-fantasy-filter header (handled by proxy)
        const filterObj = {
          players: {
            filterIds: {
              value: chunk
            }
          }
        }
        
        console.log(`[ESPN getPlayersByIds] Requesting chunk ${Math.floor(i/chunkSize) + 1} with ${chunk.length} player IDs`)
        
        try {
          const data = await this.apiRequestWithFilter(sport, leagueId, season, [ESPN_VIEWS.PLAYER_INFO], filterObj)
          
          // Parse player data from response
          const players = data.players || []
          console.log(`[ESPN getPlayersByIds] Got ${players.length} players in chunk ${Math.floor(i/chunkSize) + 1}`)
          
          // Debug: log first player structure
          if (players.length > 0 && i === 0) {
            console.log('[ESPN getPlayersByIds] First player structure:', JSON.stringify(players[0]).slice(0, 500))
          }
          
          for (const entry of players) {
            const player = entry.player || entry
            if (player.id) {
              playerMap.set(player.id, {
                name: player.fullName || `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${player.id}`,
                position: this.getPositionName(player.defaultPositionId, sport),
                team: teamMapping[player.proTeamId] || `Team${player.proTeamId}`
              })
            }
          }
        } catch (chunkError) {
          console.error(`[ESPN getPlayersByIds] Error in chunk ${Math.floor(i/chunkSize) + 1}:`, chunkError)
          // Continue with next chunk even if this one fails
        }
      }
      
      console.log(`[ESPN getPlayersByIds] Total: resolved ${playerMap.size} of ${playerIds.length} players`)
      
      // Convert Map to plain object for caching (JSON doesn't support Maps)
      const cacheObj: Record<string, { name: string; position: string; team: string }> = {}
      for (const [key, value] of playerMap.entries()) {
        cacheObj[key.toString()] = value
      }
      
      // Cache for a long time since player names don't change
      if (playerMap.size > 0) {
        cache.set('espn_players', cacheObj, CACHE_TTL.PERMANENT, cacheKey)
      }
      
      return playerMap
    } catch (error) {
      console.error('Error fetching ESPN players by IDs:', error)
      return new Map()
    }
  }

  /**
   * Make an API request with a filter header (for player info requests)
   */
  private async apiRequestWithFilter(
    sport: Sport,
    leagueId: string | number,
    season: number,
    views: string[] = [],
    filter?: any
  ): Promise<any> {
    // Get access token
    let accessToken: string | null = null
    
    try {
      const keys = Object.keys(localStorage)
      const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (authKey) {
        const stored = localStorage.getItem(authKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          accessToken = parsed?.access_token
        }
      }
    } catch (e) {
      // Try Supabase client
    }
    
    if (!accessToken) {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          accessToken = session?.access_token || null
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    if (!accessToken) {
      throw new Error('Not authenticated - please sign in')
    }

    const sportCode = ESPN_SPORT_CODES[sport]
    let endpoint = `/games/${sportCode}/seasons/${season}/segments/0/leagues/${leagueId}`
    
    if (views.length > 0) {
      const viewParams = views.map(v => `view=${v}`).join('&')
      endpoint += `?${viewParams}`
    }

    const proxyUrl = `${this.supabaseUrl}/functions/v1/espn-api`
    
    const requestBody: any = { 
      endpoint,
      filter: filter ? JSON.stringify(filter) : undefined
    }
    
    if (this.credentials?.espn_s2 && this.credentials?.swid) {
      requestBody.espn_s2 = this.credentials.espn_s2
      requestBody.swid = this.credentials.swid
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `ESPN API error: ${response.status}`)
      }

      return response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timed out.')
      }
      throw error
    }
  }

  // ============================================================
  // Scoring & Stats Methods
  // ============================================================

  /**
   * Get scoring settings for the league
   */
  async getScoringSettings(sport: Sport, leagueId: string | number, season: number): Promise<any> {
    const cacheKey = `espn_scoring_${sport}_${leagueId}_${season}`
    const cached = cache.get<any>('espn_scoring', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN scoring settings for ${leagueId}`)
      return cached
    }

    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.SETTINGS])
      
      const scoringSettings = data.settings?.scoringSettings || {}
      
      cache.set('espn_scoring', scoringSettings, CACHE_TTL.SETTINGS, cacheKey)
      
      return scoringSettings
    } catch (error) {
      console.error('Error fetching ESPN scoring settings:', error)
      throw error
    }
  }

  /**
   * Get live scoring for current week
   */
  async getLiveScoring(sport: Sport, leagueId: string | number, season: number, week: number): Promise<any> {
    try {
      const data = await this.apiRequest(
        sport,
        leagueId,
        season,
        [ESPN_VIEWS.LIVE_SCORING, ESPN_VIEWS.SCOREBOARD],
        week
      )
      
      return data
    } catch (error) {
      console.error('Error fetching ESPN live scoring:', error)
      throw error
    }
  }

  // ============================================================
  // Transaction Methods
  // ============================================================

  /**
   * Get transactions for the league
   */
  async getTransactions(sport: Sport, leagueId: string | number, season: number): Promise<any[]> {
    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.TRANSACTIONS])
      
      return data.transactions || []
    } catch (error) {
      console.error('Error fetching ESPN transactions:', error)
      return []
    }
  }

  // ============================================================
  // Historical Data Methods
  // ============================================================

  /**
   * Get historical data for a league (previous seasons)
   * Note: ESPN keeps the same league ID across seasons
   */
  async getHistoricalSeasons(sport: Sport, leagueId: string | number, fromYear: number, toYear: number): Promise<Map<number, EspnLeague>> {
    const seasons = new Map<number, EspnLeague>()
    
    for (let year = toYear; year >= fromYear; year--) {
      try {
        const league = await this.getLeague(sport, leagueId, year)
        if (league) {
          seasons.set(year, league)
        }
      } catch (error) {
        console.warn(`Could not fetch data for ${year}`)
      }
    }
    
    return seasons
  }

  /**
   * Auto-detect sport for a league by trying each sport code
   * Returns the sport and league info if found
   */
  async detectLeagueSport(leagueId: string | number, season?: number): Promise<{
    sport: Sport
    league: EspnLeague
  } | null> {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // 1-12
    
    // Determine seasons to try based on time of year
    // For sports that haven't started their new season yet, check previous year first
    const seasonsToTry = season ? [season] : [currentYear, currentYear - 1]
    
    const sports: Sport[] = ['football', 'baseball', 'basketball', 'hockey']
    
    console.log(`[ESPN] Detecting sport for league ${leagueId}, trying seasons: ${seasonsToTry.join(', ')}...`)
    
    for (const targetSeason of seasonsToTry) {
      for (const sport of sports) {
        try {
          console.log(`[ESPN] Trying ${sport} ${targetSeason}...`)
          const league = await this.getLeague(sport, leagueId, targetSeason)
          if (league) {
            console.log(`[ESPN] SUCCESS - Found league as ${sport} ${targetSeason}: ${league.name}`)
            return { sport, league }
          }
        } catch (error: any) {
          const errorMsg = error.message || ''
          
          // 403 means private league in that sport - we found it!
          if (errorMsg.includes('403') || errorMsg.includes('private')) {
            console.log(`[ESPN] League ${leagueId} exists as ${sport} ${targetSeason} but is private`)
            return { 
              sport, 
              league: {
                id: Number(leagueId),
                seasonId: targetSeason,
                scoringPeriodId: 1,
                segmentId: 0,
                name: `Private League ${leagueId}`,
                size: 0,
                isPublic: false,
                scoringType: 'H2H_POINTS',
                currentMatchupPeriod: 1,
                status: {
                  currentMatchupPeriod: 1,
                  isActive: true,
                  latestScoringPeriod: 1,
                  finalScoringPeriod: 17,
                  firstScoringPeriod: 1
                },
                settings: {} as any
              } as EspnLeague
            }
          }
          // 404 or other errors - keep trying
          console.log(`[ESPN] ${sport} ${targetSeason}: not found`)
        }
      }
    }
    
    console.log(`[ESPN] Could not find league ${leagueId} in any sport/season combination`)
    return null
  }

  /**
   * Discover all available seasons for a league
   * Fetches ALL years from current back to 2003 (ESPN fantasy football started ~2004)
   * This gets the full league history regardless of when the user joined
   * Uses parallel batching for speed
   */
  async discoverAllSeasons(sport: Sport, leagueId: string | number): Promise<Array<{
    season: number
    league: EspnLeague
  }>> {
    const currentYear = new Date().getFullYear()
    const seasons: Array<{ season: number; league: EspnLeague }> = []
    
    // ESPN fantasy started around 2003-2004 for football, later for other sports
    const minYear = 2003
    
    console.log(`[ESPN] Discovering all seasons for league ${leagueId} (${currentYear} to ${minYear})...`)
    
    // Build array of years to check
    const yearsToCheck: number[] = []
    for (let year = currentYear; year >= minYear; year--) {
      yearsToCheck.push(year)
    }
    
    // Fetch in parallel batches of 5 for speed (don't overwhelm API)
    const batchSize = 5
    for (let i = 0; i < yearsToCheck.length; i += batchSize) {
      const batch = yearsToCheck.slice(i, i + batchSize)
      
      const results = await Promise.allSettled(
        batch.map(async (year) => {
          try {
            const league = await this.getLeague(sport, leagueId, year)
            return league ? { season: year, league } : null
          } catch {
            return null
          }
        })
      )
      
      // Collect successful results
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          seasons.push(result.value)
          console.log(`[ESPN] Found season ${result.value.season}: ${result.value.league.name}`)
        }
      }
    }
    
    // Sort by season descending (most recent first)
    seasons.sort((a, b) => b.season - a.season)
    
    console.log(`[ESPN] Discovery complete: found ${seasons.length} seasons`)
    return seasons
  }

  /**
   * Quick discovery - just validate league exists and get current + recent seasons
   * Use this for fast initial add, then call discoverAllSeasons in background
   */
  async quickDiscoverLeague(leagueId: string | number): Promise<{
    sport: Sport
    leagueId: string
    name: string
    isPublic: boolean
    seasons: Array<{
      season: number
      league: EspnLeague
    }>
  } | null> {
    // First detect the sport
    const detected = await this.detectLeagueSport(leagueId)
    if (!detected) {
      return null
    }
    
    const { sport, league } = detected
    const currentYear = new Date().getFullYear()
    
    // If private and we don't have credentials, return minimal info
    if (!league.isPublic && !this.hasCredentials()) {
      return {
        sport,
        leagueId: String(leagueId),
        name: league.name,
        isPublic: false,
        seasons: [{
          season: league.seasonId || currentYear,
          league
        }]
      }
    }
    
    // Quick check: just get last 3 years in parallel (fast!)
    const recentYears = [currentYear, currentYear - 1, currentYear - 2]
    const results = await Promise.allSettled(
      recentYears.map(async (year) => {
        try {
          const l = await this.getLeague(sport, leagueId, year)
          return l ? { season: year, league: l } : null
        } catch {
          return null
        }
      })
    )
    
    const seasons: Array<{ season: number; league: EspnLeague }> = []
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        seasons.push(result.value)
      }
    }
    
    // Sort by season descending
    seasons.sort((a, b) => b.season - a.season)
    
    // Use most recent season's name
    const name = seasons.length > 0 ? seasons[0].league.name : league.name
    
    return {
      sport,
      leagueId: String(leagueId),
      name,
      isPublic: league.isPublic,
      seasons
    }
  }

  /**
   * Quick discovery - just validate league exists and get basic info
   * This is FAST - only 1 API call per sport until we find it
   */
  async discoverLeague(leagueId: string | number): Promise<{
    sport: Sport
    leagueId: string
    name: string
    isPublic: boolean
    size: number
    currentSeason: number
  } | null> {
    // Just detect the sport and get current season info
    const detected = await this.detectLeagueSport(leagueId)
    if (!detected) {
      return null
    }
    
    const { sport, league } = detected
    
    return {
      sport,
      leagueId: String(leagueId),
      name: league.name,
      isPublic: league.isPublic,
      size: league.size || 0,
      currentSeason: league.seasonId || new Date().getFullYear()
    }
  }

  /**
   * Full history discovery - call this when loading a league for viewing
   * This runs while the loading spinner is shown
   */
  async discoverFullHistory(sport: Sport, leagueId: string | number): Promise<Array<{
    season: number
    league: EspnLeague
  }>> {
    console.log(`[ESPN] Loading full history for league ${leagueId}...`)
    return this.discoverAllSeasons(sport, leagueId)
  }

  // ============================================================
  // Member/Owner Methods
  // ============================================================

  /**
   * Get league members
   */
  async getMembers(sport: Sport, leagueId: string | number, season: number): Promise<EspnMember[]> {
    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.SETTINGS])
      
      const members: EspnMember[] = (data.members || []).map((m: any) => ({
        id: m.id,
        displayName: m.displayName || 'Unknown',
        firstName: m.firstName || '',
        lastName: m.lastName || '',
        isLeagueManager: m.isLeagueManager || false
      }))
      
      return members
    } catch (error) {
      console.error('Error fetching ESPN members:', error)
      return []
    }
  }

  // ============================================================
  // Parse Methods (Transform ESPN response to our types)
  // ============================================================

  private parseLeague(data: any, sport: Sport): EspnLeague {
    const settings = data.settings || {}
    const status = data.status || {}
    
    return {
      id: data.id,
      seasonId: data.seasonId,
      scoringPeriodId: data.scoringPeriodId,
      segmentId: data.segmentId || 0,
      name: settings.name || `League ${data.id}`,
      size: settings.size || data.teams?.length || 0,
      isPublic: settings.isPublic ?? true,
      scoringType: this.mapScoringType(settings.scoringSettings?.scoringType),
      currentMatchupPeriod: status.currentMatchupPeriod || 1,
      status: {
        currentMatchupPeriod: status.currentMatchupPeriod || 1,
        isActive: status.isActive ?? true,
        latestScoringPeriod: status.latestScoringPeriod || 1,
        finalScoringPeriod: status.finalScoringPeriod || 17,
        firstScoringPeriod: status.firstScoringPeriod || 1
      },
      settings: {
        name: settings.name,
        playoffMatchupPeriodLength: settings.scheduleSettings?.playoffMatchupPeriodLength || 1,
        playoffSeedingRule: settings.scheduleSettings?.playoffSeedingRule || 'TOTAL_POINTS_SCORED',
        playoffTeamCount: settings.scheduleSettings?.playoffTeamCount || 6,
        regularSeasonMatchupPeriodCount: settings.scheduleSettings?.matchupPeriodCount || 14,
        rosterSettings: settings.rosterSettings,
        scheduleSettings: settings.scheduleSettings,
        scoringSettings: settings.scoringSettings,
        tradeSettings: settings.tradeSettings
      }
    }
  }

  private parseTeams(data: any): EspnTeam[] {
    const teams = data.teams || []
    const members = data.members || []
    
    // Create member lookup
    const memberMap = new Map<string, any>()
    members.forEach((m: any) => memberMap.set(m.id, m))
    
    console.log('[ESPN parseTeams] Raw teams count:', teams.length)
    console.log('[ESPN parseTeams] Raw members count:', members.length)
    
    // Log first raw team to see structure
    if (teams.length > 0) {
      console.log('[ESPN parseTeams] FIRST RAW TEAM:', JSON.stringify(teams[0]))
    }
    
    return teams.map((team: any) => {
      const record = team.record?.overall || {}
      
      // Debug: log record data for each team
      console.log(`[ESPN Team ${team.id}] record:`, team.record)
      console.log(`[ESPN Team ${team.id}] record.overall:`, record)
      console.log(`[ESPN Team ${team.id}] wins=${record.wins}, losses=${record.losses}, pointsFor=${record.pointsFor}, points=${team.points}`)
      
      // Debug: log all available name-related fields
      console.log(`[ESPN Team ${team.id}] Raw data:`, {
        name: team.name,
        location: team.location,
        nickname: team.nickname,
        abbrev: team.abbrev,
        primaryOwner: team.primaryOwner,
        owners: team.owners
      })
      
      // Get team name - ESPN uses different fields for different sports
      // Try multiple approaches to get the team name
      let teamName = ''
      
      // Approach 1: Use 'name' field directly (some ESPN sports use this)
      if (team.name && team.name !== 'undefined' && team.name.trim()) {
        teamName = team.name.trim()
      }
      
      // Approach 2: Combine location + nickname (common for football)
      if (!teamName && (team.location || team.nickname)) {
        const combined = `${team.location || ''} ${team.nickname || ''}`.trim()
        if (combined && combined !== 'undefined undefined') {
          teamName = combined
        }
      }
      
      // Approach 3: Use abbreviation as fallback
      if (!teamName && team.abbrev && team.abbrev !== `T${team.id}`) {
        teamName = team.abbrev
      }
      
      // Approach 4: Use owner's display name
      let ownerName = ''
      const ownerId = team.primaryOwner || team.owners?.[0]
      if (ownerId) {
        const owner = memberMap.get(ownerId)
        if (owner?.displayName) {
          ownerName = owner.displayName
          if (!teamName) {
            teamName = `${owner.displayName}'s Team`
          }
        }
      }
      
      // Final fallback
      if (!teamName) {
        teamName = `Team ${team.id}`
      }
      
      console.log(`[ESPN Team ${team.id}] Final name: "${teamName}", owner: "${ownerName}"`)
      
      return {
        id: team.id,
        abbrev: team.abbrev || `T${team.id}`,
        name: teamName,
        location: team.location || '',
        nickname: team.nickname || '',
        logo: team.logo || '',
        owners: team.owners || [],
        primaryOwner: team.primaryOwner || team.owners?.[0] || '',
        ownerName: ownerName, // Add owner display name
        points: team.points || 0,
        pointsFor: team.record?.overall?.pointsFor || record.pointsFor || 0,
        pointsAgainst: team.record?.overall?.pointsAgainst || record.pointsAgainst || 0,
        wins: record.wins || 0,
        losses: record.losses || 0,
        ties: record.ties || 0,
        rank: team.playoffSeed || team.rankCalculatedFinal || 0,
        playoffSeed: team.playoffSeed || 0,
        divisionId: team.divisionId || 0,
        record: team.record ? {
          overall: team.record.overall,
          home: team.record.home,
          away: team.record.away,
          division: team.record.division
        } : undefined
      }
    })
  }

  private parseTeamsWithRosters(data: any, sport?: Sport): EspnTeam[] {
    const teams = this.parseTeams(data)
    const rawTeams = data.teams || []
    
    // Add roster data
    teams.forEach((team, index) => {
      const rawTeam = rawTeams[index]
      if (rawTeam?.roster?.entries) {
        team.roster = rawTeam.roster.entries.map((entry: any) => this.parsePlayer(entry, sport))
      }
    })
    
    return teams
  }

  private parsePlayer(entry: any, sport?: Sport): EspnPlayer {
    const playerPoolEntry = entry.playerPoolEntry || {}
    const player = playerPoolEntry.player || {}
    const stats = player.stats || []
    
    // Find current week stats
    const currentStats = stats.find((s: any) => s.statSourceId === 0) || {}
    const projectedStats = stats.find((s: any) => s.statSourceId === 1) || {}
    
    // Get correct team mapping based on sport
    const teamMapping = sport === 'baseball' ? MLB_TEAMS : PRO_TEAMS
    
    return {
      id: entry.playerId,
      playerId: entry.playerId,
      fullName: player.fullName || 'Unknown',
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      proTeam: teamMapping[player.proTeamId] || `Team${player.proTeamId}`,
      proTeamId: player.proTeamId || 0,
      position: this.getPositionName(player.defaultPositionId, sport),
      positionId: player.defaultPositionId || 0,
      lineupSlotId: entry.lineupSlotId,
      lineupSlot: LINEUP_SLOTS[entry.lineupSlotId] || 'Unknown',
      injuryStatus: player.injuryStatus || 'ACTIVE',
      projectedPoints: projectedStats.appliedTotal || 0,
      actualPoints: currentStats.appliedTotal || 0,
      percentOwned: playerPoolEntry.player?.ownership?.percentOwned || 0,
      percentStarted: playerPoolEntry.player?.ownership?.percentStarted || 0,
      stats: this.flattenStats(currentStats.stats || {})
    }
  }

  private parseMatchups(data: any, week: number): EspnMatchup[] {
    const schedule = data.schedule || []
    console.log('[ESPN parseMatchups] Raw schedule length:', schedule.length, 'for week:', week)
    
    if (schedule.length > 0) {
      console.log('[ESPN parseMatchups] First schedule item:', JSON.stringify(schedule[0]))
      console.log('[ESPN parseMatchups] matchupPeriodIds in data:', [...new Set(schedule.map((m: any) => m.matchupPeriodId))])
    }
    
    const teams = this.parseTeams(data)
    const teamMap = new Map(teams.map(t => [t.id, t]))
    
    const filteredSchedule = schedule.filter((match: any) => match.matchupPeriodId === week)
    console.log('[ESPN parseMatchups] Filtered to', filteredSchedule.length, 'matchups for week', week)
    
    // Deduplicate matchups by ID (ESPN sometimes returns duplicates)
    const seenIds = new Set<number>()
    const uniqueMatchups = filteredSchedule.filter((match: any) => {
      if (seenIds.has(match.id)) {
        return false
      }
      seenIds.add(match.id)
      return true
    })
    console.log('[ESPN parseMatchups] After dedup:', uniqueMatchups.length, 'unique matchups')
    
    return uniqueMatchups
      .map((match: any) => ({
        id: match.id,
        matchupPeriodId: match.matchupPeriodId,
        homeTeamId: match.home?.teamId || 0,
        awayTeamId: match.away?.teamId || 0,
        homeTeam: teamMap.get(match.home?.teamId),
        awayTeam: teamMap.get(match.away?.teamId),
        homeScore: match.home?.totalPoints || 0,
        awayScore: match.away?.totalPoints || 0,
        winner: this.determineWinner(match),
        playoffTierType: match.playoffTierType || 'NONE'
      }))
  }

  private parseDraft(data: any, sport?: string): EspnDraftPick[] {
    const draftDetail = data.draftDetail || {}
    const picks = draftDetail.picks || []
    
    // Log first pick to see structure
    if (picks.length > 0) {
      console.log('[ESPN parseDraft] First raw pick:', JSON.stringify(picks[0]))
    }
    
    return picks.map((pick: any) => {
      // Try to get position from player info if available
      let position = 'Unknown'
      let positionId = 0
      
      // Some ESPN responses include player info directly
      if (pick.player) {
        positionId = pick.player.defaultPositionId || 0
        position = this.getPositionName(positionId, sport)
      } else if (pick.defaultPositionId) {
        positionId = pick.defaultPositionId
        position = this.getPositionName(positionId, sport)
      }
      
      return {
        id: pick.id,
        roundId: pick.roundId,
        roundPickNumber: pick.roundPickNumber,
        overallPickNumber: pick.overallPickNumber,
        playerId: pick.playerId,
        playerName: pick.playerName || `Player ${pick.playerId}`,
        position,
        positionId,
        teamId: pick.teamId,
        keeper: pick.keeper || false,
        bidAmount: pick.bidAmount
      }
    })
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private mapScoringType(type: string): EspnLeague['scoringType'] {
    switch (type) {
      case 'H2H_POINTS':
        return 'H2H_POINTS'
      case 'H2H_CATEGORY':
        return 'H2H_CATEGORY'
      case 'ROTO':
        return 'ROTO'
      case 'TOTAL_POINTS':
        return 'TOTAL_POINTS'
      default:
        return 'H2H_POINTS'
    }
  }

  private getPositionName(positionId: number, sport?: string): string {
    // Football positions
    const footballPositions: Record<number, string> = {
      1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K',
      6: 'P', 7: 'HC', 8: 'DT', 9: 'DE', 10: 'LB',
      11: 'CB', 12: 'S', 13: 'DB', 14: 'DP', 15: 'DL',
      16: 'D/ST', 17: 'K', 18: 'P', 19: 'HC'
    }
    
    // Baseball positions
    const baseballPositions: Record<number, string> = {
      1: 'SP', 2: 'C', 3: '1B', 4: '2B', 5: '3B',
      6: 'SS', 7: 'LF', 8: 'CF', 9: 'RF', 10: 'DH',
      11: 'RP', 12: 'P', 13: 'OF', 14: 'UTIL'
    }
    
    // Basketball positions
    const basketballPositions: Record<number, string> = {
      1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C',
      6: 'G', 7: 'F', 8: 'SG/SF', 9: 'G/F', 10: 'PF/C',
      11: 'F/C', 12: 'UTIL'
    }
    
    // Hockey positions
    const hockeyPositions: Record<number, string> = {
      1: 'C', 2: 'LW', 3: 'RW', 4: 'D', 5: 'G',
      6: 'F', 7: 'UTIL'
    }
    
    // Return based on sport context or try all
    if (sport === 'baseball' || sport === 'flb') {
      return baseballPositions[positionId] || 'Unknown'
    } else if (sport === 'basketball' || sport === 'fba') {
      return basketballPositions[positionId] || 'Unknown'
    } else if (sport === 'hockey' || sport === 'fhl') {
      return hockeyPositions[positionId] || 'Unknown'
    } else if (sport === 'football' || sport === 'ffl') {
      return footballPositions[positionId] || 'Unknown'
    }
    
    // Try to match from any sport if no sport specified
    return footballPositions[positionId] || baseballPositions[positionId] || 'Unknown'
  }

  private determineWinner(match: any): EspnMatchup['winner'] {
    const homeScore = match.home?.totalPoints || 0
    const awayScore = match.away?.totalPoints || 0
    
    if (homeScore === 0 && awayScore === 0) return 'UNDECIDED'
    if (homeScore > awayScore) return 'HOME'
    if (awayScore > homeScore) return 'AWAY'
    return 'TIE'
  }

  private flattenStats(stats: Record<string, number>): Record<string, number> {
    // ESPN returns stats as { "0": 123, "1": 456 } where keys are stat IDs
    // We keep them as-is for now, can map to names if needed
    return stats
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Get the current NFL season year
   */
  getCurrentSeason(sport: Sport = 'football'): number {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed
    
    // Different sports have different season start months
    const seasonStartMonth: Record<Sport, number> = {
      football: 8,   // September
      baseball: 2,   // March
      basketball: 9, // October
      hockey: 9      // October
    }
    
    return month < seasonStartMonth[sport] ? year - 1 : year
  }

  /**
   * Get avatar/logo URL for a team
   */
  getTeamLogo(team: EspnTeam): string {
    if (team.logo) return team.logo
    // Default ESPN team logo
    return `https://g.espncdn.com/lm-static/ffl/images/default_logos/team_${team.id % 25}.svg`
  }

  /**
   * Clear all ESPN-related caches for a specific league
   */
  clearLeagueCache(leagueId: string | number, sport: Sport, season: number): void {
    const prefix = `espn_${sport}_${leagueId}_${season}`
    console.log(`Clearing cache for ESPN league: ${prefix}`)
    // Clear various cache keys
    cache.clear('espn_league', `espn_league_${sport}_${leagueId}_${season}`)
    cache.clear('espn_teams', `espn_teams_${sport}_${leagueId}_${season}`)
    cache.clear('espn_draft', `espn_draft_${sport}_${leagueId}_${season}`)
    cache.clear('espn_scoring', `espn_scoring_${sport}_${leagueId}_${season}`)
    // Clear matchups for all weeks
    for (let week = 1; week <= 25; week++) {
      cache.clear('espn_matchups', `espn_matchups_${sport}_${leagueId}_${season}_${week}`)
    }
  }
}

// Export singleton instance
export const espnService = new EspnFantasyService()
