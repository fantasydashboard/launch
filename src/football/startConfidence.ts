/**
 * How much a start/sit decision is actually worth agonising over.
 *
 * WHY THIS EXISTS
 *
 * Our weekly board is a passthrough: the order is the platform's own weekly projection, and
 * measurement says that is the right call. Three attempts to beat it on 2025 all failed —
 * blending our season-to-date form in (alpha=0 was best at every position), demoting players
 * the absence model expected to miss (fixed 3 of 1014 zero-starts and cost points elsewhere),
 * and adjusting by how the opponent's defence had performed against the position (monotonically
 * worse the harder it was applied). The projection is hard to beat and we do not beat it.
 *
 * What we CAN do, which no platform does, is tell a manager how much his decision matters.
 * Across every same-position pair of startable players in 2025 — 45,468 of them, both playing,
 * scored in half PPR — the higher projection won at a rate that depends only on the gap:
 *
 *     gap        pairs    higher projection won
 *     0-1 pt     8,923            51.8%
 *     1-2        7,733            56.7%
 *     2-3        6,860            61.0%
 *     3-5       10,454            66.2%
 *     5-8        7,683            72.7%
 *     8+         3,815            82.1%
 *
 * A point of projection is NOT worth the same everywhere: tight end scoring is compressed, so
 * one point separates two tight ends far more than it separates two quarterbacks. Fitting the
 * curve below per position recovers exactly that, and the spread is large enough to change
 * advice — a 2-point gap is a 62% call at TE and a 57% call at QB.
 *
 * Nothing else we tried predicts the winner of a close call, including the tail. On pairs
 * inside two points, past boom rate (51.2%), a player's own P90 to date (51.5%), air yards
 * (52.5%) and touchdown rate (49.5%) were all coin flips at picking which man went off. The
 * projection itself was the best predictor of a boom, at 57.6%. So when this function reports
 * a coin flip, that is the honest end of the analysis and not a gap waiting to be filled — the
 * right advice is to stop spending the week on it.
 */

/**
 * Points of projection that buy certainty, per position. Fitted by maximum likelihood on the
 * pairs above; higher means a point matters LESS, because the position's scoring is spread out.
 *
 * Kickers and defences are not in the fit (they are not a start/sit anyone agonises over) and
 * fall back to the all-position value.
 */
export const CONFIDENCE_SCALE: Record<string, number> = {
  QB: 13.3,
  RB: 10.9,
  WR: 9.5,
  TE: 7.0,
}

/** The all-position fit, used for anything not measured separately. */
export const CONFIDENCE_SCALE_DEFAULT = 10.0

/**
 * Probability that the player projected `gap` points higher actually outscores the other, as
 * a fraction in [0.5, 1).
 *
 * The one-parameter form is calibrated to within 0.6 of a point across every band of the table
 * above, which is closer than the bands themselves are measured, so a fancier curve would be
 * fitting noise.
 */
export function startConfidence(gap: number, position?: string): number {
  const k = (position && CONFIDENCE_SCALE[position.toUpperCase()]) || CONFIDENCE_SCALE_DEFAULT
  const g = Math.abs(gap)
  return 0.5 + 0.5 * (1 - Math.exp(-g / k))
}

/**
 * Below this, the projection is not separating two players enough to be worth a decision —
 * roughly a 2-point gap at receiver, 1.6 at tight end, 2.9 at quarterback.
 *
 * This replaces the flat points threshold the close-call list used to use. A flat 2.5 points
 * called a tight-end decision close when it was really a 64% edge, and called a quarterback
 * decision settled when it was really 60/40.
 */
export const CLOSE_CALL_MAX = 0.6

/** Below this there is no basis to choose at all, and the page should say so. */
export const COIN_FLIP_MAX = 0.55

/** Whether a decision is close enough to belong on the closest-calls list. */
export function isCloseCall(gap: number, position?: string): boolean {
  return startConfidence(gap, position) < CLOSE_CALL_MAX
}

/** Whether a decision is a true coin flip — the page should tell the manager to stop. */
export function isCoinFlip(gap: number, position?: string): boolean {
  return startConfidence(gap, position) < COIN_FLIP_MAX
}

/**
 * The confidence for a decision between two named positions.
 *
 * A FLEX seat can pit a back against a receiver, and the curve was fitted WITHIN a position —
 * so a cross-position comparison gets the all-position scale rather than a borrowed one. It is
 * the honest answer: we measured "two receivers two points apart", not "a back against a
 * receiver", and those are not the same question.
 */
export function startConfidencePair(gap: number, posA?: string, posB?: string): number {
  const a = posA?.toUpperCase()
  const b = posB?.toUpperCase()
  return startConfidence(gap, a && a === b ? a : undefined)
}

/** "57%" — for the one place on screen that states the number. */
export function confidenceLabel(gap: number, position?: string): string {
  return `${Math.round(startConfidence(gap, position) * 100)}%`
}
