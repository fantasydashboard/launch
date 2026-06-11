import { describe, it, expect } from 'vitest'
import { startSitGenerator, type BenchPlayer } from '../generators/startSitGenerator'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [{ statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false }]
const benched: BenchPlayer[] = [
  { playerKey: 'b1', name: 'Speedy Bench', team: 'KC', position: 'OF', stats: { SB: 30 } },
]

describe('startSitGenerator', () => {
  it('emits a startSit candidate per benched player with side + delta', () => {
    const cands = startSitGenerator(benched, cats, 5, 0.6)
    expect(cands).toHaveLength(1)
    expect(cands[0].kind).toBe('startSit')
    expect(cands[0].side).toBe('hit')
    expect(cands[0].addDelta.SB).toBeGreaterThan(0)
    expect(cands[0].detail).toMatch(/bench/i)
  })
})
