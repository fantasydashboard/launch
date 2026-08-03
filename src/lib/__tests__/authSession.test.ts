import { describe, it, expect } from 'vitest'
import { authStorageKey, parseStoredSession } from '../authSession'

const NOW = Date.UTC(2026, 7, 3, 20, 21, 44) // 2026-08-03T20:21:44Z
const sec = (ms: number) => Math.floor(ms / 1000)

function stored(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    access_token: 'at',
    refresh_token: 'rt',
    expires_at: sec(NOW) + 2880, // ~48 min out, matching a live session
    user: { id: 'u1', email: 'a@b.co' },
    ...overrides,
  })
}

describe('authStorageKey', () => {
  it('derives supabase-js key from the project URL', () => {
    expect(authStorageKey('https://ergxtydfgffqgkddclvr.supabase.co')).toBe(
      'sb-ergxtydfgffqgkddclvr-auth-token',
    )
  })

  it('tolerates a trailing slash', () => {
    expect(authStorageKey('https://ergxtydfgffqgkddclvr.supabase.co/')).toBe(
      'sb-ergxtydfgffqgkddclvr-auth-token',
    )
  })

  it('returns null for unusable input', () => {
    expect(authStorageKey('')).toBeNull()
    expect(authStorageKey('not a url')).toBeNull()
    expect(authStorageKey(undefined as any)).toBeNull()
  })
})

describe('parseStoredSession', () => {
  it('returns a valid unexpired session', () => {
    const r = parseStoredSession(stored(), NOW)
    expect(r.reason).toBe('ok')
    expect(r.session?.access_token).toBe('at')
    expect(r.session?.user?.id).toBe('u1')
  })

  it('reports missing when nothing is stored', () => {
    expect(parseStoredSession(null, NOW)).toEqual({ session: null, reason: 'missing' })
    expect(parseStoredSession('', NOW)).toEqual({ session: null, reason: 'missing' })
  })

  it('reports unparseable rather than throwing on malformed JSON', () => {
    expect(parseStoredSession('{oops', NOW)).toEqual({ session: null, reason: 'unparseable' })
  })

  it('refuses an expired session', () => {
    const r = parseStoredSession(stored({ expires_at: sec(NOW) - 1 }), NOW)
    expect(r).toEqual({ session: null, reason: 'expired' })
  })

  it('treats a session expiring within the skew window as expired', () => {
    // About to lapse — not worth adopting, the caller should re-auth instead.
    const r = parseStoredSession(stored({ expires_at: sec(NOW) + 3 }), NOW)
    expect(r.reason).toBe('expired')
  })

  it('unwraps the legacy currentSession envelope', () => {
    const raw = JSON.stringify({ currentSession: JSON.parse(stored()) })
    const r = parseStoredSession(raw, NOW)
    expect(r.reason).toBe('ok')
    expect(r.session?.access_token).toBe('at')
  })

  it('rejects a payload with no access token', () => {
    const r = parseStoredSession(JSON.stringify({ user: { id: 'u1' } }), NOW)
    expect(r).toEqual({ session: null, reason: 'unparseable' })
  })

  it('accepts a session with no expiry field rather than discarding it', () => {
    const r = parseStoredSession(stored({ expires_at: undefined }), NOW)
    expect(r.reason).toBe('ok')
  })
})
