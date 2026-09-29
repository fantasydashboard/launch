import { describe, it, expect } from 'vitest'
import { isDailySport, DAILY_SPORTS } from '../dailySports'

describe('isDailySport', () => {
  it('serves baseball', () => expect(isDailySport('baseball')).toBe(true))

  /*
   * HOCKEY, which is the whole point. Today was gated on a baseball-only predicate in one of its
   * two platform loaders, and a Yahoo hockey league therefore waited forever on a roster fetch
   * that was switched off. Every loader now asks this one question.
   */
  it('serves hockey', () => expect(isDailySport('hockey')).toBe(true))

  it('does not serve football, which is weekly and has its own surface', () =>
    expect(isDailySport('football')).toBe(false))

  it('does not serve basketball until its data is wired, whatever the schedule looks like', () =>
    expect(isDailySport('basketball')).toBe(false))

  it('treats a missing sport as not daily rather than throwing', () => {
    expect(isDailySport(null)).toBe(false)
    expect(isDailySport(undefined)).toBe(false)
    expect(isDailySport('')).toBe(false)
  })

  /* The set is the contract every platform loader shares; if one grows a private copy, this is
     the test that should have to change too. */
  it('exposes exactly the sports it serves', () =>
    expect([...DAILY_SPORTS].sort()).toEqual(['baseball', 'hockey']))
})
