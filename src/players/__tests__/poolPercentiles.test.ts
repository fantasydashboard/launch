import { describe, it, expect } from 'vitest'
import { percentileInPool } from '@/players/poolPercentiles'
import type { AvailablePlayer } from '@/players/types'

function p(key: string, stats: Record<string, number>): AvailablePlayer {
  return { playerKey: key, name: key, position: 'P', team: 'X', percentOwned: 0, stats }
}

describe('percentileInPool', () => {
  it('higher value = higher percentile when higher is better', () => {
    const players = [p('a', { SV: 30 }), p('b', { SV: 10 }), p('c', { SV: 20 })]
    const pct = percentileInPool(players, 'SV', false)
    expect(pct.get('a')).toBeGreaterThan(pct.get('c')!)
    expect(pct.get('c')).toBeGreaterThan(pct.get('b')!)
    expect(pct.get('a')).toBe(1) // best
  })

  it('lower value = higher percentile when lower is better (ERA)', () => {
    const players = [p('a', { ERA: 2.0 }), p('b', { ERA: 5.0 }), p('c', { ERA: 3.5 })]
    const pct = percentileInPool(players, 'ERA', true)
    expect(pct.get('a')).toBe(1) // lowest ERA is best
    expect(pct.get('b')).toBeLessThan(pct.get('c')!)
  })

  it('missing stat → percentile 0', () => {
    const players = [p('a', { SV: 30 }), p('b', {})]
    const pct = percentileInPool(players, 'SV', false)
    expect(pct.get('b')).toBe(0)
  })
})
