import type {
  SleeperUser,
  SleeperLeague,
  SleeperRoster,
  SleeperMatchup,
  SleeperPlayer,
  SleeperTransaction
} from '@/types/sleeper'

const BASE_URL = 'https://api.sleeper.app/v1'
const CDN_URL = 'https://sleepercdn.com'

class SleeperService {
  // Cache for players data
  private playersCache: Record<string, SleeperPlayer> | null = null

  async getUser(username: string): Promise<SleeperUser> {
    const response = await fetch(`${BASE_URL}/user/${username}`)
    if (!response.ok) throw new Error('User not found')
    return response.json()
  }

  async getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
    const response = await fetch(`${BASE_URL}/user/${userId}/leagues/nfl/${season}`)
    if (!response.ok) throw new Error('Failed to fetch leagues')
    return response.json()
  }

  async getLeague(leagueId: string): Promise<SleeperLeague> {
    const response = await fetch(`${BASE_URL}/league/${leagueId}`)
    if (!response.ok) throw new Error('League not found')
    return response.json()
  }

  async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    const response = await fetch(`${BASE_URL}/league/${leagueId}/rosters`)
    if (!response.ok) throw new Error('Failed to fetch rosters')
    return response.json()
  }

  async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    const response = await fetch(`${BASE_URL}/league/${leagueId}/users`)
    if (!response.ok) throw new Error('Failed to fetch users')
    return response.json()
  }

  async getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    const response = await fetch(`${BASE_URL}/league/${leagueId}/matchups/${week}`)
    if (!response.ok) throw new Error('Failed to fetch matchups')
    return response.json()
  }

  async getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
    const response = await fetch(`${BASE_URL}/league/${leagueId}/transactions/${week}`)
    if (!response.ok) throw new Error('Failed to fetch transactions')
    return response.json()
  }

  async getAllTransactions(leagueId: string, totalWeeks: number): Promise<SleeperTransaction[]> {
    const promises = []
    for (let week = 1; week <= totalWeeks; week++) {
      promises.push(this.getTransactions(leagueId, week))
    }
    const results = await Promise.all(promises)
    return results.flat()
  }

  async getPlayers(): Promise<Record<string, SleeperPlayer>> {
    if (this.playersCache) return this.playersCache
    
    const response = await fetch(`${BASE_URL}/players/nfl`)
    if (!response.ok) throw new Error('Failed to fetch players')
    this.playersCache = await response.json()
    return this.playersCache
  }

  /**
   * Get all transactions for a league in a given week
   */
  async getTransactions(leagueId: string, week: number): Promise<SleeperTransaction[]> {
    const response = await fetch(`${BASE_URL}/league/${leagueId}/transactions/${week}`)
    if (!response.ok) {
      // Return empty array if no transactions (common for early/late weeks)
      if (response.status === 404) return []
      throw new Error('Failed to fetch transactions')
    }
    return response.json()
  }

  /**
   * Get all transactions for entire season
   */
  async getAllTransactions(leagueId: string, maxWeek: number = 18): Promise<SleeperTransaction[]> {
    const allTransactions: SleeperTransaction[] = []
    
    // Fetch transactions for each week
    for (let week = 1; week <= maxWeek; week++) {
      try {
        const weekTransactions = await this.getTransactions(leagueId, week)
        allTransactions.push(...weekTransactions)
      } catch (error) {
        console.warn(`No transactions for week ${week}`)
      }
    }
    
    return allTransactions
  }

  /**
   * Get playoff winners bracket for a league
   * Returns array of bracket matchups with winner (w) field indicating champion
   */
  async getWinnersBracket(leagueId: string): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/league/${leagueId}/winners_bracket`)
      if (!response.ok) {
        console.warn(`Failed to fetch winners bracket for league ${leagueId}`)
        return []
      }
      return response.json()
    } catch (error) {
      console.error('Error fetching winners bracket:', error)
      return []
    }
  }

  /**
   * Get the champion roster_id from a winners bracket
   * Bracket structure: { r: round, m: matchup_id, t1: team1_roster_id, t2: team2_roster_id, w: winner_roster_id, l: loser_roster_id, p: placement (for consolation) }
   * Championship game is the highest round with NO placement (p) field
   */
  getChampionFromBracket(bracket: any[]): number | null {
    if (!bracket || bracket.length === 0) return null
    
    console.log('Analyzing bracket:', JSON.stringify(bracket, null, 2))
    
    // Find the highest round number (championship round)
    const maxRound = Math.max(...bracket.map(m => m.r || 0))
    console.log(`Max round: ${maxRound}`)
    
    // Find the championship matchup:
    // - Highest round
    // - No 'p' field (placement games have 'p' field for 3rd place, 5th place, etc.)
    // - Has a winner (w field)
    const championshipMatchups = bracket.filter(m => {
      const isMaxRound = m.r === maxRound
      const isNotPlacement = m.p === undefined || m.p === null
      console.log(`Matchup r=${m.r}, m=${m.m}, t1=${m.t1}, t2=${m.t2}, w=${m.w}, l=${m.l}, p=${m.p} | isMaxRound=${isMaxRound}, isNotPlacement=${isNotPlacement}`)
      return isMaxRound && isNotPlacement
    })
    
    console.log(`Championship matchups found: ${championshipMatchups.length}`)
    
    // If there's exactly one championship matchup, return the winner
    if (championshipMatchups.length === 1) {
      const champGame = championshipMatchups[0]
      if (champGame.w) {
        console.log(`✓ Champion found: roster_id ${champGame.w}`)
        return champGame.w
      }
    }
    
    // If multiple matchups at max round (shouldn't happen), find the one without placement
    if (championshipMatchups.length > 1) {
      // Look for the actual championship (matchup 1 or 2 usually in final round)
      const actualChamp = championshipMatchups.find(m => m.w && (m.m === 1 || m.m === 2))
      if (actualChamp) {
        console.log(`✓ Champion found from multiple: roster_id ${actualChamp.w}`)
        return actualChamp.w
      }
    }
    
    // Fallback: Find any matchup in the highest round that has a winner
    const finalsWithWinner = bracket
      .filter(m => m.r === maxRound && m.w)
      .sort((a, b) => {
        // Prefer non-placement games
        if (a.p === undefined && b.p !== undefined) return -1
        if (a.p !== undefined && b.p === undefined) return 1
        return 0
      })
    
    if (finalsWithWinner.length > 0) {
      console.log(`✓ Champion found via fallback: roster_id ${finalsWithWinner[0].w}`)
      return finalsWithWinner[0].w
    }
    
    console.log('✗ No champion found in bracket')
    return null
  }

  /**
   * Get projections for specific players and week using GraphQL
   */
  async getPlayerProjections(
    season: string,
    week: number,
    playerIds: string[],
    seasonType: 'regular' | 'post' = 'regular'
  ): Promise<Map<string, any>> {
    if (playerIds.length === 0) return new Map()

    const queryKey = `nfl__${seasonType}__${season}__${week}__proj`
    const query = `
      query get_player_score_and_projections_batch {
        ${queryKey}: stats_for_players_in_week(
          sport: "nfl",
          season: "${season}",
          category: "proj",
          season_type: "${seasonType}",
          week: ${week},
          player_ids: [${playerIds.map(id => `"${id}"`).join(',')}]
        ) {
          player_id
          week
          season
          team
          opponent
          stats
        }
      }
    `

    try {
      const response = await fetch('https://api.sleeper.app/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          operationName: 'get_player_score_and_projections_batch',
          variables: {}
        })
      })

      if (!response.ok) {
        console.warn(`Projections API returned ${response.status}`)
        return new Map()
      }

      const data = await response.json()
      const projections = data.data[queryKey] || []
      
      const projectionsMap = new Map()
      projections.forEach((proj: any) => {
        projectionsMap.set(proj.player_id, proj)
      })

      return projectionsMap
    } catch (error) {
      console.error('Error fetching projections:', error)
      return new Map()
    }
  }

  /**
   * Get projections for multiple weeks
   */
  async getMultiWeekProjections(
    season: string,
    weeks: number[],
    playerIds: string[],
    seasonType: 'regular' | 'post' = 'regular'
  ): Promise<Map<number, Map<string, any>>> {
    const weekProjections = new Map()
    const promises = weeks.map(week =>
      this.getPlayerProjections(season, week, playerIds, seasonType)
        .then(projections => ({ week, projections }))
    )

    const results = await Promise.all(promises)
    results.forEach(({ week, projections }) => {
      weekProjections.set(week, projections)
    })

    return weekProjections
  }

  /**
   * Get all projections for a single week (all players)
   * Uses the undocumented but working Sleeper projections endpoint
   */
  async getAllWeekProjections(
    season: string,
    week: number,
    seasonType: 'regular' | 'post' = 'regular'
  ): Promise<Record<string, any>> {
    try {
      const url = `https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=${seasonType}&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=FLEX`
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Failed to fetch week ${week} projections`)
        return {}
      }
      return response.json()
    } catch (error) {
      console.error('Error fetching week projections:', error)
      return {}
    }
  }

  /**
   * Get NFL schedule for a week (includes game info)
   */
  async getNflSchedule(
    season: string,
    week: number
  ): Promise<any[]> {
    try {
      const url = `https://api.sleeper.app/schedule/nfl/regular/${season}/${week}`
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Failed to fetch NFL schedule for week ${week}`)
        return []
      }
      return response.json()
    } catch (error) {
      console.error('Error fetching NFL schedule:', error)
      return []
    }
  }

  // Get avatar URL for a roster (league-specific avatar or user avatar)
  getAvatarUrl(roster: SleeperRoster, user: SleeperUser | undefined, league: SleeperLeague): string {
    // Priority 1: Roster's metadata avatar (team-specific in league)
    if (roster.metadata?.avatar) {
      return `${CDN_URL}/avatars/thumbs/${roster.metadata.avatar}`
    }
    
    // Priority 2: Roster's settings avatar
    if (roster.settings?.avatar) {
      return `${CDN_URL}/avatars/thumbs/${roster.settings.avatar}`
    }
    
    // Priority 3: User's avatar
    if (user?.avatar) {
      return `${CDN_URL}/avatars/thumbs/${user.avatar}`
    }
    
    // Priority 4: League's default avatar
    if (league.avatar) {
      return `${CDN_URL}/avatars/thumbs/${league.avatar}`
    }
    
    // Fallback: default Sleeper avatar
    return `${CDN_URL}/avatars/thumbs/default`
  }

  // Get team name (custom or user display name)
  getTeamName(roster: SleeperRoster, user: SleeperUser | undefined): string {
    // Priority order:
    // 1. User's team_name from metadata (this is what they set in Sleeper)
    // 2. User's display_name
    // 3. User's username
    // 4. Fallback to roster ID
    return user?.metadata?.team_name || user?.display_name || user?.username || `Team ${roster.roster_id}`
  }

  // Fetch historical data for all linked leagues
  async getHistoricalData(leagueId: string): Promise<{
    seasons: SleeperLeague[]
    rosters: Map<string, SleeperRoster[]>
    users: Map<string, SleeperUser[]>
    matchups: Map<string, Map<number, SleeperMatchup[]>>
    drafts: Map<string, any>
  }> {
    const seasons: SleeperLeague[] = []
    const rosters = new Map<string, SleeperRoster[]>()
    const users = new Map<string, SleeperUser[]>()
    const matchups = new Map<string, Map<number, SleeperMatchup[]>>()
    const drafts = new Map<string, any>()
    
    let currentId: string | undefined = leagueId
    const visited = new Set<string>()
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      
      try {
        const league = await this.getLeague(currentId)
        seasons.push(league)
        
        const [seasonRosters, seasonUsers] = await Promise.all([
          this.getLeagueRosters(currentId),
          this.getLeagueUsers(currentId)
        ])
        
        rosters.set(league.season, seasonRosters)
        users.set(league.season, seasonUsers)
        
        // Fetch draft data
        try {
          const draftResponse = await fetch(`${BASE_URL}/league/${currentId}/drafts`)
          if (!draftResponse.ok) {
            console.warn(`Failed to fetch drafts for season ${league.season}:`, draftResponse.status)
          } else {
            const draftIds = await draftResponse.json()
            console.log(`Draft IDs for season ${league.season}:`, draftIds)
            
            if (draftIds && Array.isArray(draftIds) && draftIds.length > 0) {
              const draftId = draftIds[0].draft_id || draftIds[0]
              console.log(`Fetching draft data for draft ID: ${draftId}`)
              
              const [draftData, picksData] = await Promise.all([
                fetch(`${BASE_URL}/draft/${draftId}`).then(r => r.json()),
                fetch(`${BASE_URL}/draft/${draftId}/picks`).then(r => r.json())
              ])
              
              console.log(`Draft data for ${league.season}:`, {
                draftId,
                hasSettings: !!draftData?.settings,
                picksCount: picksData?.length || 0
              })
              
              // Organize picks by user
              const draftOrder: Record<string, any[]> = {}
              if (Array.isArray(picksData)) {
                picksData.forEach((pick: any) => {
                  if (!draftOrder[pick.picked_by]) {
                    draftOrder[pick.picked_by] = []
                  }
                  draftOrder[pick.picked_by].push(pick)
                })
              }
              
              drafts.set(league.season, {
                ...draftData,
                draft_order: draftOrder,
                picks: picksData || []
              })
            } else {
              console.warn(`No draft IDs found for season ${league.season}`)
            }
          }
        } catch (error) {
          console.error('Error fetching draft data for season:', league.season, error)
        }
        
        // Fetch all matchups for the season
        const playoffStart = league.settings?.playoff_week_start || 15
        const totalWeeks = playoffStart + 3 // Regular season + playoffs
        const seasonMatchups = new Map<number, SleeperMatchup[]>()
        
        for (let week = 1; week <= totalWeeks; week++) {
          try {
            const weekMatchups = await this.getMatchups(currentId, week)
            seasonMatchups.set(week, weekMatchups)
          } catch (e) {
            // Week might not exist yet
            break
          }
        }
        
        matchups.set(league.season, seasonMatchups)
        currentId = league.previous_league_id
      } catch (error) {
        console.error('Error fetching historical data:', error)
        break
      }
    }
    
    // Sort seasons newest first
    seasons.sort((a, b) => parseInt(b.season) - parseInt(a.season))
    
    return { seasons, rosters, users, matchups, drafts }
  }
}

export const sleeperService = new SleeperService()
