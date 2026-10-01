/**
 * Correcting the one position the projection feed is reliably wrong about.
 *
 * WHAT WAS MEASURED. Sleeper's own weekly projections against Sleeper's own actuals, same
 * scoring key both sides, players who actually played, four seasons:
 *
 *            2022    2023    2024    2025     4yr      n
 *     QB    0.806   0.880   0.903   0.854   0.860   2,183
 *     RB    0.982   1.039   1.055   0.957   1.006   4,200
 *     WR    0.933   1.000   1.024   0.917   0.968   6,588
 *     TE    0.958   1.031   1.038   0.991   1.003   3,218
 *
 * QUARTERBACKS ONLY, and the restraint is the point. QB is below one in all four seasons and
 * never reaches 0.91 — a 14% over-projection that does not go away. The other three straddle
 * one, and their year-to-year spread (0.08 to 0.11) is LARGER than their average distance from
 * it (0.006, 0.032, 0.003). Correcting those would be fitting noise and calling it a model, so
 * they are left at 1.0 and the table above is kept so the next person can see why.
 *
 * WHY IT MATTERS WHEN IT CANNOT CHANGE A START/SIT. Scaling every quarterback by the same
 * number leaves their order untouched, so this is worth nothing for picking a quarterback to
 * start. It matters wherever we SUM ACROSS POSITIONS, which this product does constantly: a
 * trade weighing a quarterback against a receiver, the landscape ranking whole lineups, the
 * power order, and the playoff odds that run off those lineup totals. In all of them a team
 * with a strong quarterback was carrying an inflated valuation, and a quarterback-for-skill
 * trade was priced about fourteen percent in the quarterback's favour.
 *
 * NOT APPLIED TO OBSERVED POINTS. What a player actually scored is a fact, not a forecast.
 * Only the projection is adjusted; the blend of the two then works on one honest scale.
 *
 * Harness: /tmp/wk/bias4.py. Re-measure before trusting it in a season whose scoring has moved.
 */

/** Actual over projected, measured 2022-2025. Positions not listed are deliberately 1.0. */
export const POSITION_CALIBRATION: Record<string, number> = {
  QB: 0.86,
}

/**
 * Scale a projected figure onto the calibrated scale.
 *
 * Returns the input untouched for any position we have not shown to be biased, which is most
 * of them — an uncalibrated position is the normal case, not a gap.
 */
export function calibrateProjection(points: number, position?: string): number {
  if (!Number.isFinite(points)) return points
  const f = position ? POSITION_CALIBRATION[position.toUpperCase()] : undefined
  return typeof f === 'number' ? points * f : points
}

/** The factor itself, for a caller building a per-key map. */
export function calibrationFor(position?: string): number {
  const f = position ? POSITION_CALIBRATION[position.toUpperCase()] : undefined
  return typeof f === 'number' ? f : 1
}
