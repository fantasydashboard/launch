import { describe, it, expect } from 'vitest'
import {
  startConfidence,
  startConfidencePair,
  isCloseCall,
  isCoinFlip,
  confidenceLabel,
  CONFIDENCE_SCALE,
  CONFIDENCE_SCALE_DEFAULT,
} from '../startConfidence'

describe('startConfidence', () => {
  it('reproduces the measured 2025 win rates within the accuracy they were measured to', () => {
    /*
     * The bands from the backtest, at their mean gap. Each is the outcome of thousands of real
     * pairs, so a curve that drifts a full point off one of them is not describing the data.
     */
    const measured: [number, number][] = [
      [0.5, 51.8],
      [1.5, 56.7],
      [2.5, 61.0],
      [4.0, 66.2],
      [6.5, 72.7],
      [11.0, 82.1],
    ]
    for (const [gap, actual] of measured) {
      const predicted = startConfidence(gap) * 100
      expect(Math.abs(predicted - actual)).toBeLessThan(2.0)
    }
  })

  it('never claims certainty and never drops below a coin flip', () => {
    for (const gap of [0, 0.1, 1, 5, 20, 100]) {
      const p = startConfidence(gap)
      expect(p).toBeGreaterThanOrEqual(0.5)
      expect(p).toBeLessThan(1)
    }
  })

  it('reads a zero gap as exactly a coin flip', () => {
    expect(startConfidence(0, 'WR')).toBe(0.5)
  })

  it('is symmetric — the size of the gap is what matters, not its sign', () => {
    expect(startConfidence(-3, 'RB')).toBeCloseTo(startConfidence(3, 'RB'), 10)
  })

  it('rises with the gap', () => {
    let last = 0
    for (const gap of [0, 1, 2, 3, 5, 8, 12]) {
      const p = startConfidence(gap, 'WR')
      expect(p).toBeGreaterThan(last)
      last = p
    }
  })

  it('makes a point of projection worth more at tight end than at quarterback', () => {
    /*
     * This is the whole reason the scale is per position. Tight end scoring is compressed, so
     * the same two points separates two tight ends much harder. A single shared constant would
     * call both decisions the same and be wrong about both.
     */
    expect(startConfidence(2, 'TE')).toBeGreaterThan(startConfidence(2, 'QB'))
    expect(CONFIDENCE_SCALE.TE).toBeLessThan(CONFIDENCE_SCALE.QB)
  })

  it('falls back to the all-position scale for a position it never measured', () => {
    expect(startConfidence(3, 'K')).toBeCloseTo(startConfidence(3), 10)
    expect(startConfidence(3, undefined)).toBeCloseTo(
      0.5 + 0.5 * (1 - Math.exp(-3 / CONFIDENCE_SCALE_DEFAULT)),
      10,
    )
  })

  it('is case insensitive about the position', () => {
    expect(startConfidence(2, 'te')).toBeCloseTo(startConfidence(2, 'TE'), 10)
  })
})

describe('startConfidencePair', () => {
  it('uses the position scale when both players share one', () => {
    expect(startConfidencePair(2, 'TE', 'TE')).toBeCloseTo(startConfidence(2, 'TE'), 10)
  })

  it('falls back to the all-position scale across positions, which is what we measured', () => {
    // A FLEX seat can pit a back against a receiver; the fit was made WITHIN a position.
    expect(startConfidencePair(2, 'RB', 'WR')).toBeCloseTo(startConfidence(2), 10)
    expect(startConfidencePair(2, 'RB', 'WR')).not.toBeCloseTo(startConfidence(2, 'RB'), 10)
  })
})

describe('close call thresholds', () => {
  it('treats the same gap differently by position, which a flat points cut cannot', () => {
    // 2.5 points was the old flat threshold: settled at tight end, still a live call at QB.
    expect(isCloseCall(2.5, 'TE')).toBe(false)
    expect(isCloseCall(2.5, 'QB')).toBe(true)
  })

  it('calls a half-point gap a coin flip everywhere', () => {
    for (const pos of ['QB', 'RB', 'WR', 'TE']) expect(isCoinFlip(0.5, pos)).toBe(true)
  })

  it('stops calling it a coin flip soonest at tight end', () => {
    /*
     * 0.8 points is 55.4% at tight end and under 53% at quarterback. The threshold biting at
     * different gaps is the point of the per-position scale, not a rough edge in it.
     */
    expect(isCoinFlip(0.8, 'TE')).toBe(false)
    expect(isCoinFlip(0.8, 'QB')).toBe(true)
  })

  it('does not call a decided gap a coin flip', () => {
    for (const pos of ['QB', 'RB', 'WR', 'TE']) expect(isCoinFlip(8, pos)).toBe(false)
  })

  it('every coin flip is also a close call', () => {
    for (const pos of ['QB', 'RB', 'WR', 'TE']) {
      for (let gap = 0; gap < 12; gap += 0.25) {
        if (isCoinFlip(gap, pos)) expect(isCloseCall(gap, pos)).toBe(true)
      }
    }
  })
})

describe('confidenceLabel', () => {
  it('prints a whole percentage', () => {
    expect(confidenceLabel(0, 'WR')).toBe('50%')
    expect(confidenceLabel(20, 'WR')).toMatch(/^\d{2}%$/)
  })
})
