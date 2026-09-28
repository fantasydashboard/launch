import { describe, it, expect } from 'vitest'
import { ageFactor, ageAtSeason, AGE_CURVE, AGE_STRENGTH } from '../agingCurve'

/* The shape tests below pass strength 1 explicitly: they are about the CURVE, which is a
   different question from how much of it ships. Leaving them on the default made them fail the
   moment that was tuned, which is the test measuring the wrong thing. */
const full = (from: number, to: number) => ageFactor(from, to, 1)

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
    expect(full(33, 35)).toBeCloseTo(AGE_CURVE[33] * AGE_CURVE[34], 9)
    expect(full(22, 25)).toBeCloseTo(AGE_CURVE[22] * AGE_CURVE[23] * AGE_CURVE[24], 9)
  })

  it('inverts going backwards', () => {
    expect(full(30, 28) * full(28, 30)).toBeCloseTo(1, 9)
  })

  /* Ages past either end of the measured range clamp rather than falling off to 1, which would
     say a 38-year-old stops declining the moment the data runs out. */
  it('clamps beyond the measured range', () => {
    expect(full(38, 39)).toBeCloseTo(AGE_CURVE[35], 9)
    expect(full(18, 19)).toBeCloseTo(AGE_CURVE[21], 9)
  })

  it('scales with strength, and is off at zero', () => {
    expect(ageFactor(33, 34, 0)).toBe(1)
    const full = ageFactor(33, 34, 1)
    const half = ageFactor(33, 34, 0.5)
    expect(half).toBeGreaterThan(full)      // less decline
    expect(half).toBeLessThan(1)
    expect(half).toBeCloseTo(1 + (full - 1) * 0.5, 9)
  })

  /*
   * What actually ships is damped, deliberately: the full curve over-corrects because ESPN's
   * games and the market's ADP already price some aging. Pinned so a change to that constant
   * is a decision somebody makes, not a number that drifts.
   */
  it('ships at less than full strength', () => {
    expect(AGE_STRENGTH).toBeGreaterThan(0)
    expect(AGE_STRENGTH).toBeLessThan(1)
    const shipped = ageFactor(33, 34)
    expect(shipped).toBeGreaterThan(full(33, 34))   // less decline than the raw curve
    expect(shipped).toBeLessThan(1)                 // but still decline
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
