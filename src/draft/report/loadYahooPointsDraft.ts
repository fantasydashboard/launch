import { yahooService } from '@/services/yahoo'
import { calculatePickScore, scoreToGrade, calculateTeamGrade, getRelativeTeamGrade } from '@/services/draftGrading'
import type { GradedDraft, GradedPick, GradedTeam } from './types'

/**
 * Fetch + grade a Yahoo points-league draft for a season, normalized to GradedDraft.
 * Mirrors the Yahoo branch of loadDraftData() in PointsDraftView.vue, including the
 * predraft -> previous-season (renew) fallback.
 * Any fetch error propagates to the caller (only getMyTeam is caught, matching the reference).
 */
export async function loadYahooPointsDraft(args: { leagueKey: string; sport?: string }): Promise<GradedDraft | null> {
  const { leagueKey } = args
  const sport = args.sport || 'football'

  let seasonLeagueKey = leagueKey

  let draftResults = await yahooService.getDraftResults(seasonLeagueKey)
  let playerKeys: string[] = draftResults.picks?.map((p: any) => p.player_key).filter(Boolean) || []

  // Predraft: picks exist but have no player_keys yet. Fall back to the previous
  // season's draft via the `renew` field ("prevGameKey_prevLeagueNum").
  if (playerKeys.length === 0 && draftResults.picks?.length > 0) {
    const renewedFrom = draftResults.renew
    if (renewedFrom) {
      const [prevGameKey, prevLeagueNum] = renewedFrom.split('_')
      const prevLeagueKey = `${prevGameKey}.l.${prevLeagueNum}`
      draftResults = await yahooService.getDraftResults(prevLeagueKey)
      seasonLeagueKey = prevLeagueKey
      playerKeys = draftResults.picks?.map((p: any) => p.player_key).filter(Boolean) || []
      if (playerKeys.length === 0) return null
    } else {
      return null
    }
  }

  if (!draftResults.picks || draftResults.picks.length === 0) return null

  const finalPlayerKeys: string[] = draftResults.picks.map((p: any) => p.player_key).filter(Boolean)

  const players = await yahooService.getPlayers(finalPlayerKeys, seasonLeagueKey)
  const stats = await yahooService.getPlayerStats(seasonLeagueKey, finalPlayerKeys)
  const standings = await yahooService.getStandings(seasonLeagueKey)

  const teamLookup = new Map<string, any>()
  for (const team of standings) {
    teamLookup.set(team.team_key, team)
  }

  const pickPointsData: { pick: number; points: number; playerKey: string; position: string }[] = []
  for (const pick of draftResults.picks) {
    const stat = stats.get(pick.player_key)
    const player = players.get(pick.player_key) || {}
    pickPointsData.push({
      pick: pick.pick,
      points: stat?.total_points || 0,
      playerKey: pick.player_key,
      position: player.position || 'Unknown',
    })
  }

  // Position rank as drafted: order each position was taken in the draft
  const positionDraftOrder = new Map<string, string[]>()
  for (const pick of draftResults.picks) {
    const player = players.get(pick.player_key) || {}
    const position = player.position || 'Unknown'
    if (!positionDraftOrder.has(position)) positionDraftOrder.set(position, [])
    positionDraftOrder.get(position)!.push(pick.player_key)
  }
  const positionRankDraftedMap = new Map<string, number>()
  for (const [, playerKeysInPosition] of positionDraftOrder) {
    playerKeysInPosition.forEach((playerKey, index) => positionRankDraftedMap.set(playerKey, index + 1))
  }

  // Current position rank: players within a position sorted by total points desc
  const currentPositionRankMap = new Map<string, number>()
  for (const [, playerKeysInPosition] of positionDraftOrder) {
    const sortedByPoints = playerKeysInPosition
      .map((pk) => ({ playerKey: pk, points: pickPointsData.find((p) => p.playerKey === pk)?.points || 0 }))
      .sort((a, b) => b.points - a.points)
    sortedByPoints.forEach((player, index) => currentPositionRankMap.set(player.playerKey, index + 1))
  }

  const numTeams = standings.length || 12
  const totalPicks = draftResults.picks.length

  const picks: GradedPick[] = draftResults.picks.map((pick: any) => {
    const player = players.get(pick.player_key) || {}
    const team = teamLookup.get(pick.team_key) || {}
    const position = player.position || 'Unknown'

    const positionRankDrafted = positionRankDraftedMap.get(pick.player_key) || 0
    const currentPositionRank = currentPositionRankMap.get(pick.player_key) || 999

    const result = calculatePickScore(
      pick.pick,
      pick.round,
      positionRankDrafted || pick.round,
      currentPositionRank,
      position,
      numTeams,
      totalPicks,
      sport
    )

    return {
      teamKey: pick.team_key,
      teamName: team.name || 'Team',
      teamLogo: team.logo_url || '',
      playerName: player.name || 'Unknown Player',
      position,
      round: pick.round,
      overallPick: pick.pick,
      score: result.totalScore,
      grade: scoreToGrade(result.totalScore),
      verdict: result.verdict,
      tierMovement: result.tierMovement,
      draftedTier: result.draftedTier,
      finishedTier: result.finishedTier,
    }
  })

  const picksByTeam = new Map<string, GradedPick[]>()
  for (const pick of picks) {
    if (!picksByTeam.has(pick.teamKey)) picksByTeam.set(pick.teamKey, [])
    picksByTeam.get(pick.teamKey)!.push(pick)
  }

  const unrankedTeams = [...picksByTeam.entries()].map(([teamKey, teamPicks]) => {
    const gradeResult = calculateTeamGrade(teamPicks.map((p) => ({ round: p.round, score: p.score, verdict: p.verdict })))
    const team = teamLookup.get(teamKey) || {}
    return {
      teamKey,
      teamName: team.name || teamPicks[0]?.teamName || 'Team',
      teamLogo: team.logo_url || teamPicks[0]?.teamLogo || '',
      gradeScore: gradeResult.gradeScore,
    }
  })

  unrankedTeams.sort((a, b) => b.gradeScore - a.gradeScore)

  // Relative grading uses the count of teams that actually drafted (distinct teamKeys),
  // not the standings length — matches PointsDraftView's teamGrades computed.
  const gradedTeamCount = unrankedTeams.length

  const teams: GradedTeam[] = unrankedTeams.map((t, index) => {
    const rank = index + 1
    return {
      teamKey: t.teamKey,
      teamName: t.teamName,
      teamLogo: t.teamLogo,
      gradeScore: t.gradeScore,
      grade: getRelativeTeamGrade(rank, gradedTeamCount, t.gradeScore),
      rank,
    }
  })

  let myTeamKey: string | null = null
  try {
    // Use the RESOLVED season key (post renew-fallback), so my team_key is in the SAME season's
    // namespace as the picks — otherwise isMe/spotlight never match when the fallback fired.
    const myTeam = await yahooService.getMyTeam(seasonLeagueKey)
    myTeamKey = myTeam?.team_key ?? null
  } catch {
    myTeamKey = null
  }

  return { picks, teams, numTeams, myTeamKey }
}
