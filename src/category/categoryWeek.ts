import { buildCategoryState, type CatState } from './categoryBoard'
import { dailySigma, ratioSigma } from './categorySigma'
import { weekOdds, type CategoryFormat, type WeekOdds } from './categoryLeverage'

/**
 * The state of your category week — the one call a surface makes.
 *
 * Everything below this is arithmetic; this is where it becomes a page. It takes the live
 * scoreboard, what each side still has to play, and the league's format, and answers the only
 * two questions a manager has on a Thursday: which columns are still live, and what is worth
 * chasing tonight.
 *
 * WHY THE SPREAD USES BOTH SIDES. A column is decided by the MARGIN, which is a difference of
 * two uncertain totals, so its variance is the sum of theirs. Using only your own remaining
 * production understates the noise by about root two and makes every column look more settled
 * than it is. catWinProb carries the root-two for two equal sides, so what it wants here is the
 * average of the two.
 */

export interface WeekCat {
  key: string
  label: string
  lowerIsBetter: boolean
  isRatio: boolean
  /** Ratios only: a share of attempts, or events per unit of exposure. */
  ratioKind?: 'proportion' | 'rate'
  /** Ratios only: the category key holding the volume underneath — SA, IP, attempts. */
  volumeKey?: string
}

/**
 * A column of the week, carrying what chasing it is actually worth.
 *
 * `unitValue` prices ONE unit; `movable` prices the units still to come. They rank columns
 * very differently — shutouts top the first and bottom the second — and the two must not be
 * used for the same decision in different places. See the note on worthChasing below.
 */
export interface WeekCatState extends CatState {
  /** Unit value times the units your side is still expected to produce. The chase ordering. */
  movable: number
}

export interface CategoryWeek {
  cats: WeekCatState[]
  format: CategoryFormat
  /** Counts a manager reads in one glance. */
  live: number
  safe: number
  gone: number
  /** Columns worth spending tonight on, richest first. Empty when the week is settled. */
  worthChasing: string[]
  /**
   * Your odds of taking the week, derived from the columns rather than simulated against a
   * guessed volatility table. See weekOdds — and the note there on why the existing Monte
   * Carlo cannot answer this for hockey at all.
   */
  odds: WeekOdds
}

/** Below this share of the best column, chasing it is not a plan. */
const CHASE_FLOOR = 0.1

function sigmaFor(
  cat: WeekCat,
  myStats: Record<string, number>,
  myRemaining: Record<string, number>,
  oppRemaining: Record<string, number>,
  days: number,
  bodies: number,
): number {
  if (cat.isRatio) {
    /*
     * A ratio's spread comes from the volume underneath it, and the part already in the book
     * cannot move — so the exposure still to come is diluted by what is banked.
     */
    const volKey = cat.volumeKey ?? ''
    const locked = Number(myStats[volKey]) || 0
    const future = Number(myRemaining[volKey]) || 0
    return ratioSigma(Number(myStats[cat.key]) || 0, future, cat.ratioKind ?? 'proportion', locked)
  }

  /* The margin's variance is the sum of both sides', and catWinProb carries the root-two. */
  const mine = Number(myRemaining[cat.key]) || 0
  const theirs = Number(oppRemaining[cat.key]) || 0
  const avgPerDay = days > 0 ? (mine + theirs) / 2 / days : 0
  return dailySigma(avgPerDay, cat.key, bodies)
}

export function buildCategoryWeek(input: {
  cats: WeekCat[]
  /** Live totals so far. */
  myStats: Record<string, number>
  oppStats: Record<string, number>
  /** What each side is still expected to produce — see rosterExpectation. */
  myRemaining: Record<string, number>
  oppRemaining: Record<string, number>
  days: number
  format: CategoryFormat
  /** How many of your men actually have a fixture left. */
  bodies: number
}): CategoryWeek {
  const { cats, myStats, oppStats, myRemaining, oppRemaining, days, format, bodies } = input

  const state = buildCategoryState({
    days,
    format,
    cats: cats.map((c) => ({
      key: c.key,
      label: c.label,
      mine: Number(myStats[c.key]) || 0,
      theirs: Number(oppStats[c.key]) || 0,
      sigma: sigmaFor(c, myStats, myRemaining, oppRemaining, days, bodies),
      lowerIsBetter: c.lowerIsBetter,
      isRatio: c.isRatio,
    })),
  })

  /*
   * WHAT A COLUMN IS WORTH CHASING IS NOT WHAT ONE UNIT OF IT IS WORTH.
   *
   * This ranked columns by unitValue alone, and unitValue is the value of ONE unit — so
   * shutouts came out top of "spend tonight on" in a real league. A shutout is decisive and a
   * goalie delivers about 0.08 of one per start, which makes it advice nobody can act on; the
   * ranked board underneath, which prices what players ACTUALLY produce, was meanwhile full of
   * shooters. One screen telling a manager to chase shutouts and then recommending shooters is
   * not two opinions, it is a contradiction, and the chase list was the wrong half.
   *
   * So a column is ranked by the movement still available in it: what one unit is worth times
   * how many units your side is still expected to produce. Shots are worth little each and
   * there are ninety of them left; shutouts are worth a great deal each and there are none
   * coming. Any constant factor (days, bodies) is common to every column and cancels out of
   * the ordering, so the expected remaining total is exactly the right quantity.
   */
  /*
   * Computed ONCE and carried on the column, not recomputed by every reader. The board's row
   * order and the "spend tonight on" line are the same judgement, and when they were two
   * expressions they disagreed on screen: the table was sorted by unit value under a heading
   * that said "most movable first", so it led with shutouts while the advice underneath named
   * shots. One quantity with one name cannot drift like that.
   */
  const priced: WeekCatState[] = state.map((c) => ({
    ...c,
    movable: c.unitValue * Math.max(0, Number(myRemaining[c.key]) || 0),
  }))

  const best = priced.reduce((m, c) => Math.max(m, c.movable), 0)
  const worthChasing = priced
    .filter((c) => c.movable > 0 && best > 0 && c.movable >= CHASE_FLOOR * best)
    .sort((a, b) => b.movable - a.movable)
    .map((c) => c.key)

  return {
    cats: priced,
    format,
    /* Ratio columns are not PRICED (see categoryBoard) but they are still columns you win or
       lose, so every one of them counts towards the week. Dropping them here would have
       reported a nine-category league's odds over seven. */
    odds: weekOdds(priced.map((c) => c.winPct)),
    live: priced.filter((c) => c.status === 'live').length,
    safe: priced.filter((c) => c.status === 'safe').length,
    gone: priced.filter((c) => c.status === 'gone').length,
    worthChasing,
  }
}
