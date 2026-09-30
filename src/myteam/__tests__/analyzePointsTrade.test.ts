import { describe, it, expect } from 'vitest'
import { analyzePointsTrade, applyTrade } from '../analyzePointsTrade'
import { buildBaseballValue } from '../playerValue'
import type { PointsPoolPlayer } from '../pointsTeam'
import type { FGProjection } from '@/services/projectionService'

const W = { HR: 4, R: 1, RBI: 1, K: 1, IP: 3, W: 5 }
function bat(key: string, team: string, hr: number): { p: PointsPoolPlayer; fg: FGProjection } {
  return {
    p: { playerKey: key, name: key, position: 'OF', teamKey: team, eligiblePositions: ['OF'], proTeam: 'NYY' },
    fg: { mlbam_id: 1, player_name: key, team: 'NYY', position: 'OF', player_type: 'batter', hr, r: 70, rbi: 70, g: 150 },
  }
}

/* Three teams, one OF slot each, so a swap moves the standings visibly. */
const slots = { OF: 1 }
const rows = [
  bat('A1', 'A', 20), bat('A2', 'A', 18),   // A: decent, with depth to trade from
  bat('B1', 'B', 40), bat('B2', 'B', 5),    // B: one stud, nothing behind him
  bat('C1', 'C', 30), bat('C2', 'C', 4),    // C: sits between them
]
const pool = rows.map((r) => r.p)
const fg: Record<string, FGProjection | null> = {}
rows.forEach((r) => (fg[r.p.playerKey] = r.fg))
const valueByKey = buildBaseballValue(fg, W)
const names = { A: 'Mine', B: 'Theirs', C: 'Bystander' }
const run = (gives: string[], gets: string[], extra: any = {}) =>
  analyzePointsTrade({
    pool, valueByKey, slots, teamNames: names, myTeamKey: 'A', partnerKey: 'B',
    gives: gives.map((k) => ({ playerKey: k })), gets: gets.map((k) => ({ playerKey: k })), ...extra,
  })!

describe('applyTrade', () => {
  it('swaps the rosters without touching the caller\'s pool', () => {
    const out = applyTrade(pool, 'A', 'B', ['A1'], ['B1'])
    expect(out.find((p) => p.playerKey === 'A1')!.teamKey).toBe('B')
    expect(out.find((p) => p.playerKey === 'B1')!.teamKey).toBe('A')
    // The page's own board runs off this array; re-homing a player in place would rewrite it.
    expect(pool.find((p) => p.playerKey === 'A1')!.teamKey).toBe('A')
  })
})

describe('analyzePointsTrade', () => {
  it('reports where you finish, not just what you gain', () => {
    const a = run(['A2'], ['B1'])   // their stud for my bench body
    expect(a.myGain).toBeGreaterThan(0)
    expect(a.myMove.after).toBeLessThan(a.myMove.before) // you move UP the power order
    expect(a.theirMove.after).toBeGreaterThan(a.theirMove.before)
  })

  /* The read no value chart can produce. */
  it('names the positional move in roster terms', () => {
    const a = run(['A2'], ['B1'])
    expect(a.helps.join(' ')).toMatch(/best in the league/)
    expect(a.slotMoves.length).toBeGreaterThan(0)
  })

  it('judges a bad deal, which the generator never has to', () => {
    const a = run(['A1'], ['B2'])   // my starter for their worst body
    expect(a.klass).toBe('badForYou')
    expect(a.myGain).toBeLessThanOrEqual(0)
    expect(a.warnings.join(' ')).toMatch(/does not improve/)
  })

  it('separates a mutual deal from one they would refuse', () => {
    expect(run(['A2'], ['B1']).accept).toBe('unlikely')  // they hand over their stud
    expect(['likely', 'maybe']).toContain(run(['A1'], ['B2']).accept)
  })

  it('warns when you send more bodies than you get back', () => {
    const a = run(['A1', 'A2'], ['B1'])
    expect(a.warnings.join(' ')).toMatch(/roster spots you free/)
  })

  /* Picks can be listed so the deal reads right, but nothing here can price them, and a
     number that silently covers only half a trade is worse than saying so. */
  it('flags a deal containing something it cannot value', () => {
    const a = analyzePointsTrade({
      pool, valueByKey, slots, teamNames: names, myTeamKey: 'A', partnerKey: 'B',
      gives: [{ playerKey: 'A2' }],
      gets: [{ playerKey: 'pick-2027-1', unpriced: true, label: '2027 1st' }],
    })!
    expect(a.hasUnpricedAssets).toBe(true)
    expect(a.warnings.join(' ')).toMatch(/pick/i)
  })

  it('returns nothing when there is no trade to judge', () => {
    expect(analyzePointsTrade({
      pool, valueByKey, slots, teamNames: names, myTeamKey: 'A', partnerKey: 'B', gives: [], gets: [],
    })).toBeNull()
  })
})

describe('the before/after lineup', () => {
  it('returns every opening, not only the ones that moved', () => {
    /*
     * The point of the panel this feeds: three changed seats out of nine leave a reader unable
     * to tell whether the rest are strong or whether we never looked. slotMoves answers "what
     * changed" and is deliberately a different list.
     */
    const a = run(['A2'], ['B1'])
    expect(a.lineup.length).toBe(Object.values(slots).reduce((n, v) => n + v, 0))
    expect(a.lineup.length).toBeGreaterThanOrEqual(a.slotMoves.length)
  })

  it('names who sits in the seat on each side of the deal', () => {
    const a = run(['A2'], ['B1'])   // B1 is the best bat in the league
    const of = a.lineup.find((s) => s.slot === 'OF')!
    expect(of.beforeName).toBe('A1')
    expect(of.afterName).toBe('B1')
    expect(of.changed).toBe(true)
  })

  it('carries the league rank of the body in the seat, both ways', () => {
    const a = run(['A2'], ['B1'])
    const of = a.lineup.find((s) => s.slot === 'OF')!
    // A1 was the 3rd-best OF starter in a three-team league; B1 is the best.
    expect(of.beforeRank).toBeGreaterThan(of.afterRank)
    expect(of.afterRank).toBe(1)
  })

  it('marks a seat unchanged when the deal never reaches the lineup', () => {
    /*
     * The case the panel exists to expose. Receiving a body worse than the one already seated
     * changes nothing, and the old copy said so in a sentence nobody could check.
     */
    const a = run(['A2'], ['B2'])   // their bench body for mine
    const of = a.lineup.find((s) => s.slot === 'OF')!
    expect(of.changed).toBe(false)
    expect(of.beforeName).toBe(of.afterName)
    expect(a.lineup.some((s) => s.changed)).toBe(false)
  })

  it('agrees with slotMoves wherever both speak', () => {
    // One solve, two views of it — they must not be able to disagree.
    const a = run(['A2'], ['B1'])
    for (const m of a.slotMoves) {
      const seat = a.lineup.find((s) => s.slot === m.slot && s.afterName === m.starterName)
      expect(seat).toBeDefined()
      expect(seat!.beforeRank).toBe(m.before)
      expect(seat!.afterRank).toBe(m.after)
    }
  })
})
