import { describe, it, expect } from 'vitest'
import { pickSafeDrop, type DroppableBody } from '../safeDrop'

function body(p: Partial<DroppableBody> & { playerKey: string; rosValue: number }): DroppableBody {
  return { name: p.playerKey, side: 'pit', reason: 'benched', bottomTier: true, ...p }
}

describe('pickSafeDrop', () => {
  it('picks the lowest-value body among bottom-tier candidates', () => {
    const cands = [
      body({ playerKey: 'Low', rosValue: 10 }),
      body({ playerKey: 'Lower', rosValue: 4 }),
      body({ playerKey: 'High', rosValue: 80, bottomTier: false }),
    ]
    const drop = pickSafeDrop(cands, new Set())
    expect(drop?.playerKey).toBe('Lower') // lowest of the two bottom-tier bodies; High excluded (not bottom-tier)
  })

  it('returns null when no droppable body is bottom-tier (no clean drop)', () => {
    const cands = [
      body({ playerKey: 'Stud', rosValue: 90, bottomTier: false }),
      body({ playerKey: 'Good', rosValue: 70, bottomTier: false }),
    ]
    expect(pickSafeDrop(cands, new Set())).toBeNull()
  })

  it('skips bodies already claimed by another move (no double-drop)', () => {
    const cands = [body({ playerKey: 'A', rosValue: 5 }), body({ playerKey: 'B', rosValue: 8 })]
    const claimed = new Set(['A'])
    expect(pickSafeDrop(cands, claimed)?.playerKey).toBe('B')
  })

  it('carries the reason label through', () => {
    const cands = [body({ playerKey: 'IL guy', rosValue: 2, reason: 'IL' })]
    expect(pickSafeDrop(cands, new Set())).toEqual({
      playerKey: 'IL guy',
      name: 'IL guy',
      reason: 'IL',
    })
  })

  // Regression (Bug A): two IL bodies on separate sides, both bottom-tier, ranked by a
  // CROSS-comparable value (e.g. Griffin ~0, Helsley ~12 — My Team's "vs all" scale, not a
  // within-role percentile that would put a hitter and a pitcher on incomparable scales). The
  // first stream must claim the LOWEST cross-value one; the second stream gets the other, instead
  // of both moves colliding on the same (wrong, higher-value) body or the second reading "no clean
  // drop" because the only expendable body was already claimed by the wrong move.
  it('cross-side selection: two IL bodies ranked by cross-comparable value — lower first, second claims the other', () => {
    const cands = [
      body({ playerKey: 'Helsley', rosValue: 12, side: 'pit', reason: 'IL' }),
      body({ playerKey: 'Griffin', rosValue: 0, side: 'hit', reason: 'IL' }),
    ]
    const claimed = new Set<string>()
    const first = pickSafeDrop(cands, claimed)
    expect(first?.playerKey).toBe('Griffin') // lower cross-value picked first
    claimed.add(first!.playerKey)
    const second = pickSafeDrop(cands, claimed)
    expect(second?.playerKey).toBe('Helsley') // second stream gets the other IL body, not "no clean drop"
  })

  // Regression (Bug B): a deep wire must never make a core/solid body of YOUR OWN roster look like
  // a clean drop just because a free agent projects higher. A core-tier starter benched today
  // (bottomTier: false) is NEVER selectable, even though its rosValue (217) is far below a fringe
  // body's rosValue would need to clear on the old "<= best available FA" bar. Only the genuinely
  // fringe body (bottomTier: true) is picked.
  it('never drops a core body: a core starter not playing today is skipped even when a fringe body is also available', () => {
    const cands = [
      // Core starter benched today (e.g. Shane Baz, 217 projected pts) — NOT bottom-tier of the
      // roster, so it must never be offered as a stream's drop no matter how low its rosValue is
      // relative to the wire.
      body({ playerKey: 'Baz', rosValue: 217, side: 'pit', reason: 'benched', bottomTier: false }),
      // Genuinely fringe body (e.g. Lucas Erceg, 102 projected pts) — bottom tier of the roster.
      body({ playerKey: 'Erceg', rosValue: 102, side: 'pit', reason: 'benched', bottomTier: true }),
    ]
    const drop = pickSafeDrop(cands, new Set())
    expect(drop?.playerKey).toBe('Erceg')
  })

  it('no clean drop when the only expendable body is not bottom-tier', () => {
    const cands = [body({ playerKey: 'Soriano', rosValue: 228, side: 'pit', bottomTier: false })]
    expect(pickSafeDrop(cands, new Set())).toBeNull()
  })
})
