import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ALL_BUCKETS, TODAY_DEFAULT, RANKINGS_DEFAULT, ownerBucket, showsBucket,
  toggleBucket, loadBuckets, saveBuckets, type OwnerBucket,
} from '../ownerFilter'

describe('ownerBucket', () => {
  it('puts a row in exactly one bucket, mine winning over free', () => {
    expect(ownerBucket({ mine: true, free: false })).toBe('mine')
    expect(ownerBucket({ mine: false, free: true })).toBe('free')
    expect(ownerBucket({ mine: false, free: false })).toBe('taken')
    /* A row somehow flagged both is MINE: I hold him, whatever else is true. */
    expect(ownerBucket({ mine: true, free: true })).toBe('mine')
  })

  /* The rankings rows leave both absent for another team's player. */
  it('reads an unflagged row as taken rather than throwing', () => {
    expect(ownerBucket({})).toBe('taken')
  })
})

describe('the defaults', () => {
  /*
   * A daily board is a decision about tonight, and the other ten rosters cannot be part of it:
   * you can neither start those men nor sign them. They are one click away, not gone.
   */
  it('opens the daily board on the men you can field or claim', () => {
    expect([...TODAY_DEFAULT].sort()).toEqual(['free', 'mine'])
    expect(TODAY_DEFAULT).not.toContain('taken')
  })

  it('opens the rankings board on the whole league', () => {
    expect([...RANKINGS_DEFAULT].sort()).toEqual(['free', 'mine', 'taken'])
  })
})

describe('toggleBucket', () => {
  it('turns one off and back on', () => {
    expect(toggleBucket(['mine', 'free', 'taken'], 'taken')).toEqual(['mine', 'free'])
    expect(toggleBucket(['mine', 'free'], 'taken')).toEqual(['mine', 'free', 'taken'])
  })

  /*
   * THE LAST ONE HOLDS. An empty board is never what a click meant, and it is indistinguishable
   * from one that failed to load — the confusion this codebase keeps having to design away.
   */
  it('refuses to leave the board empty', () => {
    expect(toggleBucket(['mine'], 'mine')).toEqual(['mine'])
    expect(toggleBucket(['taken'], 'taken')).toEqual(['taken'])
  })

  /* The chips must not reorder under the cursor when one comes back on. */
  it('keeps a fixed order however the buckets were added', () => {
    const out = toggleBucket(toggleBucket(['taken'], 'mine'), 'free')
    expect(out).toEqual(['mine', 'free', 'taken'])
  })

  it('does not mutate what it was given', () => {
    const before: OwnerBucket[] = ['mine', 'free']
    toggleBucket(before, 'taken')
    expect(before).toEqual(['mine', 'free'])
  })
})

describe('showsBucket', () => {
  it('is the whole filtering rule', () => {
    expect(showsBucket(['mine', 'free'], 'mine')).toBe(true)
    expect(showsBucket(['mine', 'free'], 'taken')).toBe(false)
  })
})

describe('remembering the choice', () => {
  const KEY = 'ufd_test_owners'
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('comes back as it was left', () => {
    saveBuckets(KEY, ['mine'])
    expect(loadBuckets(KEY, RANKINGS_DEFAULT)).toEqual(['mine'])
  })

  it('falls back when nothing was ever stored', () => {
    expect(loadBuckets(KEY, TODAY_DEFAULT)).toEqual(['mine', 'free'])
  })

  /* A stored empty would render the blank board the toggle refuses to produce. */
  it('falls back rather than restoring an empty or unrecognisable selection', () => {
    for (const bad of ['[]', '["nonsense"]', '{"a":1}', 'not json']) {
      localStorage.setItem(KEY, bad)
      expect(loadBuckets(KEY, TODAY_DEFAULT)).toEqual(['mine', 'free'])
    }
  })

  it('drops a bucket it no longer recognises but keeps the rest', () => {
    localStorage.setItem(KEY, JSON.stringify(['mine', 'gone']))
    expect(loadBuckets(KEY, RANKINGS_DEFAULT)).toEqual(['mine'])
  })

  /*
   * A private window, cleared site data or a thumbnail capture can make either call throw, and
   * a filter that takes the board down with it is far worse than one that forgets.
   */
  it('survives storage being unavailable, in both directions', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    expect(loadBuckets(KEY, TODAY_DEFAULT)).toEqual(['mine', 'free'])
    expect(() => saveBuckets(KEY, ['mine'])).not.toThrow()
  })

  it('keeps the two boards apart', () => {
    saveBuckets('ufd_a', ['mine'])
    saveBuckets('ufd_b', [...ALL_BUCKETS])
    expect(loadBuckets('ufd_a', TODAY_DEFAULT)).toEqual(['mine'])
    expect(loadBuckets('ufd_b', TODAY_DEFAULT)).toEqual(['mine', 'free', 'taken'])
  })
})
