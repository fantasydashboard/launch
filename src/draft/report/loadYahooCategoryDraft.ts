import { yahooService } from '@/services/yahoo'
import { calculatePickScore, scoreToGrade, calculateTeamGrade, getRelativeTeamGrade } from '@/services/draftGrading'
import { isLowerBetter } from '@/players/direction'
import { categorySeasonValue, type CatValueCat, type CatValuePlayer } from './categorySeasonValue'
import type { GradedDraft, GradedPick, GradedTeam } from './types'

/**
 * Fetch + grade a Yahoo CATEGORY-league draft for a season, normalized to GradedDraft.
 * Mirrors loadYahooPointsDraft but ranks each drafted player within position by summed
 * season category z-score (categorySeasonValue) instead of total fantasy points.
 * Like the points loader, Yahoo exposes no keeper flag or games-played source, so all
 * non-predraft picks are graded and there is no injury/incomplete guard.
 */
export async function loadYahooCategoryDraft(args: { leagueKey: string; sport?: string }): Promise<GradedDraft | null> {
  const { leagueKey } = args
  const sport = args.sport || 'baseball'

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

  // Scoring categories (+ direction) for this league — filter out display-only stats.
  let cats: CatValueCat[] = []
  try {
    const settings = await yahooService.getLeagueScoringSettings(seasonLeagueKey)
    const statCats: any[] = settings?.stat_categories ?? []
    cats = statCats
      .filter((c: any) => {
        const d = c.stat?.is_only_display_stat ?? c.is_only_display_stat
        return d !== '1' && d !== 1
      })
      .map((c: any) => {
        const statId = String(c.stat?.stat_id ?? c.stat_id)
        const label = String(c.stat?.display_name ?? c.stat?.name ?? statId)
        return { statId, lowerIsBetter: isLowerBetter(label) }
      })
      .filter((c: any) => c.statId && c.statId !== 'undefined')
  } catch {
    cats = []
  }

  const teamLookup = new Map<string, any>()
  for (const team of standings) {
    teamLookup.set(team.team_key, team)
  }

  // Category value pool: every drafted player z-scored across all scoring cats.
  const valuePlayers: CatValuePlayer[] = draftResults.picks.map((pick: any) => {
    const player = players.get(pick.player_key) || {}
    const stat = stats.get(pick.player_key)
    return {
      playerId: pick.player_key,
      position: player.position || 'Unknown',
      stats: (stat?.stats as Record<string, number>) || {},
    }
  })
  const catValue = categorySeasonValue(valuePlayers, cats)

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

  // Current position rank: players within a position sorted by category value desc
  const currentPositionRankMap = new Map<string, number>()
  for (const [, playerKeysInPosition] of positionDraftOrder) {
    const sortedByValue = [...playerKeysInPosition].sort(
      (a, b) => (catValue.get(b) ?? 0) - (catValue.get(a) ?? 0),
    )
    sortedByValue.forEach((playerKey, index) => currentPositionRankMap.set(playerKey, index + 1))
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
      sport,
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
      headshot: player.headshot || undefined,
      proTeam: player.team || undefined,
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
    const teamsList = await yahooService.getTeams(seasonLeagueKey)
    myTeamKey = teamsList.find((t: any) => t.is_my_team)?.team_key ?? null
  } catch {
    myTeamKey = null
  }

  return { picks, teams, numTeams, myTeamKey, keeperCount: 0, keepers: [], incompleteCount: 0 }
}
