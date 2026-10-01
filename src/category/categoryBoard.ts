import {
  catWinProb, catLeverage, catStatus, pivotalWeights,
  type CatStatus, type CategoryFormat,
} from './categoryLeverage'

/**
 * The state of your category week, and what a player is worth against it.
 *
 * This is the layer a surface talks to. categoryLeverage answers "what is one unit of this
 * column worth"; this answers "which columns are still in play, and given that, who should I
 * start tonight".
 *
 * RATIO COLUMNS ARE REPORTED BUT NOT PRICED, deliberately. Save percentage, GAA, ERA and field
 * goal percentage do not add — adding a bad goalie start LOWERS your save percentage, so a
 * marginal contribution can be negative, and how negative depends on the volume behind the
 * ratio rather than on the ratio itself. Every counting-stat model in this product would tell
 * you to start that goalie because he contributes a few saves. In a league with SV% as a
 * column, that is how you lose it.
 *
 * Pretending a ratio behaves like a counting stat is worse than leaving it out, because the
 * number looks the same as the ones that are right. So it is scored at zero, flagged, and
 * surfaced with its own win chance and verdict — and the sign-aware version is its own piece of
 * work with its own numerator and denominator.
 */

export interface CatInput {
  /** Canonical category key — 'G', 'SOG', 'SVPCT'. */
  key: string
  label: string
  /** Live totals for the matchup so far. */
  mine: number
  theirs: number
  /** Daily standard deviation of a roster's total in this column. */
  sigma: number
  /** GAA, ERA, WHIP — the margin reads the other way. */
  lowerIsBetter: boolean
  /** SV%, FG%, ERA — cannot be scored by addition. See the module header. */
  isRatio: boolean
}

export interface CatState extends CatInput {
  /** Your chance of taking this column, 0..1. */
  winPct: number
  status: CatStatus
  /** What one unit of this column is worth to the objective. Zero for ratios and settled columns. */
  unitValue: number
}

export function buildCategoryState(input: {
  cats: CatInput[]
  /** Days left in the matchup. Zero means it is decided. */
  days: number
  format: CategoryFormat
}): CatState[] {
  const { cats, days, format } = input
  if (!cats.length) return []

  const probs = cats.map((c) => catWinProb(c.mine, c.theirs, c.sigma, days, c.lowerIsBetter))
  /* How much each column matters given the others — identical in an each-category league, and
     the chance of being the decider in a most-categories one. See pivotalWeights. */
  const weights = pivotalWeights(probs, format)

  return cats.map((c, i) => ({
    ...c,
    winPct: probs[i],
    status: catStatus(probs[i]),
    unitValue: c.isRatio
      ? 0
      : catLeverage(c.mine, c.theirs, c.sigma, days, c.lowerIsBetter) * (weights[i] ?? 0),
  }))
}

export interface LineScore {
  /** Summed win-probability this line is worth tonight. */
  score: number
  /** The columns he actually moves — for the sentence beside the number. */
  helps: string[]
}

/** A column has to be worth this share of the best one before it is worth naming. */
const NAMEABLE = 0.15

/**
 * What a projected line is worth tonight, against the state of your week.
 *
 * The score is the sum over columns of (units he adds) x (what a unit is worth). A player who
 * piles up a column you have already banked scores nothing for it, which is the entire point:
 * the ranking stops recommending the best player and starts recommending the most useful one.
 */
export function scoreLine(line: Record<string, number>, state: CatState[]): LineScore {
  let score = 0
  const contributions: Array<{ key: string; worth: number }> = []

  for (const c of state) {
    const units = Number(line[c.key])
    if (!Number.isFinite(units) || units === 0) continue
    if (c.unitValue <= 0) continue
    const worth = units * c.unitValue
    score += worth
    contributions.push({ key: c.key, worth })
  }

  /* Named relative to his own best column, so the sentence reads "he moves goals" rather than
     listing every column he touches by a rounding error. */
  const best = contributions.reduce((m, x) => Math.max(m, x.worth), 0)
  const helps = contributions
    .filter((x) => best > 0 && x.worth >= NAMEABLE * best)
    .sort((a, b) => b.worth - a.worth)
    .map((x) => x.key)

  return { score, helps }
}
