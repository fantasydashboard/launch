import { describe, it, expect } from 'vitest'
import { rankAddsForHoles } from '@/players/rankAdds'
import type { AvailablePlayer, Hole } from '@/players/types'

function p(key: string, stats: Record<string, number>, position = 'P'): AvailablePlayer {
  return { playerKey: key, name: key, position, team: 'X', percentOwned: 0, stats }
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

  it('excludes zero-value players in higher-is-better holes and missing-stat players', () => {
    const result = rankAddsForHoles(pool, holes, { perHole: 5 })
    const sv = result.find((h) => h.hole.statId === 'SV')!
    // starter has SV:0 -> excluded (higher-is-better, zero value is useless)
    // hitter has no SV -> percentile 0 -> excluded
    expect(sv.adds.map((a) => a.player.playerKey)).toEqual(['closer1', 'closer2'])
  })

  it('returns empty adds for a hole no one supplies', () => {
    const result = rankAddsForHoles([p('x', { HR: 10 })], holes, { perHole: 3 })
    expect(result.every((h) => h.adds.length === 0)).toBe(true)
  })

  it('side-gates: a pitching hole never surfaces a hitter (no "hitter fixes Saves")', () => {
    // A hitter carries a stray SV value; without the side gate the ranker would
    // surface them for the Saves hole. With side: 'pit' set, only pitchers qualify.
    const sided: AvailablePlayer[] = [
      p('reliever', { SV: 28 }, 'RP'),
      p('slugger', { SV: 99, HR: 40 }, 'OF'), // bogus SV value, wrong side
    ]
    const result = rankAddsForHoles(sided, [{ statId: 'SV', name: 'Saves', rank: 11, lowerIsBetter: false, side: 'pit' }])
    expect(result[0].adds.map((a) => a.player.playerKey)).toEqual(['reliever'])
  })

  it('side-gates: a Runs hole never surfaces a reliever (no "reliever fixes Runs")', () => {
    const sided: AvailablePlayer[] = [
      p('leadoff', { R: 70 }, 'OF'),
      p('reliever', { R: 27 }, 'RP'), // runs allowed, wrong side for Runs scored
    ]
    const result = rankAddsForHoles(sided, [{ statId: 'R', name: 'Runs', rank: 9, lowerIsBetter: false, side: 'hit' }])
    expect(result[0].adds.map((a) => a.player.playerKey)).toEqual(['leadoff'])
  })
})
