import { describe, it, expect } from 'vitest'
import { buildPointsPositional } from '../pointsPositional'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'

const pool: PointsPoolPlayer[] = [
  { playerKey: 'p1', name: 'Star OF', position: 'OF', teamKey: 'T1' },
  { playerKey: 'p2', name: 'Weak OF', position: 'OF', teamKey: 'T2' },
]
const weights = { HR: 4 }
const fgByKey = {
  p1: { player_type: 'batter', hr: 40, g: 150 } as any,
  p2: { player_type: 'batter', hr: 10, g: 150 } as any,
}

describe('buildPointsPositional', () => {
  it('ranks each team\'s best body per position by projected points', () => {
    const grid = buildPointsPositional(pool, fgByKey, weights, ['T1', 'T2'])
    const of = grid.positions.find((p) => p.position === 'OF')!
    expect(of.cells.find((c) => c.teamKey === 'T1')!.rank).toBe(1)
    expect(of.cells.find((c) => c.teamKey === 'T2')!.rank).toBe(2)
    expect(of.cells.find((c) => c.teamKey === 'T1')!.points).toBeGreaterThan(
      of.cells.find((c) => c.teamKey === 'T2')!.points,
    )
  })

  it('a team with nobody at a position gets a null cell', () => {
    const grid = buildPointsPositional(pool, fgByKey, weights, ['T1', 'T2'])
    const c = grid.positions.find((p) => p.position === 'C')
    if (c) {
      expect(c.cells.every((x) => x.rank === null)).toBe(true)
    }
  })
})
