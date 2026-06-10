import { describe, it, expect } from 'vitest'
import { computeDropCandidates } from '../dropCandidates'
import type { PlayerContribution } from '../types'

function pc(playerKey: string, valueScore: number): PlayerContribution {
  return { playerKey, contribs: [], plusCount: 0, minusCount: 0, overallValue: 0, valueScore, topStatId: null }
}

describe('computeDropCandidates', () => {
  it('flags the most-negative players, protects positive-value studs, caps at 3', () => {
    const res = computeDropCandidates([
      pc('stud', 6.2), pc('good', 2.1), pc('ok', 0.3),
      pc('weak1', -1.2), pc('weak2', -2.5), pc('weak3', -3.1), pc('weak4', -4.0),
    ])
    const keys = res.candidates.map((c) => c.playerKey)
    expect(keys).not.toContain('stud')
    expect(keys).not.toContain('good')
    expect(keys.length).toBeLessThanOrEqual(3)
    expect(keys).toContain('weak4')
    expect(res.weakLink).toBe('weak4') // lowest valueScore
  })

  it('flags nobody when all players are above the cutoff', () => {
    const res = computeDropCandidates([pc('a', 3.0), pc('b', 1.5), pc('c', 0.6)])
    expect(res.candidates).toHaveLength(0)
    expect(res.weakLink).toBe('c')
  })

  it('marks the most-negative as strong severity', () => {
    const res = computeDropCandidates([pc('a', -3.5), pc('b', -0.8)])
    const a = res.candidates.find((c) => c.playerKey === 'a')
    expect(a?.strength).toBe('strong')
  })
})
