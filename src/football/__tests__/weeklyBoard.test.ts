import { describe, it, expect } from 'vitest'
import { buildWeeklyBoard, winPctFromMargin } from '../weeklyBoard'
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

  it('empty schedule = unknown, not a league-wide bye', () => {
    // A failed/unavailable schedule fetch yields {} — every team would otherwise
    // look like it were on bye, which would fabricate bye must-sub moves.
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(80), opp: pv(999),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'],
      freeAgents: [], opponentByTeam: {},
    })
    expect(board.starters.every((s) => s.bye)).toBe(false)
    expect(board.starters.every((s) => s.opponent === '')).toBe(true)
    expect(board.moves.every((m) => m.kind !== 'bye')).toBe(true)
  })
})

/**
 * This Week absorbed the Matchup tab, so the board now carries the fantasy opponent, the
 * near coin-flips, and the byes. All three are computed off the SAME weekly points as the
 * lineup rows, which is the point: the margin on screen can be checked against the numbers
 * beside it. The old Matchup tab derived its totals from a different (baseball) model.
 */
describe('buildWeeklyBoard — the Sunday page', () => {
  const vorByKey: Record<string, PlayerVor> = {
    qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(80), opp: pv(400),
  }

  it('projects the fantasy matchup from the same weekly points as the lineup', () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'],
      freeAgents: [], opponentByTeam: opp,
      oppTeamKey: 'other', oppTeamName: 'Their Team', oppTeamLogo: 'logo.png',
    })
    expect(board.matchup).not.toBeNull()
    // My starters are qb+rb1+rb2+rb3 = 300+200+150+120; theirs is one 400-point body.
    expect(board.matchup!.myPoints).toBe(770)
    expect(board.matchup!.oppPoints).toBe(400)
    expect(board.matchup!.margin).toBe(370)
    expect(board.matchup!.opponentName).toBe('Their Team')
    // The header total must equal the rows shown beneath it, or the page contradicts itself.
    expect(board.matchup!.myPoints).toBe(board.starters.reduce((s, r) => s + r.weekPoints, 0))
    expect(board.matchup!.myWinPct).toBeGreaterThan(50)
    expect(board.matchup!.myWinPct).toBeLessThanOrEqual(99)
  })

  /*
   * The screen prints each row rounded. If the header rounds the true total instead of
   * summing those rounded rows, a reader who adds the column gets a different number — the
   * live page showed 142 above nine rows adding to 143. The view sums the rounded rows; this
   * pins the property that makes that safe.
   */
  it('rounded row values are what the header must sum, and they can differ from a rounded total', () => {
    const fractional: Record<string, PlayerVor> = {
      qb: pv(19.6), rb1: pv(20.6), rb2: pv(13.6), rb3: pv(11.6), rb4: pv(8), opp: pv(120),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey: fractional, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'],
      freeAgents: [], opponentByTeam: opp,
      oppTeamKey: 'other', oppTeamName: 'Them',
    })
    const rowSum = board.starters.reduce((s, r) => s + Math.round(r.weekPoints), 0)
    // 19.6+20.6+13.6+11.6 = 65.4 -> rounds to 65, but the printed rows are 20+21+14+12 = 67.
    expect(Math.round(board.matchup!.myPoints)).toBe(65)
    expect(rowSum).toBe(67)
    expect(rowSum).not.toBe(Math.round(board.matchup!.myPoints))
  })

  it('never offers the same bench player as the alternative for two slots', () => {
    // Two FLEX-ish slots and a single strong bench body both could claim.
    const twoFlex = { QB: 1, RB: 1, FLEX: 2 }
    const board = buildWeeklyBoard({
      pool, vorByKey: { qb: pv(30), rb1: pv(20), rb2: pv(19), rb3: pv(18.5), rb4: pv(18), opp: pv(1) },
      slots: twoFlex, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    const alts = board.closeCalls.map((c) => c.sitName)
    expect(new Set(alts).size).toBe(alts.length)
  })

  it('ranks starters and free agents on one weekly scale', () => {
    const fa: AvailablePlayer[] = [
      { playerKey: 'faRB', name: 'Wire Back', position: 'RB', team: 'BUF' } as AvailablePlayer,
    ]
    const v = { qb: pv(30), rb1: pv(22), rb2: pv(14), rb3: pv(12), rb4: pv(9), opp: pv(1), faRB: pv(18, { vorWeek: 5 }) }
    const board = buildWeeklyBoard({
      pool, vorByKey: v, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'], freeAgents: fa, opponentByTeam: opp,
    })
    // Backs by week: rb1 22, faRB 18, rb2 14, rb3 12, rb4 9. The wire body must land
    // BETWEEN my starters — that is the comparison the page exists to make.
    const byName = new Map(board.starters.map((s2) => [s2.name, s2.posRank]))
    expect(byName.get('RB One')).toBe(1)
    expect(byName.get('RB Two')).toBe(3)
    expect(board.streamers.find((r) => r.player.name === 'Wire Back')!.posRank).toBe(2)
  })

  it('gives a flex rank only to positions the flex can take', () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    const qb = board.starters.find((s2) => s2.position === 'QB')!
    const rb = board.starters.find((s2) => s2.position === 'RB')!
    // slots here are QB/RB/FLEX, and FLEX takes RB/WR/TE — never a quarterback.
    expect(qb.flexRank).toBe(0)
    expect(rb.flexRank).toBeGreaterThan(0)
    expect(qb.posRank).toBeGreaterThan(0)
  })

  it("badges every row by who holds the player, including this week's opponent", () => {
    const fa: AvailablePlayer[] = [
      { playerKey: 'faRB', name: 'Wire Back', position: 'RB', team: 'BUF' } as AvailablePlayer,
    ]
    const v = { ...vorByKey, faRB: pv(18, { vorWeek: 5 }) }
    const board = buildWeeklyBoard({
      pool, vorByKey: v, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: fa, opponentByTeam: opp,
      oppTeamKey: 'other', oppTeamName: 'Them', teamNames: { other: 'Them' },
    })
    const rbs = board.board.RB
    const owner = new Map(rbs.map((r) => [r.name, r.owner]))
    expect(owner.get('RB One')).toBe('me')
    expect(owner.get('Their Guy')).toBe('opp')
    expect(owner.get('Wire Back')).toBe('free')
  })

  it('offers a FLEX list that is every flex-eligible body in one order', () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    expect(board.boardPositions).toContain('FLEX')
    expect(board.boardPositions[board.boardPositions.length - 1]).toBe('FLEX')
    // slots are QB/RB/FLEX and FLEX takes RB/WR/TE — so no quarterback in the flex list.
    expect(board.board.FLEX.some((r) => r.position === 'QB')).toBe(false)
    expect(board.board.FLEX.length).toBeGreaterThan(0)
  })

  it('only lists positions the league actually starts', () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    expect(board.boardPositions).not.toContain('K')
    expect(board.boardPositions).not.toContain('DEF')
  })

  it("carries the opponent's projected starters and flags their byes", () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
      oppTeamKey: 'other', oppTeamName: 'Them',
    })
    expect(board.matchup!.oppStarters.length).toBeGreaterThan(0)
    expect(board.matchup!.oppStarters.every((o) => o.name !== '—')).toBe(true)
    // Everyone plays in this fixture, so nobody is idle.
    expect(board.matchup!.oppByes).toEqual([])
  })

  it('pairs the two lineups seat by seat, nth against nth at each slot', () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
      oppTeamKey: 'other', oppTeamName: 'Them',
    })
    const duels = board.matchup!.duels
    // One row per seat in the lineup: QB + RB + RB + FLEX.
    expect(duels.length).toBe(4)
    expect(duels.map((d) => d.slot)).toEqual(['QB', 'RB', 'RB', 'FLEX'])
    // They have a single body, so most seats are unopposed rather than silently dropped.
    const contested = duels.filter((d) => d.mine && d.theirs)
    expect(contested.length).toBe(1)
    expect(duels.every((d) => d.mine !== null)).toBe(true)
    // Edge is mine minus theirs, so a positive number always means I win that seat.
    for (const d of duels) {
      expect(d.edge).toBe((d.mine?.weekPoints ?? 0) - (d.theirs?.weekPoints ?? 0))
    }
  })

  it("carries the opponent's positional rank so a seat can be read at a glance", () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
      oppTeamKey: 'other', oppTeamName: 'Them',
    })
    expect(board.matchup!.oppStarters.every((o) => o.posRank > 0)).toBe(true)
  })

  it("counts starting slots nobody could fill", () => {
    // Four slots but only a single body — three seats stay empty.
    const thin = buildWeeklyBoard({
      pool: [pool[0]], vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    expect(thin.emptySlots).toBe(3)
  })

  /*
   * The page prints a rounded margin. Feeding the raw one into the formula put "you +8" beside
   * "60% to win" — eight points is 62%. One exported formula, fed the number on screen.
   */
  it('win% is a pure function of the margin it is given', () => {
    expect(winPctFromMargin(8)).toBe(62)
    expect(winPctFromMargin(6.5)).toBe(60)
    expect(winPctFromMargin(0)).toBe(50)
    expect(winPctFromMargin(-8)).toBe(38)
    expect(winPctFromMargin(500)).toBe(99)
    expect(winPctFromMargin(-500)).toBe(1)
  })

  it('leaves the matchup null when no opponent is known (bye week)', () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    expect(board.matchup).toBeNull()
  })

  it('flags starters on a bye', () => {
    // GB and DAL are off this week, so rb3/rb4 are on bye — rb3 starts in the FLEX.
    const partial = { BUF: opp.BUF, KC: opp.KC, SF: opp.SF, NYG: opp.NYG }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'],
      freeAgents: [], opponentByTeam: partial,
    })
    expect(board.byeStarters.every((s) => s.bye)).toBe(true)
    expect(board.starters.filter((s) => s.bye).length).toBe(board.byeStarters.length)
  })

  it('surfaces a near coin-flip and ignores a decision that is not close', () => {
    // rb3 (120) starts in the FLEX over rb4 (119) — a one-point call.
    const close = { ...vorByKey, rb3: pv(120), rb4: pv(119) }
    const board = buildWeeklyBoard({
      pool, vorByKey: close, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'],
      freeAgents: [], opponentByTeam: opp,
    })
    const flex = board.closeCalls.find((c) => c.sitName === 'RB Four')
    expect(flex).toBeTruthy()
    expect(flex!.gap).toBeCloseTo(1, 5)

    // Widen the gap well past the threshold and it should stop being a close call.
    const wide = { ...vorByKey, rb3: pv(120), rb4: pv(20) }
    const board2 = buildWeeklyBoard({
      pool, vorByKey: wide, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'],
      freeAgents: [], opponentByTeam: opp,
    })
    expect(board2.closeCalls.find((c) => c.sitName === 'RB Four')).toBeUndefined()
  })
})
