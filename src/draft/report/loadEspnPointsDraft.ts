import { espnService } from '@/services/espn'
import type { Sport } from '@/types/supabase'
import { calculatePickScore, scoreToGrade, calculateTeamGrade, getRelativeTeamGrade } from '@/services/draftGrading'
import type { GradedDraft, GradedPick, GradedTeam } from './types'

/**
 * Fetch + grade an ESPN points-league draft for a season, normalized to GradedDraft.
 * Mirrors the ESPN branch of loadDraftData() in PointsDraftView.vue.
 * Any fetch error propagates to the caller (only getMyTeam is caught, matching the reference).
 */
export async function loadEspnPointsDraft(args: { sport: string; leagueId: string; season: number }): Promise<GradedDraft | null> {
  const sport = args.sport as Sport
  const { leagueId, season } = args

  const draftPicks = await espnService.getDraftWithPlayers(sport, leagueId, season)
  if (!draftPicks || draftPicks.length === 0) return null

  const teams = await espnService.getTeams(sport, leagueId, season)
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  const numTeams = teams.length || 12

  // Per-player season points, sourced from roster's actualPoints (season total)
  const playerSeasonPoints = new Map<number, number>()
  try {
    const teamsWithRosters = await espnService.getTeamsWithRosters(sport, leagueId, season)
    for (const team of teamsWithRosters) {
      if (team.roster) {
        for (const player of team.roster) {
          if (player.actualPoints && player.actualPoints > 0) {
            playerSeasonPoints.set(player.playerId, player.actualPoints)
          }
        }
      }
    }
  } catch {
    // No season points available — ranks below will fall back to 999 / round proxy
  }

  const sortedPicks = [...draftPicks].sort((a, b) => a.overallPickNumber - b.overallPickNumber)

  // Position rank as drafted: order each position was taken in the draft
  const positionDraftOrder = new Map<string, number[]>()
  for (const pick of sortedPicks) {
    const position = pick.position || 'Unknown'
    if (!positionDraftOrder.has(position)) positionDraftOrder.set(position, [])
    positionDraftOrder.get(position)!.push(pick.playerId)
  }
  const positionRankDraftedMap = new Map<number, number>()
  for (const [, playerIds] of positionDraftOrder) {
    playerIds.forEach((playerId, index) => positionRankDraftedMap.set(playerId, index + 1))
  }

  // Current position rank: players within a position sorted by season points desc
  const playerPointsData: { playerId: number; position: string; points: number }[] = draftPicks.map((pick) => ({
    playerId: pick.playerId,
    position: pick.position || 'Unknown',
    points: playerSeasonPoints.get(pick.playerId) || 0,
  }))
  const positionGroups = new Map<string, typeof playerPointsData>()
  for (const data of playerPointsData) {
    if (!positionGroups.has(data.position)) positionGroups.set(data.position, [])
    positionGroups.get(data.position)!.push(data)
  }
  const currentPositionRankMap = new Map<number, number>()
  for (const [, players] of positionGroups) {
    const sortedByPoints = [...players].sort((a, b) => b.points - a.points)
    sortedByPoints.forEach((player, index) => currentPositionRankMap.set(player.playerId, index + 1))
  }

  const totalPicks = draftPicks.length

  const picks: GradedPick[] = sortedPicks.map((pick) => {
    const team = teamMap.get(pick.teamId)
    const round = pick.roundId
    const position = pick.position || 'Unknown'
    const positionRankDrafted = positionRankDraftedMap.get(pick.playerId) || 0
    const currentPositionRank = currentPositionRankMap.get(pick.playerId) || 999

    const result = calculatePickScore(
      pick.overallPickNumber,
      round,
      positionRankDrafted || round,
      currentPositionRank,
      position,
      numTeams,
      totalPicks,
      sport
    )

    return {
      teamKey: `espn_team_${pick.teamId}`,
      teamName: team?.name || `Team ${pick.teamId}`,
      teamLogo: team?.logo || '',
      playerName: pick.playerName || `Player ${pick.playerId}`,
      position,
      round,
      overallPick: pick.overallPickNumber,
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
    const teamId = Number(teamKey.replace('espn_team_', ''))
    const team = teamMap.get(teamId)
    return {
      teamKey,
      teamName: team?.name || `Team ${teamId}`,
      teamLogo: team?.logo || '',
      gradeScore: gradeResult.gradeScore,
    }
  })

  unrankedTeams.sort((a, b) => b.gradeScore - a.gradeScore)

  // Relative grading uses the count of teams that actually drafted (distinct teamKeys),
  // not the league's getTeams() length — matches PointsDraftView's teamGrades computed.
  const gradedTeamCount = unrankedTeams.length

  const gradedTeams: GradedTeam[] = unrankedTeams.map((t, index) => {
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
    const myTeam = await espnService.getMyTeam(sport, leagueId, season)
    myTeamKey = myTeam ? `espn_team_${myTeam.id}` : null
  } catch {
    myTeamKey = null
  }

  return { picks, teams: gradedTeams, numTeams, myTeamKey }
}
