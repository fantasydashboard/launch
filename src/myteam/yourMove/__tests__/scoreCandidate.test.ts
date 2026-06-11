import { describe, it, expect } from 'vitest'
import { scoreCandidate } from '../scoreCandidate'
import type { ScoredContext } from '../types'

const ctx: ScoredContext = {
  cats: [
    { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
    { statId: 'R', lowerIsBetter: false, side: 'hit', isRatio: false },
  ],
  categoryIds: ['HR', 'R'],
  myStats: { HR: 10, R: 30 },
  oppStats: { HR: 11, R: 30 }, // HR slightly behind, R tied
  days: 4,
  platform: 'yahoo',
}

describe('scoreCandidate', () => {
  it('a positive add raises win-prob lift', () => {
    const lift = scoreCandidate({ HR: 3, R: 5 }, ctx)
    expect(lift).toBeGreaterThan(0)
  })

  it('a zero contribution yields ~0 lift', () => {
    const lift = scoreCandidate({ HR: 0, R: 0 }, ctx)
    expect(Math.abs(lift)).toBeLessThan(1)
  })
})
