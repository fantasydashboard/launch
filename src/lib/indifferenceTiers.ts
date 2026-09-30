/**
 * Tiers that mean "these are the same player". SPORT-NEUTRAL: the rule knows nothing about
 * football, and the threshold is supplied in whatever unit the board is ranked in.
 *
 * WHAT WAS WRONG. `assignTiers` decides how many tiers a list should have — one per five
 * players, capped at eight — and then cuts at exactly that many of the biggest gaps. On a
 * draft board of twenty-five that is the right instinct: you want the visible drop-offs and
 * you want a bounded number of them. On a rest-of-season board it falls apart, because the
 * budget is fixed and the list is not. Handed a hundred and fifty players it spends seven cuts
 * and returns a tier of a hundred and ten, and handed a deep positional column it spends every
 * cut in the tail, where the gaps are largest and nobody is choosing anything. The Wire board
 * worked around it by tiering only the top twenty-five rows — which put tiers exactly where a
 * manager does not need them (nobody wonders whether to claim the overall RB1) and left rows
 * twenty-six through a hundred and fifty, where every waiver decision actually lives, as one
 * flat undifferentiated list.
 *
 * THE RULE. A tier is a set of players you should be indifferent between, so define it that
 * way and let the count fall out. Walk the board from the top; the first player leads a tier;
 * every player within `threshold` points per week of that leader joins it; the first player
 * who is not starts the next tier and leads it himself.
 *
 * No budget, no maximum, no target size, so it behaves identically at row eight and row a
 * hundred and thirty. A deep tail collapses into a few large tiers, which is not a failure —
 * forty interchangeable players is the true state of the wire in week nine, and saying so is
 * the useful thing. "These six are the same, take whichever is cheapest" is a decision a
 * manager can act on; "these are ranked 61st through 66th" is not.
 *
 * MEASURED FROM THE LEADER, NOT THE PREVIOUS ROW. This is the whole design. Ten players each
 * a third of a point per week below the last have no gap anywhere for a gap-based rule to cut
 * at, yet the tenth is three points a week worse than the first. Comparing against the leader
 * lets that drift accumulate until it has to break, so a tier can never quietly span a
 * difference that matters.
 *
 * PER WEEK, NOT PER SEASON. The threshold is stated in the unit the reader thinks in, and it
 * has to be, because the same season-total gap means something different in week two than in
 * week fourteen. Dividing by the weeks that remain keeps a tier the same claim all year.
 */

/**
 * How close is close enough to be the same player, in points per week.
 *
 * One point a week is about fifteen points over a rest-of-season horizon in September — less
 * than the week-to-week noise on a single starter, and well inside the error on any projection
 * that reaches this far forward. Set against our own week-3 board it produces tiers a manager
 * would recognise: one Gibbs alone at the top, six interchangeable quarterbacks behind Josh
 * Allen, ten mid receivers in a band nobody should agonise over.
 *
 * A judgment, not a measurement — and deliberately a visible one, so that raising or lowering
 * it is a decision somebody makes on purpose rather than a constant nobody can find.
 */
export const INDIFFERENT_PTS_PER_WEEK = 1

/**
 * Assign tiers by indifference. Deterministic, total, and independent of list length: adding
 * players below a tier can never move a tier above it.
 *
 * `value` is a rest-of-season total (VOR on the Wire board); `weeksLeft` converts it to the
 * per-week basis the threshold is stated in. Returns tier numbers from 1, descending by value.
 */
export function indifferenceTiers(
  rows: { playerKey: string; value: number }[],
  weeksLeft: number,
  threshold: number = INDIFFERENT_PTS_PER_WEEK,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!rows?.length) return out

  /* A board is never worth zero weeks. Left unclamped, the division would send every gap to
     infinity and hand back a list where every player is his own tier. */
  const weeks = Math.max(1, weeksLeft)
  const sorted = [...rows].sort((a, b) => b.value - a.value)

  let tier = 1
  let leader = sorted[0].value
  for (const row of sorted) {
    if ((leader - row.value) / weeks > threshold) {
      tier++
      leader = row.value
    }
    out[row.playerKey] = tier
  }
  return out
}


/**
 * The threshold for a board whose unit is NOT football points, as a fraction of the startable
 * pool's own standard deviation.
 *
 * WHY A FRACTION OF SOMETHING, RATHER THAN A NUMBER. Hockey ranks in standard deviations across
 * the scored categories, or in a points league on its own scoring weights; baseball and
 * basketball will do the same. `INDIFFERENT_PTS_PER_WEEK` is a football number validated against
 * a football board, and carrying it across unchanged would be asserting that one point a week of
 * receiver is one unit of anything else. What ports is the RATIO it represents, not the number.
 *
 * WHY THE POOL'S SD, AND NOT THE SPREAD OF THE ROWS ON SCREEN. Our published tier cards scale by
 * the spread across the ten names they show, which is sound for a card that always shows exactly
 * ten. It does not survive a page: measured on our own week-4 board, football's threshold is
 * 0.165 of the spread across the top ten, 0.098 across the top fifty and 0.070 across the top
 * hundred and fifty — so a page offering 50 rows, 200 rows and a position filter would silently
 * change what a tier means every time the reader changed the view. A pool's standard deviation
 * is a property of the pool rather than of an arbitrary cut, so it does not move when the view
 * does.
 *
 * WHERE 0.4 COMES FROM. It is football's own validated threshold, measured. On the week-4 board,
 * one point a week over the fourteen remaining is 14 points of VOR, and the startable pool — the
 * seats a league actually fills — has a standard deviation of 35.4, giving 0.396. The same
 * measurement over an 8-team and a 12-team pool gives 0.390 and 0.393, so the ratio is a property
 * of how fantasy value is distributed and not of one league's size.
 *
 * Football itself deliberately keeps its own constant rather than this derivation: it was checked
 * by eye against a trusted analyst's board, which is better evidence than any ratio, and a number
 * that reproduces it to within one percent is evidence FOR the ratio rather than a reason to
 * replace what it was fitted to.
 */
export const INDIFFERENCE_SD_FRACTION = 0.4

/**
 * Indifference threshold for a board in an arbitrary unit.
 *
 * `values` is every ranked value on the board and `seats` how many of them a league actually
 * starts — the pool is taken from the top of the board because the spread among players nobody
 * rosters is not a fact about the decisions this page exists to support.
 *
 * Returns 0 for an empty or single-valued board, which `indifferenceTiers` reads as "every
 * distinct value is its own tier" — the honest answer when there is nothing to measure against.
 */
export function indifferenceThreshold(values: number[], seats: number): number {
  if (!values?.length) return 0
  const pool = [...values].sort((a, b) => b - a).slice(0, Math.max(1, seats))
  if (pool.length < 2) return 0
  const mean = pool.reduce((a, b) => a + b, 0) / pool.length
  const sd = Math.sqrt(pool.reduce((a, b) => a + (b - mean) ** 2, 0) / pool.length)
  return INDIFFERENCE_SD_FRACTION * sd
}
