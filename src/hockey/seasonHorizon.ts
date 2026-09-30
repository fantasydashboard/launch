import { NHL_SEASON_GAMES } from './hockeyValue'

/** Scoring weeks in an NHL season. Lives here, beside the only rule that reads it. */
export const NHL_SEASON_WEEKS = 26
import type { HockeyProjection } from './hockeyProjectionSource'
import type { SkaterRate } from './nhlRates'

/**
 * How much season is left, and how much of it each player has already used.
 *
 * WHY IT IS A MODULE AND NOT A COMPOSABLE. This lived inside useHockeyValue, so only the
 * surfaces built on that composable had a horizon at all. The /rankings board builds its own
 * values with `buildHockeyValue({ projections, weights })` — no gamesPlayed, no gamesLeft —
 * which means a FULL-SEASON total under a heading that reads "REST OF SEASON".
 *
 * In preseason the two coincide and nothing looks wrong. In January they do not: a player
 * forty games into his year is shown his whole season on the rankings board and his remaining
 * games on Trades, and the same league's two pages disagree about what a player is worth. A
 * product that argues with itself about who is good is worse than one that says nothing.
 *
 * Extracted rather than reimplemented, because two copies of this rule would drift the moment
 * either was touched — which is exactly how the disagreement arose.
 */

export interface SeasonHorizon {
  /** Nights the season has left, from the CALENDAR — a ceiling, not a per-player estimate. */
  gamesLeft: number
  /** Games already gone, per player. Empty in preseason: the full projection still remains. */
  gamesPlayed: Record<string, number>
}

/** Nights the season has left, from the calendar alone. */
export function gamesLeftFromWeeks(weeksLeft: number): number {
  const weeks = Math.max(0, Math.min(NHL_SEASON_WEEKS, Number(weeksLeft) || 0))
  return Math.round(NHL_SEASON_GAMES * (weeks / NHL_SEASON_WEEKS))
}

export function seasonHorizon(input: {
  weeksLeft: number
  projections: Record<string, HockeyProjection>
  /** The rate model, which carries each skater's real games played. */
  rateByKey: Record<string, SkaterRate | undefined>
}): SeasonHorizon {
  const gamesLeft = gamesLeftFromWeeks(input.weeksLeft)
  const elapsed = 1 - gamesLeft / NHL_SEASON_GAMES
  /* Preseason: nothing has been used, so there is nothing to subtract. Returning an empty map
     rather than a map of zeroes keeps "not started" distinct from "measured at zero". */
  if (elapsed <= 0) return { gamesLeft, gamesPlayed: {} }

  const gamesPlayed: Record<string, number> = {}
  for (const [key, p] of Object.entries(input.projections)) {
    const rate = input.rateByKey[key]
    /* Measured, where the rate model has him. */
    if (rate) { gamesPlayed[key] = rate.gamesPlayed; continue }
    /*
     * Goalies have no rate row — there is no goalie rate model — so they take the calendar's
     * share of their own projected appearances. Named here rather than left to look like a
     * measurement, because it is an estimate and the line above is not.
     */
    const total = p.position === 'G' ? (p.stats.DEC || p.stats.GP || 0) : (p.stats.GP || 0)
    gamesPlayed[key] = total * elapsed
  }
  return { gamesLeft, gamesPlayed }
}
