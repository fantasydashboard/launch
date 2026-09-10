import { describe, it, expect } from 'vitest'
import { buildWeeklyBoard, winPctFromMargin, TIER_DEPTH } from '../weeklyBoard'
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

  it('tiers each board list and marks where the cliff falls', () => {
    const gappy = { qb: pv(30), rb1: pv(29), rb2: pv(28), rb3: pv(9), rb4: pv(8), opp: pv(1) }
    const board = buildWeeklyBoard({
      pool, vorByKey: gappy, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    const rbs = board.board.RB
    expect(rbs.every((r) => r.tier >= 1)).toBe(true)
    const cliff = rbs.find((r) => r.tierBreak)
    expect(cliff).toBeTruthy()
    // The break lands at the real drop (28 -> 9), not at an arbitrary row.
    expect(cliff!.tierDrop).toBeGreaterThan(15)
  })

  it('tiers FLEX on its own scale without disturbing the position lists', () => {
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: [], opponentByTeam: opp,
    })
    // Same player appears in both lists; his flex tier is a different fact from his RB tier,
    // so the two must not share an object.
    const inRb = board.board.RB.find((r) => r.name === 'RB Three')!
    const inFlex = board.board.FLEX.find((r) => r.name === 'RB Three')!
    expect(inRb).not.toBe(inFlex)
    expect(inFlex.tier).toBeGreaterThanOrEqual(1)
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

/*
 * The board printed "TIER 5" twice and "TIER 6" three times down one column. assignTiers is
 * strictly increasing, so the repeats could not come from it — the loop walked the caller's
 * array while the tiers had been computed on a value-sorted copy, and a weekly board ties
 * constantly (half a column on 20 points), so the two orderings disagreed.
 */
/*
 * The same repeats came back on the FLEX column after the per-position fix.
 *
 * They could not come from the walk this time. The per-position pass runs FIRST and mutates
 * the shared row objects, setting tierBreak and tierDrop; FLEX then copies those same objects
 * and re-tiers them. tierUp only ever SETS the flag, so every break earned in the receiver
 * column rode into the flex column attached to a flex tier number that had already been
 * printed — "TIER 5" twice, "TIER 6" three times, exactly as before and for a new reason.
 */
describe('tier labels down the FLEX column', () => {
  it('does not inherit tier breaks from the positional pass', () => {
    // Receivers and backs interleave on points, so their positional cliffs land in the middle
    // of the flex order rather than on its own cliffs.
    const rows = [
      { k: 'rb1', pos: 'RB', p: 24 }, { k: 'rb2', pos: 'RB', p: 21 },
      { k: 'wr1', pos: 'WR', p: 21 }, { k: 'wr2', pos: 'WR', p: 20 },
      { k: 'rb3', pos: 'RB', p: 20 }, { k: 'wr3', pos: 'WR', p: 20 },
      { k: 'rb4', pos: 'RB', p: 20 }, { k: 'wr4', pos: 'WR', p: 17 },
      { k: 'rb5', pos: 'RB', p: 17 }, { k: 'wr5', pos: 'WR', p: 17 },
      { k: 'rb6', pos: 'RB', p: 14 }, { k: 'wr6', pos: 'WR', p: 12 },
    ]
    const board = buildWeeklyBoard({
      pool: rows.map((r) => ({ playerKey: r.k, name: r.k, position: r.pos, teamKey: 'me', proTeam: 'DET' })) as any,
      vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
        playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
        vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
      }])) as any,
      slots: { RB: 2, WR: 2, FLEX: 1 },
      myTeamKey: 'me',
      currentStarters: [],
      freeAgents: [],
      opponentByTeam: { DET: { opp: 'CHI', home: true } },
    })
    const seen = board.board.FLEX.filter((r) => r.tierBreak).map((r) => r.tier)
    expect(seen).toEqual([...new Set(seen)])
    // And every break must be a real advance down the column, not a leftover.
    expect([...seen].sort((a, b) => a - b)).toEqual(seen)
  })
})

describe('tier labels down a weekly column', () => {
  it('never repeats a tier number, even with heavy ties', () => {
    const rows = [
      { k: 'a', p: 24 }, { k: 'b', p: 21 }, { k: 'c', p: 21 },
      { k: 'd', p: 20 }, { k: 'e', p: 20 }, { k: 'f', p: 20 }, { k: 'g', p: 20 },
      { k: 'h', p: 17 }, { k: 'i', p: 17 }, { k: 'j', p: 17 },
    ]
    const board = buildWeeklyBoard({
      pool: rows.map((r) => ({ playerKey: r.k, name: r.k, position: 'RB', teamKey: 'me', proTeam: 'DET' })) as any,
      vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
        playerKey: r.k, position: 'RB', pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
        vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
      }])) as any,
      slots: { RB: 2, FLEX: 1 },
      myTeamKey: 'me',
      currentStarters: [],
      freeAgents: [],
      opponentByTeam: { DET: { opp: 'CHI', home: true } },
    })
    const seen = board.board.RB.filter((r) => r.tierBreak).map((r) => r.tier)
    expect(seen).toEqual([...new Set(seen)])       // no repeats
    expect(seen).toEqual([...seen].sort((a, b) => a - b)) // and strictly ascending
  })
})

/*
 * Three reads the page had the data for and never stated.
 */
describe('what the weekly board says out loud', () => {
  const mk = (rows: { k: string; pos: string; p: number; team: string }[]) => ({
    pool: rows.filter((r) => r.team !== 'FA').map((r) => ({
      playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'DET',
    })) as never,
    vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
      playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
      vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
    }])) as never,
    freeAgents: rows.filter((r) => r.team === 'FA')
      // AvailablePlayer carries `team`, not `proTeam` — with the wrong field the row reads as
      // a bye (no schedule entry for '') and drops out of the board entirely.
      .map((r) => ({ playerKey: r.k, name: r.k, position: r.pos, team: 'DET' })) as never,
    opponentByTeam: { DET: { opp: 'CHI', home: true } },
  })

  it('will not call a coin-flip a move', () => {
    // My set lineup starts the worse of two flex bodies, by nine tenths of a point.
    const rows = [
      { k: 'qb1', pos: 'QB', p: 20, team: 'me' },
      { k: 'rb1', pos: 'RB', p: 18, team: 'me' },
      { k: 'rb2', pos: 'RB', p: 13.2, team: 'me' },
      { k: 'rb3', pos: 'RB', p: 12.3, team: 'me' },
    ]
    const board = buildWeeklyBoard({
      ...mk(rows), slots: { QB: 1, RB: 2 }, myTeamKey: 'me',
      currentStarters: ['qb1', 'rb1', 'rb3'],
    })
    expect(board.moves.filter((m) => m.kind === 'swap')).toHaveLength(0)
    // It is still surfaced — as the close call it is, not as something to act on.
    expect(board.closeCalls.length).toBeGreaterThan(0)
  })

  it('still calls a real upgrade a move', () => {
    const rows = [
      { k: 'qb1', pos: 'QB', p: 20, team: 'me' },
      { k: 'rb1', pos: 'RB', p: 18, team: 'me' },
      { k: 'rb2', pos: 'RB', p: 17, team: 'me' },
      { k: 'rb3', pos: 'RB', p: 6, team: 'me' },
    ]
    const board = buildWeeklyBoard({
      ...mk(rows), slots: { QB: 1, RB: 2 }, myTeamKey: 'me',
      currentStarters: ['qb1', 'rb1', 'rb3'],
    })
    expect(board.moves.some((m) => m.kind === 'swap' && m.gain >= 2)).toBe(true)
  })

  it('totals the seats instead of leaving nine rows of arithmetic', () => {
    const rows = [
      { k: 'me_qb', pos: 'QB', p: 19, team: 'me' },
      { k: 'me_rb', pos: 'RB', p: 20, team: 'me' },
      { k: 'op_qb', pos: 'QB', p: 21, team: 'opp' },
      { k: 'op_rb', pos: 'RB', p: 15, team: 'opp' },
    ]
    const board = buildWeeklyBoard({
      ...mk(rows), slots: { QB: 1, RB: 1 }, myTeamKey: 'me',
      currentStarters: ['me_qb', 'me_rb'], oppTeamKey: 'opp', oppTeamName: 'Them',
    })
    expect(board.matchup?.seatsWon).toBe(1)
    expect(board.matchup?.seatsLost).toBe(1)
    // And it names the seat that is costing you, which is the whole point of the tally.
    expect(board.matchup?.worstSlot).toBe('QB')
    expect(board.matchup?.worstSlotEdge).toBeLessThan(0)
  })

  it('reads the wire to say what a position is worth', () => {
    // Twelve-team-ish league: a startable QB is unowned while I start a worse one.
    const rows = [
      { k: 'me_qb', pos: 'QB', p: 19, team: 'me' },
      { k: 'free_qb', pos: 'QB', p: 20, team: 'FA' },
      { k: 'me_te', pos: 'TE', p: 11, team: 'me' },
      { k: 'free_te', pos: 'TE', p: 4, team: 'FA' },
    ]
    for (let t = 0; t < 8; t++) {
      rows.push({ k: `t${t}_qb`, pos: 'QB', p: 22 + t * 0.1, team: `T${t}` })
      rows.push({ k: `t${t}_te`, pos: 'TE', p: 12 + t * 0.1, team: `T${t}` })
    }
    const board = buildWeeklyBoard({
      ...mk(rows), slots: { QB: 1, TE: 1 }, myTeamKey: 'me', currentStarters: ['me_qb', 'me_te'],
    })
    const qb = board.scarcity.find((s) => s.position === 'QB')
    expect(qb?.verdict).toBe('cheap')
    expect(qb?.freeBeatsMine).toBe(true)
    // Tight end's best free agent is far down the column — the opposite read.
    expect(board.scarcity.find((s) => s.position === 'TE')?.verdict).toBe('scarce')
  })

  it('draws a tier line only where there is a real drop', () => {
    // A compressed weekly column: forty flex bodies inside a few points, one true cliff.
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => ({ k: `a${i}`, pos: 'RB', p: 20 - i * 0.3, team: 'me' })),
      ...Array.from({ length: 10 }, (_, i) => ({ k: `b${i}`, pos: 'RB', p: 12 - i * 0.3, team: 'me' })),
    ]
    const board = buildWeeklyBoard({
      ...mk(rows), slots: { RB: 2 }, myTeamKey: 'me', currentStarters: [],
    })
    const breaks = board.board.RB.filter((r) => r.tierBreak)
    // Never a line captioned "-0 pts", which is a cliff claiming no drop at all.
    // Never a line captioned "-0 pts". The bar is relative to the column now, so the
    // assertion is on what a reader can see rather than on a points constant I picked.
    for (const b of breaks) expect(Math.round(b.tierDrop ?? 0)).toBeGreaterThanOrEqual(1)
    // And the one genuine cliff is found.
    expect(breaks.length).toBe(1)
  })
})

/*
 * Watching a league you are not playing in.
 *
 * Sleeper lets you join a league without taking a roster — a commissioner, a friend following
 * along. sleeperMyTeamKey then returns '' because no roster's owner_id matches, and the page
 * refused to render at all: "Couldn't assemble this week's board." for a league whose data had
 * loaded perfectly.
 *
 * Most of this page never needed a team. The rankings, the wire's depth at each position and
 * the streamers are facts about the league, not about you. Only the lineup, the start/sit and
 * the matchup are personal, and those are simply absent rather than a reason to show nothing.
 */
describe('a spectator with no roster', () => {
  const rows = [
    { k: 'a_qb', pos: 'QB', p: 22, team: 'T1' },
    { k: 'b_qb', pos: 'QB', p: 20, team: 'T2' },
    { k: 'a_rb', pos: 'RB', p: 18, team: 'T1' },
    { k: 'b_rb', pos: 'RB', p: 14, team: 'T2' },
    { k: 'free_rb', pos: 'RB', p: 9, team: 'FA' },
  ]
  const build = () => buildWeeklyBoard({
    pool: rows.filter((r) => r.team !== 'FA').map((r) => ({
      playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'DET',
    })) as never,
    vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
      playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
      vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
    }])) as never,
    freeAgents: rows.filter((r) => r.team === 'FA')
      .map((r) => ({ playerKey: r.k, name: r.k, position: r.pos, team: 'DET' })) as never,
    opponentByTeam: { DET: { opp: 'CHI', home: true } },
    slots: { QB: 1, RB: 1 },
    myTeamKey: '',
    currentStarters: [],
  })

  it('still ranks the league', () => {
    const board = build()
    expect(board.board.QB.map((r) => r.name)).toEqual(['a_qb', 'b_qb'])
    expect(board.board.RB.length).toBe(3)
  })

  it('leaves the personal sections empty rather than inventing them', () => {
    const board = build()
    expect(board.starters).toEqual([])
    expect(board.moves).toEqual([])
    expect(board.matchup).toBeNull()
    // Nobody is "me", so every rostered player belongs to somebody else.
    expect(board.board.QB.every((r) => r.owner !== 'me')).toBe(true)
  })

  it('still reads the wire, which is a fact about the league not about you', () => {
    const board = build()
    const rb = board.scarcity.find((s) => s.position === 'RB')
    expect(rb).toBeTruthy()
    expect(rb!.bestFreeName).toBe('free_rb')
    // With no roster of your own there is nothing to compare against, and it must not pretend.
    expect(rb!.freeBeatsMine).toBe(false)
    expect(rb!.myStarterName).toBe('')
  })
})


/*
 * Tiers have to actually appear.
 *
 * The first cure for one-man tiers was an absolute floor of two points, and it was a number
 * taken off ROUNDED values in a screenshot — a real gap of 1.7 prints as "-2" and fails a
 * >= 2 test. Nearly every tier on the weekly board vanished and the column went back to being
 * the flat list tiers exist to break up. An absolute threshold could not have been right in
 * any case: it has to hold for a quarterback column spanning fourteen points and a kicker
 * column spanning four, in whatever scoring a league uses.
 */
describe('tiers on a weekly position column', () => {
  const column = (vals: number[]) => {
    const rows = vals.map((v, i) => ({ k: 'p' + i, p: v }))
    return buildWeeklyBoard({
      pool: rows.map((r) => ({
        playerKey: r.k, name: r.k, position: 'RB', teamKey: 'T' + (Number(r.k.slice(1)) % 10), proTeam: 'DET',
      })) as never,
      vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
        playerKey: r.k, position: 'RB', pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
        vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
      }])) as never,
      slots: { RB: 2, FLEX: 1 },
      myTeamKey: 'T0',
      currentStarters: [],
      freeAgents: [],
      opponentByTeam: { DET: { opp: 'CHI', home: true } },
    }).board.RB
  }

  /** A live-shaped column: a top, a compressed middle, then a long flat free-agent tail. */
  const withTail = (head: number[]) => {
    const out = [...head]
    for (let i = 0; i < 90; i++) out.push(Math.max(0.2, 2.3 - i * 0.025))
    return out
  }

  const NORMAL = withTail([
    23.8, 21.4, 20.3, 19.9, 19.6, 17.4, 17.1, 16.9, 16.7, 16.5, 16.2, 15.9, 15.7,
    15.4, 15.1, 14.8, 14.6, 14.3, 14.0, 13.8, 13.5, 13.1, 12.6, 12.2, 11.7, 11.3,
    10.8, 10.2, 9.7, 9.1, 8.6, 8.0, 7.4, 6.8, 6.1, 5.5, 4.9, 4.2, 3.6, 3.0, 2.4,
  ])
  // The live receiver column: every displayed gap around a point, one true cliff.
  const FLAT = withTail([
    21.2, 20.4, 19.8, 17.3, 17.0, 16.6, 16.4, 16.2, 16.0, 15.8, 15.5, 15.2, 14.9,
    14.7, 14.5, 14.2, 14.0, 13.8, 13.5, 13.2, 12.9, 12.5, 12.1, 11.8, 11.4, 11.0,
    10.6, 10.1, 9.6, 9.2, 8.7, 8.1, 7.5, 6.9, 6.2, 5.6, 5.0, 4.3, 3.7, 3.1, 2.5,
  ])

  it('draws tiers on an ordinary column', () => {
    const breaks = column(NORMAL).filter((r) => r.tierBreak)
    expect(breaks.length).toBeGreaterThan(1)
  })

  it('still draws one on a column that is genuinely flat', () => {
    // Not zero. A compressed column with a single real cliff has a single real tier, and
    // reporting none is the failure that started this.
    expect(column(FLAT).filter((r) => r.tierBreak).length).toBeGreaterThan(0)
  })

  it('puts every tier where a reader can see it', () => {
    for (const vals of [NORMAL, FLAT]) {
      const rows = column(vals)
      const shown = rows.slice(0, TIER_DEPTH)
      expect(rows.filter((r) => r.tierBreak).length).toBe(shown.filter((r) => r.tierBreak).length)
    }
  })

  it('never captions a cliff with no drop', () => {
    for (const vals of [NORMAL, FLAT]) {
      for (const b of column(vals).filter((r) => r.tierBreak)) {
        expect(Math.round(b.tierDrop ?? 0)).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('keeps tier numbers ascending with no repeats', () => {
    for (const vals of [NORMAL, FLAT]) {
      const seen = column(vals).filter((r) => r.tierBreak).map((r) => r.tier)
      expect(seen).toEqual([...new Set(seen)])
      expect([...seen].sort((a, b) => a - b)).toEqual(seen)
    }
  })
})

/*
 * A ranking file's own tiers beat any we could infer.
 *
 * The analyst's weekly CSVs carry a Tier column — Burrow, Allen, Jackson, Herbert, Prescott
 * and Hurts as tier 1, Caleb Williams starting tier 2 — and the parser has always read it:
 * matchRankings returns tierByKey and the Draft Room has consumed it for a while. This board
 * never asked. So it derived its own cliffs from our points while sitting directly under a
 * header naming somebody else's order, and the tiers the reader uploaded were nowhere.
 */
describe('tiers declared by the ranking list', () => {
  const build = (tierByKey?: Record<string, number>) => {
    // Points deliberately smooth, so any tiers that appear cannot have been derived from them.
    const vals = [22, 21.6, 21.2, 20.8, 20.4, 20, 19.6, 19.2, 18.8, 18.4]
    const rows = vals.map((v, i) => ({ k: 'q' + i, p: v }))
    return buildWeeklyBoard({
      pool: rows.map((r) => ({
        playerKey: r.k, name: r.k, position: 'QB', teamKey: 'T' + (Number(r.k.slice(1)) % 5), proTeam: 'DET',
      })) as never,
      vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
        playerKey: r.k, position: 'QB', pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
        vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
      }])) as never,
      slots: { QB: 1 },
      myTeamKey: 'T0',
      currentStarters: [],
      freeAgents: [],
      opponentByTeam: { DET: { opp: 'CHI', home: true } },
      tierByKey,
    }).board.QB
  }

  it('draws the breaks the list declares, not the ones our points imply', () => {
    // The live file's shape: six in tier 1, then tier 2.
    const src = { q0: 1, q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 2, q7: 2, q8: 3, q9: 3 }
    const breaks = build(src).filter((r) => r.tierBreak)
    expect(breaks.map((r) => r.name)).toEqual(['q6', 'q8'])
    expect(breaks.map((r) => r.tier)).toEqual([2, 3])
  })

  it('finds nothing on those same smooth points without the list', () => {
    // Proof the tiers above came from the file: our own rule sees no cliff in a flat column.
    expect(build().filter((r) => r.tierBreak).length).toBe(0)
  })

  it('carries the last tier past the end of the list rather than inventing one', () => {
    // A list covers thirty quarterbacks; the board carries a hundred. Beyond its reach the
    // source has stopped having an opinion, and a line drawn there would misattribute one.
    const src = { q0: 1, q1: 1, q2: 2, q3: 2 }
    const rows = build(src)
    expect(rows.filter((r) => r.tierBreak).map((r) => r.name)).toEqual(['q2'])
    for (const r of rows.slice(4)) expect(r.tierBreak).toBeUndefined()
  })

  it('falls back to our own cliffs when the list declares only one tier', () => {
    // One tier across everything covered is a list, not a tiering.
    const flat = { q0: 1, q1: 1, q2: 1, q3: 1 }
    expect(build(flat).filter((r) => r.tierBreak).length).toBe(0)
  })
})

/*
 * A week that has started.
 *
 * One Thursday game had been played. The opponent had A.J. Brown in their first receiver seat;
 * he scored badly, and the board — which solved THEIR lineup with assignSlots — quietly benched
 * him for them and promoted someone who had not played yet. It showed the best week they could
 * still have rather than the one they were having, and every number on the page was a
 * projection for a game already in the books.
 */
describe('a week in progress', () => {
  const rows = [
    { k: 'me_qb', pos: 'QB', p: 20, team: 'me' },
    { k: 'me_wr1', pos: 'WR', p: 18, team: 'me' },
    { k: 'me_wr2', pos: 'WR', p: 12, team: 'me' },
    // Theirs: the one who already played, plus a better-projected body on their bench.
    { k: 'op_qb', pos: 'QB', p: 20, team: 'op' },
    { k: 'op_played', pos: 'WR', p: 19, team: 'op' },
    { k: 'op_bench', pos: 'WR', p: 17, team: 'op' },
  ]
  const build = (opts: { oppStarterKeys?: string[]; actualPoints?: Record<string, number> }) =>
    buildWeeklyBoard({
      pool: rows.map((r) => ({
        playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'DET',
      })) as never,
      vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
        playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
        vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
      }])) as never,
      slots: { QB: 1, WR: 1 },
      myTeamKey: 'me',
      currentStarters: [],
      freeAgents: [],
      opponentByTeam: { DET: { opp: 'CHI', home: true } },
      oppTeamKey: 'op',
      oppTeamName: 'Them',
      // Everyone here plays for DET, and these fixtures are about a game that HAS happened.
      gameStates: { DET: 'post' as const },
      ...opts,
    })

  it('starts who they actually started, however it went', () => {
    // He scored 3. Projected 19, and their bench body projects 17 — so the optimiser would
    // drop him. He is in their lineup and cannot come out of it.
    const board = build({
      oppStarterKeys: ['op_qb', 'op_played'],
      actualPoints: { op_played: 3 },
    })
    const wr = board.matchup!.oppStarters.find((o) => o.position === 'WR')
    expect(wr?.name).toBe('op_played')
  })

  it('counts what he banked, not what he was going to do', () => {
    const board = build({
      oppStarterKeys: ['op_qb', 'op_played'],
      actualPoints: { op_played: 3 },
    })
    // 20 projected at quarterback plus 3 banked at receiver, not 20 + 19.
    expect(board.matchup!.oppPoints).toBe(23)
  })

  it('treats a scoreless game as a score, not as missing data', () => {
    // Zero is a fact about a player who played. Falling back to his projection there would
    // be the same error as the lineup rewrite, one row down.
    const board = build({
      oppStarterKeys: ['op_qb', 'op_played'],
      actualPoints: { op_played: 0 },
    })
    expect(board.matchup!.oppPoints).toBe(20)
  })

  it('solves their lineup as before when the platform publishes none', () => {
    const board = build({})
    const wr = board.matchup!.oppStarters.find((o) => o.position === 'WR')
    expect(wr?.name).toBe('op_played') // the optimiser's pick, on projection alone
    expect(board.matchup!.oppPoints).toBe(39)
  })

  it('banks points on your own side too', () => {
    const board = build({ actualPoints: { me_wr1: 2 } })
    const mine = board.starters.find((s) => s.slot === 'WR')
    // Your own receiver played and scored 2, so he is worth 2 — and the OTHER receiver, who
    // has not played, is now the better body. That is a real decision, unlike the opponent's.
    expect(mine?.weekPoints).toBe(12)
  })
})


/*
 * The regression that shipped, pinned.
 *
 * Sleeper lists every rostered player in `players_points` at 0.0 from the moment a week opens.
 * Testing presence therefore marked whole rosters as having banked nothing: both teams in the
 * matchup rendered 0 and ranked in the hundreds while every other team kept its projections.
 * "Zero is a real score" was true, and I applied it to a payload where zero mostly means "has
 * not played". Kickoff has to come from the schedule.
 */
describe('a zero before kickoff is not a score', () => {
  const rows = [
    { k: 'me_qb', pos: 'QB', p: 20, team: 'me', pro: 'DET' },
    { k: 'me_wr', pos: 'WR', p: 18, team: 'me', pro: 'DET' },
    { k: 'op_qb', pos: 'QB', p: 19, team: 'op', pro: 'KC' },
    { k: 'op_wr', pos: 'WR', p: 17, team: 'op', pro: 'KC' },
  ]
  const build = (gameStates?: Record<string, 'pre' | 'in' | 'post'>) =>
    buildWeeklyBoard({
      pool: rows.map((r) => ({
        playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: r.pro,
      })) as never,
      vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
        playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
        vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
      }])) as never,
      slots: { QB: 1, WR: 1 },
      myTeamKey: 'me',
      currentStarters: [],
      freeAgents: [],
      opponentByTeam: { DET: { opp: 'CHI', home: true }, KC: { opp: 'LV', home: false } },
      oppTeamKey: 'op',
      oppTeamName: 'Them',
      // What Sleeper actually sends before anything has been played.
      actualPoints: { me_qb: 0, me_wr: 0, op_qb: 0, op_wr: 0 },
      gameStates,
    })

  it('keeps the projection when no game has kicked off', () => {
    const board = build({ DET: 'pre', KC: 'pre' })
    expect(board.starters.reduce((t, s) => t + s.weekPoints, 0)).toBe(38)
    expect(board.matchup!.oppPoints).toBe(36)
  })

  it('keeps it when the schedule cannot be read at all', () => {
    // An unreadable scoreboard must fall back to projections. Guessing the other way is what
    // emptied the roster.
    expect(build(undefined).starters.reduce((t, s) => t + s.weekPoints, 0)).toBe(38)
    expect(build({}).starters.reduce((t, s) => t + s.weekPoints, 0)).toBe(38)
  })

  it('banks the zero once that game is actually over', () => {
    // Now it means what it says: they played and scored nothing.
    const board = build({ DET: 'post', KC: 'pre' })
    expect(board.starters.reduce((t, s) => t + s.weekPoints, 0)).toBe(0)
    expect(board.matchup!.oppPoints).toBe(36)
  })

  it('banks a game in progress too', () => {
    expect(build({ DET: 'in', KC: 'pre' }).starters.reduce((t, s) => t + s.weekPoints, 0)).toBe(0)
  })
})

/*
 * A starter we cannot resolve is our bug, not their empty seat.
 *
 * Sleeper marks an unfilled slot with the string "0", and `.filter(Boolean)` keeps it because
 * "0" is truthy — so it reached the starter list, matched nobody, and vanished. That left the
 * opponent a man short in a way indistinguishable from our failing to resolve a real player,
 * and the two want opposite handling: a slot they left empty is worth zero and should read
 * that way, while a player we could not match must not be quietly staged as one.
 */
describe('an opponent lineup we could only partly read', () => {
  const rows = [
    { k: 'me_qb', pos: 'QB', p: 20, team: 'me' },
    { k: 'me_wr', pos: 'WR', p: 18, team: 'me' },
    { k: 'op_qb', pos: 'QB', p: 19, team: 'op' },
    { k: 'op_started', pos: 'WR', p: 4, team: 'op' },   // played badly, still in their lineup
    { k: 'op_bench', pos: 'WR', p: 21, team: 'op' },    // the optimiser's temptation
  ]
  const build = (oppStarterKeys: string[]) => buildWeeklyBoard({
    pool: rows.map((r) => ({
      playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'DET',
    })) as never,
    vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
      playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
      vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
    }])) as never,
    slots: { QB: 1, WR: 1 },
    myTeamKey: 'me',
    currentStarters: [],
    freeAgents: [],
    opponentByTeam: { DET: { opp: 'CHI', home: true } },
    oppTeamKey: 'op',
    oppTeamName: 'Them',
    oppStarterKeys,
  })

  it('keeps their man in his seat when every starter resolves', () => {
    const wr = build(['op_qb', 'op_started']).matchup!.oppStarters.find((o) => o.position === 'WR')
    expect(wr?.name).toBe('op_started')
  })

  it('fills the seat rather than leaving a hole when one does not resolve', () => {
    // 'ghost' is a real player id we failed to match, not a "0" sentinel — those are stripped
    // upstream. Understating them with our own bug is the worst direction to be wrong.
    const board = build(['op_qb', 'op_started', 'ghost'])
    expect(board.matchup!.oppStarters).toHaveLength(2)
    // And their actual starter still keeps his seat; only the unaccounted one is filled.
    expect(board.matchup!.oppStarters.find((o) => o.position === 'WR')?.name).toBe('op_started')
  })

  it('never lets the filler pass displace a declared starter', () => {
    // The bench body outprojects him more than two to one. Sorting the declared to the front
    // and trusting the solver does not hold — it optimises by value and ignores input order.
    const board = build(['op_qb', 'op_started', 'ghost'])
    const names = board.matchup!.oppStarters.map((o) => o.name)
    expect(names).toContain('op_started')
    expect(names).not.toContain('op_bench')
  })
})

/*
 * They started him hurt, so he is in their lineup.
 *
 * assignSlots drops anyone flagged out. That is right for "who should I start" and wrong for
 * "who did they start" — and the opponent's lineup is the second question. A.J. Brown carried
 * an injury tag, was in their declared starters, resolved in the pool, and the solver still
 * refused to seat him: their lineup came back a man short with a hole exactly where he was.
 * Once a game is played the points are banked whatever the tag says.
 */
describe('a declared starter carrying an injury tag', () => {
  const rows = [
    { k: 'me_qb', pos: 'QB', p: 20, team: 'me', il: false },
    { k: 'me_wr', pos: 'WR', p: 18, team: 'me', il: false },
    { k: 'op_qb', pos: 'QB', p: 19, team: 'op', il: false },
    { k: 'op_hurt', pos: 'WR', p: 16, team: 'op', il: true },   // started anyway
    { k: 'op_bench', pos: 'WR', p: 21, team: 'op', il: false },
  ]
  const build = (oppStarterKeys?: string[]) => buildWeeklyBoard({
    pool: rows.map((r) => ({
      playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'DET', onIL: r.il,
    })) as never,
    vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
      playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
      vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
    }])) as never,
    slots: { QB: 1, WR: 1 },
    myTeamKey: 'me',
    currentStarters: [],
    freeAgents: [],
    opponentByTeam: { DET: { opp: 'CHI', home: true } },
    oppTeamKey: 'op',
    oppTeamName: 'Them',
    oppStarterKeys,
  })

  it('seats him rather than leaving the hole', () => {
    const board = build(['op_qb', 'op_hurt'])
    expect(board.matchup!.oppStarters).toHaveLength(2)
    expect(board.matchup!.oppStarters.find((o) => o.position === 'WR')?.name).toBe('op_hurt')
  })

  it('counts him in their score', () => {
    expect(build(['op_qb', 'op_hurt']).matchup!.oppPoints).toBe(35)
  })

  it('still refuses to guess an injured player into a seat we could not read', () => {
    // No declared lineup at all: this is our recommendation, and it should not stage someone
    // flagged out. The bench body is healthy and takes the seat.
    const board = build(undefined)
    expect(board.matchup!.oppStarters.find((o) => o.position === 'WR')?.name).toBe('op_bench')
  })
})

/*
 * Where a manager put a player IS the lineup.
 *
 * A.J. Brown showed up in their flex. He was in their first receiver seat — the solver had put
 * him where IT would have played him. A set lineup is published positionally: the nth starter
 * fills the nth starting slot, and the league's own roster_positions carry that order, so
 * there is nothing to solve and one way to get it wrong.
 */
describe('a set lineup is read, not solved', () => {
  const SLOT_ORDER = ['QB', 'RB', 'WR', 'WR', 'FLEX']
  const rows = [
    { k: 'me_qb', pos: 'QB', p: 20, team: 'me' },
    { k: 'me_rb', pos: 'RB', p: 15, team: 'me' },
    { k: 'me_wr1', pos: 'WR', p: 14, team: 'me' },
    { k: 'me_wr2', pos: 'WR', p: 13, team: 'me' },
    { k: 'me_flex', pos: 'WR', p: 12, team: 'me' },
    { k: 'op_qb', pos: 'QB', p: 19, team: 'op' },
    { k: 'op_rb', pos: 'RB', p: 16, team: 'op' },
    // Their WR1 played badly; the flex body outprojects him. Both facts, neither a reason
    // to move him.
    { k: 'op_wr1', pos: 'WR', p: 4, team: 'op' },
    { k: 'op_wr2', pos: 'WR', p: 11, team: 'op' },
    { k: 'op_flex', pos: 'WR', p: 18, team: 'op' },
  ]
  const build = (opts: Record<string, unknown> = {}) => buildWeeklyBoard({
    pool: rows.map((r) => ({
      playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'DET',
    })) as never,
    vorByKey: Object.fromEntries(rows.map((r) => [r.k, {
      playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
      vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
    }])) as never,
    slots: { QB: 1, RB: 1, WR: 2, FLEX: 1 },
    myTeamKey: 'me',
    currentStarters: [],
    freeAgents: [],
    opponentByTeam: { DET: { opp: 'CHI', home: true } },
    oppTeamKey: 'op',
    oppTeamName: 'Them',
    starterSlots: SLOT_ORDER,
    ...opts,
  })

  it('puts their receiver in the receiver seat, not the flex', () => {
    const board = build({ oppStarterKeys: ['op_qb', 'op_rb', 'op_wr1', 'op_wr2', 'op_flex'] })
    const seatOf = (n: string) => board.matchup!.oppStarters.find((o) => o.name === n)?.slot
    expect(seatOf('op_wr1')).toBe('WR')
    expect(seatOf('op_wr2')).toBe('WR')
    expect(seatOf('op_flex')).toBe('FLEX')
  })

  it('keeps an empty seat empty instead of shifting everyone up one', () => {
    // Sleeper writes "0" for an unfilled slot. Dropping it would slide the flex body into a
    // receiver seat — a quieter version of the same bug.
    const board = build({ oppStarterKeys: ['op_qb', 'op_rb', 'op_wr1', '0', 'op_flex'] })
    expect(board.matchup!.oppStarters.find((o) => o.name === 'op_flex')?.slot).toBe('FLEX')
    expect(board.matchup!.oppStarters).toHaveLength(4)
  })

  it('reads your own lineup the same way, while the panel still recommends', () => {
    const board = build({ myStarterKeys: ['me_qb', 'me_rb', 'me_wr1', 'me_wr2', 'me_flex'] })
    expect(board.matchup!.myLineup.find((s) => s.name === 'me_flex')?.slot).toBe('FLEX')
    // The optimiser's answer is untouched and still available for the Best Lineup panel.
    expect(board.starters.length).toBe(5)
  })

  it('stops seating by index when the lineup does not match the seat count', () => {
    /*
     * Fewer entries than seats means we are looking at a different shape than we think, and
     * index seating would put people in the wrong chairs — worse than not knowing. It drops
     * back to the declared path, which still honours the two players they really started
     * rather than discarding their decision and re-solving the whole lineup.
     */
    const board = build({ oppStarterKeys: ['op_qb', 'op_rb'] })
    const names = board.matchup!.oppStarters.map((o) => o.name)
    expect(names).toContain('op_qb')
    expect(names).toContain('op_rb')
    expect(names).not.toContain('op_flex')
  })
})

/*
 * A free quarterback better than the one you are starting.
 *
 * Herbert and Prescott were unowned and projected above the reader's starter, the board said
 * so in its own "cheap here: QB" line, and nothing ever told him to start one. The streamer
 * card carried a `gain` measured against the weakest droppable body on his BENCH — which
 * answers "who do I add and who do I cut" rather than "does this help me win", and reports a
 * large number describing nothing.
 */
describe('a streamer who would start for you', () => {
  const rows = [
    { k: 'my_qb', pos: 'QB', p: 19, team: 'me' },
    { k: 'my_rb', pos: 'RB', p: 15, team: 'me' },
    { k: 'my_scrub', pos: 'RB', p: 3, team: 'me' },   // the droppable body
  ]
  const build = () => buildWeeklyBoard({
    pool: rows.map((r) => ({
      playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'DET',
    })) as never,
    vorByKey: {
      ...Object.fromEntries(rows.map((r) => [r.k, {
        playerKey: r.k, position: r.pos, pointsRos: r.p * 17, vorRos: r.p, pointsNextWeek: r.p,
        vorWeek: r.p, streamWeeks: 0, streamOf: 0, confidence: 'high', opportunity: '',
      }])),
      'fa:Free QB': {
        playerKey: 'fa:Free QB', position: 'QB', pointsRos: 357, vorRos: 21,
        pointsNextWeek: 21, vorWeek: 6, streamWeeks: 0, streamOf: 0,
        confidence: 'high', opportunity: '',
      },
    } as never,
    slots: { QB: 1, RB: 1 },
    myTeamKey: 'me',
    currentStarters: [],
    freeAgents: [{ name: 'Free QB', position: 'QB', team: 'GB' }] as never,
    opponentByTeam: { DET: { opp: 'CHI', home: true }, GB: { opp: 'MIN', home: true } },
  })

  it('says he would start, and over whom', () => {
    const s = build().streamers.find((x) => x.player.name === 'Free QB')!
    expect(s.startsForYou).toBe(true)
    expect(s.replacesName).toBe('my_qb')
  })

  it('counts the lineup gain, not the gap to a bench body', () => {
    // 21 over the 19 he displaces is +2. Against the droppable scrub it would have read +18,
    // a number describing a swap nobody is making.
    expect(build().streamers.find((x) => x.player.name === 'Free QB')!.gain).toBeCloseTo(2, 5)
  })
})
