import { describe, it, expect } from 'vitest'
import { buildPointsTrades, MIN_MEANINGFUL_GAIN } from '../pointsTrades'
import { buildBaseballValue } from '../playerValue'
import type { PointsPoolPlayer } from '../pointsTeam'
import type { FGProjection } from '@/services/projectionService'

const weights = { HR: 4, R: 1, RBI: 1, K: 1, IP: 3, W: 5 }

function bat(key: string, team: string, pos: string, hr: number): { p: PointsPoolPlayer; fg: FGProjection } {
  return {
    p: { playerKey: key, name: key, position: pos, teamKey: team, eligiblePositions: pos.split(','), proTeam: 'NYY' },
    fg: { mlbam_id: 1, player_name: key, team: 'NYY', position: pos, player_type: 'batter', hr, r: 70, rbi: 70, g: 150 },
  }
}
function arm(key: string, team: string, w: number): { p: PointsPoolPlayer; fg: FGProjection } {
  return {
    p: { playerKey: key, name: key, position: 'SP', teamKey: team, eligiblePositions: ['SP'], proTeam: 'NYY' },
    fg: { mlbam_id: 2, player_name: key, team: 'NYY', position: 'SP', player_type: 'pitcher', w, ip: 180, so: 200, gp: 30, gs: 30 },
  }
}

describe('buildPointsTrades', () => {
  // Slots: 1 OF, 1 SP. Team A is deep at OF (two studs) but thin at SP.
  // Team B is deep at SP but thin at OF. A win-win: A sends an OF, gets an SP.
  const slots = { OF: 1, SP: 1 }
  const rows = [
    bat('A_OF1', 'A', 'OF', 40), // A's starting OF
    bat('A_OF2', 'A', 'OF', 38), // A's BENCH OF (surplus — strong, but no slot)
    arm('A_SP1', 'A', 5), // A's weak SP
    bat('B_OF1', 'B', 'OF', 10), // B's weak OF
    arm('B_SP1', 'B', 18), // B's starting SP
    arm('B_SP2', 'B', 16), // B's BENCH SP (surplus — strong, but no slot)
  ]
  const pool = rows.map((r) => r.p)
  const fg: Record<string, FGProjection | null> = {}
  rows.forEach((r) => (fg[r.p.playerKey] = r.fg))
  const names = { A: 'My Team', B: 'Their Team' }

  it('finds a win-win: send surplus OF, get the SP that most upgrades my slot', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names)
    expect(ideas.length).toBeGreaterThan(0)
    const top = ideas[0]
    expect(top.gives[0].playerKey).toBe('A_OF2') // my benched OF
    /*
     * B's STARTING SP, not their benched one. Candidates used to be bench-only, which in a
     * flex-heavy lineup makes a mutual upgrade nearly impossible to construct — the live
     * symptom was a ten-team league with full rosters reporting "no clean win-win swap".
     * With starters offerable, both deals qualify and the better one for me sorts first:
     * B_SP1 is +65 to me, B_SP2 is +55. B improves either way (SP2 backfills the slot they
     * vacate, and they gain a far better OF), so the fairness guard still holds.
     */
    expect(top.gets[0].playerKey).toBe('B_SP1')
    expect(top.myGain).toBeGreaterThan(0)
    expect(top.theirGain).toBeGreaterThan(0)
    expect(top.oppTeamName).toBe('Their Team')
  })

  it('still offers the bench-for-bench deal as an alternative', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names)
    expect(ideas.some((i) => i.gives[0].playerKey === 'A_OF2' && i.gets[0].playerKey === 'B_SP2')).toBe(true)
  })

  it('never proposes a deal that fails to improve BOTH lineups', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names)
    for (const i of ideas) {
      expect(i.myGain).toBeGreaterThan(0)
      expect(i.theirGain).toBeGreaterThan(0)
      expect(i.myGain).toBeGreaterThanOrEqual(0.4 * i.theirGain)
    }
  })

  it('returns nothing when there is no mutual upgrade', () => {
    // Only my team in the pool → no partners.
    const solo = pool.filter((p) => p.teamKey === 'A')
    const ideas = buildPointsTrades(solo, buildBaseballValue(fg, weights), 'A', slots, names)
    expect(ideas).toEqual([])
  })

  it('annotates each trade side with VOR when a vorByKey is supplied', () => {
    // Key VOR on the two bodies the top win-win moves: give A_OF2, get B_SP1.
    const vorByKey = { A_OF2: { vorRos: 25 }, B_SP1: { vorRos: 40 } }
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names, vorByKey)
    expect(ideas.length).toBeGreaterThan(0)
    expect(ideas[0].gives[0].vor).toBe(25) // A_OF2
    expect(ideas[0].gets[0].vor).toBe(40)  // B_SP1
  })

  it('leaves VOR undefined when no vorByKey is supplied (baseball default)', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names)
    expect(ideas[0].gives[0].vor).toBeUndefined()
    expect(ideas[0].gets[0].vor).toBeUndefined()
  })
})

/**
 * The live page offered "give Matthew Golden (WR44, +1 VOR) → get Sam LaPorta", a 192-point
 * hit to the other manager's lineup, and called it an ask. Unbounded, the search will always
 * find "offer my worst body, receive their best" — technically an improvement for me, and a
 * proposal no human would send.
 */
describe('buildPointsTrades — asks have to be arguably fair', () => {
  const slots = { OF: 1, SP: 1 }
  // A owns a scrub OF and a fine SP; B owns an elite SP they would never dump for the scrub.
  const rows = [
    bat('A_OF1', 'A', 'OF', 30), bat('A_SCRUB', 'A', 'OF', 1), arm('A_SP1', 'A', 4),
    bat('B_OF1', 'B', 'OF', 28), arm('B_ACE', 'B', 20), arm('B_SP2', 'B', 19),
  ]
  const pool = rows.map((r) => r.p)
  const fg: Record<string, FGProjection | null> = {}
  rows.forEach((r) => (fg[r.p.playerKey] = r.fg))

  it('never proposes a deal that guts the other roster', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, {})
    for (const idea of ideas) {
      if (idea.kind !== 'ask') continue
      // Their loss capped at 1.5x my gain — anything worse is a punchline, not a negotiation.
      expect(-idea.theirGain).toBeLessThanOrEqual(1.5 * idea.myGain)
    }
  })

  it('ranks asks by net surplus, so the least damaging comes first', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, {})
    const nets = ideas.filter((i) => i.kind === 'ask').map((i) => i.myGain + i.theirGain)
    expect([...nets].sort((a, b) => b - a)).toEqual(nets)
  })

  it('puts every win-win ahead of every ask', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, {})
    const firstAsk = ideas.findIndex((i) => i.kind === 'ask')
    if (firstAsk >= 0) expect(ideas.slice(firstAsk).every((i) => i.kind === 'ask')).toBe(true)
  })
})

describe('buildPointsTrades — consolidation', () => {
  /*
   * Two startable bodies for one better one. This is the shape a 1-for-1 cannot produce: they
   * gain depth across two slots, you gain at the top. Two OF slots and two SP slots so each
   * side has somewhere to put what it receives.
   */
  const slots = { OF: 2, SP: 2 }
  const rows = [
    bat('A_OF1', 'A', 'OF', 34), bat('A_OF2', 'A', 'OF', 30), bat('A_OF3', 'A', 'OF', 28),
    arm('A_SP1', 'A', 3), arm('A_SP2', 'A', 2),
    bat('B_OF1', 'B', 'OF', 5), bat('B_OF2', 'B', 'OF', 4),
    arm('B_ACE', 'B', 22), arm('B_SP2', 'B', 6),
  ]
  const pool = rows.map((r) => r.p)
  const fg: Record<string, FGProjection | null> = {}
  rows.forEach((r) => (fg[r.p.playerKey] = r.fg))

  it('offers two-for-one deals and labels their shape', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, {})
    const two = ideas.filter((i) => i.shape === '2for1')
    expect(two.length).toBeGreaterThan(0)
    for (const t of two) {
      expect(t.gives.length).toBe(2)
      expect(t.gets.length).toBe(1)
    }
  })

  it('still requires the same honesty test as any other deal', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, {})
    for (const i of ideas) {
      expect(i.myGain).toBeGreaterThan(0)
      if (i.kind === 'winWin') expect(i.theirGain).toBeGreaterThan(0)
    }
  })

  it('never gives the same player away in two different deals more than twice', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, {})
    const counts = new Map<string, number>()
    for (const i of ideas) for (const g of i.gives) counts.set(g.playerKey, (counts.get(g.playerKey) ?? 0) + 1)
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2)
  })
})

/*
 * The rule that stops the page endorsing nothing.
 *
 * A gain of a few tenths survived the old `myGain <= 0` filter, then rounded to zero for
 * display — so the board carried "+0 PTS TO YOU" under a Best deals heading, captioned
 * "even — both win", and in a dynasty league sitting above "dynasty −3,200".
 */
describe('a trade has to be worth proposing', () => {
  const slots = { OF: 1, SP: 1 }

  it('drops a swap whose gain rounds away to nothing', () => {
    // A's bench OF is a hair better than B's starter — a real but meaningless upgrade.
    const rows = [
      bat('A_OF1', 'A', 'OF', 40),
      bat('A_OF2', 'A', 'OF', 39),
      arm('A_SP1', 'A', 20),
      bat('B_OF1', 'B', 'OF', 10),
      arm('B_SP1', 'B', 20.05),
      arm('B_SP2', 'B', 20.02),
    ]
    const pool = rows.map((r) => r.p)
    const fg: Record<string, FGProjection | null> = {}
    rows.forEach((r) => (fg[r.p.playerKey] = r.fg))
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, { HR: 4, R: 1, RBI: 1, K: 1, IP: 3, W: 5 }), 'A', slots, { A: 'Me', B: 'Them' })
    // Whatever survives, nothing may display as +0.
    for (const i of ideas) expect(i.myGain).toBeGreaterThanOrEqual(MIN_MEANINGFUL_GAIN)
  })

  it('still finds the deal when it is genuinely worth something', () => {
    const rows = [
      bat('A_OF1', 'A', 'OF', 40),
      bat('A_OF2', 'A', 'OF', 38),
      arm('A_SP1', 'A', 5),
      bat('B_OF1', 'B', 'OF', 10),
      arm('B_SP1', 'B', 18),
      arm('B_SP2', 'B', 16),
    ]
    const pool = rows.map((r) => r.p)
    const fg: Record<string, FGProjection | null> = {}
    rows.forEach((r) => (fg[r.p.playerKey] = r.fg))
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, { HR: 4, R: 1, RBI: 1, K: 1, IP: 3, W: 5 }), 'A', slots, { A: 'Me', B: 'Them' })
    expect(ideas.length).toBeGreaterThan(0)
    for (const i of ideas) expect(i.myGain).toBeGreaterThanOrEqual(MIN_MEANINGFUL_GAIN)
  })

  it('holds the floor at a point a week', () => {
    expect(MIN_MEANINGFUL_GAIN).toBe(1)
  })
})
