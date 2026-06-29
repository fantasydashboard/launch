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
 * Stat IDs that are pure counters/components, never a standalone H2H scoring category.
 * ESPN's per-week `scoreByStat` assigns WIN/LOSS/TIE results to these too, so without a
 * filter they leak into the category list (and the matrix / ECW model) as bogus columns
 * like AB, G, GS, BF. Deliberately conservative: ambiguous stats some leagues DO score —
 * H, TB, AVG, OPS, OBP, SLG, IP, QS, FPCT, OBA — are NOT listed, so we never hide a real
 * category. Only stats that are universally non-scoring belong here.
 */
const NON_CATEGORY_STAT_IDS: Record<string, Set<string>> = {
  // baseball: AB, PA, G, FC, SAC, HBP, IBB, GS, PC, GO, BF, GP
  baseball: new Set(['0', '17', '18', '20', '22', '25', '26', '53', '54', '66', '67', '99']),
}

/**
 * Map an ESPN category breakdown + team list into the platform-neutral shapes
 * MyTeamView's analytics core consumes. Standings are keyed by `espn_<id>` to
 * match the breakdown map keys and getMyTeam's team id.
 */
export function mapBreakdownToCategoryData(
  breakdown: EspnBreakdownLike,
  teams: EspnTeamLike[],
  sport?: string,
): EspnCategoryData {
  const standings: StandingsEntryLike[] = teams.map((t) => {
    const key = `espn_${t.id}`
    return {
      team: { teamId: key, name: t.name, avatar: t.logo },
      perCategoryWins: breakdown.teamCategoryWins.get(key) ?? {},
      perCategoryLosses: breakdown.teamCategoryLosses.get(key) ?? {},
    }
  })

  // Drop pure-counter stats that aren't real scoring categories. Guarded: if the filter
  // would remove everything (unexpected stat-id space), fall back to the raw list.
  const deny = (sport && NON_CATEGORY_STAT_IDS[sport]) || null
  let scoringCats = deny ? breakdown.categories.filter((c) => !deny.has(c.stat_id)) : breakdown.categories
  if (!scoringCats.length) scoringCats = breakdown.categories

  const categories: CategoryDef[] = scoringCats.map((c) => ({
    statId: c.stat_id,
    label: c.display_name || c.name || `S${c.stat_id}`,
    name: c.name || c.display_name || `Stat ${c.stat_id}`,
    side: 'hit',
    higherIsBetter: !c.is_negative,
  }))

  const cats = scoringCats.map((c) => ({
    statId: c.stat_id,
    lowerIsBetter: !!c.is_negative,
  }))

  return { standings, categories, cats }
}
