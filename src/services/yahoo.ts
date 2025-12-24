/**
 * Yahoo Fantasy API Service
 * 
 * Handles all interactions with Yahoo Fantasy Sports API.
 * Supports Football, Baseball, Basketball, and Hockey.
 */

import { supabase } from '@/lib/supabase'
import type { Sport } from '@/types/supabase'

const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

// Yahoo sport keys
const SPORT_KEYS: Record<Sport, string> = {
  football: 'nfl',
  baseball: 'mlb',
  basketball: 'nba',
  hockey: 'nhl'
}

// Current season game keys (these change each year)
// Format: {sport_code}.l.{league_id}
const GAME_KEYS_2024: Record<Sport, string> = {
  football: '449',  // NFL 2024
  baseball: '450',  // MLB 2024 (approximate - verify)
  basketball: '451', // NBA 2024-25 (approximate - verify)
  hockey: '452'     // NHL 2024-25 (approximate - verify)
}

interface YahooApiResponse {
  fantasy_content: any
}

interface YahooLeague {
  league_key: string
  league_id: string
  name: string
  season: string
  num_teams: number
  scoring_type: string
  league_type: string
  current_week: number
  start_week: number
  end_week: number
  is_finished: boolean
}

interface YahooTeam {
  team_key: string
  team_id: string
  name: string
  managers: { manager: { nickname: string; guid: string } }[]
  roster?: YahooPlayer[]
}

interface YahooPlayer {
  player_key: string
  player_id: string
  name: { full: string; first: string; last: string }
  team_abbr: string
  position: string
  status: string
}

interface YahooMatchup {
  week: number
  teams: YahooTeam[]
  is_playoffs: boolean
  is_consolation: boolean
}

export class YahooFantasyService {
  private accessToken: string | null = null
  private userId: string | null = null

  constructor() {}

  /**
   * Initialize the service with user's access token
   */
  async initialize(userId: string): Promise<boolean> {
    this.userId = userId
    
    if (!supabase) {
      console.error('Supabase not configured')
      return false
    }

    // Get Yahoo tokens from database
    const { data, error } = await supabase
      .from('connected_platforms')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'yahoo')
      .single()

    if (error || !data) {
      console.error('Yahoo not connected:', error)
      return false
    }

    // Check if token is expired
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
      // Token expired, try to refresh
      const refreshed = await this.refreshToken(data.refresh_token)
      if (!refreshed) {
        console.error('Failed to refresh Yahoo token')
        return false
      }
    } else {
      this.accessToken = data.access_token
    }

    return true
  }

  /**
   * Refresh the access token
   */
  private async refreshToken(refreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        }
      )

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const tokens = await response.json()
      this.accessToken = tokens.access_token

      // Update tokens in database
      if (supabase && this.userId) {
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        
        await supabase
          .from('connected_platforms')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt
          })
          .eq('user_id', this.userId)
          .eq('platform', 'yahoo')
      }

      return true
    } catch (error) {
      console.error('Error refreshing Yahoo token:', error)
      return false
    }
  }

  /**
   * Make an authenticated request to Yahoo Fantasy API
   */
  private async apiRequest(endpoint: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Yahoo not authenticated')
    }

    const url = `${YAHOO_API_BASE}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (response.status === 401) {
      // Token might have expired mid-session, try to get fresh token
      throw new Error('Yahoo authentication expired')
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Yahoo API error:', response.status, errorText)
      throw new Error(`Yahoo API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all leagues for the current user
   */
  async getLeagues(sport: Sport): Promise<YahooLeague[]> {
    const gameKey = GAME_KEYS_2024[sport]
    
    try {
      // Get user's leagues for this game/sport
      const data = await this.apiRequest(
        `/users;use_login=1/games;game_keys=${gameKey}/leagues?format=json`
      )

      const leagues: YahooLeague[] = []
      
      // Parse the nested Yahoo response structure
      const fantasyContent = data.fantasy_content
      if (!fantasyContent?.users?.[0]?.user?.[1]?.games) {
        return leagues
      }

      const games = fantasyContent.users[0].user[1].games
      
      // Find the game matching our sport
      for (const game of Object.values(games) as any[]) {
        if (typeof game !== 'object' || !game.game) continue
        
        const gameData = game.game[0]
        if (gameData.game_key !== gameKey) continue
        
        const leaguesData = game.game[1]?.leagues
        if (!leaguesData) continue

        for (const leagueWrapper of Object.values(leaguesData) as any[]) {
          if (typeof leagueWrapper !== 'object' || !leagueWrapper.league) continue
          
          const league = leagueWrapper.league[0]
          leagues.push({
            league_key: league.league_key,
            league_id: league.league_id,
            name: league.name,
            season: league.season,
            num_teams: parseInt(league.num_teams),
            scoring_type: league.scoring_type,
            league_type: league.league_type,
            current_week: parseInt(league.current_week || '1'),
            start_week: parseInt(league.start_week || '1'),
            end_week: parseInt(league.end_week || '17'),
            is_finished: league.is_finished === '1'
          })
        }
      }

      return leagues
    } catch (error) {
      console.error('Error fetching Yahoo leagues:', error)
      throw error
    }
  }

  /**
   * Get league details including settings
   */
  async getLeagueDetails(leagueKey: string): Promise<any> {
    const data = await this.apiRequest(
      `/league/${leagueKey};out=settings,standings,scoreboard?format=json`
    )
    
    return data.fantasy_content?.league
  }

  /**
   * Get all teams in a league
   */
  async getTeams(leagueKey: string): Promise<YahooTeam[]> {
    const data = await this.apiRequest(
      `/league/${leagueKey}/teams?format=json`
    )

    const teams: YahooTeam[] = []
    const teamsData = data.fantasy_content?.league?.[1]?.teams

    if (!teamsData) return teams

    for (const teamWrapper of Object.values(teamsData) as any[]) {
      if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
      
      const teamInfo = teamWrapper.team[0]
      teams.push({
        team_key: teamInfo[0]?.team_key,
        team_id: teamInfo[1]?.team_id,
        name: teamInfo[2]?.name,
        managers: teamInfo[19]?.managers || []
      })
    }

    return teams
  }

  /**
   * Get user's team in a specific league
   */
  async getMyTeam(leagueKey: string): Promise<YahooTeam | null> {
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/teams;team_keys=${leagueKey}.t.me?format=json`
      )
      
      const teamData = data.fantasy_content?.league?.[1]?.teams?.[0]?.team
      if (!teamData) return null

      const teamInfo = teamData[0]
      return {
        team_key: teamInfo[0]?.team_key,
        team_id: teamInfo[1]?.team_id,
        name: teamInfo[2]?.name,
        managers: teamInfo[19]?.managers || []
      }
    } catch (error) {
      console.error('Error fetching my team:', error)
      return null
    }
  }

  /**
   * Get roster for a team
   */
  async getRoster(teamKey: string): Promise<YahooPlayer[]> {
    const data = await this.apiRequest(
      `/team/${teamKey}/roster?format=json`
    )

    const players: YahooPlayer[] = []
    const rosterData = data.fantasy_content?.team?.[1]?.roster?.[0]?.players

    if (!rosterData) return players

    for (const playerWrapper of Object.values(rosterData) as any[]) {
      if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
      
      const playerInfo = playerWrapper.player[0]
      players.push({
        player_key: playerInfo[0]?.player_key,
        player_id: playerInfo[1]?.player_id,
        name: {
          full: playerInfo[2]?.name?.full,
          first: playerInfo[2]?.name?.first,
          last: playerInfo[2]?.name?.last
        },
        team_abbr: playerInfo[6]?.editorial_team_abbr,
        position: playerInfo[9]?.display_position,
        status: playerInfo[10]?.status || ''
      })
    }

    return players
  }

  /**
   * Get league standings
   */
  async getStandings(leagueKey: string): Promise<any[]> {
    const data = await this.apiRequest(
      `/league/${leagueKey}/standings?format=json`
    )

    const standings: any[] = []
    const teamsData = data.fantasy_content?.league?.[1]?.standings?.[0]?.teams

    if (!teamsData) return standings

    for (const teamWrapper of Object.values(teamsData) as any[]) {
      if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
      
      const teamInfo = teamWrapper.team[0]
      const teamStandings = teamWrapper.team[1]?.team_standings
      
      standings.push({
        team_key: teamInfo[0]?.team_key,
        team_id: teamInfo[1]?.team_id,
        name: teamInfo[2]?.name,
        rank: parseInt(teamStandings?.rank || '0'),
        wins: parseInt(teamStandings?.outcome_totals?.wins || '0'),
        losses: parseInt(teamStandings?.outcome_totals?.losses || '0'),
        ties: parseInt(teamStandings?.outcome_totals?.ties || '0'),
        points_for: parseFloat(teamStandings?.points_for || '0'),
        points_against: parseFloat(teamStandings?.points_against || '0')
      })
    }

    return standings.sort((a, b) => a.rank - b.rank)
  }

  /**
   * Get matchups for a specific week
   */
  async getMatchups(leagueKey: string, week: number): Promise<YahooMatchup[]> {
    const data = await this.apiRequest(
      `/league/${leagueKey}/scoreboard;week=${week}?format=json`
    )

    const matchups: YahooMatchup[] = []
    const scoreboardData = data.fantasy_content?.league?.[1]?.scoreboard?.[0]?.matchups

    if (!scoreboardData) return matchups

    for (const matchupWrapper of Object.values(scoreboardData) as any[]) {
      if (typeof matchupWrapper !== 'object' || !matchupWrapper.matchup) continue
      
      const matchupInfo = matchupWrapper.matchup
      const teams = matchupInfo[0]?.teams || []
      
      const parsedTeams: YahooTeam[] = []
      for (const teamWrapper of Object.values(teams) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamInfo = teamWrapper.team[0]
        const teamPoints = teamWrapper.team[1]?.team_points
        
        parsedTeams.push({
          team_key: teamInfo[0]?.team_key,
          team_id: teamInfo[1]?.team_id,
          name: teamInfo[2]?.name,
          managers: [],
          points: parseFloat(teamPoints?.total || '0')
        } as any)
      }

      matchups.push({
        week,
        teams: parsedTeams,
        is_playoffs: matchupInfo.is_playoffs === '1',
        is_consolation: matchupInfo.is_consolation === '1'
      })
    }

    return matchups
  }

  /**
   * Get player stats/projections
   */
  async getPlayerStats(leagueKey: string, playerKeys: string[], week?: number): Promise<any[]> {
    const weekParam = week ? `;type=week;week=${week}` : ''
    const data = await this.apiRequest(
      `/league/${leagueKey}/players;player_keys=${playerKeys.join(',')}/stats${weekParam}?format=json`
    )

    const players: any[] = []
    const playersData = data.fantasy_content?.league?.[1]?.players

    if (!playersData) return players

    for (const playerWrapper of Object.values(playersData) as any[]) {
      if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
      
      const playerInfo = playerWrapper.player[0]
      const playerStats = playerWrapper.player[1]?.player_stats
      
      players.push({
        player_key: playerInfo[0]?.player_key,
        player_id: playerInfo[1]?.player_id,
        name: playerInfo[2]?.name?.full,
        stats: playerStats?.stats || [],
        total_points: parseFloat(playerStats?.total || '0')
      })
    }

    return players
  }
}

// Export singleton instance
export const yahooService = new YahooFantasyService()
