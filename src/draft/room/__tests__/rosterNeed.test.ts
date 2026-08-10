import { describe, it, expect } from 'vitest'
import {
  startableRemaining, needFactorByPosition, needFactorFor, BENCH_FACTOR,
  startablePositions, isStartablePosition,
} from '../rosterNeed'

const SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 3 }

describe('startableRemaining', () => {
  it('an empty roster can start everyone', () => {
    const r = startableRemaining({ slots: SLOTS, filledByPosition: {} })
    expect(r.QB).toBe(1)
    expect(r.RB).toBe(2 + 3) // dedicated plus all three flex
    expect(r.WR).toBe(2 + 3)
    expect(r.TE).toBe(1 + 3)
  })

  it('a position with its own slots full can still reach flex', () => {
    // This is pick 4.04: two backs rostered, three flex spots untouched.
    const r = startableRemaining({ slots: SLOTS, filledByPosition: { RB: 2 } })
    expect(r.RB).toBe(3)
  })

  it('overflow consumes flex capacity for everyone', () => {
    // Five backs: two dedicated, three spilling into flex.
    const r = startableRemaining({ slots: SLOTS, filledByPosition: { RB: 5 } })
    expect(r.RB).toBe(0)
    expect(r.WR).toBe(2) // dedicated only — the flex is gone
  })

  it('quarterbacks reach flex only in superflex', () => {
    expect(startableRemaining({ slots: SLOTS, filledByPosition: { QB: 1 } }).QB).toBe(0)
    const sf = startableRemaining({ slots: { QB: 1, SUPER_FLEX: 1 }, filledByPosition: { QB: 1 } })
    expect(sf.QB).toBe(1)
  })

  it('kickers never reach flex', () => {
    const r = startableRemaining({ slots: { ...SLOTS, K: 1 }, filledByPosition: { K: 1 } })
    expect(r.K).toBe(0)
  })
})

describe('needFactorByPosition', () => {
  it('does not discount anyone on an empty roster', () => {
    const f = needFactorByPosition({ slots: SLOTS, filledByPosition: {} })
    expect(f.RB).toBe(1)
    expect(f.WR).toBe(1)
  })

  it('does not discount a third back while flex is open', () => {
    expect(needFactorFor('RB', { slots: SLOTS, filledByPosition: { RB: 2 } })).toBe(1)
  })

  it('discounts a sixth back once flex is spent', () => {
    expect(needFactorFor('RB', { slots: SLOTS, filledByPosition: { RB: 5 } })).toBe(BENCH_FACTOR)
  })

  it('discounts a second quarterback in a one-QB league', () => {
    expect(needFactorFor('QB', { slots: SLOTS, filledByPosition: { QB: 1 } })).toBe(BENCH_FACTOR)
  })

  it('discounts rather than zeroes — a bench back still has value', () => {
    expect(BENCH_FACTOR).toBeGreaterThan(0)
    expect(BENCH_FACTOR).toBeLessThan(1)
  })

  it('never discounts a position it does not model', () => {
    expect(needFactorFor('LB', { slots: SLOTS, filledByPosition: {} })).toBe(1)
  })

  it('tolerates empty input', () => {
    expect(needFactorFor('RB', { slots: {}, filledByPosition: {} })).toBe(BENCH_FACTOR)
  })
})

describe('startablePositions', () => {
  // The mock the tool was tested against: nine starters, no kicker, no defense.
  const noKickerNoDef = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 3, BN: 6 }

  it('leaves out positions the league never starts', () => {
    const pos = startablePositions(noKickerNoDef)
    expect(pos.has('K')).toBe(false)
    expect(pos.has('DEF')).toBe(false)
    expect([...pos].sort()).toEqual(['QB', 'RB', 'TE', 'WR'])
  })

  it('counts a position that only a flex could start', () => {
    expect(startablePositions({ QB: 1, FLEX: 1 }).has('TE')).toBe(true)
  })

  it('includes kicker and defense when the league starts them', () => {
    const pos = startablePositions({ QB: 1, RB: 2, K: 1, DEF: 1 })
    expect(pos.has('K')).toBe(true)
    expect(pos.has('DEF')).toBe(true)
  })

  it('ignores bench, IR and taxi', () => {
    expect(startablePositions({ QB: 1, BN: 8, IR: 2, TAXI: 1 })).toEqual(new Set(['QB']))
  })

  it('assumes nothing when the lineup is unknown', () => {
    // Empty settings means we have not loaded them, not that nobody can play.
    const pos = startablePositions({})
    for (const p of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) expect(pos.has(p)).toBe(true)
  })

  it('answers for a single player, multi-position listings included', () => {
    expect(isStartablePosition('DEF', noKickerNoDef)).toBe(false)
    expect(isStartablePosition('RB/WR', noKickerNoDef)).toBe(true)
  })
})
