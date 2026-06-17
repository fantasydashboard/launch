import { describe, it, expect } from 'vitest'
import { buildStreamBoard } from '../streamBoard'
import type { WeekSchedule } from '@/services/mlbSchedule'

const schedule: WeekSchedule = {
  gamesByTeam: {},
  startsByPitcher: {
    'reese olson': [
      { pitcherName: 'Reese Olson', teamAbbr: 'DET', opponentAbbr: 'COL', date: '2026-06-18' },
      { pitcherName: 'Reese Olson', teamAbbr: 'DET', opponentAbbr: 'MIA', date: '2026-06-21' },
    ],
  },
}

describe('buildStreamBoard', () => {
  const weakCats = [
    { statId: 'K', label: 'K', rank: 11, side: 'pit' as const, isRatio: false },
    { statId: 'SV', label: 'SV', rank: 9, side: 'pit' as const, isRatio: false },
  ]

  it('surfaces a 2-start SP for a weak starter cat and a reliever for SV', () => {
    const board = buildStreamBoard({
      freeAgents: [
        { playerKey: 'p1', name: 'Reese Olson', position: 'SP', team: 'DET' },
        { playerKey: 'p2', name: 'Bryan Abreu', position: 'RP', team: 'HOU' },
        { playerKey: 'h1', name: 'Some Hitter', position: 'OF', team: 'NYY' },
      ],
      weakCats, schedule,
    })
    expect(board.starters.map((s) => s.player.name)).toContain('Reese Olson')
    expect(board.starters[0].twoStart).toBe(true)
    expect(board.relievers.map((s) => s.player.name)).toContain('Bryan Abreu')
    expect(board.starters.map((s) => s.player.name)).not.toContain('Some Hitter')
  })

  it('empties cleanly when there are no weak pitching cats', () => {
    const board = buildStreamBoard({
      freeAgents: [{ playerKey: 'p1', name: 'Reese Olson', position: 'SP', team: 'DET' }],
      weakCats: [{ statId: 'HR', label: 'HR', rank: 11, side: 'hit', isRatio: false }],
      schedule,
    })
    expect(board.starters).toEqual([])
    expect(board.relievers).toEqual([])
  })
})
