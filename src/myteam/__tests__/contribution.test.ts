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
})
