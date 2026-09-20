import { describe, it, expect } from 'vitest'
import { authStorageKey, parseStoredSession, readStoredSession } from '../authSession'

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

describe('the expired-token bug these call sites all had', () => {
  /*
   * THE BUG, IN ONE ASSERTION. A Supabase access token lives about an hour. Three call sites
   * — the ESPN proxy, the Yahoo proxy and the ESPN login form — read `access_token` out of
   * localStorage and sent whatever was there, never looking at expires_at. After an hour on
   * one tab every call came back 401.
   *
   * That is why "sign out and back in" was the fix that worked: it was not repairing a
   * session, it was replacing a stale string nobody was inspecting. And it only bites after
   * an hour of continuous use, which is exactly the session where somebody is doing real
   * work.
   *
   * readStoredSession already refused anything expired. All three had reimplemented it
   * without that check rather than calling it.
   */
  const NOW = 1_800_000_000_000                    // a fixed "now", in ms
  const key = 'sb-ergxtydfgffqgkddclvr-auth-token'
  const url = 'https://ergxtydfgffqgkddclvr.supabase.co'
  const store = (expiresAtSeconds: number) => ({
    getItem: () => JSON.stringify({ access_token: 'tok', expires_at: expiresAtSeconds }),
  })

  it('refuses a token that has already expired', () => {
    const past = Math.floor(NOW / 1000) - 60
    expect(readStoredSession(url, store(past), NOW).reason).toBe('expired')
    expect(readStoredSession(url, store(past), NOW).session).toBeNull()
  })

  it('accepts one that is still live', () => {
    const future = Math.floor(NOW / 1000) + 600
    const r = readStoredSession(url, store(future), NOW)
    expect(r.reason).toBe('ok')
    expect(r.session?.access_token).toBe('tok')
  })

  /* A token expiring this second is not worth racing — the request still has to fly. */
  it('refuses one lapsing right now', () => {
    const edge = Math.floor(NOW / 1000)
    expect(readStoredSession(url, store(edge), NOW).reason).toBe('expired')
  })

  it('reports a missing store rather than throwing in the auth path', () => {
    expect(readStoredSession(url, undefined, NOW).reason).toBe('missing')
    expect(readStoredSession(url, { getItem: () => { throw new Error('blocked') } }, NOW).reason).toBe('missing')
  })

  /* The Yahoo reader hardcoded this project's ref, which would have broken silently
     anywhere else. The key is derived from the URL. */
  it('derives the storage key from the project URL', () => {
    expect(authStorageKey(url)).toBe(key)
  })
})
