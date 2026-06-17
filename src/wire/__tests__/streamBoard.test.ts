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

  it('a 1-start SP is not flagged twoStart and reads "1 start"', () => {
    const sched: WeekSchedule = {
      gamesByTeam: {},
      startsByPitcher: { 'one starter': [{ pitcherName: 'One Starter', teamAbbr: 'SD', opponentAbbr: 'LAD', date: '2026-06-19' }] },
    }
    const board = buildStreamBoard({
      freeAgents: [{ playerKey: 's1', name: 'One Starter', position: 'SP', team: 'SD' }],
      weakCats: [{ statId: 'K', label: 'K', rank: 11, side: 'pit', isRatio: false }],
      schedule: sched,
    })
    expect(board.starters[0].twoStart).toBeFalsy()
    expect(board.starters[0].rationale).toBe('1 start: LAD')
  })

  it('excludes an SP with no scheduled starts, and does not double-list an SP,RP arm', () => {
    const sched: WeekSchedule = {
      gamesByTeam: {},
      startsByPitcher: { 'swing arm': [{ pitcherName: 'Swing Arm', teamAbbr: 'NYM', opponentAbbr: 'ATL', date: '2026-06-19' }] },
    }
    const board = buildStreamBoard({
      freeAgents: [
        { playerKey: 'noStart', name: 'No Start', position: 'SP', team: 'BOS' },
        { playerKey: 'swing', name: 'Swing Arm', position: 'SP,RP', team: 'NYM' },
      ],
      weakCats: [
        { statId: 'K', label: 'K', rank: 11, side: 'pit', isRatio: false },
        { statId: 'SV', label: 'SV', rank: 9, side: 'pit', isRatio: false },
      ],
      schedule: sched,
    })
    expect(board.starters.map((s) => s.player.name)).not.toContain('No Start') // no scheduled start
    expect(board.starters.map((s) => s.player.name)).toContain('Swing Arm')
    expect(board.relievers.map((s) => s.player.name)).not.toContain('Swing Arm') // not double-listed
  })
})
