import { describe, it, expect } from 'vitest'
import { buildBaseballValue, buildFootballValue, weeklyRate } from '@/myteam/playerValue'
import type { FGProjection } from '@/services/projectionService'
import type { FootballProjection } from '@/football/buildFootballProjections'

const batter = (over: Partial<FGProjection> = {}): FGProjection => ({
  mlbam_id: 1, player_name: 'Bat', team: 'NYY', position: 'OF', player_type: 'batter',
  g: 150, hr: 30, r: 90, rbi: 90, sb: 10, ...over,
})
const starter = (over: Partial<FGProjection> = {}): FGProjection => ({
  mlbam_id: 2, player_name: 'Ace', team: 'NYY', position: 'SP', player_type: 'pitcher',
  gs: 30, gp: 30, ip: 190, k: 220, w: 14, ...over,
})

describe('buildBaseballValue', () => {
  it('produces a PlayerValue per key with side + weeklyCap', () => {
    const v = buildBaseballValue({ a: batter(), b: starter() }, { HR: 4, R: 1, RBI: 1, SB: 1, K: 1, W: 5, IP: 1 })
    expect(v.a.side).toBe('hit')
    expect(v.a.weeklyCap).toBe(6.5)
    expect(v.a.total).toBeGreaterThan(0)
    expect(v.b.side).toBe('pit')
    expect(v.b.weeklyCap).toBe(1.3) // gs >= gp*0.5 ⇒ starter
  })

  it('gives relievers the reliever cap', () => {
    const v = buildBaseballValue({ r: starter({ position: 'RP', gs: 0, gp: 60, ip: 65, k: 80 }) }, { K: 1, IP: 1 })
    expect(v.r.weeklyCap).toBe(3.5)
  })

  it('null projection ⇒ zero value, cap harmless', () => {
    const v = buildBaseballValue({ x: null }, { HR: 4 })
    expect(v.x.total).toBe(0)
    expect(weeklyRate(v.x, 4)).toBe(0)
  })
})

describe('weeklyRate', () => {
  it('is perGame × min(games/weeksLeft, cap)', () => {
    const v = buildBaseballValue({ a: batter({ g: 24 }) }, { HR: 4, R: 1, RBI: 1, SB: 1 })
    // perGame = total/24; games/weeksLeft = 24/4 = 6 < cap 6.5 ⇒ rate = perGame*6
    const expected = (v.a.total / 24) * 6
    expect(weeklyRate(v.a, 4)).toBeCloseTo(expected, 6)
  })
  it('caps a two-start-week spike (starter cap 1.3)', () => {
    const v = buildBaseballValue({ b: starter({ gs: 4, gp: 4, ip: 26, k: 30 }) }, { K: 1, IP: 1 })
    // games/weeksLeft = 4/1 = 4 > cap 1.3 ⇒ rate = perGame*1.3
    const expected = (v.b.total / 4) * 1.3
    expect(weeklyRate(v.b, 1)).toBeCloseTo(expected, 6)
  })
})

describe('buildFootballValue', () => {
  const proj = (points: number): FootballProjection => ({ stats: {}, points })
  it('per-week: total=points, games=weeksLeft, side undefined, cap high', () => {
    const v = buildFootballValue({ q: proj(300) }, 15)
    expect(v.q.total).toBe(300)
    expect(v.q.games).toBe(15)
    expect(v.q.side).toBeUndefined()
    expect(v.q.weeklyCap).toBe(999)
    expect(v.q.total / v.q.games).toBe(20)
  })
  it('clamps weeksLeft to >= 1', () => {
    const v = buildFootballValue({ q: proj(50) }, 0)
    expect(v.q.games).toBe(1)
  })
})
