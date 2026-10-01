import { describe, it, expect } from 'vitest'
import { offerSignature, offerSignatureByCost, gainJustifiesCost, buildPointsTrades, MIN_GAIN_PER_WEEK } from '../pointsTrades'
import { MIN_SENDABLE_ODDS } from '../tradeStrategy'
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

  /*
   * Shopping one player to several managers is the strategy, not a bug.
   *
   * The cap was two, on the theory that repeats are clutter. They are not: you send the same
   * surplus back around the league to find out who bites, and only one of those offers can be
   * accepted anyway. The cap exists to stop the board becoming four variations on one player,
   * not to stop you canvassing — so it is loose, and it is still a cap.
   */
  it('shops a player around without letting one name take over the board', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, {})
    const counts = new Map<string, number>()
    for (const i of ideas) for (const g of i.gives) counts.set(g.playerKey, (counts.get(g.playerKey) ?? 0) + 1)
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(4)
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
    for (const i of ideas) expect(i.myGain).toBeGreaterThanOrEqual(MIN_GAIN_PER_WEEK)
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
    for (const i of ideas) expect(i.myGain).toBeGreaterThanOrEqual(MIN_GAIN_PER_WEEK)
  })

  it('holds the floor at a point a week', () => {
    // Stated per week and multiplied by the weeks left, rather than a bare season point —
    // which is what the constant used to be while its comment claimed otherwise.
    expect(MIN_GAIN_PER_WEEK).toBe(1)
  })
})

describe('the same deal wearing a different hat', () => {
  /*
   * The interchangeable body varies on BOTH sides. Going out: "Gustavsson for Tavares +
   * Zibanejad" and "Gustavsson for Tavares + Stone", both +72. Coming back: "Brady Tkachuk +
   * Matthew Tkachuk for Malkin + Zibanejad" and "Brady Tkachuk + Verhaeghe for Malkin +
   * Zibanejad", both +24. Same partner, same gain, same decision — and at a board that stops
   * at ten, each copy costs a real alternative its slot.
   *
   * Each signature requires a WHOLE SIDE to match. Keying on the headline piece instead was
   * tried and was too coarse — it merged a bench-for-bench alternative into an unrelated deal
   * and let a worse-for-you offer stand in for a better one. Both failures are pinned by the
   * buildPointsTrades tests above.
   */
  const side = (key: string, points: number): any =>
    ({ playerKey: key, name: key, position: 'C', points })

  const idea = (gets: any[], gives: any[], myGain = 72): any => ({
    gets, gives, oppTeamKey: 'opp', oppTeamName: 'Opp', myGain, theirGain: 5,
    kind: 'winWin', odds: 0.55, rung: 'fair', spots: 1, pitch: '', note: '',
  })

  it('collapses a swapped body on the way OUT', () => {
    const a = idea([side('gustavsson', 307)], [side('tavares', 272), side('zibanejad', 263)])
    const b = idea([side('gustavsson', 307)], [side('tavares', 272), side('stone', 215)])
    expect(offerSignature(a)).toBe(offerSignature(b))
  })

  it('collapses a swapped body on the way BACK', () => {
    const a = idea([side('tkachuk', 295), side('mtkachuk', 228)], [side('malkin', 269)], 24)
    const b = idea([side('tkachuk', 295), side('verhaeghe', 218)], [side('malkin', 269)], 24)
    expect(offerSignatureByCost(a)).toBe(offerSignatureByCost(b))
  })

  it('does not merge two deals that differ on BOTH sides', () => {
    const a = idea([side('gustavsson', 307)], [side('tavares', 272)])
    const b = idea([side('knight', 290)], [side('malkin', 269)])
    expect(offerSignature(a)).not.toBe(offerSignature(b))
    expect(offerSignatureByCost(a)).not.toBe(offerSignatureByCost(b))
  })

  it('keeps a different gain, and a different partner', () => {
    const base = idea([side('gustavsson', 307)], [side('tavares', 272)], 72)
    expect(offerSignature(base))
      .not.toBe(offerSignature(idea([side('gustavsson', 307)], [side('tavares', 272)], 51)))
    expect(offerSignature(base))
      .not.toBe(offerSignature({ ...base, oppTeamKey: 'other' }))
  })
})

describe('a deal has to be worth the body it costs', () => {
  /*
   * The live hockey board put this under "Best deals": give Mika Zibanejad (263) AND Valeri
   * Nichushkin (262) — 525 points of real bodies — receive Mathew Barzal (272), for a lineup
   * gain of THREE. The engine was right that neither man started for this roster, and it even
   * captioned it "favors them — easy yes". It is still a trade no human sends.
   *
   * MIN_GAIN_PER_WEEK is an absolute floor of one point, which a 525-for-272 swap clears
   * trivially. The missing guard is relative: if you are sending a genuine starter, the deal
   * has to actually move your lineup. Measured against the BEST body leaving, because that is
   * the one the other manager is really buying and the one you will miss.
   */
  it('rejects a swap whose gain is trivial beside the best player leaving', () => {
    expect(gainJustifiesCost(3, [{ points: 263 }, { points: 262 }] as any)).toBe(false)
  })

  it('accepts a consolidation that genuinely moves the lineup', () => {
    /* The same two bodies out, but +72 back — a real upgrade, and it survived. */
    expect(gainJustifiesCost(72, [{ points: 263 }, { points: 262 }] as any)).toBe(true)
  })

  it('lets a small gain stand when what leaves is small too', () => {
    /* Giving up a 40-point bench body for +8 is a fine piece of business. */
    expect(gainJustifiesCost(8, [{ points: 40 }] as any)).toBe(true)
  })

  it('never divides by zero when nothing priced is leaving', () => {
    expect(gainJustifiesCost(5, [] as any)).toBe(true)
    expect(gainJustifiesCost(5, [{ points: 0 }] as any)).toBe(true)
  })
})

describe('one-in-five is not a trade suggestion', () => {
  /*
   * The board carried cards at 18% and 20% — "nothing they need, costs them 78" — beside
   * genuine win-wins at 55-65%. A long shot labelled as such is still a long shot, and at ten
   * slots each one displaces a deal that might actually happen.
   */
  it('sets the sendable floor above a one-in-five chance', () => {
    expect(MIN_SENDABLE_ODDS).toBeGreaterThan(0.2)
  })
})
