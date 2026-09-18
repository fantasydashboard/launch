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

describe('scarcity moves as the draft goes', () => {
  /* Twenty forwards and twenty defencemen on a clean gradient, in a league starting two of
     each across two teams — four seats per pool, so a run is easy to see. */
  const points: Record<string, number> = {}
  const positionByKey: Record<string, string> = {}
  for (let i = 0; i < 20; i++) {
    points[`f${i}`] = 100 - i; positionByKey[`f${i}`] = 'C'
    points[`d${i}`] = 100 - i; positionByKey[`d${i}`] = 'D'
  }
  const SLOTS = { F: 2, D: 2 }
  const build = (drafted?: Set<string>) =>
    buildHockeyVor({ points, positionByKey, slots: SLOTS, teams: 2, drafted })

  const levelOf = (rows: ReturnType<typeof build>, pool: string) => {
    const r = Object.values(rows).find((x) => x.pool === pool)!
    return r.points - r.vor
  }

  it('leaves the levels alone when nothing has been taken', () => {
    const r = build()
    expect(levelOf(r, 'F')).toBe(levelOf(r, 'D'))
  })

  /*
   * THE POINT OF THE WHOLE FILE. Four forwards gone means four forward jobs are gone, so the
   * man who misses out is now shallower in what remains and the replacement level DROPS —
   * which makes the forwards still on the board worth more, because the alternative to them
   * got worse. A board that does not do this is a preseason ranking with rows hidden.
   */
  it('drops a position\'s replacement level when that position gets run', () => {
    const before = levelOf(build(), 'F')
    const after = levelOf(build(new Set(['f0', 'f1', 'f2', 'f3'])), 'F')
    expect(after).toBeLessThan(before)
  })

  it('leaves the other position alone when one gets run', () => {
    const before = levelOf(build(), 'D')
    const after = levelOf(build(new Set(['f0', 'f1', 'f2', 'f3'])), 'D')
    expect(after).toBe(before)
  })

  it('makes the survivors at a run position worth more', () => {
    const before = build().f10.vor
    const after = build(new Set(['f0', 'f1', 'f2', 'f3'])).f10.vor
    expect(after).toBeGreaterThan(before)
  })

  it('takes a drafted player off the board entirely', () => {
    const r = build(new Set(['f0']))
    expect(r.f0).toBeUndefined()
    expect(r.f1).toBeDefined()
  })

  /*
   * Past the point where every seat is spent, everyone left is a bench player. The index is
   * floored at one rather than nought so the ordering survives: nought would make replacement
   * the best available player and flatten every remaining VOR to zero, exactly when a drafter
   * is still choosing between them.
   */
  it('keeps the board ordered after every seat is spent', () => {
    const gone = new Set(Array.from({ length: 8 }, (_, i) => `f${i}`))
    const r = build(gone)
    expect(r.f8.vor).toBeGreaterThan(r.f9.vor)
    expect(r.f8.vor).toBeGreaterThan(0)
  })
})

describe('what actually moves a replacement level', () => {
  /* Thirty goalies on a clean gradient, four goalie seats across two teams. */
  const points: Record<string, number> = {}
  const positionByKey: Record<string, string> = {}
  for (let i = 0; i < 30; i++) { points[`g${i}`] = 100 - i; positionByKey[`g${i}`] = 'G' }
  const build = (drafted?: Set<string>) =>
    buildHockeyVor({ points, positionByKey, slots: { G: 2 }, teams: 2, drafted })
  const level = (r: ReturnType<typeof build>) => {
    const row = Object.values(r)[0]
    return row.points - row.vor
  }

  /*
   * THE SURPRISING PROPERTY, PINNED. A draft that follows this board exactly moves the
   * replacement level by nothing, and that is arithmetic rather than a defect: removing the
   * top K of a pool while shrinking its seats by K lands the index on the same player.
   *
   * It is here because the obvious test of "does the board react to picks" — take the top N,
   * watch the levels — returns "no" against a CORRECT implementation, and would send the next
   * person looking for a bug that is not there.
   */
  it('does not move when the draft follows the board exactly', () => {
    const inOrder = new Set(['g0', 'g1', 'g2'])
    expect(level(build(inOrder))).toBe(level(build()))
  })

  /* What does move it: a league that rates somebody differently from us. */
  it('moves when the draft departs from the board', () => {
    const reaches = new Set(['g0', 'g10', 'g11'])
    expect(level(build(reaches))).toBeGreaterThan(level(build()))
  })

  it('prices the survivors off the level that actually applies', () => {
    const reaches = new Set(['g0', 'g10', 'g11'])
    expect(build(reaches).g1.vor).toBeLessThan(build().g1.vor)
  })
})
