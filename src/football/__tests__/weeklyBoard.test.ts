import { describe, it, expect } from 'vitest'
import { buildWeeklyBoard } from '../weeklyBoard'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { PlayerVor } from '../footballVor'
import type { AvailablePlayer } from '@/players/types'

// Minimal PlayerVor with only the fields the board reads.
function pv(pointsNextWeek: number, extra: Partial<PlayerVor> = {}): PlayerVor {
  return {
    playerKey: 'x', position: '', pointsRos: 0, vorRos: 0,
    pointsNextWeek, vorWeek: extra.vorWeek ?? 0,
    streamWeeks: extra.streamWeeks ?? 0, streamOf: extra.streamOf ?? 0,
    confidence: 'high', opportunity: extra.opportunity ?? '',
  }
}

// slots = 4 starting spots; the roster has 5 my-players, so the optimizer always
// benches one — that's what makes start/sit and bye moves observable.
const slots = { QB: 1, RB: 2, FLEX: 1 }
const pool: PointsPoolPlayer[] = [
  { playerKey: 'qb', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
  { playerKey: 'rb1', name: 'RB One', position: 'RB', teamKey: 'me', proTeam: 'KC' },
  { playerKey: 'rb2', name: 'RB Two', position: 'RB', teamKey: 'me', proTeam: 'SF' },
  { playerKey: 'rb3', name: 'RB Three', position: 'RB', teamKey: 'me', proTeam: 'DAL' },
  { playerKey: 'rb4', name: 'RB Four', position: 'RB', teamKey: 'me', proTeam: 'GB' },
  { playerKey: 'opp', name: 'Their Guy', position: 'RB', teamKey: 'other', proTeam: 'NYG' },
]
// Everyone plays this week.
const opp = {
  BUF: { opp: 'MIA', home: true }, KC: { opp: 'DEN', home: true }, SF: { opp: 'LAR', home: false },
  DAL: { opp: 'PHI', home: true }, GB: { opp: 'CHI', home: true }, NYG: { opp: 'WAS', home: false },
}

describe('buildWeeklyBoard', () => {
  it('clean week: current lineup == optimal → no moves, starters flagged inCurrent', () => {
    // Optimal (4 slots): qb, rb1, rb2 (top RBs), rb3 (FLEX). rb4 (80) benched.
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(80), opp: pv(999),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'], // == optimal
      freeAgents: [], opponentByTeam: opp,
    })
    expect(board.moves).toEqual([])
    expect(board.starters.every((s) => s.inCurrent)).toBe(true)
    const qb = board.starters.find((s) => s.playerKey === 'qb')!
    expect(qb.opponent).toBe('MIA')
    expect(qb.bye).toBe(false)
    expect(board.bench.map((b) => b.playerKey)).toEqual(['rb4']) // the benched one
  })

  it('bench player out-projects a current starter → a swap move with the gain', () => {
    // rb4 (220) is the best RB this week but the manager benches him for rb3 (120).
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(220), opp: pv(999),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'], // starts rb3, benches rb4
      freeAgents: [], opponentByTeam: opp,
    })
    const swap = board.moves.find((m) => m.startKey === 'rb4')
    expect(swap).toBeTruthy()
    expect(swap!.kind).toBe('swap')
    expect(swap!.sitKey).toBe('rb3')
    expect(swap!.gain).toBe(100) // 220 − 120
  })

  it('a current starter on bye → a bye must-sub move', () => {
    // rb1 (KC) is on bye this week (no KC game); the optimizer benches him for rb4.
    const byeOpp = {
      BUF: { opp: 'MIA', home: true }, SF: { opp: 'LAR', home: false },
      DAL: { opp: 'PHI', home: true }, GB: { opp: 'CHI', home: true },
    } // no KC → rb1 on bye
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(0), rb2: pv(150), rb3: pv(120), rb4: pv(100), opp: pv(999),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'], // still starts rb1 (on bye)
      freeAgents: [], opponentByTeam: byeOpp,
    })
    const byeMove = board.moves.find((m) => m.sitKey === 'rb1')
    expect(byeMove).toBeTruthy()
    expect(byeMove!.kind).toBe('bye')
    expect(byeMove!.startKey).toBe('rb4') // healthy replacement
  })

  it('streamers = free agents by weekly VOR, positive only, carrying week points', () => {
    const fas: AvailablePlayer[] = [
      { playerKey: 'fa_a', name: 'Streamer A', position: 'WR', team: 'CHI', percentOwned: 0, status: '', stats: {} },
      { playerKey: 'fa_b', name: 'Streamer B', position: 'WR', team: 'IND', percentOwned: 0, status: '', stats: {} },
      { playerKey: 'fa_c', name: 'Zero Guy', position: 'WR', team: 'NYJ', percentOwned: 0, status: '', stats: {} },
    ]
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(80), opp: pv(999),
      fa_a: pv(18, { vorWeek: 8, streamWeeks: 3, streamOf: 4 }),
      fa_b: pv(22, { vorWeek: 12 }),
      fa_c: pv(5, { vorWeek: 0 }), // not a positive-VOR stream
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: fas, opponentByTeam: opp,
    })
    expect(board.streamers.map((s) => s.player.name)).toEqual(['Streamer B', 'Streamer A'])
    expect(board.streamers[0].weekPoints).toBe(22)
    expect(board.streamers[0].vorWeek).toBe(12)
  })
})
