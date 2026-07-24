import { describe, it, expect } from 'vitest'
import { pickSafeDrop, type DroppableBody } from '../safeDrop'

function body(p: Partial<DroppableBody> & { playerKey: string; rosValue: number }): DroppableBody {
  return { name: p.playerKey, side: 'pit', reason: 'benched', ...p }
}

// Wire replacement level per side: a body is a clean drop only when rosValue <= this.
const repl = (levels: Partial<Record<'hit' | 'pit', number>>) => (side: 'hit' | 'pit') =>
  levels[side] ?? -Infinity

describe('pickSafeDrop', () => {
  it('picks the lowest-value body at or below the wire replacement level', () => {
    const cands = [
      body({ playerKey: 'Low', rosValue: 10 }),
      body({ playerKey: 'Lower', rosValue: 4 }),
      body({ playerKey: 'High', rosValue: 80 }),
    ]
    const drop = pickSafeDrop(cands, repl({ pit: 30 }), new Set())
    expect(drop?.playerKey).toBe('Lower') // lowest of the two (4,10) under the 30 bar; High(80) excluded
  })

  it('returns null when every droppable body is above the replacement level (no clean drop)', () => {
    const cands = [body({ playerKey: 'Stud', rosValue: 90 }), body({ playerKey: 'Good', rosValue: 70 })]
    expect(pickSafeDrop(cands, repl({ pit: 40 }), new Set())).toBeNull()
  })

  it('skips bodies already claimed by another move (no double-drop)', () => {
    const cands = [body({ playerKey: 'A', rosValue: 5 }), body({ playerKey: 'B', rosValue: 8 })]
    const claimed = new Set(['A'])
    expect(pickSafeDrop(cands, repl({ pit: 50 }), claimed)?.playerKey).toBe('B')
  })

  it('empty wire for a side (replacement -Infinity) → no clean drop there (conservative)', () => {
    const cands = [body({ playerKey: 'X', rosValue: 1, side: 'hit' })]
    expect(pickSafeDrop(cands, repl({}), new Set())).toBeNull()
  })

  it('carries the reason label through', () => {
    const cands = [body({ playerKey: 'IL guy', rosValue: 2, reason: 'IL' })]
    expect(pickSafeDrop(cands, repl({ pit: 50 }), new Set())).toEqual({
      playerKey: 'IL guy',
      name: 'IL guy',
      reason: 'IL',
    })
  })

  // Regression (BUG 5): two IL bodies (e.g. Griffin ~0, Helsley ~12) — the first stream must
  // claim the LOWEST-value one, leaving the second-lowest available for the next stream, instead
  // of both moves colliding on the same (wrong, higher-value) body.
  it('two IL bodies: first stream claims the lower-value one, second stream claims the other', () => {
    const cands = [
      body({ playerKey: 'Helsley', rosValue: 12, side: 'pit', reason: 'IL' }),
      body({ playerKey: 'Griffin', rosValue: 0, side: 'hit', reason: 'IL' }),
    ]
    const replLevel = repl({ pit: 50, hit: 50 })
    const claimed = new Set<string>()
    const first = pickSafeDrop(cands, replLevel, claimed)
    expect(first?.playerKey).toBe('Griffin') // lowest value picked first
    claimed.add(first!.playerKey)
    const second = pickSafeDrop(cands, replLevel, claimed)
    expect(second?.playerKey).toBe('Helsley') // second stream gets the other IL body, not "no clean drop"
  })
})
