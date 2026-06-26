import { describe, it, expect } from 'vitest'
import { projectPlayerPoints, projectedGames } from '../pointsValue'
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
