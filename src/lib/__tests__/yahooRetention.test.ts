import { describe, it, expect } from 'vitest'
import { mayPersist, retentionReason, YAHOO_RETENTION_HOURS } from '../yahooRetention'

describe('mayPersist', () => {
  it('refuses to store anything Yahoo\'s API gave us', () => {
    expect(mayPersist('yahoo', 'auto')).toBe(false)
    expect(mayPersist('yahoo')).toBe(false) // auto is the default
  })

  it('keeps a season the user typed in themselves', () => {
    // Not "obtained through the Yahoo APIs" — it is their own record of their
    // own league, and deleting it buys Yahoo nothing.
    expect(mayPersist('yahoo', 'manual')).toBe(true)
  })

  it('leaves the other platforms alone', () => {
    for (const p of ['espn', 'sleeper']) {
      expect(mayPersist(p, 'auto')).toBe(true)
      expect(mayPersist(p, 'manual')).toBe(true)
    }
  })

  it('matches the platform case-insensitively', () => {
    // A caller passing 'Yahoo' must not slip past the rule on capitalisation.
    expect(mayPersist('Yahoo', 'auto')).toBe(false)
    expect(mayPersist('YAHOO', 'auto')).toBe(false)
  })

  it('treats an unknown platform as permitted rather than guessing', () => {
    expect(mayPersist('', 'auto')).toBe(true)
    expect(mayPersist(undefined as unknown as string, 'auto')).toBe(true)
  })
})

describe('retentionReason', () => {
  it('explains a skipped write and names the window', () => {
    expect(retentionReason('yahoo', 'auto')).toContain(String(YAHOO_RETENTION_HOURS))
    expect(retentionReason('yahoo', 'auto')).toContain('not persisted')
  })

  it('is empty when the write is allowed', () => {
    expect(retentionReason('sleeper', 'auto')).toBe('')
    expect(retentionReason('yahoo', 'manual')).toBe('')
  })
})
