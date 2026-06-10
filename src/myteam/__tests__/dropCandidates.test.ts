import { describe, it, expect } from 'vitest'
import { computeDropCandidates } from '../dropCandidates'
import type { PlayerContribution } from '../types'

function pc(playerKey: string, role: 'hitter' | 'pitcher', roleValue: number): PlayerContribution {
  return { playerKey, contribs: [], plusCount: 0, minusCount: 0, overallValue: 0, valueScore: 0, role, roleValue, topStatId: null }
}

describe('computeDropCandidates', () => {
  it('flags the lowest-roleValue players across roles, protects mid/high, caps at 3', () => {
    const res = computeDropCandidates([
      pc('aceP', 'pitcher', 95), pc('studH', 'hitter', 88), pc('midH', 'hitter', 55),
      pc('fringeP', 'pitcher', 18), pc('fringeH', 'hitter', 12), pc('scrubP', 'pitcher', 5), pc('scrubH', 'hitter', 8),
    ])
    const keys = res.candidates.map((c) => c.playerKey)
    expect(keys).not.toContain('aceP')
    expect(keys).not.toContain('studH')
    expect(keys).not.toContain('midH')
    expect(keys.length).toBeLessThanOrEqual(3)
    expect(keys).toContain('scrubP')
    expect(res.weakLink).toBe('scrubP') // lowest roleValue overall
  })

  it('flags nobody when everyone is mid or better', () => {
    const res = computeDropCandidates([pc('a', 'hitter', 60), pc('b', 'pitcher', 52), pc('c', 'hitter', 40)])
    expect(res.candidates).toHaveLength(0)
    expect(res.weakLink).toBe('c')
  })

  it('marks the very lowest as strong severity', () => {
    const res = computeDropCandidates([pc('a', 'pitcher', 6), pc('b', 'hitter', 22)])
    expect(res.candidates.find((c) => c.playerKey === 'a')?.strength).toBe('strong')
  })
})
