import { describe, it, expect } from 'vitest'
import { buildPointsTradeLandscape } from '../pointsTradeLandscape'
import { buildBaseballValue } from '../playerValue'
import type { PointsPoolPlayer } from '../pointsTeam'
import type { FGProjection } from '@/services/projectionService'

const weights = { HR: 4, R: 1, RBI: 1, K: 1, IP: 3, W: 5 }

function player(key: string, team: string, pos: string, isPitcher: boolean, score: number): { p: PointsPoolPlayer; fg: FGProjection } {
  const fg: FGProjection = isPitcher
    ? { mlbam_id: 1, player_name: key, team: 'X', position: pos, player_type: 'pitcher', ip: score, so: 0, w: 0, gp: 30, gs: 30 }
    : { mlbam_id: 1, player_name: key, team: 'X', position: pos, player_type: 'batter', hr: score, r: 0, rbi: 0, g: 150 }
  return { p: { playerKey: key, name: key, position: pos, teamKey: team, eligiblePositions: pos.split(',') }, fg }
}

describe('buildPointsTradeLandscape', () => {
  // 3 teams. Team A: great SP, weak OF. Team B: great OF, weak SP. C: middling.
  const rows = [
    player('A_SP', 'A', 'SP', true, 100), // A strong SP (IP 100 → 300 pts)
    player('A_OF', 'A', 'OF', false, 2), // A weak OF (HR 2 → 8 pts)
    player('B_SP', 'B', 'SP', true, 10), // B weak SP
    player('B_OF', 'B', 'OF', false, 40), // B strong OF
    player('C_SP', 'C', 'SP', true, 50),
    player('C_OF', 'C', 'OF', false, 20),
  ]
  const pool = rows.map((r) => r.p)
  const fg: Record<string, FGProjection | null> = {}
  rows.forEach((r) => (fg[r.p.playerKey] = r.fg))
  const names = { A: 'My Team', B: 'Their Team', C: 'Mid Team' }

  it('ranks each team at each position and reads my strengths / holes', () => {
    const ls = buildPointsTradeLandscape(pool, buildBaseballValue(fg, weights), fg, 'A', names)!
    expect(ls.rank.SP.A).toBe(1) // A has the best SP
    expect(ls.rank.OF.A).toBe(3) // A has the worst OF
    expect(ls.myStrong).toContain('SP')
    expect(ls.myWeak).toContain('OF')
  })

  it('finds the complementary partner (they hold what you need)', () => {
    const ls = buildPointsTradeLandscape(pool, buildBaseballValue(fg, weights), fg, 'A', names)!
    const b = ls.partners.find((p) => p.teamKey === 'B')!
    expect(b.youBuy).toContain('OF') // B strong OF, A weak OF
    expect(b.theyNeed).toContain('SP') // A strong SP, B weak SP
  })

  it('surfaces a pure sell-from-strength target when I have no weak spot of my own', () => {
    // 3 teams. X: best SP AND best OF — stacked, no glaring hole. Y: middling.
    // Z: worst SP and worst OF — weak everywhere X is strong.
    const rowsStacked = [
      player('X_SP', 'X', 'SP', true, 100),
      player('X_OF', 'X', 'OF', false, 40),
      player('Y_SP', 'Y', 'SP', true, 50),
      player('Y_OF', 'Y', 'OF', false, 20),
      player('Z_SP', 'Z', 'SP', true, 10),
      player('Z_OF', 'Z', 'OF', false, 2),
    ]
    const poolStacked = rowsStacked.map((r) => r.p)
    const fgStacked: Record<string, FGProjection | null> = {}
    rowsStacked.forEach((r) => (fgStacked[r.p.playerKey] = r.fg))
    const namesStacked = { X: 'My Team', Y: 'Mid Team', Z: 'Weak Team' }

    const ls = buildPointsTradeLandscape(poolStacked, buildBaseballValue(fgStacked, weights), fgStacked, 'X', namesStacked)!
    expect(ls.myWeak).toEqual([]) // no glaring hole — a stacked roster

    const z = ls.partners.find((p) => p.teamKey === 'Z')
    expect(z).toBeDefined()
    expect(z!.youBuy).toEqual([]) // nothing to acquire — I have no need
    expect(z!.theyNeed).toEqual(expect.arrayContaining(['SP', 'OF'])) // they're thin where I'm loaded
  })
})

describe('buildPointsTradeLandscape — football VOR strength', () => {
  // 2 teams, RB position. A's RB is above replacement (+20), B's is BELOW (-8).
  // With a vorByKey, B's negative-VOR RB must still rank as a real body (rank 2), not "none".
  const fbPool: PointsPoolPlayer[] = [
    { playerKey: 'A_RB', name: 'A_RB', position: 'RB', teamKey: 'A', eligiblePositions: ['RB'] },
    { playerKey: 'B_RB', name: 'B_RB', position: 'RB', teamKey: 'B', eligiblePositions: ['RB'] },
  ]
  const vorByKey = { A_RB: { vorRos: 20 }, B_RB: { vorRos: -8 } }

  it('ranks by VOR including negatives when a vorByKey is supplied', () => {
    const ls = buildPointsTradeLandscape(fbPool, {}, {}, 'A', { A: 'Me', B: 'You' }, 'football', vorByKey)!
    expect(ls.positions).toContain('RB')
    expect(ls.rank.RB.A).toBe(1) // above replacement — best
    expect(ls.rank.RB.B).toBe(2) // below replacement, but a real body — ranked, not 0
    expect(ls.myStrong).toContain('RB') // A is top-third at RB
  })
})

describe('the FLEX row', () => {
  /*
   * Football, VOR-ranked, with the slot shape this was built for: QB/RB2/WR2/TE/FLEX3.
   *
   * The whole point of the row is that it separates teams the concrete rows cannot. Both
   * teams below field an identical top two at running back and receiver — so RB and WR tie —
   * and one of them has three more startable bodies behind them while the other has nothing.
   * That is the team with three fillable flex seats against the team starting warm bodies in
   * three of its nine, and before this row the grid showed them as the same roster.
   */
  const SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 3 }

  function nfl(key: string, team: string, pos: string) {
    return { playerKey: key, name: key, position: pos, teamKey: team, eligiblePositions: [pos] } as PointsPoolPlayer
  }
  // identical starters for DEEP and SHALLOW; only the bench behind them differs
  const shared = [
    ['QB', 100], ['RB', 90], ['RB', 80], ['WR', 85], ['WR', 75], ['TE', 60],
  ] as [string, number][]
  const pool: PointsPoolPlayer[] = []
  const vor: Record<string, { vorRos: number }> = {}
  for (const team of ['DEEP', 'SHALLOW']) {
    shared.forEach(([pos, v], i) => {
      const k = `${team}_${pos}${i}`
      pool.push(nfl(k, team, pos)); vor[k] = { vorRos: v }
    })
  }
  // DEEP alone carries three more startable bodies
  ;[['RB', 70], ['WR', 65], ['TE', 55]].forEach(([pos, v], i) => {
    const k = `DEEP_SPARE${i}`
    pool.push(nfl(k, 'DEEP', pos as string)); vor[k] = { vorRos: v as number }
  })
  const names = { DEEP: 'Deep', SHALLOW: 'Shallow' }
  const ls = buildPointsTradeLandscape(pool, {}, {}, 'DEEP', names, 'football', vor, SLOTS)!

  it('appears as its own row when the league fills flex seats', () => {
    expect(ls.positions).toContain('FLEX')
  })

  it('separates two teams the concrete rows call identical', () => {
    // the rows that already existed cannot tell these apart …
    expect(ls.rank.RB.DEEP).toBe(ls.rank.RB.SHALLOW)
    expect(ls.rank.WR.DEEP).toBe(ls.rank.WR.SHALLOW)
    // … and the new one can.
    expect(ls.rank.FLEX.DEEP).toBe(1)
    expect(ls.rank.FLEX.SHALLOW).not.toBe(1)
  })

  it('counts leftovers, not the best body — otherwise it just restates RB', () => {
    /*
     * DEEP's best flex-eligible player is his RB1 at 90, who is already in a committed seat.
     * The row must be scored on the 70/65/55 behind him, not on 90.
     */
    expect(ls.rank.FLEX.DEEP).toBe(1)
    const shallowHasNoSpare = ls.rank.FLEX.SHALLOW
    expect(shallowHasNoSpare === 0 || shallowHasNoSpare === 2).toBe(true)
  })

  it('stays off the grid for a league with no flex seats', () => {
    const noFlex = buildPointsTradeLandscape(
      pool, {}, {}, 'DEEP', names, 'football', vor, { QB: 1, RB: 2, WR: 2, TE: 1 },
    )!
    expect(noFlex.positions).not.toContain('FLEX')
  })

  it('reads a bare flex bench as a hole worth trading for', () => {
    const shallow = buildPointsTradeLandscape(pool, {}, {}, 'SHALLOW', names, 'football', vor, SLOTS)!
    expect(shallow.myWeak).toContain('FLEX')
  })
})
