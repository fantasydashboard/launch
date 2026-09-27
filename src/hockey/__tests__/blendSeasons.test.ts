import { describe, it, expect } from 'vitest'
import { blendSeasons, trendMultiplier, PRIOR_WEIGHTS, TREND_CAP, MIN_TREND_GAMES } from '../blendSeasons'

const row = (playerId: number, gamesPlayed: number, points: number, over: any = {}) =>
  ({ playerId, gamesPlayed, points, goals: 0, assists: 0, plusMinus: 0, penaltyMinutes: 0,
     ppPoints: 0, shots: 0, hits: 0, blockedShots: 0, ppGoals: 0, shGoals: 0, shPoints: 0,
     skaterFullName: 'P' + playerId, positionCode: 'C', ...over })

const rate = (r: any) => r.points / r.gamesPlayed

describe('blendSeasons', () => {
  it('weights the recent season most', () => {
    /* 1.00/gp now, 0.50/gp before. With 6/3 the answer must sit nearer 1.00 than the midpoint. */
    const [p] = blendSeasons([[row(1, 82, 82)], [row(1, 82, 41)]], [6, 3], { trend: false })
    expect(rate(p)).toBeCloseTo((82 * 6 + 41 * 3) / (82 * 6 + 82 * 3), 6)
    expect(rate(p)).toBeGreaterThan(0.75)
  })

  /*
   * THE BUG THIS EXISTS TO FIX. A star who missed a third of a season was rated at that
   * season's depressed rate and buried. The blend must pull him back toward his own history.
   */
  it('lifts a star who had an injured, down year', () => {
    const down = row(1, 60, 53)       // 0.88/gp
    const good = row(1, 67, 78)       // 1.16/gp
    const [p] = blendSeasons([[down], [good]], [6, 4], { trend: false })
    expect(rate(p)).toBeGreaterThan(rate(down))
    expect(rate(p)).toBeLessThan(rate(good))
  })

  /*
   * ...and must NOT undo a genuine breakout, which is exactly what a flat average does. The
   * most recent season stays dominant, so a riser keeps most of his gain.
   */
  it('leaves a riser nearer his new level than his old one', () => {
    const now = row(1, 69, 75)        // 1.09/gp — the breakout
    const before = row(1, 82, 67)     // 0.82/gp — what he was
    const [p] = blendSeasons([[now], [before]], PRIOR_WEIGHTS)

    /* Above a flat average, which is the thing that would erase the breakout outright. */
    expect(rate(p)).toBeGreaterThan((75 + 67) / (69 + 82))
    /* Still regressed — the point is to regress, not to take the latest season at face value. */
    expect(rate(p)).toBeLessThan(rate(now))
    /* And landing nearer the new level than the old one. That asymmetry IS "recent season
       dominant", and it is the whole difference between this and a mean. */
    expect(Math.abs(rate(p) - rate(now))).toBeLessThan(Math.abs(rate(p) - rate(before)))
  })

  /*
   * A rookie has one season and must be rated on it. Contributing zeros for seasons he could
   * not have played would halve his rate and bury every first-year player on the board.
   */
  it('does not dilute a player who only appears in one season', () => {
    const [p] = blendSeasons([[row(1, 82, 82)], [row(2, 82, 20)]], [6, 3], { trend: false })
    expect(rate(p)).toBeCloseTo(1.0, 6)
  })

  it('is a ratio of sums, not a mean of ratios', () => {
    /* 2 points in 2 games is not worth the same as 41 in 82, and averaging rates says it is. */
    const [p] = blendSeasons([[row(1, 2, 2)], [row(1, 82, 41)]], [1, 1], { trend: false })
    expect(rate(p)).toBeCloseTo(43 / 84, 6)
    expect(rate(p)).toBeLessThan(0.75)
  })

  it('takes identity from the most recent season naming the player', () => {
    const [p] = blendSeasons(
      [[row(1, 10, 5, { skaterFullName: 'New Team', positionCode: 'D' })],
       [row(1, 82, 41, { skaterFullName: 'Old Team', positionCode: 'C' })]], [6, 3], { trend: false })
    expect(p.skaterFullName).toBe('New Team')
    expect(p.positionCode).toBe('D')
  })

  it('ignores seasons with no weight, and survives empties', () => {
    const [p] = blendSeasons([[row(1, 82, 82)], [row(1, 82, 0)]], [1, 0], { trend: false })
    expect(rate(p)).toBeCloseTo(1.0, 6)
    expect(blendSeasons([], [6, 3])).toEqual([])
    expect(blendSeasons([[]], [6])).toEqual([])
  })
})

/* Off by default — measured and declined, see blendSeasons.ts. These cover the behaviour it
   has when switched on, so the negative result stays reproducible rather than becoming folklore. */
describe('the trajectory term (opt-in)', () => {
  /*
   * Regression assumes the level is stable and the sample is noisy. For a developing player
   * that is wrong in a specific way — his level IS moving, so his older seasons describe a
   * different, younger player. This is the half that keeps a breakout.
   */
  it('lets a rising player keep more of his recent season', () => {
    const now = row(1, 69, 75)        // 1.09/gp
    const before = row(1, 82, 67)     // 0.82/gp
    const plain = blendSeasons([[now], [before]], PRIOR_WEIGHTS, { trend: false })[0]
    const boosted = blendSeasons([[now], [before]], PRIOR_WEIGHTS, { trend: true })[0]
    expect(rate(boosted)).toBeGreaterThan(rate(plain))
    expect(rate(boosted)).toBeLessThan(rate(now))   // still regressed, just less
  })

  it('does nothing to a flat or declining player', () => {
    const flat = [[row(1, 82, 82)], [row(1, 82, 82)]]
    expect(rate(blendSeasons(flat, PRIOR_WEIGHTS, { trend: true })[0]))
      .toBeCloseTo(rate(blendSeasons(flat, PRIOR_WEIGHTS, { trend: false })[0]), 9)
    const falling = [[row(1, 82, 50)], [row(1, 82, 82)]]
    expect(trendMultiplier(falling[0][0], [falling[1][0]])).toBe(1)
  })

  /*
   * THE FAILURE MODE THIS MUST NOT HAVE. A hot twenty-game run is precisely what regression
   * exists to discount; boosting it would turn this into a machine for chasing luck upward.
   */
  it('refuses to boost a small sample', () => {
    const hot = row(1, MIN_TREND_GAMES - 1, 40)     // blistering, and meaningless
    expect(trendMultiplier(hot, [row(1, 82, 41)])).toBe(1)
  })

  it('refuses to boost when there is nothing credible to rise from', () => {
    expect(trendMultiplier(row(1, 82, 82), [row(1, 10, 2)])).toBe(1)
    expect(trendMultiplier(row(1, 82, 82), [])).toBe(1)
  })

  it('is capped, so one freak season cannot take over', () => {
    const absurd = trendMultiplier(row(1, 82, 150), [row(1, 82, 20)])
    expect(absurd).toBe(TREND_CAP)
  })

  it('scales with how far the player actually rose', () => {
    const small = trendMultiplier(row(1, 82, 90), [row(1, 82, 82)])
    const large = trendMultiplier(row(1, 82, 110), [row(1, 82, 82)])
    expect(large).toBeGreaterThan(small)
    expect(small).toBeGreaterThan(1)
  })
})
