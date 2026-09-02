import { describe, it, expect } from 'vitest'
import { buildPointsTrades } from '../pointsTrades'
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
    expect(top.give.playerKey).toBe('A_OF2') // my benched OF
    /*
     * B's STARTING SP, not their benched one. Candidates used to be bench-only, which in a
     * flex-heavy lineup makes a mutual upgrade nearly impossible to construct — the live
     * symptom was a ten-team league with full rosters reporting "no clean win-win swap".
     * With starters offerable, both deals qualify and the better one for me sorts first:
     * B_SP1 is +65 to me, B_SP2 is +55. B improves either way (SP2 backfills the slot they
     * vacate, and they gain a far better OF), so the fairness guard still holds.
     */
    expect(top.get.playerKey).toBe('B_SP1')
    expect(top.myGain).toBeGreaterThan(0)
    expect(top.theirGain).toBeGreaterThan(0)
    expect(top.oppTeamName).toBe('Their Team')
  })

  it('still offers the bench-for-bench deal as an alternative', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names)
    expect(ideas.some((i) => i.give.playerKey === 'A_OF2' && i.get.playerKey === 'B_SP2')).toBe(true)
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
    expect(ideas[0].give.vor).toBe(25) // A_OF2
    expect(ideas[0].get.vor).toBe(40)  // B_SP1
  })

  it('leaves VOR undefined when no vorByKey is supplied (baseball default)', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names)
    expect(ideas[0].give.vor).toBeUndefined()
    expect(ideas[0].get.vor).toBeUndefined()
  })
})
