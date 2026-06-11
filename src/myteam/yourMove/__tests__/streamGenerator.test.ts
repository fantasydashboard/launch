import { describe, it, expect } from 'vitest'
import { streamGenerator } from '../generators/streamGenerator'
import { projectStarts } from '../projectRemainingWeek'
import type { ScoredContext } from '../types'
import type { AvailablePlayer } from '@/players/types'
import type { ProbableStart } from '@/services/mlbSchedule'

const cats = [
  { statId: 'K', lowerIsBetter: false, side: 'pit' as const, isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit' as const, isRatio: true },
]
const ctx: ScoredContext = {
  cats,
  categoryIds: ['K', 'ERA'],
  myStats: { K: 40, ERA: 4.0 },
  oppStats: { K: 45, ERA: 3.8 },
  days: 5,
  platform: 'yahoo',
}
const fas: AvailablePlayer[] = [
  { playerKey: 'sp1', name: 'Hunter Brown', position: 'SP', team: 'HOU', percentOwned: 30, stats: { K: 160, ERA: 3.0 } },
  { playerKey: 'h1', name: 'Some Hitter', position: 'OF', team: 'SF', percentOwned: 10, stats: { HR: 20 } },
]
const starts: Record<string, ProbableStart[]> = {
  'hunter brown': [
    { pitcherName: 'Hunter Brown', teamAbbr: 'HOU', opponentAbbr: 'LAA', date: '2026-06-12' },
    { pitcherName: 'Hunter Brown', teamAbbr: 'HOU', opponentAbbr: 'SEA', date: '2026-06-15' },
  ],
}

describe('projectStarts', () => {
  it('scales counting stats per-start and passes ratios through', () => {
    const out = projectStarts({ K: 160, ERA: 3.0 }, null, cats, 2, 0.6)
    // full-season K = 160/0.6; per start /32; * 2 starts
    expect(out.K).toBeCloseTo((160 / 0.6 / 32) * 2, 4)
    expect(out.ERA).toBeCloseTo(3.0, 6)
  })
})

describe('streamGenerator', () => {
  it('proposes pitchers with confirmed starts, flags two-start weeks', () => {
    const cands = streamGenerator(fas, starts, ['K', 'ERA'], ctx, 0.6)
    expect(cands).toHaveLength(1)
    expect(cands[0].kind).toBe('stream')
    expect(cands[0].player.key).toBe('sp1')
    expect(cands[0].categories).toContain('K')
    expect(cands[0].rationale).toMatch(/two-start/i)
  })

  it('ignores hitters and pitchers without scheduled starts', () => {
    expect(streamGenerator(fas, {}, ['K'], ctx, 0.6)).toEqual([])
  })
})
