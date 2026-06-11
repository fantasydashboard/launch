import { describe, it, expect } from 'vitest'
import { startSitGenerator, type BenchPlayer } from '../generators/startSitGenerator'
import type { ScoredContext } from '../types'

const ctx: ScoredContext = {
  cats: [{ statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false }],
  categoryIds: ['SB'],
  myStats: { SB: 6 },
  oppStats: { SB: 9 },
  days: 5,
  platform: 'yahoo',
}
const benched: BenchPlayer[] = [
  { playerKey: 'b1', name: 'Speedy Bench', team: 'KC', position: 'OF', stats: { SB: 30 } },
  { playerKey: 'b2', name: 'No Speed', team: 'BOS', position: '1B', stats: { SB: 1 } },
]

describe('startSitGenerator', () => {
  it('proposes starting a benched player who helps a flippable cat', () => {
    const cands = startSitGenerator(benched, ['SB'], ctx, 0.6)
    const speedy = cands.find((c) => c.player.key === 'b1')!
    expect(speedy.kind).toBe('startSit')
    expect(speedy.categories).toContain('SB')
    expect(speedy.winProbLift).toBeGreaterThan(0)
    expect(speedy.rationale).toMatch(/bench/i)
  })

  it('returns nothing without flippable cats', () => {
    expect(startSitGenerator(benched, [], ctx, 0.6)).toEqual([])
  })
})
