import { describe, it, expect } from 'vitest'
import { addGenerator } from '../generators/addGenerator'
import type { ScoredContext } from '../types'
import type { AvailablePlayer } from '@/players/types'

const ctx: ScoredContext = {
  cats: [{ statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }],
  categoryIds: ['HR'],
  myStats: { HR: 8 },
  oppStats: { HR: 11 },
  days: 5,
  platform: 'yahoo',
}
const fas: AvailablePlayer[] = [
  { playerKey: 'fa1', name: 'Power Bat', position: 'OF', team: 'NYY', percentOwned: 20, stats: { HR: 24 } },
  { playerKey: 'fa2', name: 'Slap Hitter', position: '2B', team: 'SF', percentOwned: 5, stats: { HR: 2 } },
]

describe('addGenerator', () => {
  it('produces add candidates for flippable cats, tagged with helped cats', () => {
    const cands = addGenerator(fas, ['HR'], ctx, 0.6)
    const power = cands.find((c) => c.player.key === 'fa1')!
    expect(power.kind).toBe('add')
    expect(power.categories).toContain('HR')
    expect(power.winProbLift).toBeGreaterThan(0)
  })

  it('returns nothing when there are no flippable cats', () => {
    expect(addGenerator(fas, [], ctx, 0.6)).toEqual([])
  })
})
