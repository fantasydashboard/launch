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

  it('chips a specialist only when they are a standout (not anyone who accrues the stat)', () => {
    // SB scored; build a pool where a few hitters steal a lot and most steal a little.
    const w = { HR: 4, SB: 2 }
    const speed = (k: string, sb: number) => ({
      p: { playerKey: k, name: k, position: 'OF', teamKey: 'A', eligiblePositions: ['OF'] },
      fg: { mlbam_id: 1, player_name: k, team: 'A', position: 'OF', player_type: 'batter' as const, hr: 15, sb, g: 150 },
    })
    const rows2 = [speed('Burner1', 40), speed('Burner2', 35), speed('Plodder1', 3), speed('Plodder2', 2), speed('Plodder3', 1)]
    const pool2 = rows2.map((r) => r.p)
    const fg2: Record<string, FGProjection | null> = {}
    rows2.forEach((r) => (fg2[r.p.playerKey] = r.fg))
    const m = buildPointsTeam(pool2, fg2, w, 'A', { OF: 1 })
    const chip = (k: string) => m.rosterRows.find((r) => r.player.playerKey === k)?.chips ?? []
    expect(chip('Burner1')).toContain('SB')
    expect(chip('Plodder3')).not.toContain('SB') // accrues SB points, but not a standout
  })

  it('parseEligible falls back to the position string', () => {
    expect(parseEligible({ playerKey: 'x', name: 'x', position: 'SP,RP', teamKey: 'A' })).toEqual(['SP', 'RP'])
  })

  it('discounts injured players (IL x0.5, DTD x0.9), keeps perGame at the healthy rate, and lowers strength', () => {
    const injPool = pool.map((p) =>
      p.playerKey === 'Stud2B' ? { ...p, onIL: true } // IL
      : p.playerKey === 'WeakOF' ? { ...p, status: 'DTD' } // DTD
      : p,
    )
    const healthy = buildPointsTeam(pool, fgByKey, weights, 'A', slots)
    const injured = buildPointsTeam(injPool, fgByKey, weights, 'A', slots)

    const row = (m: ReturnType<typeof buildPointsTeam>, key: string) =>
      m.rosterRows.find((r) => r.player.playerKey === key)!

    // IL: points halved, tier tagged, per-game rate untouched
    expect(row(injured, 'Stud2B').points).toBeCloseTo(row(healthy, 'Stud2B').points * 0.5, 5)
    expect(row(injured, 'Stud2B').injury).toBe('il')
    expect(row(injured, 'Stud2B').perGame).toBeCloseTo(row(healthy, 'Stud2B').perGame, 5)
    // DTD: points x0.9
    expect(row(injured, 'WeakOF').points).toBeCloseTo(row(healthy, 'WeakOF').points * 0.9, 5)
    expect(row(injured, 'WeakOF').injury).toBe('dtd')
    // Healthy player unchanged
    expect(row(injured, 'AceA').points).toBeCloseTo(row(healthy, 'AceA').points, 5)
    expect(row(injured, 'AceA').injury).toBe('healthy')
    // Team strength drops when a star is hurt
    const strengthA = (m: ReturnType<typeof buildPointsTeam>) =>
      m.standings.find((s) => s.teamKey === 'A')!.startingPoints
    expect(strengthA(injured)).toBeLessThan(strengthA(healthy))
  })

  it('DTD discount (startable) lowers team strength by exactly the haircut', () => {
    // WeakOF is team A's only OF, so he starts. DTD keeps him startable at x0.9, so the
    // 0.1 haircut must show up in standings strength — proving the discount, not exclusion, moved it.
    const dtdPool = pool.map((p) => (p.playerKey === 'WeakOF' ? { ...p, status: 'DTD' } : p))
    const healthy = buildPointsTeam(pool, fgByKey, weights, 'A', slots)
    const dtd = buildPointsTeam(dtdPool, fgByKey, weights, 'A', slots)
    const strengthA = (m: ReturnType<typeof buildPointsTeam>) =>
      m.standings.find((s) => s.teamKey === 'A')!.startingPoints
    const weakOfPoints = healthy.rosterRows.find((r) => r.player.playerKey === 'WeakOF')!.points
    expect(strengthA(dtd)).toBeLessThan(strengthA(healthy))
    expect(strengthA(healthy) - strengthA(dtd)).toBeCloseTo(weakOfPoints * 0.1, 3)
  })

  it('excludes a status-only IL player (onIL false) from the optimal lineup, not just discounts them', () => {
    // AceA is team A's only SP. Marking him OUT via status alone (onIL stays false) should EXCLUDE
    // him from the lineup (SP slot empties) — removing his FULL value from strength, not just x0.5.
    const outPool = pool.map((p) => (p.playerKey === 'AceA' ? { ...p, status: 'OUT' } : p))
    const healthy = buildPointsTeam(pool, fgByKey, weights, 'A', slots)
    const out = buildPointsTeam(outPool, fgByKey, weights, 'A', slots)
    const strengthA = (m: ReturnType<typeof buildPointsTeam>) =>
      m.standings.find((s) => s.teamKey === 'A')!.startingPoints
    const aceHealthyPts = healthy.rosterRows.find((r) => r.player.playerKey === 'AceA')!.points
    // Excluded → full ace value removed (a mere 0.5x discount would remove only half)
    expect(strengthA(healthy) - strengthA(out)).toBeCloseTo(aceHealthyPts, 3)
    expect(out.rosterRows.find((r) => r.player.playerKey === 'AceA')!.injury).toBe('il')
  })
})
