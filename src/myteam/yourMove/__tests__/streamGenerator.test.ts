import { describe, it, expect } from 'vitest'
import { streamGenerator } from '../generators/streamGenerator'
import { projectStarts } from '../projectRemainingWeek'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import type { ProbableStart } from '@/services/mlbSchedule'

const cats: CatSpec[] = [
  { statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true },
]
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
    expect(out.K).toBeCloseTo((160 / 0.6 / 32) * 2, 4)
    expect(out.ERA).toBeCloseTo(3.0, 6)
  })
})

describe('streamGenerator', () => {
  it('emits stream candidates for pitchers with confirmed starts, flags two-start', () => {
    const cands = streamGenerator(fas, starts, cats, 0.6)
    expect(cands).toHaveLength(1)
    expect(cands[0].kind).toBe('stream')
    expect(cands[0].side).toBe('pit')
    expect(cands[0].player.key).toBe('sp1')
    expect(cands[0].addDelta.K).toBeGreaterThan(0)
    expect(cands[0].detail).toMatch(/two-start/i)
  })

  it('ignores hitters and pitchers without scheduled starts', () => {
    expect(streamGenerator(fas, {}, cats, 0.6)).toEqual([])
  })
})
