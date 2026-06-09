import { describe, it, expect } from 'vitest'
import { computePlayerContributions } from '@/myteam/contribution'

interface Pl {
  playerKey: string
  stats: Record<string, number>
}

function p(key: string, stats: Record<string, number>): Pl {
  return { playerKey: key, stats }
}

describe('computePlayerContributions', () => {
  it('top-third in a counting cat (HR) → plus', () => {
    const pool = [
      p('mine', { HR: 40 }),
      p('a', { HR: 5 }),
      p('b', { HR: 10 }),
      p('c', { HR: 15 }),
      p('d', { HR: 20 }),
    ]
    const result = computePlayerContributions(pool, ['mine'], [{ statId: 'HR', lowerIsBetter: false }])
    const mine = result.find((r) => r.playerKey === 'mine')!
    const hr = mine.contribs.find((c) => c.statId === 'HR')!
    expect(hr.tier).toBe('plus')
    expect(mine.plusCount).toBe(1)
    expect(mine.minusCount).toBe(0)
  })

  it('bottom-third in a ratio cat (ERA, lowerIsBetter) → minus', () => {
    const pool = [
      p('mine', { ERA: 6.0 }),
      p('a', { ERA: 2.0 }),
      p('b', { ERA: 2.5 }),
      p('c', { ERA: 3.0 }),
      p('d', { ERA: 3.5 }),
    ]
    const result = computePlayerContributions(pool, ['mine'], [{ statId: 'ERA', lowerIsBetter: true }])
    const mine = result.find((r) => r.playerKey === 'mine')!
    const era = mine.contribs.find((c) => c.statId === 'ERA')!
    expect(era.tier).toBe('minus')
    expect(mine.minusCount).toBe(1)
  })

  it('bottom-third in a counting cat (SB) → neutral, NOT minus', () => {
    const pool = [
      p('mine', { SB: 1 }),
      p('a', { SB: 10 }),
      p('b', { SB: 20 }),
      p('c', { SB: 30 }),
      p('d', { SB: 40 }),
    ]
    const result = computePlayerContributions(pool, ['mine'], [{ statId: 'SB', lowerIsBetter: false }])
    const mine = result.find((r) => r.playerKey === 'mine')!
    const sb = mine.contribs.find((c) => c.statId === 'SB')!
    expect(sb.tier).toBe('neutral')
    expect(mine.minusCount).toBe(0)
  })

  it('missing stat → neutral, excluded from plus/minus counts', () => {
    const pool = [
      p('mine', {}),
      p('a', { HR: 10 }),
      p('b', { HR: 20 }),
      p('c', { HR: 30 }),
    ]
    const result = computePlayerContributions(pool, ['mine'], [{ statId: 'HR', lowerIsBetter: false }])
    const mine = result.find((r) => r.playerKey === 'mine')!
    const hr = mine.contribs.find((c) => c.statId === 'HR')!
    expect(hr.tier).toBe('neutral')
    expect(mine.plusCount).toBe(0)
    expect(mine.minusCount).toBe(0)
  })

  it('returns one PlayerContribution per my player', () => {
    const pool = [p('m1', { HR: 40 }), p('m2', { HR: 5 }), p('other', { HR: 20 })]
    const result = computePlayerContributions(pool, ['m1', 'm2'], [{ statId: 'HR', lowerIsBetter: false }])
    expect(result.map((r) => r.playerKey).sort()).toEqual(['m1', 'm2'])
  })

  it('overallValue = mean of contributed-category percentiles; balanced mid player is sensible', () => {
    // 3 hitting cats. "mid" is squarely middle in each across a 5-player pool.
    const cats = [
      { statId: 'HR', lowerIsBetter: false },
      { statId: 'R', lowerIsBetter: false },
      { statId: 'RBI', lowerIsBetter: false },
    ]
    const pool = [
      p('mid', { HR: 15, R: 50, RBI: 50 }),
      p('a', { HR: 5, R: 30, RBI: 30 }),
      p('b', { HR: 10, R: 40, RBI: 40 }),
      p('c', { HR: 20, R: 60, RBI: 60 }),
      p('d', { HR: 25, R: 70, RBI: 70 }),
    ]
    const result = computePlayerContributions(pool, ['mid'], cats)
    const mid = result.find((r) => r.playerKey === 'mid')!
    // mid is ranked 3rd of 5 in each cat → percentile (5-2)/5 = 0.6 each → mean 0.6.
    expect(mid.overallValue).toBeCloseTo(0.6, 5)
    expect(mid.overallValue).toBeGreaterThan(0.4)
    expect(mid.overallValue).toBeLessThan(0.8)
  })

  it('scrub low everywhere has a low overallValue', () => {
    const cats = [
      { statId: 'HR', lowerIsBetter: false },
      { statId: 'R', lowerIsBetter: false },
    ]
    const pool = [
      p('scrub', { HR: 1, R: 5 }),
      p('a', { HR: 20, R: 60 }),
      p('b', { HR: 30, R: 70 }),
      p('c', { HR: 40, R: 80 }),
      p('d', { HR: 50, R: 90 }),
    ]
    const result = computePlayerContributions(pool, ['scrub'], cats)
    const scrub = result.find((r) => r.playerKey === 'scrub')!
    // last of 5 in each → percentile (5-4)/5 = 0.2 each → mean 0.2.
    expect(scrub.overallValue).toBeCloseTo(0.2, 5)
    expect(scrub.overallValue).toBeLessThan(0.35)
  })

  it('topStatId is the highest-percentile contributed category', () => {
    const cats = [
      { statId: 'HR', lowerIsBetter: false },
      { statId: 'SB', lowerIsBetter: false },
    ]
    const pool = [
      // mine: best in SB (1st of 4), worst in HR (last of 4)
      p('mine', { HR: 1, SB: 40 }),
      p('a', { HR: 10, SB: 5 }),
      p('b', { HR: 20, SB: 10 }),
      p('c', { HR: 30, SB: 15 }),
    ]
    const result = computePlayerContributions(pool, ['mine'], cats)
    const mine = result.find((r) => r.playerKey === 'mine')!
    expect(mine.topStatId).toBe('SB')
  })

  it('overallValue only counts categories the player actually has (pitcher not penalized for hitting)', () => {
    const cats = [
      { statId: 'HR', lowerIsBetter: false }, // hitting
      { statId: 'K', lowerIsBetter: false }, // pitching
    ]
    const pool = [
      // pitcher: no HR (absent), strong K
      p('pitcher', { K: 200 }),
      p('hitterA', { HR: 30, K: 50 }),
      p('hitterB', { HR: 20, K: 100 }),
      p('hitterC', { HR: 10, K: 150 }),
    ]
    const result = computePlayerContributions(pool, ['pitcher'], cats)
    const pitcher = result.find((r) => r.playerKey === 'pitcher')!
    // Only K counted. Among 4 with K, pitcher has 200 → 1st → percentile (4-0)/4 = 1.0.
    expect(pitcher.overallValue).toBeCloseTo(1.0, 5)
    expect(pitcher.topStatId).toBe('K')
  })

  it('player with no contributed category → overallValue 0, topStatId null', () => {
    const cats = [{ statId: 'HR', lowerIsBetter: false }]
    const pool = [p('mine', {}), p('a', { HR: 10 }), p('b', { HR: 20 })]
    const result = computePlayerContributions(pool, ['mine'], cats)
    const mine = result.find((r) => r.playerKey === 'mine')!
    expect(mine.overallValue).toBe(0)
    expect(mine.topStatId).toBeNull()
  })
})
