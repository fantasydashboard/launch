import { describe, it, expect } from 'vitest'
import { seasonHorizon, gamesLeftFromWeeks, NHL_SEASON_WEEKS } from '../seasonHorizon'

/**
 * This rule lived inside useHockeyValue, so only the surfaces built on it had a horizon. The
 * /rankings board computed its own values with no gamesPlayed and no gamesLeft — a FULL-SEASON
 * total under a heading reading "REST OF SEASON". In preseason the two agree and nothing looks
 * wrong; in January the same league's two pages disagree about what a player is worth.
 */
const proj = (position: string, stats: Record<string, number>) =>
  ({ playerKey: 'k', position, stats } as any)

describe('gamesLeftFromWeeks', () => {
  it('gives a full slate before the season starts', () => {
    expect(gamesLeftFromWeeks(NHL_SEASON_WEEKS)).toBe(82)
  })

  it('gives half a slate at the midpoint', () => {
    expect(gamesLeftFromWeeks(NHL_SEASON_WEEKS / 2)).toBe(41)
  })

  it('never goes negative or past a full season', () => {
    expect(gamesLeftFromWeeks(-5)).toBe(0)
    expect(gamesLeftFromWeeks(999)).toBe(82)
  })
})

describe('seasonHorizon', () => {
  it('subtracts nothing in preseason, because nothing has been used', () => {
    const h = seasonHorizon({
      weeksLeft: NHL_SEASON_WEEKS,
      projections: { a: proj('C', { GP: 82 }) },
      rateByKey: { a: { gamesPlayed: 0 } as any },
    })
    expect(h.gamesLeft).toBe(82)
    /* Empty, not a map of zeroes — "not started" and "measured at zero" are different. */
    expect(h.gamesPlayed).toEqual({})
  })

  it('uses the rate model’s real games for a skater mid-season', () => {
    const h = seasonHorizon({
      weeksLeft: NHL_SEASON_WEEKS / 2,
      projections: { a: proj('C', { GP: 82 }) },
      rateByKey: { a: { gamesPlayed: 39 } as any },
    })
    expect(h.gamesPlayed.a).toBe(39)
  })

  it('estimates a goalie from the calendar, because no goalie rate model exists', () => {
    const h = seasonHorizon({
      weeksLeft: NHL_SEASON_WEEKS / 2,
      projections: { g: proj('G', { DEC: 60 }) },
      rateByKey: {},
    })
    /* Half the season gone, so half his projected decisions. */
    expect(h.gamesPlayed.g).toBeCloseTo(30, 0)
  })

  it('falls back to appearances for a goalie with no record projected', () => {
    const h = seasonHorizon({
      weeksLeft: NHL_SEASON_WEEKS / 2,
      projections: { g: proj('G', { GP: 50 }) },
      rateByKey: {},
    })
    expect(h.gamesPlayed.g).toBeCloseTo(25, 0)
  })
})
