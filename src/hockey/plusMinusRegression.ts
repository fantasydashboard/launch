/**
 * Plus-minus, regressed to what it can actually predict.
 *
 * WHY THIS COLUMN AND NOT THE OTHERS. Every stat is noisy; this one is barely a stat. Measured
 * over three completed seasons, a skater's per-82 plus-minus correlates with his own NEXT
 * season at r = 0.29 and r = 0.34. Goals and shots persist; plus-minus is mostly which team he
 * is on and which bounces went in while he was over the boards.
 *
 * WHAT THAT IMPLIES, and it is not a matter of taste: the spread of a PROJECTION should be
 * about r times the spread of the season that produced it. That is what regression to the mean
 * means. Observed per-82 plus-minus has a mean |x| of ~12.5, so a projected column should sit
 * near 0.32 x 12.5 = 4.0. Ours sat at 8.9 — twice as wide as anything it could support. An
 * outside baseline built by analysts sits at 4.2, which is that arithmetic, independently.
 *
 * WHAT IT WAS COSTING. Plus-minus is worth two points a unit in common points scoring, so a
 * doubled column moves players a long way on nothing. Aleksander Barkov was projected +16
 * against a baseline +8 and sat 9th among centres on our board against 25th on theirs; Jack
 * Eichel +19 against +6. And because we project only the top few hundred players, the
 * offsetting negatives live in the fringe nobody projects — so our column also summed to +629
 * across a league where plus-minus is zero-sum by construction. Not a wrong estimate; a
 * violation of a conservation law.
 *
 * WHY REGRESS TOWARD THE POOL MEAN RATHER THAN ZERO. Zero is the whole league's mean, and this
 * pool is not the whole league — it is the rated skaters, who really are collectively positive
 * because the men they outscore are the ones nobody projects. Pulling to zero would invent a
 * different bias to cure this one. The mean is measured from the pool in hand.
 */

/**
 * How much of a skater's plus-minus edge survives into next season.
 *
 * Measured, not chosen: r = 0.293 (2023-24 -> 2024-25) and r = 0.342 (2024-25 -> 2025-26),
 * over ~500 skaters with 40+ games in both. Taken as the average rather than the kinder of
 * the two.
 */
export const PLUS_MINUS_PERSISTENCE = 0.32

/**
 * Pull every value toward the mean of the set, keeping `persistence` of the distance.
 *
 * Deliberately a whole-pool operation rather than a per-player one: the mean it regresses
 * toward has to come from the same population being regressed, and a function handed one
 * player has no way to know it.
 */
export function regressToMean(values: number[], persistence = PLUS_MINUS_PERSISTENCE): number[] {
  if (!values.length) return []
  const usable = values.filter((v) => Number.isFinite(v))
  if (!usable.length) return values.map(() => 0)
  const mean = usable.reduce((s, v) => s + v, 0) / usable.length
  return values.map((v) => (Number.isFinite(v) ? mean + (v - mean) * persistence : mean))
}

/** A rate carrying a per-game plus-minus. Structural, so this file needs no import. */
export interface HasPlusMinus { perGame: Record<string, number> }

/**
 * Regress the plus-minus column of a whole set of rates, in place of the raw one.
 *
 * Returns new objects; nothing is mutated, because these rates are shared by every surface
 * and a board quietly rewriting another board's inputs is its own kind of bug.
 */
export function regressPlusMinus<T extends HasPlusMinus>(
  rates: T[],
  persistence = PLUS_MINUS_PERSISTENCE,
): T[] {
  if (!rates.length) return rates
  const regressed = regressToMean(rates.map((r) => r.perGame?.plusMinus ?? 0), persistence)
  return rates.map((r, i) => ({ ...r, perGame: { ...r.perGame, plusMinus: regressed[i] } }))
}
