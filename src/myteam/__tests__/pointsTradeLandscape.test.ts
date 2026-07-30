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
