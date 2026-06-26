import { describe, it, expect } from 'vitest'
import { buildPointsTeam, parseEligible, type PointsPoolPlayer } from '../pointsTeam'
import type { FGProjection } from '@/services/projectionService'

const weights = { HR: 4, R: 1, RBI: 1, K: 1, W: 5, IP: 3, ER: -2 }

function bat(key: string, team: string, pos: string, hr: number, r: number, rbi: number): {
  p: PointsPoolPlayer; fg: FGProjection
} {
  return {
    p: { playerKey: key, name: key, position: pos, teamKey: team, eligiblePositions: pos.split(',') },
    fg: { mlbam_id: 1, player_name: key, team, position: pos, player_type: 'batter', hr, r, rbi, g: 150 },
  }
}
function arm(key: string, team: string, pos: string, w: number, ip: number, so: number, er: number): {
  p: PointsPoolPlayer; fg: FGProjection
} {
  return {
    p: { playerKey: key, name: key, position: pos, teamKey: team, eligiblePositions: pos.split(',') },
    fg: { mlbam_id: 2, player_name: key, team, position: pos, player_type: 'pitcher', w, ip, so, er, gp: 30, gs: 30 },
  }
}

describe('buildPointsTeam', () => {
  const slots = { '2B': 1, OF: 1, SP: 1 }
  const rows = [
    bat('Stud2B', 'A', '2B', 40, 100, 110), // A
    bat('WeakOF', 'A', 'OF', 10, 40, 40),
    arm('AceA', 'A', 'SP', 15, 200, 240, 60),
    bat('MidOF', 'B', 'OF', 25, 80, 80), // B
    bat('Weak2B', 'B', '2B', 8, 35, 35),
    arm('AceB', 'B', 'SP', 18, 210, 250, 55),
  ]
  const pool = rows.map((r) => r.p)
  const fgByKey: Record<string, FGProjection | null> = {}
  rows.forEach((r) => (fgByKey[r.p.playerKey] = r.fg))

  it('tiers my roster by projected points and ranks the lineup vs the league', () => {
    const m = buildPointsTeam(pool, fgByKey, weights, 'A', slots)
    expect(m.rosterRows).toHaveLength(3)
    // Stud2B is the highest-scoring HITTER on my team (pitchers rank within their own side)
    const myHitters = m.rosterRows.filter((r) => r.side === 'hit')
    expect(myHitters[0].player.playerKey).toBe('Stud2B')
    expect(myHitters[0].points).toBe(40 * 4 + 100 + 110)
    // standings rank both teams
    expect(m.teams).toBe(2)
    expect(m.myStanding?.teamKey).toBe('A')
  })

  it('ranks each position starter against the other team at that slot', () => {
    const m = buildPointsTeam(pool, fgByKey, weights, 'A', slots)
    const my2B = m.slotRanks.find((s) => s.slot === '2B')!
    expect(my2B.starterName).toBe('Stud2B')
    expect(my2B.rank).toBe(1) // Stud2B (270) beats Weak2B
    const myOF = m.slotRanks.find((s) => s.slot === 'OF')!
    expect(myOF.starterName).toBe('WeakOF')
    expect(myOF.rank).toBe(2) // WeakOF (90) loses to MidOF (260)
    // Pitching is NOT a per-slot row — it folds into the staff aggregate.
    expect(m.slotRanks.some((s) => s.slot === 'SP')).toBe(false)
  })

  it('folds pitching into one staff rank with arms listed by points', () => {
    const m = buildPointsTeam(pool, fgByKey, weights, 'A', slots)
    // AceA staff (795) trails AceB staff (860) → my pitching ranks 2nd.
    expect(m.pitching?.rank).toBe(2)
    expect(m.pitching?.teams).toBe(2)
    expect(m.pitching?.arms[0].name).toBe('AceA')
  })

  it('parseEligible falls back to the position string', () => {
    expect(parseEligible({ playerKey: 'x', name: 'x', position: 'SP,RP', teamKey: 'A' })).toEqual(['SP', 'RP'])
  })
})
