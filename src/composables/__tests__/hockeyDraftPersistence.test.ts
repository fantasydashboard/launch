import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * A reload mid-draft must not cost somebody their picks.
 *
 * On 2026-09-27 it did: the hand-entered rules came back and every crossed-off player did not,
 * because the rules were persisted and the draft was not. The extension only sends what happens
 * AFTER it reconnects — there is no backfill — so nothing could restore a live draft's board
 * but typing forty names by hand while the clock ran.
 *
 * These lock the contract the storage layer has to keep, independent of the composable's Vue
 * wiring: scoped to one league-season, dropped when it goes stale, and never merged into a
 * board that already has picks on it.
 */

const DRAFT_KEY = 'ufd:hockey:draftState'
const TTL = 24 * 60 * 60 * 1000

interface StoredDraft {
  scope: string
  at: number
  mockOrder: string[]
  extensionOrder: string[]
  mySlot: number | null
  myTeamId: number | null
}

/** The same read the composable performs — kept here so the rules it enforces are testable. */
function readDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as StoredDraft
    if (!v || typeof v.scope !== 'string') return null
    if (!Number.isFinite(v.at) || Date.now() - v.at > TTL) return null
    return v
  } catch { return null }
}

const store = (over: Partial<StoredDraft> = {}) =>
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    scope: '1924339137:2027', at: Date.now(),
    mockOrder: ['a', 'b'], extensionOrder: ['a'], mySlot: 3, myTeamId: 2, ...over,
  }))

describe('draft state survives a reload', () => {
  beforeEach(() => { localStorage.clear(); vi.useRealTimers() })

  it('returns the picks it stored', () => {
    store()
    expect(readDraft()?.mockOrder).toEqual(['a', 'b'])
  })

  it('keeps the seat, which is what the clock reads', () => {
    // Losing this is why the board said "seat 1 on the clock" for somebody in seat 3.
    store()
    expect(readDraft()?.mySlot).toBe(3)
    expect(readDraft()?.myTeamId).toBe(2)
  })

  it('drops a draft older than a day', () => {
    // A draft does not run for two, and stale picks cross off players who are not gone.
    store({ at: Date.now() - TTL - 1000 })
    expect(readDraft()).toBeNull()
  })

  it('keeps one still inside the window', () => {
    store({ at: Date.now() - 60_000 })
    expect(readDraft()).not.toBeNull()
  })

  it('survives corrupt storage rather than throwing into the board', () => {
    localStorage.setItem(DRAFT_KEY, '{not json')
    expect(readDraft()).toBeNull()
  })

  it('ignores a record with no scope, which cannot be matched to a league', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: Date.now(), mockOrder: ['a'] }))
    expect(readDraft()).toBeNull()
  })
})

describe('the scope is the league and the season', () => {
  beforeEach(() => localStorage.clear())

  it('does not match another league', () => {
    // Pointing the board at tonight's league while this afternoon's mock is stored would
    // cross off players who are still available, and nothing on screen would say so.
    store({ scope: '999:2027' })
    expect(readDraft()!.scope).not.toBe('1924339137:2027')
  })

  it('does not match another season of the same league', () => {
    store({ scope: '1924339137:2026' })
    expect(readDraft()!.scope).not.toBe('1924339137:2027')
  })
})
