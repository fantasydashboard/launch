import { describe, it, expect } from 'vitest'
import { regressToMean, regressPlusMinus, PLUS_MINUS_PERSISTENCE } from '../plusMinusRegression'

const spread = (a: number[]) => {
  const m = a.reduce((s, v) => s + v, 0) / a.length
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
}

describe('regressToMean', () => {
  it('keeps the mean and shrinks the spread by the persistence', () => {
    const v = [-20, -10, 0, 10, 20]
    const out = regressToMean(v, 0.32)
    expect(out.reduce((s, x) => s + x, 0) / out.length).toBeCloseTo(0, 9)
    expect(spread(out)).toBeCloseTo(spread(v) * 0.32, 9)
  })

  /* The pool mean is preserved, NOT forced to zero. These skaters are collectively positive
     because the men they outscore are the ones nobody projects; pulling to zero would invent a
     second bias to cure the first. */
  it('regresses toward the pool mean, not toward zero', () => {
    const v = [10, 14, 18]                    // mean 14
    const out = regressToMean(v, 0.5)
    expect(out.reduce((s, x) => s + x, 0) / out.length).toBeCloseTo(14, 9)
    expect(Math.min(...out)).toBeGreaterThan(0)
  })

  it('is identity at persistence 1 and flat at 0', () => {
    const v = [-8, 3, 11]
    expect(regressToMean(v, 1)).toEqual(v)
    const flat = regressToMean(v, 0)
    expect(new Set(flat.map((x) => x.toFixed(9))).size).toBe(1)
  })

  it('survives an empty set and non-numbers', () => {
    expect(regressToMean([])).toEqual([])
    const out = regressToMean([5, NaN, 15], 0.5)
    expect(out[1]).toBe(10)                   // the mean stands in for what it cannot read
    expect(out.every(Number.isFinite)).toBe(true)
  })
})

describe('regressPlusMinus', () => {
  const rate = (pm: number, goals = 1) => ({ perGame: { plusMinus: pm, goals } })

  it('narrows plus-minus and leaves every other column alone', () => {
    const rates = [rate(0.4, 0.5), rate(-0.2, 0.3), rate(0.1, 0.9)]
    const out = regressPlusMinus(rates)
    expect(spread(out.map((r) => r.perGame.plusMinus)))
      .toBeCloseTo(spread(rates.map((r) => r.perGame.plusMinus)) * PLUS_MINUS_PERSISTENCE, 9)
    expect(out.map((r) => r.perGame.goals)).toEqual([0.5, 0.3, 0.9])
  })

  /* These rates are shared by every hockey surface. A board that rewrote them in place would
     be changing another board's inputs from across the app. */
  it('does not mutate what it was given', () => {
    const rates = [rate(0.4), rate(-0.4)]
    regressPlusMinus(rates)
    expect(rates[0].perGame.plusMinus).toBe(0.4)
  })

  it('handles an empty roster', () => {
    expect(regressPlusMinus([])).toEqual([])
  })
})
