/**
 * How many points a quarterback's own team is expected to score this week.
 *
 * WHY ONLY QUARTERBACKS. Compared against an analyst's weekly lists, our ordering already
 * tracks his closely at running back (0.95), receiver (0.91) and tight end (0.88). Quarterback
 * was the outlier at 0.79, and the disagreement had a clear shape: where he rated a passer
 * above us, his team's implied total was higher. The correlation between our rank difference
 * and the Vegas total was +0.46 at QB, +0.27 at RB, +0.15 at TE and −0.05 at WR.
 *
 * That is the whole case for scoping this to one position. A quarterback's week is mostly a
 * function of how much his offence scores; a receiver's is mostly target share, which the game
 * total barely moves. Applying this everywhere would add noise at receiver to fix a passer
 * problem, so it does not.
 *
 * WHY VEGAS RATHER THAN OUR OWN NUMBER. Same reason the dynasty board reads a market instead
 * of discounting projections by an age curve: a betting line is a price thousands of people
 * are exposed to, and it reacts to injuries, weather and game script within hours. Our weekly
 * projection is season-shaped and does not.
 */

/** A team's expected point total, derived from the game's spread and over/under. */
export type ImpliedTotals = Record<string, number>

/**
 * Split a game's over/under across its two teams using the spread.
 *
 * The favourite's share is half the total plus half the spread, the underdog's is half minus
 * half — which is the standard construction and, checked against an analyst's own published
 * numbers for the same week, reproduces them to within 0.28 points across 23 quarterbacks.
 */
export function impliedFromLine(
  overUnder: number,
  spread: number,
  favourite: 'home' | 'away',
): { home: number; away: number } {
  const half = overUnder / 2
  const edge = Math.abs(spread) / 2
  return favourite === 'home'
    ? { home: half + edge, away: half - edge }
    : { home: half - edge, away: half + edge }
}

/**
 * How hard the environment pushes. Fitted, not chosen.
 *
 * Sweeping the exponent against the analyst's own quarterback order, correlation rose from
 * 0.80 unadjusted to a peak of 0.90 at 0.5 and fell away on both sides — 0.877 at 0.25, 0.882
 * at 0.75, 0.79 by 3.0. A square root of the ratio, in other words: a team expected to score
 * 20% more lifts its quarterback about 10%.
 *
 * CALIBRATED ON ONE WEEK, 23 QUARTERBACKS, AGAINST ONE ANALYST. That is thin evidence for a
 * constant, and it is written here rather than buried so it can be re-fitted against actual
 * results rather than against somebody's opinion.
 */
export const QB_ENVIRONMENT_EXPONENT = 0.5

/**
 * Scale a quarterback's weekly projection by his offence's expected output.
 *
 * Returns the input untouched when the team has no line — an unpriced game is unknown, not
 * average, and inventing a neutral figure for it would quietly move a real player.
 */
export function adjustQbForEnvironment(
  points: number,
  team: string | undefined,
  implied: ImpliedTotals,
  leagueMean: number,
  exponent: number = QB_ENVIRONMENT_EXPONENT,
): number {
  const t = (team ?? '').toUpperCase().trim()
  const own = implied[t]
  if (!own || !leagueMean || !Number.isFinite(points)) return points
  return points * Math.pow(own / leagueMean, exponent)
}

/** The league's average implied total, the baseline every team is measured against. */
export function meanImplied(implied: ImpliedTotals): number {
  const vals = Object.values(implied).filter((v) => Number.isFinite(v) && v > 0)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
