import { describe, it, expect } from 'vitest'
import { projectPlayerPoints, projectedGames, weeklyRate, type PlayerPoints } from '../pointsValue'
import type { FGProjection } from '@/services/projectionService'

// A typical points-league scoring sheet (ESPN-ish defaults).
const weights: Record<string, number> = {
  R: 1, HR: 4, RBI: 1, SB: 2, H: 1, BB: 1, SO: -1, // batting
  K: 1, W: 5, SV: 5, HLD: 2, IP: 3, ER: -2, H_P: -1, BB_P: -1, // pitching
}

function batter(p: Partial<FGProjection>): FGProjection {
  return { mlbam_id: 1, player_name: 'B', team: 'NYY', position: 'OF', player_type: 'batter', ...p }
}
function pitcher(p: Partial<FGProjection>): FGProjection {
  return { mlbam_id: 2, player_name: 'P', team: 'NYY', position: 'SP', player_type: 'pitcher', ...p }
}

describe('projectPlayerPoints', () => {
  it('sums batting counting stats × weights', () => {
    const fg = batter({ r: 80, hr: 30, rbi: 90, sb: 10, h: 150, bb: 60, so: 140, g: 150 })
    const res = projectPlayerPoints(fg, weights)
    // 80*1 + 30*4 + 90*1 + 10*2 + 150*1 + 60*1 + 140*(-1)
    expect(res.total).toBe(80 + 120 + 90 + 20 + 150 + 60 - 140)
    expect(res.side).toBe('hit')
    expect(res.perStat.HR).toBe(120)
    expect(res.perStat.SO).toBe(-140)
  })

  it('scores pitchers off ER/H/BB allowed without double-counting batting homonyms', () => {
    // A pitcher row carries h/bb/hr/er/so as "allowed/recorded" — these must map
    // to the pitching keys (H_P/BB_P/K), never the batting H/BB/SO weights.
    const fg = pitcher({ w: 12, sv: 0, hld: 0, ip: 180, so: 200, er: 60, h: 150, bb: 45, gp: 30, gs: 30 })
    const res = projectPlayerPoints(fg, weights)
    // 12*5(W) + 200*1(K) + 180*3(IP) + 60*-2(ER) + 150*-1(H_P) + 45*-1(BB_P)
    expect(res.total).toBe(60 + 200 + 540 - 120 - 150 - 45)
    expect(res.side).toBe('pit')
    expect(res.perStat.K).toBe(200)
    // batting H weight (+1) must NOT apply to a pitcher's hits-allowed
    expect(res.perStat.H).toBeUndefined()
  })

  it('only counts stats the league actually scores', () => {
    const fg = batter({ r: 80, hr: 30, sb: 10, g: 150 })
    const res = projectPlayerPoints(fg, { HR: 4 }) // HR-only league
    expect(res.total).toBe(120)
    expect(Object.keys(res.perStat)).toEqual(['HR'])
  })

  it('returns a zeroed result for a null projection', () => {
    const res = projectPlayerPoints(null, weights)
    expect(res.total).toBe(0)
    expect(res.perStat).toEqual({})
  })

  it('projectedGames reads G for batters, GP for pitchers', () => {
    expect(projectedGames(batter({ g: 150 }), 'hit')).toBe(150)
    expect(projectedGames(pitcher({ gp: 30, gs: 30 }), 'pit')).toBe(30)
  })
})

describe('weeklyRate', () => {
  const hit = (total: number, games: number): PlayerPoints => ({ total, games, side: 'hit', perStat: {} })
  const pit = (total: number, games: number): PlayerPoints => ({ total, games, side: 'pit', perStat: {} })

  it('an everyday hitter sits under the cap → rate ≈ per-game × games/week', () => {
    // 120 pts over 60 games = 2/game; 60 games / 10 weeks = 6/week (< 6.5 cap).
    expect(weeklyRate(hit(120, 60), batter({ g: 60 }), 10)).toBeCloseTo(12, 5)
  })

  it('throttles a two-start week so it cannot inflate strength', () => {
    // SP: 40 pts over 4 starts = 10/start. A 2-week window with 4 starts = 2/week,
    // but a starter is capped at 1.3 turns → 10 × 1.3 = 13, not 10 × 2 = 20.
    const sp = pitcher({ gs: 4, gp: 4 })
    expect(weeklyRate(pit(40, 4), sp, 2)).toBeCloseTo(13, 5)
    // A normal cadence (4 starts over 4 weeks = 1/week) is under the cap, untouched.
    expect(weeklyRate(pit(40, 4), sp, 4)).toBeCloseTo(10, 5)
  })

  it('keeps an everyday regular above a part-time platoon bat (volume-aware)', () => {
    const everyday = weeklyRate(hit(120, 60), batter({ g: 60 }), 10) // 2/game, 6/week → 12
    const platoon = weeklyRate(hit(90, 30), batter({ g: 30 }), 10) // 3/game, 3/week → 9
    expect(everyday).toBeGreaterThan(platoon)
  })

  it('returns 0 when there are no projected games or points', () => {
    expect(weeklyRate(hit(0, 0), null, 5)).toBe(0)
    expect(weeklyRate(hit(100, 0), null, 5)).toBe(0)
  })
})
