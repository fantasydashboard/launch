import { describe, it, expect } from 'vitest'
import { buildRosPoints, observedFromLines, PRIOR_GAMES, SEASON_GAMES } from '../rosBlend'
import type { SeasonLine } from '@/services/playerUsage'

const line = (playerKey: string, week: number, points: number): SeasonLine =>
  ({ playerKey, team: 'DET', opponent: 'CHI', position: 'WR', points, week })

describe('rest-of-season points that respond to the season', () => {
  /*
   * The defect: Sleeper's season projection never converges, so our rest-of-season board
   * carried the same number in week fourteen as in week one. Against an analyst's week-2 list
   * their ranking tracked points-per-game far harder than ours everywhere, and at tight end
   * ours was POSITIVELY correlated with production — we ranked the better producers worse.
   */
  it('moves a player toward what he has actually done', () => {
    const proj = { over: 170, under: 170 }   // both forecast at 10 a game
    const lines = [line('over', 1, 30), line('over', 2, 30), line('under', 1, 2), line('under', 2, 2)]
    const out = buildRosPoints({ seasonProjection: proj, lines, currentWeek: 3 })
    expect(out.over.perGame).toBeGreaterThan(10)
    expect(out.under.perGame).toBeLessThan(10)
    expect(out.over.pointsRos).toBeGreaterThan(out.under.pointsRos)
  })

  /* Two games is mostly noise. A board that chased it would swing every Monday. */
  it('shrinks hard toward the forecast on a small sample', () => {
    const out = buildRosPoints({
      seasonProjection: { p: 170 },              // 10 a game
      lines: [line('p', 1, 40)],                 // one enormous afternoon
      currentWeek: 2,
    })
    // One game against five games of prior: a sixth of the way, not most of it.
    expect(out.p.perGame).toBeCloseTo((10 * PRIOR_GAMES + 40) / (PRIOR_GAMES + 1), 5)
    expect(out.p.perGame).toBeLessThan(16)
  })

  it('lets a real sample outweigh the forecast by midseason', () => {
    const early = buildRosPoints({ seasonProjection: { p: 170 }, lines: [line('p', 1, 20)], currentWeek: 2 })
    const later = buildRosPoints({
      seasonProjection: { p: 170 },
      lines: Array.from({ length: 8 }, (_, i) => line('p', i + 1, 20)),
      currentWeek: 9,
    })
    expect(later.p.perGame).toBeGreaterThan(early.p.perGame)
    expect(later.p.perGame).toBeGreaterThan(15)   // well past the halfway mark toward 20
  })

  /* A rest-of-season number must not include games already won. */
  it('returns what REMAINS, not the whole year', () => {
    const wk1 = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 1 })
    const wk10 = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 10 })
    expect(wk1.p.pointsRos).toBeCloseTo(170, 5)
    expect(wk10.p.pointsRos).toBeCloseTo((170 / SEASON_GAMES) * 8, 5)
    expect(wk10.p.pointsRos).toBeLessThan(wk1.p.pointsRos)
  })

  it('never multiplies by zero at the end of the season', () => {
    const out = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 25 })
    expect(out.p.pointsRos).toBeGreaterThan(0)
  })

  /*
   * Absent is not a zero-point game. A player the stats feed has not filed keeps the prior
   * outright — burying him would be a verdict drawn from our own missing data.
   */
  it('keeps the forecast for a player with no lines at all', () => {
    const out = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 3 })
    expect(out.p.gamesPlayed).toBe(0)
    expect(out.p.perGame).toBeCloseTo(10, 5)
  })

  it('counts games and points per player', () => {
    const o = observedFromLines([line('a', 1, 10), line('a', 2, 20), line('b', 1, 5)])
    expect(o.a).toEqual({ points: 30, games: 2 })
    expect(o.b).toEqual({ points: 5, games: 1 })
  })
})
