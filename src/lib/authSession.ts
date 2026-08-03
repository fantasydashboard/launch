/**
 * Reading the Supabase session straight out of storage.
 *
 * `supabase.auth.getSession()` serializes behind a navigator lock, so two
 * concurrent initializations (app boot + a callback view) can make one of them
 * take seconds. Racing it against a timeout is fine; treating the timeout as
 * "no session" is NOT — a timeout means "unknown", and reporting the user as
 * logged out when a valid token is sitting in localStorage signs them out of a
 * flow they were correctly authenticated for. These helpers are the fallback:
 * pure, synchronous, and lock-free.
 */

export interface StoredSession {
  access_token: string
  refresh_token?: string
  expires_at?: number // seconds since epoch, as supabase-js stores it
  user?: { id?: string; email?: string; [k: string]: unknown }
  [k: string]: unknown
}

export type StoredSessionReason = 'ok' | 'missing' | 'unparseable' | 'expired'

export interface StoredSessionResult {
  session: StoredSession | null
  reason: StoredSessionReason
}

/** Don't adopt a session this close to lapsing — re-auth instead of racing it. */
const EXPIRY_SKEW_SECONDS = 5

/**
 * The localStorage key supabase-js uses for a given project URL:
 * `https://<ref>.supabase.co` → `sb-<ref>-auth-token`.
 */
export function authStorageKey(supabaseUrl: string): string | null {
  if (!supabaseUrl || typeof supabaseUrl !== 'string') return null
  let host: string
  try {
    host = new URL(supabaseUrl).hostname
  } catch {
    return null
  }
  const ref = host.split('.')[0]
  if (!ref || ref === host) return null
  return `sb-${ref}-auth-token`
}

/**
 * Parse a stored session, refusing anything expired or malformed. Never throws —
 * a corrupt entry yields `unparseable`, not an exception in the auth path.
 */
export function parseStoredSession(raw: string | null, nowMs: number): StoredSessionResult {
  if (!raw) return { session: null, reason: 'missing' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { session: null, reason: 'unparseable' }
  }
  if (!parsed || typeof parsed !== 'object') return { session: null, reason: 'unparseable' }

  // supabase-js has stored both the bare session and a { currentSession } envelope.
  const envelope = parsed as Record<string, unknown>
  const candidate = (
    envelope.currentSession && typeof envelope.currentSession === 'object'
      ? envelope.currentSession
      : envelope
  ) as StoredSession

  if (!candidate || typeof candidate.access_token !== 'string' || !candidate.access_token) {
    return { session: null, reason: 'unparseable' }
  }

  // No expiry recorded → trust it; supabase-js will refresh when it needs to.
  if (typeof candidate.expires_at === 'number') {
    if (candidate.expires_at * 1000 <= nowMs + EXPIRY_SKEW_SECONDS * 1000) {
      return { session: null, reason: 'expired' }
    }
  }

  return { session: candidate, reason: 'ok' }
}

/** Convenience wrapper over the two helpers, guarded for SSR/absent storage. */
export function readStoredSession(
  supabaseUrl: string,
  storage: Pick<Storage, 'getItem'> | undefined,
  nowMs: number = Date.now(),
): StoredSessionResult {
  const key = authStorageKey(supabaseUrl)
  if (!key || !storage) return { session: null, reason: 'missing' }
  let raw: string | null = null
  try {
    raw = storage.getItem(key)
  } catch {
    return { session: null, reason: 'missing' }
  }
  return parseStoredSession(raw, nowMs)
}
