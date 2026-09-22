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

/*
 * A rest-of-season total is per-game production times the games he actually PLAYS, and a team
 * on bye does not play. Multiplying by the weeks left instead credited every player with a
 * game he will spend on his couch — about 7% too much in September, and unevenly wrong from
 * week five onward, when some byes have gone and others have not. Two players of identical
 * quality are not worth the same if one of them still owes you a week off.
 */
describe('the bye is not a game he plays', () => {
  it('drops a game for a player whose bye is still ahead', () => {
    const withBye = buildRosPoints({
      seasonProjection: { p: 170 }, lines: [], currentWeek: 3, byeWeekByKey: { p: 9 },
    })
    const without = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 3 })
    expect(withBye.gamesRemaining).toBeUndefined() // shape check: per-player, not global
    expect(withBye.p.gamesRemaining).toBe(without.p.gamesRemaining - 1)
    expect(withBye.p.pointsRos).toBeCloseTo(without.p.pointsRos * (14 / 15), 5)
  })

  it('leaves a player whose bye has already gone alone', () => {
    const gone = buildRosPoints({
      seasonProjection: { p: 170 }, lines: [], currentWeek: 10, byeWeekByKey: { p: 6 },
    })
    const plain = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 10 })
    expect(gone.p.pointsRos).toBeCloseTo(plain.p.pointsRos, 5)
  })

  /* The bye happening THIS week is still ahead of him — he has not played it yet. */
  it('counts a bye in the current week as still to come', () => {
    const out = buildRosPoints({
      seasonProjection: { p: 170 }, lines: [], currentWeek: 6, byeWeekByKey: { p: 6 },
    })
    const plain = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 6 })
    expect(out.p.gamesRemaining).toBe(plain.p.gamesRemaining - 1)
  })

  /* Missing bye data must behave exactly as before — never invent a bye we cannot see. */
  it('is unchanged for a player with no bye on file', () => {
    const out = buildRosPoints({
      seasonProjection: { p: 170 }, lines: [], currentWeek: 3, byeWeekByKey: { other: 9 },
    })
    const plain = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 3 })
    expect(out.p.pointsRos).toBeCloseTo(plain.p.pointsRos, 5)
  })

  it('never subtracts its way to zero games at the end of the season', () => {
    const out = buildRosPoints({
      seasonProjection: { p: 170 }, lines: [], currentWeek: 25, byeWeekByKey: { p: 25 },
    })
    expect(out.p.gamesRemaining).toBeGreaterThanOrEqual(1)
    expect(out.p.pointsRos).toBeGreaterThan(0)
  })
})

/*
 * How much a two-game sample should count is not one number for everybody.
 *
 * Measured against a trusted analyst's week-3 2026 board, our ranks tracked season-to-date
 * scoring harder than theirs at every position, and hugely so at the two where a two-game
 * sample is mostly touchdown variance: at tight end we correlated 0.73 to their 0.16, at
 * quarterback 0.70 to their 0.32. Their implied prior weight was around 8-9 games at running
 * back and receiver — near ours — but roughly 18 at quarterback and 20 at tight end.
 *
 * So the weight has to be settable per player, which is how a caller makes it per position.
 * rosBlend itself has no idea what position anybody plays, and should not learn.
 */
describe('how much the prior is worth can vary by player', () => {
  const lines = [line('sticky', 1, 40), line('loose', 1, 40)]
  const proj = { sticky: 170, loose: 170 }   // both forecast at 10 a game

  it('moves a player with a heavier prior less', () => {
    const out = buildRosPoints({
      seasonProjection: proj, lines, currentWeek: 2,
      priorGamesByKey: { sticky: 20, loose: 3 },
    })
    expect(out.sticky.perGame).toBeCloseTo((10 * 20 + 40) / 21, 5)
    expect(out.loose.perGame).toBeCloseTo((10 * 3 + 40) / 4, 5)
    expect(out.sticky.perGame).toBeLessThan(out.loose.perGame)
  })

  it('falls back to the shipped weight for a player not in the map', () => {
    const out = buildRosPoints({
      seasonProjection: proj, lines, currentWeek: 2, priorGamesByKey: { sticky: 20 },
    })
    const plain = buildRosPoints({ seasonProjection: proj, lines, currentWeek: 2 })
    expect(out.loose.perGame).toBeCloseTo(plain.loose.perGame, 5)
  })

  /* Zero is a real setting — "trust only what he has done" — not a missing one. It was being
     swallowed by the same guard that rejects negatives, which silently turned the backtest's
     most production-chasing candidate into a duplicate of the shipped default. */
  it('treats a weight of zero as ignoring the forecast outright', () => {
    const out = buildRosPoints({
      seasonProjection: proj, lines, currentWeek: 2, priorGamesByKey: { sticky: 0 },
    })
    expect(out.sticky.perGame).toBeCloseTo(40, 5)
  })

  it('ignores a negative weight rather than inverting the blend', () => {
    const out = buildRosPoints({
      seasonProjection: proj, lines, currentWeek: 2, priorGamesByKey: { sticky: -4 },
    })
    const plain = buildRosPoints({ seasonProjection: proj, lines, currentWeek: 2 })
    expect(out.sticky.perGame).toBeCloseTo(plain.sticky.perGame, 5)
  })
})

/*
 * The prior was frozen in August and that is what made the board over-react.
 *
 * A preseason projection cannot learn that a role changed, so the ONLY thing able to move a
 * player was his last two box scores — which is why our ranks tracked season-to-date scoring
 * harder than a trusted analyst's at every position, worst at the two where two games is mostly
 * noise. Sleeper publishes a per-week projection that IS maintained: it already knows the depth
 * chart, the injury and the current role. Blending that rate in gives the board a second
 * opinion that updates without being a box score.
 *
 * Backtested on 2025 with no lookahead: +0.067 Spearman at receiver winning 12 of 13 weeks,
 * +0.039 at tight end, and noise at quarterback and back. A half-and-half blend is positive at
 * all four. See docs/ros-backtest-2025.md.
 */
describe('the upcoming week projection as a second opinion', () => {
  it('moves the rate halfway toward a forward projection', () => {
    const plain = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 3 })
    const out = buildRosPoints({
      seasonProjection: { p: 170 }, lines: [], currentWeek: 3, forwardRateByKey: { p: 20 },
    })
    // prior rate is 10/game; forward says 20; half and half is 15.
    expect(plain.p.perGame).toBeCloseTo(10, 5)
    expect(out.p.perGame).toBeCloseTo(15, 5)
  })

  it('leaves a player with no forward projection exactly as he was', () => {
    const plain = buildRosPoints({ seasonProjection: { p: 170, q: 170 }, lines: [], currentWeek: 3 })
    const out = buildRosPoints({
      seasonProjection: { p: 170, q: 170 }, lines: [], currentWeek: 3, forwardRateByKey: { p: 20 },
    })
    expect(out.q.perGame).toBeCloseTo(plain.q.perGame, 5)
  })

  /*
   * A zero is a BYE or an unprojected player, never a claim that he is worthless. Blending it
   * would halve the rest-of-season value of every player whose team is off next week, which is
   * the most confident possible wrong answer.
   */
  it('ignores a zero or negative forward projection', () => {
    const plain = buildRosPoints({ seasonProjection: { p: 170 }, lines: [], currentWeek: 3 })
    for (const bad of [0, -3]) {
      const out = buildRosPoints({
        seasonProjection: { p: 170 }, lines: [], currentWeek: 3, forwardRateByKey: { p: bad },
      })
      expect(out.p.perGame).toBeCloseTo(plain.p.perGame, 5)
    }
  })

  it('blends against the OBSERVED rate, not the untouched prior', () => {
    // Two games at 30 against a 10/game forecast pulls the blend up; the forward rate then
    // averages with THAT, not with the forecast it already replaced.
    const lines = [line('p', 1, 30), line('p', 2, 30)]
    const noFwd = buildRosPoints({ seasonProjection: { p: 170 }, lines, currentWeek: 3 })
    const out = buildRosPoints({
      seasonProjection: { p: 170 }, lines, currentWeek: 3, forwardRateByKey: { p: 10 },
    })
    expect(out.p.perGame).toBeCloseTo((noFwd.p.perGame + 10) / 2, 5)
  })
})
