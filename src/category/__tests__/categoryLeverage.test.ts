import { describe, it, expect } from 'vitest'
import {
  catWinProb, catLeverage, catStatus, pivotalWeights, PIVOTAL_EACH,
} from '../categoryLeverage'

/**
 * The daily category board ranked players by a season z-sum divided by games, which produced a
 * column of 1.0s and told a manager nothing. What he actually needs to know is which columns
 * are still in play and what a unit in each is worth TONIGHT.
 */

describe('catWinProb', () => {
  const sigma = 2, days = 3

  it('is a coin flip when the two sides are level', () => {
    expect(catWinProb(10, 10, sigma, days, false)).toBeCloseTo(0.5, 6)
  })

  it('rises as you lead, falls as you trail', () => {
    expect(catWinProb(14, 10, sigma, days, false)).toBeGreaterThan(0.5)
    expect(catWinProb(6, 10, sigma, days, false)).toBeLessThan(0.5)
  })

  it('inverts for a category where lower wins, like GAA', () => {
    expect(catWinProb(2.1, 3.0, 0.4, days, true)).toBeGreaterThan(0.5)
    expect(catWinProb(3.0, 2.1, 0.4, days, true)).toBeLessThan(0.5)
  })

  /* With no days left the week is decided — no distribution, just the scoreboard. */
  it('collapses to the scoreboard when the week is over', () => {
    expect(catWinProb(11, 10, sigma, 0, false)).toBe(1)
    expect(catWinProb(9, 10, sigma, 0, false)).toBe(0)
    expect(catWinProb(10, 10, sigma, 0, false)).toBe(0.5)
  })
})

describe('catLeverage — what one unit is worth', () => {
  const sigma = 2, days = 3

  it('is highest in a dead-level category', () => {
    const level = catLeverage(10, 10, sigma, days, false)
    expect(level).toBeGreaterThan(catLeverage(16, 10, sigma, days, false))
    expect(level).toBeGreaterThan(catLeverage(4, 10, sigma, days, false))
  })

  /*
   * PUNTING FALLS OUT OF THE MATHS. A category you cannot win has a flat probability curve, so
   * a unit there is worth nothing and the ranking stops paying for it — with no punt setting
   * and nothing for the manager to declare. The same number handles a column already banked.
   */
  it('goes to nearly nothing in a category that is out of reach', () => {
    expect(catLeverage(10, 60, sigma, days, false)).toBeLessThan(1e-6)
    expect(catLeverage(60, 10, sigma, days, false)).toBeLessThan(1e-6)
  })

  it('is never negative — a unit of a counting stat cannot hurt you', () => {
    for (const mine of [0, 5, 10, 20, 50]) {
      expect(catLeverage(mine, 10, sigma, days, false)).toBeGreaterThanOrEqual(0)
    }
  })

  it('treats a lower-is-better category symmetrically', () => {
    const a = catLeverage(3.0, 3.0, 0.4, days, true)
    const b = catLeverage(3.0, 3.0, 0.4, days, false)
    expect(a).toBeCloseTo(b, 9)
  })

  it('is zero once the week is over', () => {
    expect(catLeverage(10, 10, sigma, 0, false)).toBe(0)
  })

  /* More days left = more noise still to come = any single unit matters less. */
  it('shrinks as the horizon lengthens', () => {
    expect(catLeverage(10, 10, sigma, 1, false))
      .toBeGreaterThan(catLeverage(10, 10, sigma, 6, false))
  })
})

describe('catStatus', () => {
  it('names the three states a manager acts on', () => {
    expect(catStatus(0.97)).toBe('safe')
    expect(catStatus(0.5)).toBe('live')
    expect(catStatus(0.03)).toBe('gone')
  })
})

describe('pivotalWeights — what the league format does to the objective', () => {
  /*
   * EACH CATEGORY: every column won is a win in the standings, so they are all worth the same
   * and always will be. Taking back two columns in a lost week is two wins — which is exactly
   * why this format must not be given the risk posture the other one needs.
   */
  it('weights every category equally in an each-category league', () => {
    const w = pivotalWeights([0.9, 0.5, 0.1, 0.5], 'each')
    expect(w).toEqual([PIVOTAL_EACH, PIVOTAL_EACH, PIVOTAL_EACH, PIVOTAL_EACH])
  })

  /*
   * MOST CATEGORIES: only the columns that could decide the week matter. A category is worth
   * what it is worth BECAUSE of the others — it counts when the rest land level.
   */
  it('weights a category by how often it is the decider', () => {
    /* Three categories, two already settled one each way: the third decides everything. */
    const w = pivotalWeights([0.999, 0.001, 0.5], 'most')
    expect(w[2]).toBeGreaterThan(0.9)
  })

  it('gives almost nothing to a category in a week already decided', () => {
    /* Five categories, four banked: the fifth cannot change the result. */
    const w = pivotalWeights([0.999, 0.999, 0.999, 0.999, 0.5], 'most')
    expect(w[4]).toBeLessThan(0.05)
  })

  it('returns one weight per category, never negative', () => {
    const ps = [0.2, 0.4, 0.6, 0.8, 0.5, 0.5, 0.5]
    for (const fmt of ['each', 'most'] as const) {
      const w = pivotalWeights(ps, fmt)
      expect(w).toHaveLength(ps.length)
      for (const x of w) expect(x).toBeGreaterThanOrEqual(0)
    }
  })

  it('handles a single category and an empty list without blowing up', () => {
    expect(pivotalWeights([0.5], 'most')).toHaveLength(1)
    expect(pivotalWeights([], 'most')).toEqual([])
  })
})
