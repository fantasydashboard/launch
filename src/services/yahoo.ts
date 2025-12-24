/**
 * Yahoo Fantasy API Service
 * 
 * Handles all interactions with Yahoo Fantasy Sports API.
 * Supports Football, Baseball, Basketball, and Hockey.
 * 
 * All requests go through the yahoo-api Edge Function proxy
 * to avoid CORS issues.
 */

import { supabase } from '@/lib/supabase'
import type { Sport } from '@/types/supabase'

// Yahoo sport keys
const SPORT_KEYS: Record<Sport, string> = {
  football: 'nfl',
  baseball: 'mlb',
  basketball: 'nba',
  hockey: 'nhl'
}

// Game keys by sport and year
// These change each season - format is typically a 3-digit number
const GAME_KEYS: Record<Sport, Record<number, string>> = {
  football: {
    2024: '449',
    2023: '414',
    2022: '390',
    2021: '371',
    2020: '399'
  },
  baseball: {
    2024: '431',
    2023: '422',
    2022: '412',
    2021: '404',
    2020: '398'
  },
  basketball: {
    2024: '428',  // 2024-25 season
    2023: '418',
    2022: '410',
    2021: '402',
    2020: '395'
  },
  hockey: {
    2024: '427',  // 2024-25 season
    2023: '419',
    2022: '411',
    2021: '403',
    2020: '396'
  }
}

// Get game keys for recent seasons
function getRecentGameKeys(sport: Sport, numYears: number = 3): string[] {
  const sportKeys = GAME_KEYS[sport]
  const currentYear = new Date().getFullYear()
  const keys: string[] = []
  
  for (let year = currentYear; year >= currentYear - numYears + 1; year--) {
    if (sportKeys[year]) {
      keys.push(sportKeys[year])
    }
  }
  
  return keys
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
  points?: number
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
  private userId: string | null = null
  private supabaseUrl: string

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  }

  /**
   * Initialize the service with user ID
   */
  async initialize(userId: string): Promise<boolean> {
    this.userId = userId
    
    if (!supabase) {
      console.error('Supabase not configured')
      return false
    }

    // Verify Yahoo is connected
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

    return true
  }

  /**
   * Make an authenticated request to Yahoo Fantasy API via proxy
   */
  private async apiRequest(endpoint: string): Promise<any> {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get current session for auth header
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }

    const proxyUrl = `${this.supabaseUrl}/functions/v1/yahoo-api`
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ endpoint })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Yahoo API proxy error:', response.status, errorData)
      throw new Error(errorData.error || `Yahoo API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all leagues for the current user across recent seasons
   */
  async getLeagues(sport: Sport): Promise<YahooLeague[]> {
    const gameKeys = getRecentGameKeys(sport, 5) // Get last 5 years
    
    try {
      // Get user's leagues for all recent game keys
      const allGameKeys = gameKeys.join(',')
      const data = await this.apiRequest(
        `/users;use_login=1/games;game_keys=${allGameKeys}/leagues?format=json`
      )

      const leagues: YahooLeague[] = []
      
      // Parse the nested Yahoo response structure
      const fantasyContent = data.fantasy_content
      if (!fantasyContent?.users?.[0]?.user?.[1]?.games) {
        console.log('No games found in response')
        return leagues
      }

      const games = fantasyContent.users[0].user[1].games
      
      // Iterate through all games (seasons)
      for (const game of Object.values(games) as any[]) {
        if (typeof game !== 'object' || !game.game) continue
        
        const gameData = game.game[0]
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

      // Sort by season (newest first)
      leagues.sort((a, b) => parseInt(b.season) - parseInt(a.season))

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
        })
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
}

// Export singleton instance
export const yahooService = new YahooFantasyService()
