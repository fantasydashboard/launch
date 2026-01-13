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

// Pro team IDs to abbreviations
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
    // Get access token from localStorage (Supabase getSession can hang)
    let accessToken: string | null = null
    
    try {
      const storageKey = 'sb-ergxtydfgffqgkddclvr-auth-token'
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        accessToken = parsed?.access_token
      }
    } catch (e) {
      console.error('[ESPN] Failed to get session from localStorage:', e)
    }
    
    if (!accessToken) {
      throw new Error('Not authenticated - no session found')
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

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

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
   * Get teams with full rosters
   */
  async getTeamsWithRosters(sport: Sport, leagueId: string | number, season: number, week?: number): Promise<EspnTeam[]> {
    try {
      const views = [ESPN_VIEWS.TEAM, ESPN_VIEWS.ROSTER]
      const data = await this.apiRequest(sport, leagueId, season, views, week)
      
      return this.parseTeamsWithRosters(data)
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
    const cacheKey = `espn_draft_${sport}_${leagueId}_${season}`
    const cached = cache.get<EspnDraftPick[]>('espn_draft', cacheKey)
    if (cached) {
      console.log(`[Cache HIT] ESPN draft for ${leagueId}`)
      return cached
    }

    try {
      const data = await this.apiRequest(sport, leagueId, season, [ESPN_VIEWS.DRAFT_DETAIL])
      
      const picks = this.parseDraft(data)
      
      // Draft data is permanent
      cache.set('espn_draft', picks, CACHE_TTL.PERMANENT, cacheKey)
      
      return picks
    } catch (error) {
      console.error('Error fetching ESPN draft:', error)
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
    const targetSeason = season || this.getCurrentSeason('football')
    const sports: Sport[] = ['football', 'baseball', 'basketball', 'hockey']
    
    for (const sport of sports) {
      try {
        console.log(`[ESPN] Trying ${sport} for league ${leagueId}...`)
        const league = await this.getLeague(sport, leagueId, targetSeason)
        if (league) {
          console.log(`[ESPN] Found league as ${sport}: ${league.name}`)
          return { sport, league }
        }
      } catch (error: any) {
        // 404 means wrong sport, keep trying
        // 403 means private league in that sport - could be correct sport
        if (error.message?.includes('403') || error.message?.includes('private')) {
          console.log(`[ESPN] League ${leagueId} exists as ${sport} but is private`)
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
            }
          }
        }
        // Otherwise keep trying other sports
        console.log(`[ESPN] ${sport} not found for league ${leagueId}`)
      }
    }
    
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
    
    return teams.map((team: any) => {
      const record = team.record?.overall || {}
      
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
      if (!teamName) {
        const ownerId = team.primaryOwner || team.owners?.[0]
        if (ownerId) {
          const owner = memberMap.get(ownerId)
          if (owner?.displayName) {
            teamName = `${owner.displayName}'s Team`
          }
        }
      }
      
      // Final fallback
      if (!teamName) {
        teamName = `Team ${team.id}`
      }
      
      console.log(`[ESPN Team ${team.id}] Final name: "${teamName}"`)
      
      return {
        id: team.id,
        abbrev: team.abbrev || `T${team.id}`,
        name: teamName,
        location: team.location || '',
        nickname: team.nickname || '',
        logo: team.logo || '',
        owners: team.owners || [],
        primaryOwner: team.primaryOwner || team.owners?.[0] || '',
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

  private parseTeamsWithRosters(data: any): EspnTeam[] {
    const teams = this.parseTeams(data)
    const rawTeams = data.teams || []
    
    // Add roster data
    teams.forEach((team, index) => {
      const rawTeam = rawTeams[index]
      if (rawTeam?.roster?.entries) {
        team.roster = rawTeam.roster.entries.map((entry: any) => this.parsePlayer(entry))
      }
    })
    
    return teams
  }

  private parsePlayer(entry: any): EspnPlayer {
    const playerPoolEntry = entry.playerPoolEntry || {}
    const player = playerPoolEntry.player || {}
    const stats = player.stats || []
    
    // Find current week stats
    const currentStats = stats.find((s: any) => s.statSourceId === 0) || {}
    const projectedStats = stats.find((s: any) => s.statSourceId === 1) || {}
    
    return {
      id: entry.playerId,
      playerId: entry.playerId,
      fullName: player.fullName || 'Unknown',
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      proTeam: PRO_TEAMS[player.proTeamId] || 'FA',
      proTeamId: player.proTeamId || 0,
      position: this.getPositionName(player.defaultPositionId),
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
    
    return filteredSchedule
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

  private parseDraft(data: any): EspnDraftPick[] {
    const draftDetail = data.draftDetail || {}
    const picks = draftDetail.picks || []
    
    return picks.map((pick: any) => ({
      id: pick.id,
      roundId: pick.roundId,
      roundPickNumber: pick.roundPickNumber,
      overallPickNumber: pick.overallPickNumber,
      playerId: pick.playerId,
      playerName: pick.playerName || `Player ${pick.playerId}`,
      teamId: pick.teamId,
      keeper: pick.keeper || false,
      bidAmount: pick.bidAmount
    }))
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

  private getPositionName(positionId: number): string {
    const positions: Record<number, string> = {
      1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K',
      6: 'P', 7: 'HC', 8: 'DT', 9: 'DE', 10: 'LB',
      11: 'CB', 12: 'S', 13: 'DB', 14: 'DP', 15: 'DL',
      16: 'D/ST', 17: 'K', 18: 'P', 19: 'HC'
    }
    return positions[positionId] || 'Unknown'
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
