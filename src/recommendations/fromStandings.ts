import type { CategoryDef, MyTeamCategoryProfile, TeamCategoryRecord } from './types'

/** Subset of the app's StandingsEntry we depend on (CategoryStandingsTable.vue:167-181). */
export interface StandingsEntryLike {
  team: { teamId: string; name: string; avatar?: string }
  perCategoryWins?: Record<string, number>
  perCategoryLosses?: Record<string, number>
}

export function profileFromStandings(
  allStandings: StandingsEntryLike[],
  cats: CategoryDef[],
  myTeamId: string,
): MyTeamCategoryProfile {
  const mine = allStandings.find((s) => s.team.teamId === myTeamId)
  if (!mine) {
    throw new Error(`profileFromStandings: team ${myTeamId} not found in standings`)
  }

  const categories: TeamCategoryRecord[] = cats.map((cat) => {
    // Rank: sort all teams by this category's win count desc; my position = rank.
    const sorted = [...allStandings].sort(
      (a, b) => (b.perCategoryWins?.[cat.statId] ?? 0) - (a.perCategoryWins?.[cat.statId] ?? 0),
    )
    const rank = sorted.findIndex((s) => s.team.teamId === myTeamId) + 1
    return {
      statId: cat.statId,
      wins: mine.perCategoryWins?.[cat.statId] ?? 0,
      losses: mine.perCategoryLosses?.[cat.statId] ?? 0,
      ties: 0,
      rank,
    }
  })

  return {
    teamId: mine.team.teamId,
    teamName: mine.team.name,
    numTeams: allStandings.length,
    categories,
  }
}
