import { describe, it, expect } from 'vitest'
import { expectedGamesMissed, consecutiveMissed } from '@/football/availability'

describe('expectedGamesMissed', () => {
  it('charges a healthy player nothing', () => {
    expect(expectedGamesMissed(null, 0, 14)).toBe(0)
    expect(expectedGamesMissed('ACTIVE', 0, 14)).toBe(0)
  })

  /* The bug this file exists for: a man on IR carried a full season of games. */
  it('keeps an IR player down at least the four games the rule requires', () => {
    expect(expectedGamesMissed('IR', 0, 14)).toBeGreaterThanOrEqual(4)
  })

  it('shortens the IR charge as the stint is served', () => {
    const fresh = expectedGamesMissed('IR', 0, 14)
    const served = expectedGamesMissed('IR', 3, 14)
    expect(served).toBeLessThan(fresh)
    /* But never to nothing — three weeks in is not nearly back. */
    expect(served).toBeGreaterThan(1)
  })

  /* The objection that shaped the design: Out is a WEEKLY flag, not a duration. */
  it('charges Out about two and a third games, not one', () => {
    const cost = expectedGamesMissed('OUT', 0, 14)
    expect(cost).toBeGreaterThan(2)
    expect(cost).toBeLessThan(3.5)
  })

  it('charges Out MORE once he has already missed some', () => {
    expect(expectedGamesMissed('OUT', 2, 14)).toBeGreaterThan(expectedGamesMissed('OUT', 0, 14))
  })

  it('barely touches a Questionable, who usually plays', () => {
    expect(expectedGamesMissed('QUESTIONABLE', 0, 14)).toBeLessThan(0.5)
  })

  /* The status field misses people. The log does not. */
  it('believes an absence streak even with no designation', () => {
    expect(expectedGamesMissed(null, 3, 14)).toBeGreaterThan(1)
  })

  /* Never project more missed games than there are games left, or the rate goes negative. */
  it('cannot charge more games than remain', () => {
    expect(expectedGamesMissed('IR', 0, 2)).toBeLessThanOrEqual(2)
    expect(expectedGamesMissed('OUT', 0, 1)).toBeLessThanOrEqual(1)
    expect(expectedGamesMissed('IR', 0, 0)).toBe(0)
  })
})

describe('consecutiveMissed', () => {
  it('counts only the streak running up to now', () => {
    /* Missed 2 and 3, played 4 and 5 — he is available, and charging him for a healed injury
       is the opposite of the error this fixes. */
    expect(consecutiveMissed([1, 4, 5], 6)).toBe(0)
  })

  it('counts a live streak', () => {
    expect(consecutiveMissed([1, 2, 3], 6)).toBe(2)
  })

  it('does not count a bye as a missed game', () => {
    expect(consecutiveMissed([1, 2, 3], 6, 5)).toBe(1)
    expect(consecutiveMissed([1, 2, 3, 4], 6, 5)).toBe(0)
  })

  it('is zero for a player with no games at all rather than the whole season', () => {
    expect(consecutiveMissed([], 8)).toBe(0)
  })
})
