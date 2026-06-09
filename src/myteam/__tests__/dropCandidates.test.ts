import { describe, it, expect } from 'vitest'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import type { PlayerContribution } from '@/myteam/types'

function pc(playerKey: string, plusCount: number, minusCount: number): PlayerContribution {
  return { playerKey, contribs: [], plusCount, minusCount }
}

describe('computeDropCandidates', () => {
  it('plusCount 0 and minusCount >= 1 → strong drop candidate', () => {
    const contributions = [pc('weak', 0, 2), pc('star', 3, 0)]
    const { candidates } = computeDropCandidates(contributions)
    const weak = candidates.find((c) => c.playerKey === 'weak')!
    expect(weak.strength).toBe('strong')
    expect(weak.reason).toMatch(/no category strengths/i)
  })

  it('plusCount 0 and minusCount 0 → mild drop candidate', () => {
    const contributions = [pc('bench', 0, 0), pc('star', 2, 0)]
    const { candidates } = computeDropCandidates(contributions)
    const bench = candidates.find((c) => c.playerKey === 'bench')!
    expect(bench.strength).toBe('mild')
  })

  it('player with a plus is not a drop candidate', () => {
    const contributions = [pc('star', 1, 3)]
    const { candidates } = computeDropCandidates(contributions)
    expect(candidates.find((c) => c.playerKey === 'star')).toBeUndefined()
  })

  it('weakLink is the player with the lowest (plusCount - minusCount)', () => {
    const contributions = [pc('a', 3, 0), pc('b', 0, 2), pc('c', 1, 1)]
    const { weakLink } = computeDropCandidates(contributions)
    expect(weakLink).toBe('b') // net -2, lowest
  })

  it('weakLink is null when there are no players', () => {
    const { weakLink, candidates } = computeDropCandidates([])
    expect(weakLink).toBeNull()
    expect(candidates).toEqual([])
  })
})
