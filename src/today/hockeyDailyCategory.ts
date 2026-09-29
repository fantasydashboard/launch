import { buildHockeyCategoryValue, type HockeyCategory } from '@/hockey/hockeyCategoryValue'
import type { HockeyProjection } from '@/hockey/hockeyValue'
import { shiftToNonNegative } from '@/composables/useDailyCategoryValue'
import type { PlayerValue, ValueByKey } from '@/myteam/playerValue'

/**
 * What a hockey player is worth TONIGHT in a category league.
 *
 * WHY THIS EXISTS. The daily page priced category leagues through useDailyCategoryValue, which
 * divides a season value by a FanGraphs projection's games. Hockey has no FanGraphs row, so
 * every skater divided by zero games, every value came back 0.0, and the panel sat on "still
 * reading tonight's values" forever — a loading state for data that was never coming. The points
 * path had had its own hockey branch since hockey shipped; the category path never got one.
 *
 * IT IS A DIVISOR, NOT A NEW MODEL. buildHockeyCategoryValue already answers "who is better this
 * season", is tested, and is what the rankings board and the draft board rank on. Re-deriving it
 * here would give the daily page its own opinion, and a product that disagrees with itself about
 * who is good is worse than one that says nothing. So this divides that number by the games it
 * was earned over, which is the only thing that separates tonight from the season.
 */

/** Games the projection expects him to play. Absent is unknown, and unknown is not one. */
function gamesOf(p: HockeyProjection | undefined): number {
  const g = Number(p?.stats?.GP)
  return Number.isFinite(g) && g > 0 ? g : 0
}

export function hockeyDailyCategoryValue(input: {
  projections: Record<string, HockeyProjection>
  categories: HockeyCategory[]
  /** How many players this league drafts; the second standardising pass uses only those. */
  draftablePlayers?: number
}): ValueByKey {
  const { projections, categories, draftablePlayers } = input
  if (!categories.length || !Object.keys(projections).length) return {}

  const { totalByKey } = buildHockeyCategoryValue({ projections, categories, draftablePlayers })

  /*
   * Season z-sum over projected games. A man with no projected games has an unknown schedule,
   * not a one-game season — dividing by one would hand the loudest answer on the board to the
   * least information on it, so he is left out of the rates entirely and scored at zero below.
   */
  const perGame = new Map<string, number>()
  for (const [key, total] of Object.entries(totalByKey)) {
    const games = gamesOf(projections[key])
    if (games > 0) perGame.set(key, total / games)
  }

  /*
   * Lifted so the worst player sits at zero, for the reason documented on shiftToNonNegative:
   * roughly half of any z-sum pool is negative, a player with no game scores exactly 0, and a
   * negative value would therefore rank BELOW a man who is not playing at all. Adding a constant
   * to the per-game rate preserves every ordering, which is the entire content of the ranking.
   */
  const rates = shiftToNonNegative(perGame)

  const out: ValueByKey = {}
  for (const key of Object.keys(totalByKey)) {
    const games = gamesOf(projections[key])
    const rate = rates.get(key) ?? 0
    const isGoalie = projections[key]?.position === 'G'
    out[key] = {
      /* total/games is what the daily path reads back out, so total carries the lift. */
      total: rate * games,
      games,
      perStat: {},
      /* The lineup engine speaks baseball's two sides. A goalie fills the seat a pitcher does —
         one slot, its own scarcity — so he is priced on that side of the board rather than beside
         skaters. */
      side: isGoalie ? 'pit' : 'hit',
      weeklyCap: isGoalie ? 1.3 : 6.5,
    } as PlayerValue
  }
  return out
}
