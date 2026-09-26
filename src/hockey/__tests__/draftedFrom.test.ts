import { describe, it, expect } from 'vitest'
import { draftedFrom } from '../draftedFrom'

const S = (...k: string[]) => new Set(k)
const base = {
  live: false, liveDrafted: null as Set<string> | null,
  handMarked: [] as string[], fromExtension: [] as string[],
}

describe('who is off the board', () => {
  it('uses hand-marked picks when not live', () => {
    expect(draftedFrom({ ...base, handMarked: ['a', 'b'] })).toEqual(S('a', 'b'))
  })

  /* While ESPN is authoritative, a human clicking rows can disagree with the draft — so the
     clicks lose. This is the part the original rule got right and must keep getting right. */
  it('ignores hand-marked picks while live', () => {
    expect(draftedFrom({
      ...base, live: true, liveDrafted: S('x'), handMarked: ['a', 'b'],
    })).toEqual(S('x'))
  })

  it('falls back to hand-marked when live but ESPN has not answered yet', () => {
    expect(draftedFrom({ ...base, live: true, liveDrafted: null, handMarked: ['a'] }))
      .toEqual(S('a'))
  })
})

describe('the extension counts in both modes', () => {
  it('adds to hand-marked picks in mock mode', () => {
    expect(draftedFrom({ ...base, handMarked: ['a'], fromExtension: ['b'] }))
      .toEqual(S('a', 'b'))
  })

  /*
   * THE REGRESSION. ESPN reports a running draft as in-progress with every pick empty, so
   * `liveDrafted` stays empty for the whole draft. The old rule returned it alone and threw
   * away the extension — a real session synced 161 picks and showed a full pool.
   */
  it('counts extension picks while live, even when ESPN reports nothing', () => {
    expect(draftedFrom({
      ...base, live: true, liveDrafted: S(), fromExtension: ['p1', 'p2', 'p3'],
    })).toEqual(S('p1', 'p2', 'p3'))
  })

  it('adds to ESPN rather than replacing it', () => {
    expect(draftedFrom({
      ...base, live: true, liveDrafted: S('x', 'y'), fromExtension: ['z'],
    })).toEqual(S('x', 'y', 'z'))
  })

  /* Live still beats the HUMAN, even while the extension is contributing. Both rules at once
     is the combination the board actually runs in during a live draft. */
  it('still ignores hand-marked picks while live and syncing', () => {
    expect(draftedFrom({
      ...base, live: true, liveDrafted: S('x'), handMarked: ['clicked'], fromExtension: ['z'],
    })).toEqual(S('x', 'z'))
  })

  it('does not double-count a pick both sources report', () => {
    expect(draftedFrom({ ...base, handMarked: ['a'], fromExtension: ['a'] }).size).toBe(1)
  })

  it('is empty when nothing has happened', () => {
    expect(draftedFrom(base)).toEqual(S())
  })
})
