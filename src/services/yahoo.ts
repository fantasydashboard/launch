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
// Keys are confirmed from Yahoo's API - new seasons get new keys
const GAME_KEYS: Record<Sport, Record<number, string>> = {
  football: {
    // NFL seasons (September - February)
    2025: '449',  // NFL 2025 (current season - playoffs starting)
    2024: '423',  
    2023: '414',
    2022: '390',
    2021: '371',
    2020: '399',
    2019: '380',
    2018: '359',
    2017: '348',
    2016: '331',
    2015: '314',
    2014: '299',
    2013: '273',
    2012: '257',
    2011: '242',
    2010: '222'
  },
  baseball: {
    // MLB seasons (March - October)
    2025: '431',  // MLB 2025 (season ended in October)
    2024: '422',
    2023: '412',
    2022: '404',
    2021: '398',
    2020: '388',
    2019: '378',
    2018: '370',
    2017: '357',
    2016: '346',
    2015: '328',
    2014: '308',
    2013: '283',
    2012: '268',
    2011: '253',
    2010: '238'
  },
  basketball: {
    // NBA seasons (October - June, spans 2 years)
    2025: '445',  // 2025-26 season (current)
    2024: '428',  // 2024-25 season
    2023: '418',
    2022: '410',
    2021: '402',
    2020: '395',
    2019: '385',
    2018: '375',
    2017: '364',
    2016: '353',
    2015: '340',
    2014: '322',
    2013: '304',
    2012: '282',
    2011: '265',
    2010: '249'
  },
  hockey: {
    // NHL seasons (October - June, spans 2 years)
    2025: '444',  // 2025-26 season (current)
    2024: '427',  // 2024-25 season
    2023: '419',
    2022: '411',
    2021: '403',
    2020: '396',
    2019: '386',
    2018: '376',
    2017: '365',
    2016: '354',
    2015: '341',
    2014: '321',
    2013: '303',
    2012: '281',
    2011: '263',
    2010: '248'
  }
}

// Get game keys for recent seasons
function getRecentGameKeys(sport: Sport, numYears: number = 16): string[] {
  const sportKeys = GAME_KEYS[sport]
  const currentYear = new Date().getFullYear()
  const keys: string[] = []
  
  // Start from current year and go back
  for (let year = currentYear; year >= currentYear - numYears; year--) {
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
  managers: { manager: { nickname: string; guid: string; is_current_login?: boolean } }[]
  roster?: YahooPlayer[]
  points?: number
  logo_url?: string
  wins?: number
  losses?: number
  ties?: number
  points_for?: number
  points_against?: number
  rank?: number
  projected_points?: number
  is_my_team?: boolean
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
  matchup_id: number
  teams: YahooTeam[]
  is_playoffs: boolean
  is_consolation: boolean
  winner_team_key?: string
  is_tied?: boolean
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
    const gameKeys = getRecentGameKeys(sport, 6) // Get last 6 years
    
    if (gameKeys.length === 0) {
      console.log('No game keys available for sport:', sport)
      return []
    }
    
    try {
      // Get user's leagues for all recent game keys
      const allGameKeys = gameKeys.join(',')
      console.log(`Fetching Yahoo leagues for ${sport} with game keys:`, allGameKeys)
      
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
   * Get current week and league metadata
   */
  async getLeagueMetadata(leagueKey: string): Promise<{ currentWeek: number; startWeek: number; endWeek: number; isFinished: boolean }> {
    const data = await this.apiRequest(
      `/league/${leagueKey}/metadata?format=json`
    )
    
    const league = data.fantasy_content?.league?.[0]
    
    return {
      currentWeek: parseInt(league?.current_week || '1'),
      startWeek: parseInt(league?.start_week || '1'),
      endWeek: parseInt(league?.end_week || '16'),
      isFinished: league?.is_finished === '1'
    }
  }

  /**
   * Get all teams in a league with full details
   */
  async getTeams(leagueKey: string): Promise<YahooTeam[]> {
    const data = await this.apiRequest(
      `/league/${leagueKey}/teams;out=standings?format=json`
    )

    const teams: YahooTeam[] = []
    const teamsData = data.fantasy_content?.league?.[1]?.teams

    if (!teamsData) return teams

    for (const teamWrapper of Object.values(teamsData) as any[]) {
      if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
      
      const teamInfo = teamWrapper.team[0]
      const teamStandings = teamWrapper.team[1]?.team_standings
      
      // Check if this is the current user's team
      const managers = teamInfo[19]?.managers || teamInfo.managers || []
      const isMyTeam = managers.some((m: any) => m.manager?.is_current_login === '1')
      
      // Get team logo
      let logoUrl = ''
      for (const item of teamInfo) {
        if (item?.team_logos) {
          logoUrl = item.team_logos[0]?.team_logo?.url || ''
          break
        }
      }
      
      teams.push({
        team_key: teamInfo[0]?.team_key,
        team_id: teamInfo[1]?.team_id,
        name: teamInfo[2]?.name,
        logo_url: logoUrl,
        managers: managers,
        is_my_team: isMyTeam,
        wins: parseInt(teamStandings?.outcome_totals?.wins || '0'),
        losses: parseInt(teamStandings?.outcome_totals?.losses || '0'),
        ties: parseInt(teamStandings?.outcome_totals?.ties || '0'),
        points_for: parseFloat(teamStandings?.points_for || '0'),
        points_against: parseFloat(teamStandings?.points_against || '0'),
        rank: parseInt(teamStandings?.rank || '0')
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

    console.log('Raw standings response (full):', JSON.stringify(data, null, 2))

    const standings: any[] = []
    const teamsData = data.fantasy_content?.league?.[1]?.standings?.[0]?.teams

    if (!teamsData) {
      console.log('No teamsData found in standings response')
      return standings
    }

    for (const teamWrapper of Object.values(teamsData) as any[]) {
      if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
      
      const teamArray = teamWrapper.team
      
      // Extract team info from the first element (array of objects)
      let team_key = ''
      let team_id = ''
      let name = ''
      let logo_url = ''
      
      const teamInfoArray = teamArray[0]
      if (Array.isArray(teamInfoArray)) {
        for (const item of teamInfoArray) {
          if (item?.team_key) team_key = item.team_key
          if (item?.team_id) team_id = item.team_id
          if (item?.name) name = item.name
          if (item?.team_logos) logo_url = item.team_logos[0]?.team_logo?.url || ''
        }
      }
      
      // Look for team_standings in ALL elements of teamArray (not just index 1)
      let teamStandings: any = null
      let teamPoints: any = null
      
      for (let i = 1; i < teamArray.length; i++) {
        const element = teamArray[i]
        if (element?.team_standings) {
          teamStandings = element.team_standings
          console.log(`Found team_standings at index ${i} for ${name}:`, JSON.stringify(teamStandings))
        }
        if (element?.team_points) {
          teamPoints = element.team_points
          console.log(`Found team_points at index ${i} for ${name}:`, JSON.stringify(teamPoints))
        }
      }
      
      // If still no team_standings, log what we have
      if (!teamStandings) {
        console.log(`No team_standings found for ${name}. Full teamArray:`, JSON.stringify(teamArray))
      }
      
      // Parse standings data
      const rank = parseInt(teamStandings?.rank || '0')
      const wins = parseInt(teamStandings?.outcome_totals?.wins || '0')
      const losses = parseInt(teamStandings?.outcome_totals?.losses || '0')
      const ties = parseInt(teamStandings?.outcome_totals?.ties || '0')
      const points_for = parseFloat(teamStandings?.points_for || teamPoints?.total || '0')
      const points_against = parseFloat(teamStandings?.points_against || '0')
      
      console.log(`Final parsed ${name}: rank=${rank}, wins=${wins}, losses=${losses}, pf=${points_for}`)
      
      standings.push({
        team_key,
        team_id,
        name,
        logo_url,
        rank,
        wins,
        losses,
        ties,
        points_for,
        points_against
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

    let matchupId = 1
    for (const matchupWrapper of Object.values(scoreboardData) as any[]) {
      if (typeof matchupWrapper !== 'object' || !matchupWrapper.matchup) continue
      
      const matchupInfo = matchupWrapper.matchup
      const teams = matchupInfo[0]?.teams || []
      
      const parsedTeams: YahooTeam[] = []
      for (const teamWrapper of Object.values(teams) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamInfo = teamWrapper.team[0]
        const teamPoints = teamWrapper.team[1]?.team_points
        const teamProjected = teamWrapper.team[1]?.team_projected_points
        
        // Get team logo
        let logoUrl = ''
        for (const item of teamInfo) {
          if (item?.team_logos) {
            logoUrl = item.team_logos[0]?.team_logo?.url || ''
            break
          }
        }
        
        // Check if my team
        const managers = teamInfo[19]?.managers || []
        const isMyTeam = managers.some((m: any) => m.manager?.is_current_login === '1')
        
        parsedTeams.push({
          team_key: teamInfo[0]?.team_key,
          team_id: teamInfo[1]?.team_id,
          name: teamInfo[2]?.name,
          logo_url: logoUrl,
          managers: managers,
          points: parseFloat(teamPoints?.total || '0'),
          projected_points: parseFloat(teamProjected?.total || '0'),
          is_my_team: isMyTeam
        })
      }

      matchups.push({
        week,
        matchup_id: matchupId++,
        teams: parsedTeams,
        is_playoffs: matchupInfo.is_playoffs === '1',
        is_consolation: matchupInfo.is_consolation === '1',
        winner_team_key: matchupInfo.winner_team_key,
        is_tied: matchupInfo.is_tied === '1'
      })
    }

    return matchups
  }

  /**
   * Get league settings including scoring type, divisions, etc.
   */
  async getLeagueSettings(leagueKey: string): Promise<any> {
    const data = await this.apiRequest(
      `/league/${leagueKey}/settings?format=json`
    )
    
    const settings = data.fantasy_content?.league?.[1]?.settings?.[0]
    return settings
  }

  /**
   * Get transactions for a league
   */
  async getTransactions(leagueKey: string): Promise<any[]> {
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/transactions?format=json`
      )
      
      const transactions: any[] = []
      const transData = data.fantasy_content?.league?.[1]?.transactions
      
      if (!transData) return transactions
      
      for (const transWrapper of Object.values(transData) as any[]) {
        if (typeof transWrapper !== 'object' || !transWrapper.transaction) continue
        
        const trans = transWrapper.transaction[0]
        transactions.push({
          transaction_key: trans.transaction_key,
          type: trans.type,
          status: trans.status,
          timestamp: trans.timestamp
        })
      }
      
      return transactions
    } catch (e) {
      console.error('Error fetching transactions:', e)
      return []
    }
  }

  /**
   * Get transaction counts per team
   */
  async getTransactionCounts(leagueKey: string): Promise<Map<string, number>> {
    try {
      // Use the standings endpoint which includes transaction data
      const data = await this.apiRequest(
        `/league/${leagueKey}/standings?format=json`
      )
      
      const counts = new Map<string, number>()
      const teamsData = data.fantasy_content?.league?.[1]?.standings?.[0]?.teams
      
      if (!teamsData) {
        console.log('No teams data found for transactions')
        return counts
      }
      
      for (const teamWrapper of Object.values(teamsData) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamInfo = teamWrapper.team[0]
        const teamKey = teamInfo[0]?.team_key
        
        // Look for number_of_moves and number_of_trades in the team info array
        let moves = 0
        let trades = 0
        
        for (const item of teamInfo) {
          if (item?.number_of_moves !== undefined) {
            moves = parseInt(item.number_of_moves) || 0
          }
          if (item?.number_of_trades !== undefined) {
            trades = parseInt(item.number_of_trades) || 0
          }
        }
        
        counts.set(teamKey, moves + trades)
        console.log(`Team ${teamKey}: ${moves} moves, ${trades} trades = ${moves + trades} total`)
      }
      
      return counts
    } catch (e) {
      console.error('Error fetching transaction counts:', e)
      return new Map()
    }
  }

  /**
   * Get all matchups for multiple weeks (for calculating all-play and standings over time)
   */
  async getAllMatchups(leagueKey: string, startWeek: number, endWeek: number): Promise<Map<number, any[]>> {
    const allMatchups = new Map<number, any[]>()
    
    for (let week = startWeek; week <= endWeek; week++) {
      try {
        const matchups = await this.getMatchups(leagueKey, week)
        if (matchups.length > 0) {
          allMatchups.set(week, matchups)
        }
      } catch (e) {
        console.error(`Error fetching week ${week} matchups:`, e)
      }
    }
    
    return allMatchups
  }

  /**
   * Get draft results for a league
   */
  async getDraftResults(leagueKey: string): Promise<any> {
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/draftresults?format=json`
      )
      
      console.log('Draft results response:', JSON.stringify(data, null, 2).substring(0, 3000))
      
      const draftResults: any[] = []
      const resultsData = data.fantasy_content?.league?.[1]?.draft_results
      
      if (!resultsData) {
        console.log('No draft_results found in response')
        return { picks: [], type: 'unknown' }
      }
      
      // Get draft type from league info
      const leagueInfo = data.fantasy_content?.league?.[0] || {}
      const draftType = leagueInfo.draft_status || 'unknown'
      
      for (const resultWrapper of Object.values(resultsData) as any[]) {
        if (typeof resultWrapper !== 'object' || !resultWrapper.draft_result) continue
        
        const result = resultWrapper.draft_result
        draftResults.push({
          pick: parseInt(result.pick || '0'),
          round: parseInt(result.round || '0'),
          team_key: result.team_key,
          player_key: result.player_key,
          // Note: Player details need separate API call
        })
      }
      
      return {
        picks: draftResults.sort((a, b) => a.pick - b.pick),
        type: draftType
      }
    } catch (e) {
      console.error('Error fetching draft results:', e)
      return { picks: [], type: 'unknown' }
    }
  }

  /**
   * Get player details for multiple player keys
   */
  async getPlayers(playerKeys: string[]): Promise<Map<string, any>> {
    const players = new Map<string, any>()
    
    // Yahoo API limits to 25 players per request
    const chunks: string[][] = []
    for (let i = 0; i < playerKeys.length; i += 25) {
      chunks.push(playerKeys.slice(i, i + 25))
    }
    
    for (const chunk of chunks) {
      try {
        const keysParam = chunk.join(',')
        const data = await this.apiRequest(
          `/players;player_keys=${keysParam}?format=json`
        )
        
        const playersData = data.fantasy_content?.players
        if (!playersData) continue
        
        for (const playerWrapper of Object.values(playersData) as any[]) {
          if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
          
          const playerInfo = playerWrapper.player[0]
          if (!Array.isArray(playerInfo)) continue
          
          let player_key = ''
          let player_id = ''
          let name = ''
          let team = ''
          let position = ''
          let headshot = ''
          
          for (const item of playerInfo) {
            if (item?.player_key) player_key = item.player_key
            if (item?.player_id) player_id = item.player_id
            if (item?.name) name = item.name.full || item.name.first + ' ' + item.name.last
            if (item?.editorial_team_abbr) team = item.editorial_team_abbr
            if (item?.display_position) position = item.display_position
            if (item?.headshot) headshot = item.headshot.url || ''
          }
          
          players.set(player_key, {
            player_key,
            player_id,
            name,
            team,
            position,
            headshot
          })
        }
      } catch (e) {
        console.error('Error fetching player chunk:', e)
      }
    }
    
    return players
  }

  /**
   * Get player season stats for draft analysis
   * For baseball, this would be batting/pitching stats with fantasy points
   */
  async getPlayerStats(leagueKey: string, playerKeys: string[]): Promise<Map<string, any>> {
    const stats = new Map<string, any>()
    
    // Yahoo API limits to 25 players per request
    const chunks: string[][] = []
    for (let i = 0; i < playerKeys.length; i += 25) {
      chunks.push(playerKeys.slice(i, i + 25))
    }
    
    console.log(`Fetching player stats for ${playerKeys.length} players in ${chunks.length} chunks`)
    
    for (const chunk of chunks) {
      try {
        const keysParam = chunk.join(',')
        // Use league context to get fantasy points, not just raw stats
        const data = await this.apiRequest(
          `/league/${leagueKey}/players;player_keys=${keysParam}/stats?format=json`
        )
        
        console.log('Player stats response sample:', JSON.stringify(data, null, 2).substring(0, 2000))
        
        const playersData = data.fantasy_content?.league?.[1]?.players
        if (!playersData) {
          console.log('No players data in response')
          continue
        }
        
        for (const playerWrapper of Object.values(playersData) as any[]) {
          if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
          
          const playerArray = playerWrapper.player
          const playerInfo = playerArray[0]
          const playerStats = playerArray[1]?.player_stats
          const playerPoints = playerArray[1]?.player_points
          
          if (!Array.isArray(playerInfo)) continue
          
          let player_key = ''
          for (const item of playerInfo) {
            if (item?.player_key) player_key = item.player_key
          }
          
          // Parse stats
          const statValues: Record<string, number> = {}
          if (playerStats?.stats) {
            for (const stat of playerStats.stats) {
              if (stat?.stat) {
                statValues[stat.stat.stat_id] = parseFloat(stat.stat.value || '0')
              }
            }
          }
          
          // Get total fantasy points - check both player_stats.total and player_points.total
          const totalPoints = parseFloat(playerPoints?.total || playerStats?.total || '0')
          
          stats.set(player_key, {
            player_key,
            stats: statValues,
            total_points: totalPoints
          })
          
          if (stats.size <= 3) {
            console.log(`Player ${player_key} stats:`, { totalPoints, hasPlayerPoints: !!playerPoints, hasPlayerStats: !!playerStats })
          }
        }
      } catch (e) {
        console.error('Error fetching player stats chunk:', e)
      }
    }
    
    console.log(`Got stats for ${stats.size} players`)
    return stats
  }

  /**
   * Get all rostered players across all teams in a league with their stats
   * Returns player info, ownership, and season stats
   */
  async getAllRosteredPlayers(leagueKey: string): Promise<any[]> {
    const allPlayers: any[] = []
    const playerOwnership = new Map<string, { teamKey: string; teamName: string; managerName: string }>()
    
    try {
      // First get all teams and their rosters
      const teamsData = await this.apiRequest(
        `/league/${leagueKey}/teams/roster?format=json`
      )
      
      console.log('Teams roster response:', JSON.stringify(teamsData, null, 2).substring(0, 2000))
      
      const teams = teamsData.fantasy_content?.league?.[1]?.teams
      if (!teams) {
        console.log('No teams found')
        return allPlayers
      }
      
      const playerKeys: string[] = []
      
      // Extract all player keys and build ownership map
      for (const teamWrapper of Object.values(teams) as any[]) {
        if (typeof teamWrapper !== 'object' || !teamWrapper.team) continue
        
        const teamArray = teamWrapper.team
        const teamInfo = teamArray[0]
        const rosterData = teamArray[1]?.roster?.[0]?.players
        
        // Get team details
        let teamKey = ''
        let teamName = ''
        let managerName = ''
        
        if (Array.isArray(teamInfo)) {
          for (const item of teamInfo) {
            if (item?.team_key) teamKey = item.team_key
            if (item?.name) teamName = item.name
            if (item?.managers?.[0]?.manager?.nickname) {
              managerName = item.managers[0].manager.nickname
            }
          }
        }
        
        if (!rosterData) continue
        
        for (const playerWrapper of Object.values(rosterData) as any[]) {
          if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
          
          const playerInfo = playerWrapper.player[0]
          if (!Array.isArray(playerInfo)) continue
          
          let playerKey = ''
          for (const item of playerInfo) {
            if (item?.player_key) playerKey = item.player_key
          }
          
          if (playerKey) {
            playerKeys.push(playerKey)
            playerOwnership.set(playerKey, { teamKey, teamName, managerName })
          }
        }
      }
      
      console.log(`Found ${playerKeys.length} rostered players across all teams`)
      
      // Now get detailed stats for all players
      const playerStats = await this.getPlayerStats(leagueKey, playerKeys)
      const playerDetails = await this.getPlayers(playerKeys)
      
      // Combine all data
      for (const playerKey of playerKeys) {
        const details = playerDetails.get(playerKey)
        const stats = playerStats.get(playerKey)
        const ownership = playerOwnership.get(playerKey)
        
        if (details) {
          allPlayers.push({
            player_key: playerKey,
            player_id: details.player_id,
            full_name: details.name,
            position: details.position,
            mlb_team: details.team,
            headshot: details.headshot,
            total_points: stats?.total_points || 0,
            stats: stats?.stats || {},
            fantasy_team: ownership?.teamName || null,
            fantasy_team_key: ownership?.teamKey || null,
            manager_name: ownership?.managerName || null
          })
        }
      }
      
      return allPlayers
      
    } catch (e) {
      console.error('Error fetching all rostered players:', e)
      return allPlayers
    }
  }

  /**
   * Get top available free agents in a league
   */
  async getTopFreeAgents(leagueKey: string, count: number = 100): Promise<any[]> {
    const freeAgents: any[] = []
    
    try {
      // Get free agents sorted by percent owned (most owned first)
      const data = await this.apiRequest(
        `/league/${leagueKey}/players;status=FA;sort=OR;count=${count}?format=json`
      )
      
      console.log('Free agents response:', JSON.stringify(data, null, 2).substring(0, 2000))
      
      const playersData = data.fantasy_content?.league?.[1]?.players
      if (!playersData) return freeAgents
      
      const playerKeys: string[] = []
      
      for (const playerWrapper of Object.values(playersData) as any[]) {
        if (typeof playerWrapper !== 'object' || !playerWrapper.player) continue
        
        const playerInfo = playerWrapper.player[0]
        if (!Array.isArray(playerInfo)) continue
        
        let playerKey = ''
        let playerId = ''
        let name = ''
        let team = ''
        let position = ''
        let headshot = ''
        let percentOwned = 0
        
        for (const item of playerInfo) {
          if (item?.player_key) playerKey = item.player_key
          if (item?.player_id) playerId = item.player_id
          if (item?.name) name = item.name.full || `${item.name.first} ${item.name.last}`
          if (item?.editorial_team_abbr) team = item.editorial_team_abbr
          if (item?.display_position) position = item.display_position
          if (item?.headshot) headshot = item.headshot.url || ''
          if (item?.percent_owned) percentOwned = parseFloat(item.percent_owned.value || '0')
        }
        
        if (playerKey) {
          playerKeys.push(playerKey)
          freeAgents.push({
            player_key: playerKey,
            player_id: playerId,
            full_name: name,
            position,
            mlb_team: team,
            headshot,
            percent_owned: percentOwned,
            fantasy_team: null,
            fantasy_team_key: null,
            manager_name: null
          })
        }
      }
      
      // Get stats for free agents
      if (playerKeys.length > 0) {
        const playerStats = await this.getPlayerStats(leagueKey, playerKeys)
        
        for (const player of freeAgents) {
          const stats = playerStats.get(player.player_key)
          player.total_points = stats?.total_points || 0
          player.stats = stats?.stats || {}
        }
      }
      
      return freeAgents
      
    } catch (e) {
      console.error('Error fetching free agents:', e)
      return freeAgents
    }
  }

  /**
   * Get player weekly stats for multiple weeks (for calculating recent performance)
   */
  async getPlayerWeeklyStats(leagueKey: string, playerKey: string, weeks: number[]): Promise<Map<number, any>> {
    const weeklyStats = new Map<number, any>()
    
    for (const week of weeks) {
      try {
        const data = await this.apiRequest(
          `/league/${leagueKey}/players;player_keys=${playerKey}/stats;type=week;week=${week}?format=json`
        )
        
        const playerData = data.fantasy_content?.league?.[1]?.players?.[0]?.player
        if (!playerData) continue
        
        const statsData = playerData[1]?.player_stats
        const pointsData = playerData[1]?.player_points
        
        weeklyStats.set(week, {
          week,
          points: parseFloat(pointsData?.total || statsData?.total || '0'),
          stats: statsData?.stats || []
        })
      } catch (e) {
        console.error(`Error fetching week ${week} stats for ${playerKey}:`, e)
      }
    }
    
    return weeklyStats
  }

  /**
   * Get league scoring settings to understand point values
   */
  async getLeagueScoringSettings(leagueKey: string): Promise<any> {
    try {
      const data = await this.apiRequest(
        `/league/${leagueKey}/settings?format=json`
      )
      
      const settings = data.fantasy_content?.league?.[1]?.settings?.[0]
      
      // Extract stat categories and their point values
      const statCategories = settings?.stat_categories?.stats || []
      const statModifiers = settings?.stat_modifiers?.stats || []
      
      // Build a map of stat_id to point value
      const scoringMap = new Map<string, number>()
      for (const mod of statModifiers) {
        if (mod?.stat) {
          scoringMap.set(mod.stat.stat_id, parseFloat(mod.stat.value || '0'))
        }
      }
      
      return {
        scoring_type: settings?.scoring_type,
        stat_categories: statCategories,
        stat_modifiers: scoringMap,
        roster_positions: settings?.roster_positions || []
      }
    } catch (e) {
      console.error('Error fetching league settings:', e)
      return null
    }
  }
}

// Export singleton instance
export const yahooService = new YahooFantasyService()
