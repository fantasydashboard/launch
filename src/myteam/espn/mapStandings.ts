import type { StandingsEntryLike } from '@/recommendations/fromStandings'
import type { CategoryDef } from '@/recommendations/types'

/** The subset of the ESPN getCategoryStatsBreakdown result this mapper reads. */
export interface EspnBreakdownLike {
  categories: { stat_id: string; name: string; display_name: string; is_negative?: boolean }[]
  teamCategoryWins: Map<string, Record<string, number>>
  teamCategoryLosses: Map<string, Record<string, number>>
}

/** The subset of EspnTeam this mapper reads (id + display fields). */
export interface EspnTeamLike {
  id: number
  name: string
  logo?: string
}

export interface EspnCategoryData {
  standings: StandingsEntryLike[]
  categories: CategoryDef[]
  cats: { statId: string; lowerIsBetter: boolean }[]
}

/**
 * Map an ESPN category breakdown + team list into the platform-neutral shapes
 * MyTeamView's analytics core consumes. Standings are keyed by `espn_<id>` to
 * match the breakdown map keys and getMyTeam's team id.
 */
export function mapBreakdownToCategoryData(
  breakdown: EspnBreakdownLike,
  teams: EspnTeamLike[],
): EspnCategoryData {
  const standings: StandingsEntryLike[] = teams.map((t) => {
    const key = `espn_${t.id}`
    return {
      team: { teamId: key, name: t.name, avatar: t.logo },
      perCategoryWins: breakdown.teamCategoryWins.get(key) ?? {},
      perCategoryLosses: breakdown.teamCategoryLosses.get(key) ?? {},
    }
  })

  const categories: CategoryDef[] = breakdown.categories.map((c) => ({
    statId: c.stat_id,
    label: c.display_name || c.name || `S${c.stat_id}`,
    name: c.name || c.display_name || `Stat ${c.stat_id}`,
    side: 'hit',
    higherIsBetter: !c.is_negative,
  }))

  const cats = breakdown.categories.map((c) => ({
    statId: c.stat_id,
    lowerIsBetter: !!c.is_negative,
  }))

  return { standings, categories, cats }
}
