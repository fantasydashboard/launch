/**
 * Tiers that mean "these are the same player".
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
