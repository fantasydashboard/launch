import { describe, it, expect } from 'vitest'
import {
  dailySigma, ratioSigma, DISPERSION, dispersionFor,
} from '../categorySigma'

/**
 * The old table gave every hockey and basketball column a standard deviation of five, because
 * it is keyed by BASEBALL stat ids and everything else fell through the default. Five goals of
 * daily noise makes every column a coin flip, which is why both category boards print a win
 * chance they cannot justify.
 */

describe('dailySigma — counting columns', () => {
  /*
   * A player-day in a counting column is a count of discrete events, so its variance is about
   * its mean. A roster-day is a sum of independent player-days, so the team's variance is the
   * team's expected total. That makes the spread DERIVED from the projection rather than
   * guessed, and it moves with the roster: ten skaters playing tonight carry more noise than
   * three, which a fixed constant can never express.
   */
  it('is the root of what the roster is expected to produce', () => {
    expect(dailySigma(4, 'G')).toBeCloseTo(Math.sqrt(4 * DISPERSION.G), 9)
  })

  it('grows with the slate, but slower than the total does', () => {
    const light = dailySigma(2, 'G')
    const heavy = dailySigma(8, 'G')
    expect(heavy).toBeGreaterThan(light)
    expect(heavy).toBeLessThan(light * 4)
  })

  it('is zero when the roster is expected to produce nothing', () => {
    expect(dailySigma(0, 'G')).toBe(0)
  })

  it('never returns NaN on junk input', () => {
    expect(dailySigma(NaN, 'G')).toBe(0)
    expect(dailySigma(-5, 'G')).toBe(0)
  })

  /* Shots and hits cluster by role and ice time, so they spread wider than a pure count. */
  it('spreads role-driven columns wider than pure counts', () => {
    expect(dispersionFor('SOG')).toBeGreaterThan(dispersionFor('G'))
    expect(dispersionFor('HITS')).toBeGreaterThan(dispersionFor('G'))
  })

  it('falls back to a pure count for a column it has no entry for', () => {
    expect(dispersionFor('SOMETHING_NEW')).toBe(1)
  })
})

describe('dailySigma — plus/minus is not a count', () => {
  /*
   * Plus/minus is a DIFFERENCE of two counts, not a count: it is centred near zero and can go
   * negative, so its spread has nothing to do with its mean. Treating it as Poisson would hand
   * a team hovering at zero a spread of zero and call the column decided.
   */
  it('does not collapse when the expected total is zero', () => {
    expect(dailySigma(0, 'PLUSMINUS')).toBeGreaterThan(0)
  })

  it('scales with how many skaters are playing, not with the total', () => {
    expect(dailySigma(0, 'PLUSMINUS', 10)).toBeGreaterThan(dailySigma(0, 'PLUSMINUS', 3))
  })
})

describe('ratioSigma', () => {
  /*
   * A ratio's spread comes from the volume underneath it, not from its own size. A save
   * percentage over four hundred shots is far steadier than the same number over forty, and a
   * model that cannot tell them apart will call a column safe that is not.
   */
  it('tightens as the volume behind it grows', () => {
    expect(ratioSigma(0.91, 400)).toBeLessThan(ratioSigma(0.91, 40))
  })

  it('is widest at a coin-flip rate', () => {
    expect(ratioSigma(0.5, 100)).toBeGreaterThan(ratioSigma(0.95, 100))
  })

  it('refuses to divide by nothing', () => {
    expect(ratioSigma(0.91, 0)).toBe(0)
    expect(ratioSigma(0.91, NaN)).toBe(0)
  })

  /* GAA and ERA are rates per unit of time, not proportions — a rate per sixty minutes over a
     handful of starts is noisy, and the spread is the root of the rate over the exposure. */
  it('handles a rate above one, like goals against average', () => {
    const few = ratioSigma(2.8, 4, 'rate')
    const many = ratioSigma(2.8, 40, 'rate')
    expect(few).toBeGreaterThan(many)
    expect(many).toBeGreaterThan(0)
  })
})

describe('ratioSigma — the part already in the book cannot move', () => {
  /*
   * A ratio's final value is (locked + future) / (locked + future). Only the future half is
   * uncertain, and the locked half DILUTES it: four hundred shots already faced means tonight's
   * thirty can barely shift the number, while on Monday with nothing banked those same thirty
   * are the whole column.
   *
   * Reading the remaining volume as if it were the entire season overstates the swing, which on
   * a save-percentage column means calling a banked column live and streaming a goalie for it
   * all week.
   */
  it('tightens as more of the week is already banked', () => {
    const monday = ratioSigma(0.91, 120, 'proportion', 0)
    const friday = ratioSigma(0.91, 30, 'proportion', 400)
    expect(friday).toBeLessThan(monday)
  })

  it('matches the all-ahead case when nothing is banked', () => {
    expect(ratioSigma(0.91, 120, 'proportion', 0))
      .toBeCloseTo(Math.sqrt(0.91 * 0.09 / 120), 9)
  })

  it('goes to nothing once there is no volume left to come', () => {
    expect(ratioSigma(0.91, 0, 'proportion', 400)).toBe(0)
  })

  it('dilutes a rate column the same way', () => {
    const early = ratioSigma(2.8, 6, 'rate', 0)
    const late = ratioSigma(2.8, 1, 'rate', 20)
    expect(late).toBeLessThan(early)
  })
})
