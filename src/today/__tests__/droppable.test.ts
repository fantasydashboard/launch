import { describe, it, expect } from 'vitest'
import { cheapestDroppable, addIsWorthTheCut } from '../droppable'
import { availability } from '@/composables/useDailyLineup'

const p = (name: string, seasonValue: number, status = '') =>
  ({ playerKey: name, name, seasonValue, status })

describe('cheapestDroppable', () => {
  it('names the least valuable body over the rest of the season', () => {
    const got = cheapestDroppable([p('Star', 90), p('Filler', 3), p('Useful', 40)], { availability })
    expect(got?.name).toBe('Filler')
  })

  /*
   * THE REGRESSION. The cut was ranked on TONIGHT's score, so a star whose categories happened
   * not to match the week came back as the cheapest man on the bench — and three separate
   * streaming adds each proposed cutting him for about three points of one evening.
   */
  it('does not offer a star just because tonight does not suit him', () => {
    const bench = [p('Brayden Point', 95), p('Fourth Liner', 8)]
    expect(cheapestDroppable(bench, { availability })?.name).toBe('Fourth Liner')
  })

  /* A man on IL is a stashed asset, not a cut — and he is frequently the lowest number here. */
  it('never offers an injured man as the cost of an add', () => {
    const bench = [p('Injured Star', 1, 'IR'), p('Replaceable', 12)]
    expect(cheapestDroppable(bench, { availability })?.name).toBe('Replaceable')
  })

  it('has nobody to name on an empty bench', () => {
    expect(cheapestDroppable([], { availability })).toBeNull()
  })

  it('has nobody to name when every bench body is out', () => {
    expect(cheapestDroppable([p('A', 5, 'IR'), p('B', 2, 'OUT')], { availability })).toBeNull()
  })

  /* Day-to-day is playable, so he stays a candidate like anyone else. */
  it('still considers a day-to-day man', () => {
    expect(cheapestDroppable([p('DTD', 2, 'DTD'), p('Fit', 30)], { availability })?.name).toBe('DTD')
  })
})

describe('addIsWorthTheCut', () => {
  it('allows an add that is worth more than the man it costs', () => {
    expect(addIsWorthTheCut(40, { seasonValue: 10 })).toBe(true)
  })

  /* The asymmetry the panel's layout hides: a bold one-night gain against a permanent loss. */
  it('refuses an add that costs someone better than himself', () => {
    expect(addIsWorthTheCut(10, { seasonValue: 95 })).toBe(false)
  })

  it('refuses a dead-level swap, which is churn for nothing', () => {
    expect(addIsWorthTheCut(20, { seasonValue: 20 })).toBe(false)
  })

  /* With nobody to cut the roster has room, so the cost is a spot rather than a player. */
  it('allows the add when there is nobody to cut', () => {
    expect(addIsWorthTheCut(1, null)).toBe(true)
  })
})
