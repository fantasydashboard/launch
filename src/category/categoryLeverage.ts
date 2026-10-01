/**
 * What a unit of a category is worth to you TONIGHT.
 *
 * WHAT THIS REPLACES. The daily board priced a category league by taking a player's season
 * z-sum and dividing it by his games. That answers "who is better this year", which is a
 * question the rankings page already answers, and it produced a column of 1.0s — forty players
 * separated by a tenth, under a heading promising tonight's best plays.
 *
 * It also cannot express the thing that actually decides a category week. A goal is not worth
 * the same in every column. It is worth a great deal in a column you are level in, and nothing
 * at all in one you have banked or cannot reach. A model that ranks on talent alone will tell a
 * manager to chase a category he has already lost, every night, for a week.
 *
 * THE WHOLE MODEL IS ONE DERIVATIVE. Each category's win probability is a normal CDF of the
 * margin over the noise still to come. The value of one more unit is the SLOPE of that curve:
 *
 *     P(win c)  = Phi(z),  z = (mine - theirs) / (sqrt(2) * sigma * sqrt(days))
 *     leverage  = dP/dunit = phi(z) / (sqrt(2) * sigma * sqrt(days))
 *
 * Everything a manager asked for falls out of phi(z) going to zero at the tails:
 *
 *   PUNTING — a category you cannot win has a flat curve, so the board stops paying for it. No
 *   punt setting, nothing to declare, and it handles the punts a manager would not have thought
 *   to declare: a column that went out of reach on Tuesday.
 *
 *   CLINCHING — a column already banked is equally flat. Piling on scores nothing.
 *
 *   CATCHING UP — a level column has the steepest curve, so a unit there outscores a unit
 *   anywhere else. That is the same number, read from the other side.
 *
 * SIGMA IS AN ARGUMENT, DELIBERATELY. The volatility table in services/categoryWinProbability
 * is keyed by BASEBALL stat ids on two platforms; every hockey and basketball category falls
 * through to a default of five, which makes a goal as noisy as a strikeout and every column a
 * coin flip. Taking sigma as an input keeps this module honest and testable while that table is
 * measured per sport rather than guessed.
 */

/** Standard normal PDF. */
function phi(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
}

/** Standard normal CDF, via the Abramowitz-Stegun error function. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = phi(z)
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? 1 - p : p
}

/** The spread of the margin still to come. Zero days means the week is decided. */
function marginSigma(sigma: number, days: number): number {
  const d = Number.isFinite(days) ? Math.max(0, days) : 0
  const s = Number.isFinite(sigma) ? Math.max(0, sigma) : 0
  return Math.SQRT2 * s * Math.sqrt(d)
}

/**
 * Your chance of winning this column, 0..1.
 *
 * `lowerIsBetter` covers GAA, ERA, WHIP and the rest — the margin is simply read the other way
 * rather than the caller having to negate its inputs and get the leverage sign wrong.
 */
export function catWinProb(
  mine: number, theirs: number, sigma: number, days: number, lowerIsBetter: boolean,
): number {
  const m = Number.isFinite(mine) ? mine : 0
  const t = Number.isFinite(theirs) ? theirs : 0
  const margin = lowerIsBetter ? t - m : m - t
  const spread = marginSigma(sigma, days)
  /* Decided: no distribution left, just the scoreboard. A tie is a tie. */
  if (spread <= 0) return margin > 0 ? 1 : margin < 0 ? 0 : 0.5
  return normalCdf(margin / spread)
}

/**
 * What ONE more unit of this category is worth, in win probability.
 *
 * Always non-negative: a unit of a counting stat cannot hurt you. Ratio categories are the
 * exception and are NOT modelled here — adding a bad goalie start lowers your save percentage,
 * so a ratio needs its numerator and denominator rather than a single total. That is its own
 * module; pretending a ratio behaves like a counting stat is how a board ends up telling you to
 * start a goalie who will cost you the column.
 */
export function catLeverage(
  mine: number, theirs: number, sigma: number, days: number, lowerIsBetter: boolean,
): number {
  const m = Number.isFinite(mine) ? mine : 0
  const t = Number.isFinite(theirs) ? theirs : 0
  const spread = marginSigma(sigma, days)
  if (spread <= 0) return 0
  const margin = lowerIsBetter ? t - m : m - t
  return phi(margin / spread) / spread
}

export type CatStatus = 'safe' | 'live' | 'gone'

/** Above this it is banked; below the mirror of it, it is gone. Everything else is in play. */
const SAFE_AT = 0.9

/**
 * The label a manager reads. The leverage above is the number that does the work — a safe or
 * gone column already scores near zero — so this exists to say so in words, not to gate anything.
 */
export function catStatus(winPct: number): CatStatus {
  if (!Number.isFinite(winPct)) return 'live'
  if (winPct >= SAFE_AT) return 'safe'
  if (winPct <= 1 - SAFE_AT) return 'gone'
  return 'live'
}

/**
 * Which of the two category formats the league scores by.
 *
 *   'each' — every column won is a win in the standings (Yahoo `head`, ESPN H2H_CATEGORY).
 *   'most' — winning more columns than your opponent is one win (Yahoo `headone`,
 *            ESPN H2H_MOST_CATEGORIES).
 *
 * Both strings are already parsed by useIsCategoryLeague and then collapsed into one boolean.
 * The distinction is not cosmetic: in an each-category league, taking back two columns in a week
 * you have lost is two wins, and advice to chase variance instead would be actively harmful.
 */
export type CategoryFormat = 'each' | 'most'

/** Every column is worth one win, so each carries the same weight, always. */
export const PIVOTAL_EACH = 1

/**
 * How much each category matters, given the others.
 *
 * EACH-CATEGORY leagues are linear: the objective is expected columns won, so dE/dp is one for
 * every column and nothing about the rest of the scoreboard changes it. No clinching, no
 * gambling, no posture — just take whatever is cheapest to take.
 *
 * MOST-CATEGORIES leagues are not. The objective is the probability of winning more columns
 * than your opponent, and a column is worth exactly how often it DECIDES that:
 *
 *     dP(win week)/dp_c = P(the other columns land exactly level)
 *
 * which is the Poisson-binomial over the rest, evaluated at the tipping point. So a column is
 * worth most when the week is close and nearly nothing when it is already settled — a 9-0 week
 * and a 0-9 week both correctly stop paying for anything, and the board turns its attention to
 * the columns that can still swing it.
 */
export function pivotalWeights(ps: number[], format: CategoryFormat): number[] {
  if (!ps.length) return []
  if (format === 'each') return ps.map(() => PIVOTAL_EACH)

  const n = ps.length
  /* You win the week with more than half the columns, so the column that decides it is the one
     that arrives when the others have landed exactly here. */
  const tipping = Math.floor(n / 2)

  return ps.map((_, i) => {
    /* The distribution of columns won EXCLUDING this one. */
    let dist = [1]
    for (let j = 0; j < n; j++) {
      if (j === i) continue
      const p = Math.min(1, Math.max(0, Number(ps[j]) || 0))
      const next = new Array(dist.length + 1).fill(0)
      for (let k = 0; k < dist.length; k++) {
        next[k] += dist[k] * (1 - p)
        next[k + 1] += dist[k] * p
      }
      dist = next
    }
    return dist[tipping] ?? 0
  })
}
