import { describe, it, expect } from 'vitest'
import { computeCategoryGaps } from '@/myteam/categoryGaps'

/**
 * Build standings for a single stat where each team has the given per-category wins.
 */
function standingsFor(statId: string, winsByTeam: Record<string, number>) {
  return Object.entries(winsByTeam).map(([teamId, w]) => ({
    team: { teamId },
    perCategoryWins: { [statId]: w },
  }))
}

/** Merge several single-stat standings maps into one multi-stat standings array. */
function mergeStandings(maps: ReturnType<typeof standingsFor>[]) {
  const byTeam = new Map<string, Record<string, number>>()
  for (const m of maps) {
    for (const row of m) {
      const existing = byTeam.get(row.team.teamId) ?? {}
      byTeam.set(row.team.teamId, { ...existing, ...row.perCategoryWins })
    }
  }
  return Array.from(byTeam.entries()).map(([teamId, perCategoryWins]) => ({
    team: { teamId },
    perCategoryWins,
  }))
}

describe('computeCategoryGaps', () => {
  it('top-third category → strong (regardless of gapUp)', () => {
    const standings = standingsFor('HR', { t1: 100, me: 99, t3: 90, t4: 80 })
    const profile = { teamId: 'me', numTeams: 12, categories: [{ statId: 'HR', rank: 2 }] }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'HR', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'HR')!
    expect(g.tier).toBe('strong')
    expect(g.rank).toBe(2)
    expect(g.gapUp).toBe(1)
    expect(g.gapDown).toBe(9)
  })

  it('1st place → gapUp null, strong', () => {
    const standings = standingsFor('R', { me: 100, below: 90 })
    const profile = { teamId: 'me', numTeams: 12, categories: [{ statId: 'R', rank: 1 }] }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'R', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'R')!
    expect(g.gapUp).toBeNull()
    expect(g.tier).toBe('strong')
  })

  it('at most 3 winnable in a tight league; closest gaps win the slots', () => {
    // 5 non-strong cats all behind with gapUp 0 or 1. Only the 3 closest become winnable.
    const cats = [
      { statId: 'C1', lowerIsBetter: false },
      { statId: 'C2', lowerIsBetter: false },
      { statId: 'C3', lowerIsBetter: false },
      { statId: 'C4', lowerIsBetter: false },
      { statId: 'C5', lowerIsBetter: false },
    ]
    // me ranked 6th (mid of 12, never top/bottom third) in each.
    // gapUp: C1=0, C2=0, C3=1, C4=1, C5=1
    const standings = mergeStandings([
      standingsFor('C1', { above: 50, me: 50, below: 40 }), // gapUp 0
      standingsFor('C2', { above: 60, me: 60, below: 50 }), // gapUp 0
      standingsFor('C3', { above: 31, me: 30, below: 20 }), // gapUp 1
      standingsFor('C4', { above: 41, me: 40, below: 30 }), // gapUp 1
      standingsFor('C5', { above: 71, me: 70, below: 60 }), // gapUp 1
    ])
    const profile = {
      teamId: 'me',
      numTeams: 12,
      categories: cats.map((c) => ({ statId: c.statId, rank: 6 })),
    }
    const gaps = computeCategoryGaps(standings, profile, cats)
    const winnable = gaps.filter((g) => g.tier === 'winnable').map((g) => g.statId)
    expect(winnable).toHaveLength(3)
    // The two gapUp-0 cats must be selected (closest), plus one of the gapUp-1 cats.
    expect(winnable).toContain('C1')
    expect(winnable).toContain('C2')
    // The rest of the behind, mid-rank cats are safe (not lost, not winnable).
    const nonWinnable = gaps.filter((g) => g.tier !== 'winnable')
    expect(nonWinnable.every((g) => g.tier === 'safe')).toBe(true)
  })

  it('dead-last (12th) with gapUp 1 → lost, NOT winnable', () => {
    const standings = standingsFor('SV', { above: 51, me: 50 })
    const profile = { teamId: 'me', numTeams: 12, categories: [{ statId: 'SV', rank: 12 }] }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'SV', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'SV')!
    expect(g.gapUp).toBe(1)
    expect(g.tier).toBe('lost')
  })

  it('dead-last (12th) with gapUp 0 → winnable (tied)', () => {
    const standings = standingsFor('SB', { above: 50, me: 50 })
    const profile = { teamId: 'me', numTeams: 12, categories: [{ statId: 'SB', rank: 12 }] }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'SB', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'SB')!
    expect(g.gapUp).toBe(0)
    expect(g.tier).toBe('winnable')
  })

  it('bottom-third behind, large gap → lost', () => {
    const standings = standingsFor('K', { above: 50, me: 10 })
    const profile = { teamId: 'me', numTeams: 12, categories: [{ statId: 'K', rank: 12 }] }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'K', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'K')!
    expect(g.tier).toBe('lost')
    expect(g.gapUp).toBe(40)
    expect(g.gapDown).toBeNull()
  })

  it('mid-rank behind with gapUp > 1 → safe (not winnable, not lost)', () => {
    const standings = standingsFor('AVG', { above: 55, me: 50 })
    const profile = { teamId: 'me', numTeams: 12, categories: [{ statId: 'AVG', rank: 6 }] }
    const gaps = computeCategoryGaps(standings, profile, [{ statId: 'AVG', lowerIsBetter: false }])
    const g = gaps.find((x) => x.statId === 'AVG')!
    expect(g.gapUp).toBe(5)
    expect(g.tier).toBe('safe')
  })
})
