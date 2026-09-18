import { describe, it, expect } from 'vitest'
import { buildHockeyVor, poolForPosition, expandSlots } from '../hockeyVor'
import { canonicalPosition } from '@/trades/rosterSlots'

/* Your real league: 9 forward seats, 5 defence, 2 goal, 1 utility. */
const SLOTS = { F: 9, D: 5, G: 2, UTIL: 1 }

describe('why hockey needs its own VOR', () => {
  /*
   * The reason this file exists, pinned so nobody reuses the football engine by mistake.
   * Football's canonicalPosition maps D to DEF because there D means a team defence. Routed
   * through it, every defenceman becomes a football defence, gets measured against a DEF slot
   * no hockey league has, and ends up with a replacement level of zero — ranking as free.
   */
  it('proves the football normaliser would destroy defencemen', () => {
    expect(canonicalPosition('D')).toBe('DEF')
    expect(canonicalPosition('D')).not.toBe('D')
  })

  it('keeps a defenceman a defenceman', () => {
    const v = buildHockeyVor({
      points: { d1: 100 }, positionByKey: { d1: 'D' }, slots: SLOTS, teams: 8,
    })
    expect(v.d1.position).toBe('D')
    expect(v.d1.pool).toBe('D')
  })
})

describe('which pool a player competes in', () => {
  /* A forward never reaches the lineup through a C slot in this league — there isn't one.
     Measuring him against other centres would invent a scarcity the lineup does not have. */
  it('measures forwards against forwards when the league starts F, not C/LW/RW', () => {
    expect(poolForPosition('C', SLOTS)).toBe('F')
    expect(poolForPosition('LW', SLOTS)).toBe('F')
    expect(poolForPosition('RW', SLOTS)).toBe('F')
  })

  it('respects strict positional slots when a league actually uses them', () => {
    const strict = { C: 2, LW: 2, RW: 2, D: 4, G: 2 }
    expect(poolForPosition('C', strict)).toBe('C')
    expect(poolForPosition('LW', strict)).toBe('LW')
  })

  /* Goalies share no slot with anyone, so they fall out in their own pool with no special
     case. Stated because it is the one position where being right is a property of the data
     rather than a rule written down. */
  it('measures goalies only against goalies', () => {
    expect(poolForPosition('G', SLOTS)).toBe('G')
    expect(poolForPosition('G', { F: 9, UTIL: 3 })).toBe('G')
  })
})

describe('folding the utility slot', () => {
  /* One UTIL opening left standing alone is a one-deep position, which sets its replacement
     level off the single best player alive. It is a tenth forward seat in practice. */
  it('shares UTIL across the pools that can fill it rather than leaving it alone', () => {
    const out = expandSlots(SLOTS)
    expect(out.UTIL).toBeUndefined()
    expect(out.F).toBeGreaterThan(9)
    expect(out.D).toBeGreaterThan(5)
    expect(out.G).toBe(2)          // goalies cannot fill it
  })

  it('keeps the total number of seats honest', () => {
    const out = expandSlots(SLOTS)
    const total = Object.values(out).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(17, 5)   // 9 + 5 + 2 + 1
  })

  it('leaves UTIL standing when nothing else can fill it', () => {
    expect(expandSlots({ UTIL: 3 })).toEqual({ UTIL: 3 })
  })

  it('drops empty slots', () => {
    expect(expandSlots({ F: 9, C: 0, LW: 0 })).toEqual({ F: 9 })
  })
})

describe('value over replacement', () => {
  const mk = (n: number, pos: string, base: number) =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [`${pos}${i}`, base - i]))

  it('prices a player against the last startable man in his pool', () => {
    const points = { ...mk(100, 'f', 200), ...mk(60, 'd', 120), ...mk(30, 'g', 150) }
    const positionByKey = Object.fromEntries(Object.keys(points).map((k) => [
      k, k.startsWith('f') ? 'C' : k.startsWith('d') ? 'D' : 'G',
    ]))
    const v = buildHockeyVor({ points, positionByKey, slots: SLOTS, teams: 8 })
    // The best forward is worth more over replacement than the 50th.
    expect(v.f0.vor).toBeGreaterThan(v.f49.vor)
    // A goalie is measured against goalies, so his edge reflects goalie scarcity, not skaters'.
    expect(v.g0.pool).toBe('G')
    expect(v.g0.vor).toBeGreaterThan(0)
  })

  it('skips players with no position or no points rather than valuing them at zero', () => {
    const v = buildHockeyVor({
      points: { a: 100, b: 50 }, positionByKey: { a: 'C' }, slots: SLOTS, teams: 8,
    })
    expect(v.a).toBeDefined()
    expect(v.b).toBeUndefined()
  })
})
