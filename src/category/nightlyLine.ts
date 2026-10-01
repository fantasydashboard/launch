/**
 * One night of a projection, out of a season of it.
 *
 * WHY THIS IS ITS OWN MODULE. A HockeyProjection's `stats` are projected SEASON TOTALS, with
 * `stats.GP` the games they were earned over — but scoreLine prices a line against the units a
 * man adds TONIGHT. Hand it the season totals and every number is roughly eighty times too
 * large, which does not look like an error on screen: the ranking is still monotone in the same
 * quantity, so the order is plausible and only the magnitudes are nonsense. A board that is
 * wrong by a constant and still sorted is the hardest kind of wrong to notice.
 *
 * rosterExpectation already divides by GP for its own purposes. This exists so the second
 * consumer cannot quietly forget to, and so the rule has a test of its own.
 */

/**
 * A player's expected line for a single game, or null when it cannot be known.
 *
 * NULL RATHER THAN ZERO. No projected games is an unknown schedule, not a scoreless season.
 * Returning a line of zeroes would rank him as a real, bad option; returning null lets the
 * caller leave him off a board he does not belong on.
 */
export function perGameLine(stats: Record<string, number> | undefined): Record<string, number> | null {
  const gp = Number(stats?.GP)
  if (!stats || !Number.isFinite(gp) || gp <= 0) return null

  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(stats)) {
    const n = Number(v)
    if (!Number.isFinite(n)) continue
    /*
     * Games played is the denominator, not a column — dividing it by itself yields a 1 that
     * would be scored as a real unit if the league ever listed GP as a category.
     */
    if (k === 'GP') continue
    out[k] = n / gp
  }
  return out
}
