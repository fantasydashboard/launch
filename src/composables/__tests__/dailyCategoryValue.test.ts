import { describe, it, expect } from 'vitest'
import { gamesFor, shiftToNonNegative } from '@/composables/useDailyCategoryValue'
import type { FGProjection } from '@/services/projectionService'

/**
 * The two claims the daily category engine rests on. Both have a wrong answer that looks
 * completely reasonable, which is why they are pinned here rather than trusted.
 */

describe('shiftToNonNegative', () => {
  it('lifts the worst player to exactly zero', () => {
    const out = shiftToNonNegative(new Map([['a', 0.4], ['b', -1.2], ['c', 0.1]]))
    expect(out.get('b')).toBeCloseTo(0)
    expect(out.get('a')).toBeCloseTo(1.6)
    expect(out.get('c')).toBeCloseTo(1.3)
  })

  it('preserves every ordering, which is the entire content of a category ranking', () => {
    const before = new Map([['a', -2.5], ['b', 0.75], ['c', -0.5], ['d', 3]])
    const after = shiftToNonNegative(before)
    const order = (m: Map<string, number>) =>
      [...m.entries()].sort((x, y) => y[1] - x[1]).map(([k]) => k)
    expect(order(after)).toEqual(order(before))
  })

  it('never returns a negative, so no starter loses his seat to an empty one', () => {
    const out = shiftToNonNegative(new Map([['a', -9], ['b', -3], ['c', -0.01]]))
    for (const v of out.values()) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('leaves an all-positive pool alone rather than inventing a shift', () => {
    const before = new Map([['a', 1], ['b', 5]])
    expect([...shiftToNonNegative(before)]).toEqual([...before])
  })

  /*
   * The empty case is the one a real season hits first: on the morning the projection
   * universe has not loaded, `contributions` is empty and this runs over nothing.
   */
  it('survives an empty pool', () => {
    expect(shiftToNonNegative(new Map()).size).toBe(0)
  })

  /* A player absent from the input must stay absent. Defaulting him to the shifted floor
     would place an unrankable player level with the worst rankable one. */
  it('does not invent entries', () => {
    const out = shiftToNonNegative(new Map([['a', -1]]))
    expect(out.has('ghost')).toBe(false)
  })
})

describe('gamesFor', () => {
  /*
   * ABSENT IS NOT ONE. A player we could not match has an unknown schedule; dividing his
   * season value by a default of one game would rocket him to the top of tonight's board —
   * the loudest possible answer drawn from the least information.
   */
  it('returns zero for a player with no projection', () => {
    expect(gamesFor(null)).toBe(0)
    expect(gamesFor(undefined)).toBe(0)
  })

  it('returns zero rather than a fraction when the projection has no games', () => {
    expect(gamesFor({ player_type: 'batter' } as unknown as FGProjection)).toBe(0)
  })

  it('reads a hitter in games and a starter in starts', () => {
    const hitter = gamesFor({ player_type: 'batter', g: 150, pa: 600 } as unknown as FGProjection)
    const pitcher = gamesFor({ player_type: 'pitcher', gs: 30, gp: 30, ip: 180 } as unknown as FGProjection)
    expect(hitter).toBeGreaterThan(100)
    /* The split is the whole reason per-game exists: ranked on season value every starter
       outranks every hitter, which is how the top forty once came back forty pitchers. */
    expect(pitcher).toBeLessThan(hitter)
    expect(pitcher).toBeGreaterThan(0)
  })
})
