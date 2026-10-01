import { buildCategoryState, type CatState } from './categoryBoard'
import { dailySigma, ratioSigma } from './categorySigma'
import type { CategoryFormat } from './categoryLeverage'

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

export interface CategoryWeek {
  cats: CatState[]
  format: CategoryFormat
  /** Counts a manager reads in one glance. */
  live: number
  safe: number
  gone: number
  /** Columns worth spending tonight on, richest first. Empty when the week is settled. */
  worthChasing: string[]
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

  const best = state.reduce((m, c) => Math.max(m, c.unitValue), 0)
  const worthChasing = state
    .filter((c) => c.unitValue > 0 && best > 0 && c.unitValue >= CHASE_FLOOR * best)
    .sort((a, b) => b.unitValue - a.unitValue)
    .map((c) => c.key)

  return {
    cats: state,
    format,
    live: state.filter((c) => c.status === 'live').length,
    safe: state.filter((c) => c.status === 'safe').length,
    gone: state.filter((c) => c.status === 'gone').length,
    worthChasing,
  }
}
