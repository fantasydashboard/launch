import { espnService } from '@/services/espn'
import type { Sport } from '@/types/supabase'
import {
  calculatePickScore,
  scoreToGrade,
  calculateTeamGrade,
  getRelativeTeamGrade,
  getTier,
  getTierConfig,
} from '@/services/draftGrading'
import { espnHeadshotUrl } from '@/myteam/espn/mapRosters'
import type { GradedDraft, GradedPick, GradedTeam, KeeperInfo } from './types'

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

  // Playing-time source for the injury/incomplete-season guard below, keyed by playerId.
  // Sourced from the dedicated player-stats endpoint (getPlayersWithStats), NOT
  // getTeamsWithRosters — the roster view's per-player stat breakdown can be thin or
  // missing entirely, and (more importantly) games-played stat ids are BATTER-only in
  // ESPN's baseball catalog, so a GP-based guard is a no-op for pitchers. Pitchers use
  // innings pitched (stat 17); hitters use games played (99) else at-bats (0). These stat
  // ids are BASEBALL-specific, so the guard is gated to baseball — other sports get
  // undefined playing time and are never excluded (conservative, safe).
  const isPitcher = (position: string): boolean =>
    ['SP', 'RP', 'P'].includes((position || '').split(/[,/|]/)[0].trim().toUpperCase())

  let statsById = new Map<number, { name: string; position: string; team: string; stats: Record<string, number> }>()
  // Best-effort + TIME-BOUNDED: the injury guard is an enhancement and must NEVER block or break
  // the report. getPlayersWithStats fetches stats for every drafted player (200+ in a keeper
  // league) in rate-limited chunks and can be slow; if it doesn't return within the budget we
  // proceed with NO guard (report still renders, just without injury exclusion). Non-baseball
  // never uses these stat ids, so skip the fetch entirely there.
  if (sport === 'baseball') {
    try {
      const playerIds = draftPicks.map((p) => p.playerId)
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000))
      const result = await Promise.race([
        espnService.getPlayersWithStats(sport, leagueId, season, playerIds),
        timeout,
      ])
      if (result) statsById = result
      else console.debug('[draft report] ESPN getPlayersWithStats timed out — injury guard skipped')
    } catch {
      // No playing-time data available — isIncomplete below will conservatively never exclude
    }
  }

  const playingTimeOf = (playerId: number, position: string): number | undefined => {
    if (sport !== 'baseball') return undefined // IP/GP/AB stat ids are baseball-specific
    const s = statsById.get(playerId)?.stats
    if (!s) return undefined
    return isPitcher(position) ? s['17'] : (s['99'] ?? s['0'])
  }

  // Exclude keeper picks from grading and rank computation entirely — a kept star
  // shouldn't distort the position-rank pools or team grades.
  const keeperCount = draftPicks.filter((p) => p.keeper).length
  const nonKeeperPicks = draftPicks.filter((p) => !p.keeper)

  // Injury/incomplete-season guard: a non-keeper pick is excluded from grading when it
  // missed most of the season AND didn't produce — the points check prevents false-excluding
  // a rookie/midseason callup with little playing time but big points (a real steal).
  // posMaxPT / posMaxPoints are the max known playing-time / season points among non-keeper
  // picks at that position; a position group is only trusted once it has >=3 picks with
  // KNOWN playing time (replaces the old games-specific ">=20 games" floor, which didn't
  // make sense for an innings-pitched scale).
  const posMaxPT = new Map<string, number>()
  const posKnownPTCount = new Map<string, number>()
  const posMaxPoints = new Map<string, number>()
  for (const pick of nonKeeperPicks) {
    const position = pick.position || 'Unknown'
    const pt = playingTimeOf(pick.playerId, position)
    if (pt !== undefined) {
      posMaxPT.set(position, Math.max(posMaxPT.get(position) || 0, pt))
      posKnownPTCount.set(position, (posKnownPTCount.get(position) || 0) + 1)
    }
    const points = playerSeasonPoints.get(pick.playerId) || 0
    posMaxPoints.set(position, Math.max(posMaxPoints.get(position) || 0, points))
  }
  const isIncomplete = (pick: (typeof nonKeeperPicks)[number]): boolean => {
    const position = pick.position || 'Unknown'
    const pt = playingTimeOf(pick.playerId, position)
    if (pt === undefined) return false // unknown playing time — never exclude
    const knownCount = posKnownPTCount.get(position) || 0
    if (knownCount < 3) return false // position pool too small to be meaningful
    const maxPT = posMaxPT.get(position) || 0
    if (maxPT <= 0 || pt >= 0.5 * maxPT) return false
    const points = playerSeasonPoints.get(pick.playerId) || 0
    const maxPoints = posMaxPoints.get(position) || 0
    if (points >= 0.5 * maxPoints) return false
    return true
  }
  const incompleteCount = nonKeeperPicks.filter(isIncomplete).length
  console.debug('[draft report] ESPN incompleteCount', incompleteCount, 'of', nonKeeperPicks.length, 'non-keeper picks')

  // Sample the 5 lowest-points non-keeper picks so we can see WHY they were/weren't excluded.
  const pointsOf = (p: (typeof nonKeeperPicks)[number]) => playerSeasonPoints.get(p.playerId) || 0
  const sample = [...nonKeeperPicks]
    .sort((a, b) => pointsOf(a) - pointsOf(b))
    .slice(0, 5)
    .map((p) => ({
      name: p.playerName,
      pos: p.position,
      pt: playingTimeOf(p.playerId, p.position || 'Unknown'),
      pts: pointsOf(p),
      excl: isIncomplete(p),
    }))
  console.debug('[draft report] ESPN low-points sample', sample)

  const gradedPicks = nonKeeperPicks.filter((p) => !isIncomplete(p))

  // Full-pool current position rank (keepers INCLUDED) — used only to label kept players
  // with a finished tier; separate from the keeper-excluded grading rank map below.
  const fullPositionGroups = new Map<string, { playerId: number; points: number }[]>()
  for (const pick of draftPicks) {
    const position = pick.position || 'Unknown'
    if (!fullPositionGroups.has(position)) fullPositionGroups.set(position, [])
    fullPositionGroups.get(position)!.push({ playerId: pick.playerId, points: playerSeasonPoints.get(pick.playerId) || 0 })
  }
  const fullPositionRankMap = new Map<number, number>()
  for (const [, players] of fullPositionGroups) {
    const sortedByPoints = [...players].sort((a, b) => b.points - a.points)
    sortedByPoints.forEach((player, index) => fullPositionRankMap.set(player.playerId, index + 1))
  }
  const tierConfig = getTierConfig(numTeams)
  const keepers: KeeperInfo[] = draftPicks
    .filter((p) => p.keeper)
    .map((pick) => {
      const team = teamMap.get(pick.teamId)
      return {
        teamKey: `espn_team_${pick.teamId}`,
        teamName: team?.name || `Team ${pick.teamId}`,
        teamLogo: team?.logo || '',
        playerName: pick.playerName || `Player ${pick.playerId}`,
        position: pick.position || 'Unknown',
        round: pick.roundId,
        points: playerSeasonPoints.get(pick.playerId) ?? 0,
        finishedTier: getTier(fullPositionRankMap.get(pick.playerId) ?? 999, tierConfig),
        headshot: espnHeadshotUrl(pick.playerId, sport),
        proTeam: pick.proTeam || undefined,
      }
    })

  const sortedPicks = [...gradedPicks].sort((a, b) => a.overallPickNumber - b.overallPickNumber)

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
  const playerPointsData: { playerId: number; position: string; points: number }[] = gradedPicks.map((pick) => ({
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

  const totalPicks = gradedPicks.length

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
      headshot: espnHeadshotUrl(pick.playerId, sport),
      proTeam: pick.proTeam || undefined,
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

  return { picks, teams: gradedTeams, numTeams, myTeamKey, keeperCount, keepers, incompleteCount }
}
