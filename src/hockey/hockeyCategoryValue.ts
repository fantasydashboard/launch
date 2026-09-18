import { HOCKEY_STAT_BY_ID, LOWER_IS_BETTER } from './hockeyPositions'
import type { HockeyProjection } from './hockeyValue'

/**
 * What a player is worth in a CATEGORY league, where nothing is worth points.
 *
 * A points league has an exchange rate: a goal is two points, a block is half of one, and
 * adding them up is the whole job. A category league has no exchange rate at all. You win a
 * week by taking more of the categories than your opponent, so a goal is worth whatever
 * winning the goals column is worth, which depends entirely on how tightly bunched everyone
 * else is in that column. The currency is STANDARD DEVIATIONS, not goals.
 *
 * So each category is standardised — a player's projection minus the pool's mean, over the
 * pool's spread — and a player is the sum of his z-scores. A forward two deviations clear in
 * shots and half a deviation clear in hits is worth 2.5; so is one who is 1.25 clear in both.
 * That is the actual claim a category league makes, and it is why points-league rankings
 * mislead in one: points rankings reward the categories with big numbers attached.
 *
 * THREE THINGS THIS HAS TO GET RIGHT, AND EACH HAS A WRONG ANSWER THAT LOOKS FINE.
 *
 * 1. WHICH POOL. Standardising against all 456 projected players sets the mean at a fourth
 *    liner, and every startable player then looks good — the spread is dominated by people
 *    nobody drafts. The pool has to be the players who actually get taken, which is a
 *    circular definition, so it is solved in two passes: rank once against everybody, keep
 *    the top however-many-get-drafted, then rank again against only those.
 *
 * 2. GOALIES ARE NOT SKATERS. A goalie has no shots on goal and a skater has no saves.
 *    Standardising a goalie's zero goals against a pool of skaters would bury every goalie
 *    alive under a stack of large negatives. Each category is therefore standardised only
 *    over the players who HAVE that stat, and a player sums only his own categories. The
 *    totals that come out are not comparable across positions — a goalie sums five columns
 *    and a forward six — and that is fine, because nothing compares them here. Replacement
 *    level does, downstream, by measuring each against the last man who holds his seat.
 *
 * 3. RATE CATEGORIES ARE NOT COUNTING CATEGORIES. A .930 save percentage over twelve starts
 *    and a .930 over sixty are the same number and wildly different players. Taking the rate
 *    at face value hands the category to whoever has the smallest sample. Rates are
 *    converted to IMPACT — how far the rate sits from the pool average, times the volume it
 *    was earned over — before anything is standardised.
 */

/** One column a category league is decided in. */
export interface HockeyCategory {
  /** Unified stat key, e.g. 'G' or 'SVPCT'. */
  key: string
  /** ESPN's stat id, kept so a surface can explain where the column came from. */
  statId: number
  /** True when a lower number wins the column: goals against, GAA, losses. */
  reverse: boolean
}

/**
 * Rate categories, and the volume each one is earned over.
 *
 * A rate not on this list is standardised as-is, which is correct for a counting stat and
 * would be wrong for a rate — so anything rate-like that ESPN adds later must be added here
 * as well as to the stat map.
 */
export const RATE_VOLUME: Record<string, string> = {
  SVPCT: 'SA',      // save percentage is earned over shots faced
  GAA: 'TOI',       // goals-against average over time on ice
  WINPCT: 'DEC',    // win percentage over decisions
  TOIG: 'GP',       // minutes per game over games
}

/**
 * Which columns this league is decided in, from ESPN's `scoringItems`.
 *
 * In a category league every item in that list is an active category — unlike a points
 * league, where the list is every stat the league COULD score and most sit at zero. That
 * difference is why this function exists separately from the weight reader rather than
 * sharing its filter: applying the points-league rule here would return no categories at
 * all, because a category league assigns no points.
 *
 * DIRECTION COMES FROM THE LEAGUE FIRST. ESPN flags a lower-is-better column with
 * `isReverseItem`, and that is the league's own answer. The hardcoded list is only consulted
 * when no item in the league carries the flag, because several hockey columns genuinely go
 * both ways depending on house rules — penalty minutes are a category you win by having MORE
 * of in most leagues and fewer in some, and there is no way to know which from the stat
 * alone.
 */
export function categoriesFromScoringItems(
  items: { statId?: number; isReverseItem?: boolean }[] | undefined,
): { categories: HockeyCategory[]; unnamed: number[] } {
  const list = items ?? []
  const anyFlagged = list.some((it) => it?.isReverseItem === true)

  const categories: HockeyCategory[] = []
  const unnamed: number[] = []
  const seen = new Set<string>()

  for (const it of list) {
    const statId = Number(it?.statId)
    if (!Number.isFinite(statId)) continue
    const key = HOCKEY_STAT_BY_ID[statId]
    if (!key) { unnamed.push(statId); continue }
    if (seen.has(key)) continue
    seen.add(key)
    categories.push({
      key,
      statId,
      reverse: anyFlagged ? it.isReverseItem === true : LOWER_IS_BETTER.has(key),
    })
  }
  return { categories, unnamed: [...new Set(unnamed)].sort((a, b) => a - b) }
}

/** Mean and population standard deviation. Spread of zero is returned as zero, not as NaN. */
function moments(values: number[]): { mean: number; sd: number } {
  if (!values.length) return { mean: 0, sd: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return { mean, sd: Math.sqrt(variance) }
}

/**
 * A player's contribution in one category, before standardisation.
 *
 * Counting stats are themselves. Rates become impact: distance from the pool average times
 * the volume behind them, which is what actually moves a team's season-long rate. Returns
 * undefined when the player has no projection for the stat — ABSENT IS NOT ZERO, and a
 * skater with no save percentage must be left out of that column rather than entered at the
 * bottom of it.
 */
export function rawContribution(
  proj: HockeyProjection,
  key: string,
  poolRateMean: number,
): number | undefined {
  const value = proj.stats[key]
  if (!Number.isFinite(value)) return undefined

  const volumeKey = RATE_VOLUME[key]
  if (!volumeKey) return value

  const volume = proj.stats[volumeKey]
  if (!Number.isFinite(volume) || volume <= 0) return undefined
  return (value - poolRateMean) * volume
}

export interface HockeyCategoryInput {
  projections: Record<string, HockeyProjection>
  categories: HockeyCategory[]
  /**
   * How many players get drafted in this league. The second pass standardises against these
   * and only these. Absent means standardise against everybody, which is right for a pool
   * that has already been trimmed and wrong for the raw feed.
   */
  draftablePlayers?: number
}

export interface HockeyCategoryResult {
  /** playerKey -> total z-score, the quantity a category board ranks on. */
  totalByKey: Record<string, number>
  /** playerKey -> category key -> that player's z in that column. */
  perCategoryByKey: Record<string, Record<string, number>>
  /** The pool each column was standardised over, after trimming. */
  poolSizeByCategory: Record<string, number>
}

/**
 * One standardisation pass.
 *
 * `poolKeys` sets the yardstick — the mean and spread every z is measured against —
 * and `scoreKeys` is who gets measured. They are separate on purpose. Scoring only the pool
 * would delete everyone outside it from the board, and a draft board that silently stops at
 * the last draftable player is worst exactly where it is used most: late, when the pool has
 * emptied and the next name is by definition one nobody projected as draftable.
 */
function scorePass(
  projections: Record<string, HockeyProjection>,
  categories: HockeyCategory[],
  poolKeys: string[],
  scoreKeys: string[],
): HockeyCategoryResult {
  const totalByKey: Record<string, number> = {}
  const perCategoryByKey: Record<string, Record<string, number>> = {}
  const poolSizeByCategory: Record<string, number> = {}
  for (const key of scoreKeys) { totalByKey[key] = 0; perCategoryByKey[key] = {} }

  for (const cat of categories) {
    /* The rate mean has to be taken over rates before contributions can be computed, because
       impact is measured against it — so rate columns need this extra sweep first, and it
       runs over the POOL, since the pool is what a league-average rate should mean. */
    let rateMean = 0
    if (RATE_VOLUME[cat.key]) {
      const rates = poolKeys
        .map((k) => projections[k]?.stats[cat.key])
        .filter((v): v is number => Number.isFinite(v))
      rateMean = moments(rates).mean
    }

    const contribution = (k: string): number | undefined => {
      const proj = projections[k]
      return proj ? rawContribution(proj, cat.key, rateMean) : undefined
    }

    const poolValues: number[] = []
    for (const k of poolKeys) {
      const raw = contribution(k)
      if (raw !== undefined) poolValues.push(raw)
    }

    poolSizeByCategory[cat.key] = poolValues.length
    const { mean, sd } = moments(poolValues)
    if (!sd) continue   // a column nobody separates in decides nothing

    for (const k of scoreKeys) {
      const raw = contribution(k)
      if (raw === undefined) continue
      const z = ((raw - mean) / sd) * (cat.reverse ? -1 : 1)
      perCategoryByKey[k][cat.key] = z
      totalByKey[k] += z
    }
  }
  return { totalByKey, perCategoryByKey, poolSizeByCategory }
}

/**
 * Score every player for a category league.
 *
 * Two passes, for the reason in the header: the first ranks everybody against everybody to
 * find out who is draftable, the second re-ranks the draftable against each other. The
 * second pass is the answer; the first exists only to choose its pool.
 */
export function buildHockeyCategoryValue(input: HockeyCategoryInput): HockeyCategoryResult {
  const { projections, categories, draftablePlayers } = input
  const allKeys = Object.keys(projections)
  if (!allKeys.length || !categories.length) {
    return { totalByKey: {}, perCategoryByKey: {}, poolSizeByCategory: {} }
  }

  const first = scorePass(projections, categories, allKeys, allKeys)
  if (!draftablePlayers || draftablePlayers >= allKeys.length) return first

  /*
   * Trim by POSITION GROUP, not off one combined list.
   *
   * Taking the global top N would be a quiet disaster for goalies: they sum fewer columns
   * than skaters and their totals sit lower as a matter of arithmetic, so a global cut would
   * drop most of them and then standardise the survivors against a pool of the four best
   * goalies alive. Each group keeps its own share, in the proportion the group appears in
   * the feed, so the trim changes who is in the pool without changing its shape.
   */
  const byGroup = new Map<string, string[]>()
  for (const k of allKeys) {
    const group = projections[k]?.position === 'G' ? 'G' : 'SKATER'
    byGroup.set(group, [...(byGroup.get(group) ?? []), k])
  }

  const pool: string[] = []
  for (const [, groupKeys] of byGroup) {
    const share = Math.max(1, Math.round(draftablePlayers * (groupKeys.length / allKeys.length)))
    pool.push(
      ...[...groupKeys]
        .sort((a, b) => (first.totalByKey[b] ?? 0) - (first.totalByKey[a] ?? 0))
        .slice(0, share),
    )
  }

  /* Everybody is scored; only the yardstick shrinks. Players outside the pool come out
     negative, which is the true statement about them — not a reason to hide them. */
  return scorePass(projections, categories, pool, allKeys)
}
