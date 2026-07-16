import { sleeperService } from '@/services/sleeper'
import { draftAnalysisService } from '@/services/draftAnalysis'
import { useLeagueStore } from '@/stores/league'
import {
  calculatePickScore,
  scoreToGrade,
  calculateTeamGrade,
  getRelativeTeamGrade,
  getTier,
  getTierConfig,
} from '@/services/draftGrading'
import type { GradedDraft, GradedPick, GradedTeam, KeeperInfo } from './types'

/**
 * Grade a Sleeper points-league draft for a season, normalized to GradedDraft.
 * Mirrors the Sleeper branch of loadDraftData() in PointsDraftView.vue.
 * Assumes the season's historical draft/matchups/rosters/users are already loaded
 * into the league store — this function only reads from the store, it never
 * triggers a load itself. Returns null if no draft (or no picks) is found.
 */
export async function loadSleeperPointsDraft(args: {
  season: number
  currentUserId: string | null
  sport?: string
}): Promise<GradedDraft | null> {
  const leagueStore = useLeagueStore()
  const seasonKey = String(args.season)
  const sport = args.sport || 'football'

  const draft = leagueStore.historicalDrafts.get(seasonKey)
  if (!draft || !draft.picks || draft.picks.length === 0) return null

  // Exclude keeper picks from grading and rank computation entirely — a kept star
  // shouldn't distort the position-rank pools or team grades.
  const isKeeper = (pk: any) => {
    const v = pk?.metadata?.is_keeper
    return v === true || v === 'true' || v === 1 || v === '1'
  }
  const keeperCount = draft.picks.filter(isKeeper).length
  const nonKeeperPicks = draft.picks.filter((p: any) => !isKeeper(p))

  const rosters = leagueStore.historicalRosters.get(seasonKey) || []
  const users = leagueStore.historicalUsers.get(seasonKey) || []
  const matchups = leagueStore.historicalMatchups.get(seasonKey)
  const seasonInfo = leagueStore.historicalSeasons.find((s) => s.season === seasonKey)

  // Build player positions map from draft picks
  const playerPositions = new Map<string, string>()
  nonKeeperPicks.forEach((pick: any) => {
    const pos = pick.metadata?.position
    if (pos && pick.player_id) playerPositions.set(pick.player_id, pos)
  })

  // Per-player season stats (used for current position rank), sourced from matchups
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  const playerStats = matchups
    ? draftAnalysisService.calculatePlayerSeasonStats(matchups, playoffStart - 1, playerPositions)
    : new Map()

  // Injury/incomplete-season guard: a non-keeper pick is excluded from grading when it
  // missed most of the season AND didn't produce — the points check prevents false-excluding
  // a rookie/midseason callup with few games but big points (a real steal). posMaxGames /
  // posMaxPoints are the max games / season points among non-keeper picks at that position.
  const posMaxGames = new Map<string, number>()
  const posMaxPoints = new Map<string, number>()
  for (const pick of nonKeeperPicks as any[]) {
    const position = pick.metadata?.position || 'Unknown'
    const stats = playerStats.get(pick.player_id)
    if (stats && stats.gamesPlayed !== undefined) {
      posMaxGames.set(position, Math.max(posMaxGames.get(position) || 0, stats.gamesPlayed))
    }
    const points = stats?.totalPoints ?? 0
    posMaxPoints.set(position, Math.max(posMaxPoints.get(position) || 0, points))
  }
  const isIncomplete = (pick: any): boolean => {
    const stats = playerStats.get(pick.player_id)
    if (!stats || stats.gamesPlayed === undefined) return false // unknown games — never exclude
    const position = pick.metadata?.position || 'Unknown'
    const maxGames = posMaxGames.get(position) || 0
    if (maxGames < 20) return false // position pool too small to be meaningful
    if (stats.gamesPlayed >= 0.5 * maxGames) return false
    const points = stats.totalPoints ?? 0
    const maxPoints = posMaxPoints.get(position) || 0
    if (points >= 0.5 * maxPoints) return false
    return true
  }
  const incompleteCount = nonKeeperPicks.filter(isIncomplete).length
  console.debug('[draft report] Sleeper incompleteCount', incompleteCount)

  const gradedPicks = nonKeeperPicks.filter((p: any) => !isIncomplete(p))

  // Position rank as drafted: order each position was taken in the draft
  const positionDraftOrder: Record<string, string[]> = {}
  gradedPicks.forEach((pick: any) => {
    const pos = pick.metadata?.position
    if (pos && pick.player_id) {
      if (!positionDraftOrder[pos]) positionDraftOrder[pos] = []
      positionDraftOrder[pos].push(pick.player_id)
    }
  })

  // Team lookup keyed by roster_id
  const teamLookup = new Map<number, { name: string; avatar: string }>()
  rosters.forEach((roster: any) => {
    const user = users.find((u: any) => u.user_id === roster.owner_id)
    const avatar = seasonInfo ? sleeperService.getAvatarUrl(roster, user, seasonInfo) : ''
    teamLookup.set(roster.roster_id, {
      name: sleeperService.getTeamName(roster, user),
      avatar,
    })
  })

  const numTeams = rosters.length || 12
  const totalPicks = gradedPicks.length

  // Kept players — labeled with a finished tier from a MANUAL full-pool position rank.
  // We can't use PlayerSeasonStats.positionRank here: keepers are excluded from
  // playerPositions (to protect the non-keeper grading pools), so the stats engine buckets
  // them as FLEX and their positionRank is a FLEX-pool rank, not their real position. Build
  // a separate full-pool rank over ALL picks keyed by real position + season points, exactly
  // like the ESPN loader does. This does NOT touch playerPositions or the grading rank logic.
  const tierConfig = getTierConfig(numTeams)
  const pointsOf = (playerId: string) => playerStats.get(playerId)?.totalPoints ?? 0
  const byPos = new Map<string, { id: string; pts: number }[]>()
  for (const p of draft.picks) {
    const pos = p.metadata?.position || 'Unknown'
    const id = String(p.player_id)
    if (!byPos.has(pos)) byPos.set(pos, [])
    byPos.get(pos)!.push({ id, pts: pointsOf(id) })
  }
  const fullPositionRankMap = new Map<string, number>()
  for (const [, arr] of byPos) {
    arr.sort((a, b) => b.pts - a.pts).forEach((x, i) => fullPositionRankMap.set(x.id, i + 1))
  }
  const keepers: KeeperInfo[] = draft.picks.filter(isKeeper).map((pick: any) => {
    const position = pick.metadata?.position || 'Unknown'
    const playerName =
      pick.metadata?.first_name && pick.metadata?.last_name
        ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
        : `Player ${pick.player_id}`
    const teamInfo = teamLookup.get(pick.roster_id)
    const id = String(pick.player_id)
    return {
      teamKey: `sleeper_${pick.roster_id}`,
      teamName: teamInfo?.name || `Team ${pick.roster_id}`,
      teamLogo: teamInfo?.avatar || '',
      playerName,
      position,
      round: pick.round,
      points: pointsOf(id),
      finishedTier: getTier(fullPositionRankMap.get(id) ?? 999, tierConfig),
      headshot: pick.metadata?.headshot_url || undefined,
    }
  })

  const picks: GradedPick[] = gradedPicks.map((pick: any) => {
    const position = pick.metadata?.position || 'Unknown'
    const playerName =
      pick.metadata?.first_name && pick.metadata?.last_name
        ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
        : `Player ${pick.player_id}`

    // Get drafted position rank
    const draftedRank = (positionDraftOrder[position]?.indexOf(pick.player_id) ?? -1) + 1

    // Get current position rank from stats
    const stats = playerStats.get(pick.player_id)
    let currentRank = 999
    if (stats) {
      const samePositionPlayers = Array.from(playerStats.entries())
        .filter(([, s]: [string, any]) => s.position === position)
        .sort((a: any, b: any) => b[1].totalPoints - a[1].totalPoints)
      currentRank = samePositionPlayers.findIndex(([id]: [string, any]) => id === pick.player_id) + 1
      if (currentRank === 0) currentRank = 999
    }

    const overallPick = pick.pick_no || pick.draft_slot
    const result = calculatePickScore(
      overallPick,
      pick.round,
      draftedRank || pick.round,
      currentRank,
      position,
      numTeams,
      totalPicks,
      sport
    )

    const teamInfo = teamLookup.get(pick.roster_id)

    return {
      teamKey: `sleeper_${pick.roster_id}`,
      teamName: teamInfo?.name || `Team ${pick.roster_id}`,
      teamLogo: teamInfo?.avatar || '',
      playerName,
      position,
      round: pick.round,
      overallPick,
      score: result.totalScore,
      grade: scoreToGrade(result.totalScore),
      verdict: result.verdict,
      tierMovement: result.tierMovement,
      draftedTier: result.draftedTier,
      finishedTier: result.finishedTier,
      headshot: pick.metadata?.headshot_url || undefined,
    }
  })

  const picksByTeam = new Map<string, GradedPick[]>()
  for (const pick of picks) {
    if (!picksByTeam.has(pick.teamKey)) picksByTeam.set(pick.teamKey, [])
    picksByTeam.get(pick.teamKey)!.push(pick)
  }

  const unrankedTeams = [...picksByTeam.entries()].map(([teamKey, teamPicks]) => {
    const gradeResult = calculateTeamGrade(teamPicks.map((p) => ({ round: p.round, score: p.score, verdict: p.verdict })))
    return {
      teamKey,
      teamName: teamPicks[0]?.teamName || 'Team',
      teamLogo: teamPicks[0]?.teamLogo || '',
      gradeScore: gradeResult.gradeScore,
    }
  })

  unrankedTeams.sort((a, b) => b.gradeScore - a.gradeScore)

  // Relative grading uses the count of teams that actually drafted (distinct teamKeys),
  // not the league's roster count — matches PointsDraftView's teamGrades computed.
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

  const myRoster = args.currentUserId ? rosters.find((r: any) => r.owner_id === args.currentUserId) : undefined
  const myTeamKey = myRoster ? `sleeper_${myRoster.roster_id}` : null

  return { picks, teams, numTeams, myTeamKey, keeperCount, keepers, incompleteCount }
}
