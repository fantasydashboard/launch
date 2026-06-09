import { describe, it, expect } from 'vitest'
import { rankAddsForHoles } from '@/players/rankAdds'
import type { AvailablePlayer, Hole } from '@/players/types'

function p(key: string, stats: Record<string, number>): AvailablePlayer {
  return { playerKey: key, name: key, position: 'P', team: 'X', percentOwned: 0, stats }
}

const pool: AvailablePlayer[] = [
  p('closer1', { SV: 30, ERA: 2.5 }),
  p('closer2', { SV: 20, ERA: 3.0 }),
  p('starter', { SV: 0, ERA: 2.0 }),
  p('hitter', { HR: 25 }),
]

const holes: Hole[] = [
  { statId: 'SV', name: 'Saves', rank: 11, lowerIsBetter: false },
  { statId: 'ERA', name: 'ERA', rank: 10, lowerIsBetter: true },
]

describe('rankAddsForHoles', () => {
  it('returns one HoleAdds per hole, ordered best-first within each', () => {
    const result = rankAddsForHoles(pool, holes, { perHole: 2 })
    expect(result.map((h) => h.hole.statId)).toEqual(['SV', 'ERA'])
    const sv = result[0]
    expect(sv.adds.map((a) => a.player.playerKey)).toEqual(['closer1', 'closer2'])
    expect(sv.adds[0].statValue).toBe(30)
    expect(sv.adds[0].percentile).toBeGreaterThan(sv.adds[1].percentile)
  })

  it('respects perHole limit and excludes zero-value players', () => {
    const result = rankAddsForHoles(pool, holes, { perHole: 5 })
    const sv = result.find((h) => h.hole.statId === 'SV')!
    // starter has SV:0 -> still has a stat value 0, but percentile is lowest;
    // hitter has no SV -> percentile 0 -> excluded.
    expect(sv.adds.some((a) => a.player.playerKey === 'hitter')).toBe(false)
  })

  it('returns empty adds for a hole no one supplies', () => {
    const result = rankAddsForHoles([p('x', { HR: 10 })], holes, { perHole: 3 })
    expect(result.every((h) => h.adds.length === 0)).toBe(true)
  })
})
