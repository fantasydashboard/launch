import { describe, it, expect } from 'vitest'
import { computeCategoryGaps } from '@/myteam/categoryGaps'

/**
 * Build standings for a single stat where team i (1-based) has `wins[i-1]` per-category wins.
 * teamId 'me' is inserted at the given winsValue.
 */
function standingsFor(statId: string, winsByTeam: Record<string, number>) {
  return Object.entries(winsByTeam).map(([teamId, w]) => ({
    team: { teamId },
    perCategoryWins: { [statId]: w },
  }))
}

describe('computeCategoryGaps', () => {
  it('2nd place with small gapUp → strong', () => {
    // 12 teams; me ranked 2nd (top third) in HR.
    const standings = standingsFor('HR', { t1: 100, me: 99, t3: 90, t4: 80 })
    const profile = {
      teamId: 'me',
      numTeams: 12,
      categories: [{ statId: 'HR', rank: 2 }],
    }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'HR', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'HR')!
    expect(g.tier).toBe('strong')
    expect(g.rank).toBe(2)
    expect(g.gapUp).toBe(1) // 100 - 99
    expect(g.gapDown).toBe(9) // 99 - 90
  })

  it('9th of 12 with gapUp 1 → winnable', () => {
    const standings = standingsFor('SB', {
      above: 41,
      me: 40,
      below: 30,
    })
    const profile = {
      teamId: 'me',
      numTeams: 12,
      categories: [{ statId: 'SB', rank: 9 }],
    }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'SB', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'SB')!
    expect(g.tier).toBe('winnable')
    expect(g.gapUp).toBe(1)
  })

  it('12th far back → lost', () => {
    const standings = standingsFor('SV', {
      above: 50,
      me: 10,
    })
    const profile = {
      teamId: 'me',
      numTeams: 12,
      categories: [{ statId: 'SV', rank: 12 }],
    }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'SV', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'SV')!
    expect(g.tier).toBe('lost')
    expect(g.gapDown).toBeNull() // last place, no team below
    expect(g.gapUp).toBe(40)
  })

  it('1st place → gapUp null', () => {
    const standings = standingsFor('R', { me: 100, below: 90 })
    const profile = { teamId: 'me', numTeams: 12, categories: [{ statId: 'R', rank: 1 }] }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'R', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'R')!
    expect(g.gapUp).toBeNull()
    expect(g.tier).toBe('strong')
  })
})
