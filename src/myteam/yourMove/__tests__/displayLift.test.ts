import { describe, it, expect } from 'vitest'
import { displayLift } from '../displayLift'

describe('displayLift', () => {
  it('passes small lifts through unchanged (rounded)', () => {
    expect(displayLift(3.4)).toBe(3)
    expect(displayLift(0)).toBe(0)
  })
  it('clamps negative lift to 0', () => {
    expect(displayLift(-5)).toBe(0)
  })
  it('compresses lifts above the soft cap (order-preserving)', () => {
    expect(displayLift(20)).toBeLessThan(20)
    expect(displayLift(30)).toBeGreaterThan(displayLift(20))
  })
  // Regression: a non-finite lift (from a NaN days / stat upstream) rendered as "+NaN%"
  // on the matchup "moves that swing it" section. Guard it to 0.
  it('returns 0 for non-finite input (no +NaN%)', () => {
    expect(displayLift(NaN)).toBe(0)
    expect(displayLift(Infinity)).toBe(0)
    expect(displayLift(-Infinity)).toBe(0)
  })
})
