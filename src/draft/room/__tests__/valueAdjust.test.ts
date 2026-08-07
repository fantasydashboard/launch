import { describe, it, expect } from 'vitest'
import { applyAdpAnchor, DEFAULT_ADP_WEIGHT } from '../valueAdjust'

describe('applyAdpAnchor', () => {
  const players = [
    { playerKey: 'a', value: 300 },
    { playerKey: 'b', value: 200 },
    { playerKey: 'c', value: 100 },
  ]

  it('leaves values untouched at zero weight', () => {
    const v = applyAdpAnchor(players, { a: 1, b: 2, c: 3 }, 0)
    expect(v).toEqual({ a: 300, b: 200, c: 100 })
  })

  it('pulls a player the market likes upward, and only partway', () => {
    // Market order: c, b, a. Implied values 300, 200, 100.
    const v = applyAdpAnchor(players, { c: 1, b: 2, a: 3 }, 0.25)
    expect(v.c).toBeCloseTo(0.75 * 100 + 0.25 * 300) // 150
    expect(v.c).toBeGreaterThan(100)
    expect(v.c).toBeLessThan(300) // an anchor, not a replacement
  })

  it('at full weight it adopts the market ordering outright', () => {
    const v = applyAdpAnchor(players, { c: 1, b: 2, a: 3 }, 1)
    expect(v.c).toBe(300)
    expect(v.a).toBe(100)
  })

  it('agreeing with the market changes nothing', () => {
    const v = applyAdpAnchor(players, { a: 1, b: 2, c: 3 }, 0.25)
    expect(v).toEqual({ a: 300, b: 200, c: 100 })
  })

  it('a player with no ADP keeps his own value', () => {
    const v = applyAdpAnchor(players, { a: 1, b: 2 }, 0.25)
    expect(v.c).toBe(100)
  })

  it('defaults to a light anchor', () => {
    expect(DEFAULT_ADP_WEIGHT).toBeLessThanOrEqual(0.25)
    expect(DEFAULT_ADP_WEIGHT).toBeGreaterThan(0)
  })

  it('handles an empty pool and clamps a nonsense weight', () => {
    expect(applyAdpAnchor([], { a: 1 })).toEqual({})
    const v = applyAdpAnchor(players, { c: 1, b: 2, a: 3 }, 99)
    expect(v.c).toBe(300)
  })
})
