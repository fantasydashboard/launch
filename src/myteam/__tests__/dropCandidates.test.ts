import { describe, it, expect } from 'vitest'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import type { PlayerContribution } from '@/myteam/types'

function pc(playerKey: string, overallValue: number): PlayerContribution {
  return {
    playerKey,
    contribs: [],
    plusCount: 0,
    minusCount: 0,
    overallValue,
    topStatId: null,
  }
}

describe('computeDropCandidates', () => {
  it('flags only the low-value scrubs (<=3), never studs', () => {
    const contributions = [
      pc('scrubA', 0.1),
      pc('scrubB', 0.3),
      pc('star1', 0.8),
      pc('star2', 0.7),
      pc('star3', 0.6),
      pc('star4', 0.55),
    ]
    const { candidates } = computeDropCandidates(contributions)
    const keys = candidates.map((c) => c.playerKey).sort()
    expect(keys).toEqual(['scrubA', 'scrubB'])
    // No stud (>= 0.5) ever appears.
    expect(candidates.find((c) => c.playerKey.startsWith('star'))).toBeUndefined()
  })

  it('strong severity for value < 0.2, mild otherwise', () => {
    const contributions = [pc('strong', 0.1), pc('mild', 0.3)]
    const { candidates } = computeDropCandidates(contributions)
    const strong = candidates.find((c) => c.playerKey === 'strong')!
    const mild = candidates.find((c) => c.playerKey === 'mild')!
    expect(strong.strength).toBe('strong')
    expect(strong.reason).toMatch(/weak across categories/i)
    expect(mild.strength).toBe('mild')
    expect(mild.reason).toMatch(/low overall value/i)
  })

  it('caps the list at 3 lowest-value qualifiers', () => {
    const contributions = [
      pc('a', 0.05),
      pc('b', 0.1),
      pc('c', 0.15),
      pc('d', 0.2),
      pc('e', 0.3),
    ]
    const { candidates } = computeDropCandidates(contributions)
    expect(candidates).toHaveLength(3)
    expect(candidates.map((c) => c.playerKey)).toEqual(['a', 'b', 'c'])
  })

  it('never flags a player with overallValue >= 0.5 (stud protection); 0.35..0.5 also not flagged', () => {
    // 0.34 qualifies (below 0.35); 0.4 is below the stud floor but at/above the drop
    // threshold so it is not flagged; 0.5 is a protected stud.
    const contributions = [pc('lowEnough', 0.34), pc('borderline', 0.4), pc('stud', 0.5)]
    const { candidates } = computeDropCandidates(contributions)
    expect(candidates.map((c) => c.playerKey)).toEqual(['lowEnough'])
  })

  it('zero candidates when all players are >= 0.5 value', () => {
    const contributions = [pc('a', 0.6), pc('b', 0.7), pc('c', 0.9)]
    const { candidates } = computeDropCandidates(contributions)
    expect(candidates).toEqual([])
  })

  it('weakLink is the single lowest-value player, independent of the 0.35 threshold', () => {
    const contributions = [pc('a', 0.6), pc('b', 0.55), pc('c', 0.51)]
    const { weakLink, candidates } = computeDropCandidates(contributions)
    expect(weakLink).toBe('c') // lowest overallValue
    expect(candidates).toEqual([]) // none qualify as drop
  })

  it('weakLink is null when there are no players', () => {
    const { weakLink, candidates } = computeDropCandidates([])
    expect(weakLink).toBeNull()
    expect(candidates).toEqual([])
  })
})
