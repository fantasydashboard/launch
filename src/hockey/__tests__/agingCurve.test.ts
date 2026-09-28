import { describe, it, expect } from 'vitest'
import { ageFactor, ageAtSeason, AGE_CURVE } from '../agingCurve'

describe('ageFactor', () => {
  it('is a no-op for the same age', () => {
    expect(ageFactor(27, 27)).toBe(1)
  })

  it('grows a young player and shrinks an old one', () => {
    expect(ageFactor(22, 23)).toBeGreaterThan(1)
    expect(ageFactor(33, 34)).toBeLessThan(1)
  })

  /* Two years is a product of two steps, not one step doubled. 33 -> 35 must be 0.898 x 0.885. */
  it('compounds across multiple years', () => {
    expect(ageFactor(33, 35)).toBeCloseTo(AGE_CURVE[33] * AGE_CURVE[34], 9)
    expect(ageFactor(22, 25)).toBeCloseTo(AGE_CURVE[22] * AGE_CURVE[23] * AGE_CURVE[24], 9)
  })

  it('inverts going backwards', () => {
    expect(ageFactor(30, 28) * ageFactor(28, 30)).toBeCloseTo(1, 9)
  })

  /* Ages past either end of the measured range clamp rather than falling off to 1, which would
     say a 38-year-old stops declining the moment the data runs out. */
  it('clamps beyond the measured range', () => {
    expect(ageFactor(38, 39)).toBeCloseTo(AGE_CURVE[35], 9)
    expect(ageFactor(18, 19)).toBeCloseTo(AGE_CURVE[21], 9)
  })

  it('scales with strength, and is off at zero', () => {
    expect(ageFactor(33, 34, 0)).toBe(1)
    const full = ageFactor(33, 34, 1)
    const half = ageFactor(33, 34, 0.5)
    expect(half).toBeGreaterThan(full)      // less decline
    expect(half).toBeLessThan(1)
    expect(half).toBeCloseTo(1 + (full - 1) * 0.5, 9)
  })

  it('survives nonsense without throwing', () => {
    expect(ageFactor(NaN, 30)).toBe(1)
    expect(ageFactor(30, NaN)).toBe(1)
  })
})

describe('ageAtSeason', () => {
  it('reads the birth year', () => {
    expect(ageAtSeason('1995-09-17', 2026)).toBe(31)
  })
  it('refuses what it cannot read', () => {
    expect(ageAtSeason(undefined, 2026)).toBeNull()
    expect(ageAtSeason('', 2026)).toBeNull()
    expect(ageAtSeason('1850-01-01', 2026)).toBeNull()
  })
})
