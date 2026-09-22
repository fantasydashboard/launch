import { describe, it, expect } from 'vitest'
import { buildFootballWire } from '../footballWire'

/* Tier thresholds are stated per week, so every board needs a horizon. Ten keeps the
   arithmetic in these fixtures readable: one point per week is a ten-point span. */
const WEEKS_LEFT = 10
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'
import type { PlayerVor } from '../footballVor'

function vor(key: string, position: string, vorRos: number, extra: Partial<PlayerVor> = {}): PlayerVor {
  return {
    playerKey: key, position, pointsRos: vorRos + 100, vorRos,
    pointsNextWeek: 0, vorWeek: extra.vorWeek ?? 0,
    streamWeeks: extra.streamWeeks ?? 0, streamOf: extra.streamOf ?? 0,
    confidence: 'high', opportunity: '', ...extra,
  }
}

const slots = { QB: 1, RB: 2, FLEX: 1 }

// My roster: strong QB, two RBs, one flex RB.
const pool: PointsPoolPlayer[] = [
  { playerKey: 'qb1', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
  { playerKey: 'rb1', name: 'My RB1', position: 'RB', teamKey: 'me', proTeam: 'KC' },
  { playerKey: 'rb2', name: 'My RB2', position: 'RB', teamKey: 'me', proTeam: 'SF' },
  { playerKey: 'rb3', name: 'My RB3', position: 'RB', teamKey: 'me', proTeam: 'DEN' },
  { playerKey: 'opp_wr', name: 'Opp WR', position: 'WR', teamKey: 'opp', proTeam: 'MIA' },
]

const freeAgents: AvailablePlayer[] = [
  { playerKey: 'fa_rb', name: 'Stud FA RB', position: 'RB', team: 'LAR', percentOwned: 0, status: '', stats: {} },
  { playerKey: 'fa_qb', name: 'Backup FA QB', position: 'QB', team: 'NYJ', percentOwned: 0, status: '', stats: {} },
  { playerKey: 'fa_ghost', name: 'Ghost FA', position: 'WR', team: 'CHI', percentOwned: 0, status: '', stats: {} },
]

const vorByKey: Record<string, PlayerVor> = {
  qb1: vor('qb1', 'QB', 150), rb1: vor('rb1', 'RB', 120), rb2: vor('rb2', 'RB', 80),
  rb3: vor('rb3', 'RB', 10), opp_wr: vor('opp_wr', 'WR', 60),
  fa_rb: vor('fa_rb', 'RB', 95, { vorWeek: 12, streamWeeks: 3, streamOf: 4 }),
  fa_qb: vor('fa_qb', 'QB', 40, { vorWeek: 2, streamWeeks: 1, streamOf: 4 }),
}

describe('buildFootballWire', () => {
  const wire = buildFootballWire({ freeAgents, vorByKey, pool, slots, myTeamKey: 'me', weeksLeft: WEEKS_LEFT })

  it('bestAvailable is free agents by ROS VOR desc', () => {
    expect(wire.bestAvailable.map((r) => r.player.name)).toEqual(['Stud FA RB', 'Backup FA QB'])
    expect(wire.bestAvailable[0].vorRos).toBe(95)
  })

  it('upgrades rank by lineup-marginal and name the displaced body; a backup QB is not an upgrade', () => {
    // fa_rb (points 195) cracks the flex over rb3 (points 110) → positive marginal.
    const rbUp = wire.upgrades.find((s) => s.add.player.name === 'Stud FA RB')
    expect(rbUp).toBeTruthy()
    expect(rbUp!.dropName).toBe('My RB3')
    expect(rbUp!.marginal).toBeGreaterThan(0)
    // fa_qb (points 140) can't beat qb1 (points 250) → no upgrade row.
    expect(wire.upgrades.find((s) => s.add.player.name === 'Backup FA QB')).toBeFalsy()
  })

  it('thisWeek is free agents by weekly VOR desc, carrying streamability', () => {
    expect(wire.thisWeek[0].player.name).toBe('Stud FA RB')
    expect(wire.thisWeek[0].streamWeeks).toBe(3)
    expect(wire.thisWeek[0].streamOf).toBe(4)
  })

  it('board groups every player by position, VOR-ranked, owned flagged', () => {
    const rbRow = wire.board['RB']
    expect(rbRow.map((r) => r.name)).toEqual(['My RB1', 'Stud FA RB', 'My RB2', 'My RB3'])
    expect(rbRow.find((r) => r.name === 'My RB1')!.owned).toBe(true)
    expect(rbRow.find((r) => r.name === 'Stud FA RB')!.owned).toBe(false)
  })

  it('drops FAs with no VOR entry from best-available and the board', () => {
    expect(wire.bestAvailable.find((r) => r.player.name === 'Ghost FA')).toBeUndefined()
    expect((wire.board['WR'] ?? []).find((r) => r.name === 'Ghost FA')).toBeUndefined()
  })
})

/*
 * One board across every position.
 *
 * The per-position pills answered "who is the best receiver available", one column at a time,
 * and left the reader holding four of them in their head to compare across. The question a
 * waiver claim actually poses is "of everything on this wire, what should I want" — and value
 * over replacement is already the cross-position number, since it measures points above the
 * last startable body at a player's OWN position. The overall order was computable all along.
 */
describe('the overall board', () => {
  const build = () => buildFootballWire({
    pool: [
      { playerKey: 'qb1', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
      { playerKey: 'rb1', name: 'My RB', position: 'RB', teamKey: 'me', proTeam: 'DET' },
      { playerKey: 'rb2', name: 'Their RB', position: 'RB', teamKey: 'them', proTeam: 'DET' },
    ] as PointsPoolPlayer[],
    vorByKey: {
      qb1: vor('qb1', 'QB', 40),
      rb1: vor('rb1', 'RB', 90),
      rb2: vor('rb2', 'RB', 60),
      'fa:Free RB': vor('fa:Free RB', 'RB', 20),
      'fa:Free QB': vor('fa:Free QB', 'QB', 70),
    },
    freeAgents: [
      { name: 'Free RB', position: 'RB', team: 'CHI' },
      { name: 'Free QB', position: 'QB', team: 'GB' },
    ] as AvailablePlayer[],
    myTeamKey: 'me',
    slots,
    weeksLeft: WEEKS_LEFT,
  })

  it('ranks every position together, best first', () => {
    const all = build().board.ALL
    expect(all.map((r) => r.name)).toEqual(['My RB', 'Free QB', 'Their RB', 'My QB', 'Free RB'])
  })

  it('carries each row position, which the per-position boards never had to', () => {
    const all = build().board.ALL
    expect(all.find((r) => r.name === 'Free QB')?.position).toBe('QB')
  })

  it('keeps the per-position boards intact beside it', () => {
    const w = build()
    expect(w.board.QB.map((r) => r.name)).toEqual(['Free QB', 'My QB'])
    expect(w.board.RB.map((r) => r.name)).toEqual(['My RB', 'Their RB', 'Free RB'])
  })

  it('tiers the overall board on its own, not by inheritance', () => {
    const all = build().board.ALL
    // Shared row objects carry tier state from the positional pass; the overall board must
    // re-derive it, or a cliff among receivers shows up as a cliff among everybody.
    const breaks = all.filter((r) => r.tierBreak).map((r) => r.tier)
    expect(breaks).toEqual([...new Set(breaks)])
    expect([...breaks].sort((a, b) => a - b)).toEqual(breaks)
  })
})

/*
 * Tiers have to land where the decisions are.
 *
 * Two bugs, one after the other. First, `assignTiers` spent a fixed budget of cuts on the
 * biggest gaps in whatever column it was handed, and a real position column runs far past the
 * rows anyone reads, trailing through third quarterbacks to minus three hundred. Those tail
 * gaps are the biggest, so they took every cut and the visible board came back as one tier.
 *
 * The fix for that was to tier only the top twenty-five rows — which created the second bug.
 * Tiers then existed exactly where nobody needs them (no one wonders whether to claim the
 * overall QB1) and stopped at row twenty-six, where every waiver claim actually lives. A
 * manager choosing between the 61st and the 74th receiver got a ranked list and no grouping.
 *
 * `indifferenceTiers` has no cut budget, so it needs no depth limit: it tiers the whole column
 * by asking the same question at every row — is this player still within a point a week of the
 * one leading his tier?
 */
describe('tiers land on the rows that are displayed', () => {
  const column = (vals: number[]) => {
    const vorByKey: Record<string, PlayerVor> = {}
    const pool: PointsPoolPlayer[] = []
    vals.forEach((v, i) => {
      const k = 'q' + i
      pool.push({ playerKey: k, name: 'QB' + i, position: 'QB', teamKey: i === 0 ? 'me' : 'T' + i, proTeam: 'BUF' } as PointsPoolPlayer)
      vorByKey[k] = vor(k, 'QB', v)
    })
    return buildFootballWire({
      pool, vorByKey, freeAgents: [], myTeamKey: 'me', weeksLeft: WEEKS_LEFT,
      slots: { QB: 1, RB: 2, FLEX: 1 },
    }).board.QB
  }

  // A believable column: a clear QB1, a compressed startable middle, then a long decaying tail.
  const REAL = [
    65, 29, 24, 14, 12, 10, 7, 7, 3, 0, -1, -1, -10, -13, -13, -16, -18, -22, -22, -26,
    -30, -34, -38, -42, -46, -50, -55, -60, -66, -73, -81, -90, -100, -112, -125, -140,
    -160, -185, -215, -250, -290, -335,
  ]

  it('cuts more than one cliff into the part where decisions happen', () => {
    const rows = column(REAL)
    const visibleBreaks = rows.slice(0, 25).filter((r) => r.tierBreak).length
    expect(visibleBreaks).toBeGreaterThan(1)
  })

  it('keeps cutting below the fold, where the waiver decisions are', () => {
    // The old rule stopped at row 25 and left everything under it as one flat list.
    const rows = column(REAL)
    expect(rows.slice(25).filter((r) => r.tierBreak).length).toBeGreaterThan(0)
  })

  it('keeps tier numbers ascending down the column', () => {
    const seen = column(REAL).filter((r) => r.tierBreak).map((r) => r.tier)
    expect(seen).toEqual([...new Set(seen)])
    expect([...seen].sort((a, b) => a - b)).toEqual(seen)
  })
})

/*
 * How long the column is must not change how it is tiered.
 *
 * This was once enforced by tiering a fixed 25 rows and ignoring the rest. It is now a
 * property of the rule instead: tiers are assigned in a single top-down walk, so players added
 * below a tier are read after it has already been decided and cannot reach back up to move it.
 */
describe('list depth and tier depth are independent', () => {
  const deepColumn = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ k: 'p' + i, v: 200 - i * 1.5 }))

  const build = (n: number) => {
    const rows = deepColumn(n)
    const vorByKey: Record<string, PlayerVor> = {}
    const pool: PointsPoolPlayer[] = []
    rows.forEach((r, i) => {
      pool.push({ playerKey: r.k, name: 'RB' + i, position: 'RB', teamKey: i === 0 ? 'me' : 'T' + i, proTeam: 'DET' } as PointsPoolPlayer)
      vorByKey[r.k] = vor(r.k, 'RB', r.v)
    })
    return buildFootballWire({
      pool, vorByKey, freeAgents: [], myTeamKey: 'me', slots: { RB: 2, FLEX: 1 },
      weeksLeft: WEEKS_LEFT,
    }).board.RB
  }

  it('returns the whole column, however deep', () => {
    // The builder never truncates — the surface decides how much to render.
    expect(build(183)).toHaveLength(183)
  })

  it('tiers the depths as well as the top', () => {
    const rows = build(183)
    expect(rows.slice(100).filter((r) => r.tierBreak).length).toBeGreaterThan(0)
  })

  it('tiers the same way whether the column is short or long', () => {
    // Adding 158 rows below must not move a single cliff, or renumber a single tier, above.
    const short = build(25).map((r) => [r.name, r.tier, !!r.tierBreak])
    const long = build(183).slice(0, 25).map((r) => [r.name, r.tier, !!r.tierBreak])
    expect(long).toEqual(short)
  })
})

/*
 * Kickers and team defences belong to their own column and nowhere else.
 *
 * The overall board ranks on value over replacement, which is what lets a quarterback and a
 * tight end share an axis. It does not do the same favour for a kicker: every kicker in the
 * league projects within a point or two of every other, so they all land at a value of roughly
 * zero — which on this board reads as "exactly replacement level" and drops the entire position
 * into the middle of the list, above real players with negative value.
 *
 * Defences were worse. Sleeper files them with no full_name at all, so none of them matched a
 * projection and all thirty-two arrived unprojected, were scored zero for want of anything
 * better, and sorted into that same middle band. Sixteen consecutive rows of "no proj" sat
 * above startable players.
 *
 * They are still ranked inside their own position, where the comparison is the one a manager
 * is actually making: this kicker against that kicker.
 */
describe('the overall board is skill positions only', () => {
  const withSpecialists = () => buildFootballWire({
    pool: [
      { playerKey: 'qb1', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
      { playerKey: 'rb1', name: 'My RB', position: 'RB', teamKey: 'me', proTeam: 'DET' },
      { playerKey: 'k1', name: 'A Kicker', position: 'K', teamKey: 'me', proTeam: 'DET' },
      { playerKey: 'd1', name: 'Rams D/ST', position: 'D/ST', teamKey: 'me', proTeam: 'LAR' },
    ] as PointsPoolPlayer[],
    vorByKey: {
      qb1: vor('qb1', 'QB', 40),
      rb1: vor('rb1', 'RB', -12),   // a real player BELOW replacement
      k1: vor('k1', 'K', 0),
      d1: vor('d1', 'DEF', 0),
    },
    freeAgents: [],
    myTeamKey: 'me',
    slots: { QB: 1, RB: 2, FLEX: 1, K: 1, DEF: 1 },
    weeksLeft: WEEKS_LEFT,
  }).board

  it('leaves kickers and defences out of the overall list', () => {
    const names = (withSpecialists().ALL ?? []).map((r) => r.name)
    expect(names).toContain('My QB')
    expect(names).toContain('My RB')
    expect(names).not.toContain('A Kicker')
    expect(names).not.toContain('Rams D/ST')
  })

  it('still ranks them in their own column', () => {
    const board = withSpecialists()
    expect((board.K ?? []).map((r) => r.name)).toEqual(['A Kicker'])
    expect((board.DEF ?? []).map((r) => r.name)).toEqual(['Rams D/ST'])
  })

  /* The specific failure: a specialist at zero outranking a real player who is below
     replacement, purely because we had nothing to say about him. */
  it('carries only skill positions, whatever the league rosters', () => {
    const positions = new Set((withSpecialists().ALL ?? []).map((r) => r.position))
    expect([...positions].sort()).toEqual(['QB', 'RB'])
  })
})
