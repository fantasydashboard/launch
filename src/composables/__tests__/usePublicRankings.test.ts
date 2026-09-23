import { describe, it, expect } from 'vitest'
import { publicWeeksLeft } from '../usePublicRankings'

/*
 * Tier width is stated in points per WEEK, so the horizon converts a rest-of-season value
 * into it. A wrong horizon silently produces plausible, wrong tiers — which is why this is a
 * named function with its own tests rather than an expression inside a component.
 */
describe('publicWeeksLeft', () => {
  it('counts the current week as still to play', () => {
    expect(publicWeeksLeft(1)).toBe(17)
    expect(publicWeeksLeft(3)).toBe(15)
  })

  it('is one on the last week of the regular season', () => {
    expect(publicWeeksLeft(17)).toBe(1)
  })

  /* Past the regular season the horizon floors at one rather than going to zero or negative
     — a zero would divide the tier rule by nothing and a negative would invert it. */
  it('never drops below one', () => {
    expect(publicWeeksLeft(18)).toBe(1)
    expect(publicWeeksLeft(30)).toBe(1)
  })

  /* Sleeper reports week 0 in the offseason. The whole season is still ahead then, so that
     is what the horizon says — not "one week left", which would draw tiers seventeen times
     too narrow and call half the league interchangeable. Garbage input reads the same way. */
  it('reads the offseason as a whole season ahead', () => {
    expect(publicWeeksLeft(0)).toBe(17)
    expect(publicWeeksLeft(-4)).toBe(17)
    expect(publicWeeksLeft(NaN)).toBe(17)
  })

  /* Preseason: Sleeper reports weeks under season_type 'pre', and loadPool maps those to 0
     so the horizon reads as a whole season rather than a fifth of one already gone. */
  it('treats the preseason sentinel as a whole season ahead', () => {
    expect(publicWeeksLeft(0)).toBe(17)
  })
})
