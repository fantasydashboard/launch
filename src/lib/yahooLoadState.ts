/**
 * Telling "you have no Yahoo leagues" apart from "we couldn't reach Yahoo".
 *
 * When every per-sport league fetch fails — which is what a Fantasy API 403 looks
 * like — the modal used to render "No Yahoo leagues found. Try syncing or check
 * your Yahoo account." That sends the user to audit a Yahoo account that is
 * perfectly fine, and hides a platform outage behind a shrug. An empty list is a
 * claim about the user's data; it should only be made when the calls succeeded.
 */

export type YahooLoadOutcome =
  | { kind: 'ok' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'empty' }

export interface SettledLike {
  status: 'fulfilled' | 'rejected'
  value?: unknown
  reason?: unknown
}

const FALLBACK = 'Yahoo could not be reached.'

/** Best human-readable message from a rejection reason. Never throws. */
export function errorMessageOf(reason: unknown): string {
  if (typeof reason === 'string' && reason.trim()) return reason
  if (reason && typeof reason === 'object') {
    const m = (reason as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m
  }
  return FALLBACK
}

/**
 * Classify a Promise.allSettled over per-sport league fetches.
 * `unavailable` requires that EVERY call failed — a partial failure still means
 * Yahoo answered, so the absence of leagues is real information, not an outage.
 */
export function summarizeYahooLoad(results: SettledLike[]): YahooLoadOutcome {
  if (!results.length) return { kind: 'empty' }

  const anyLeagues = results.some(
    (r) => r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0,
  )
  if (anyLeagues) return { kind: 'ok' }

  const allRejected = results.every((r) => r.status === 'rejected')
  if (allRejected) {
    const first = results.find((r) => r.status === 'rejected')
    return { kind: 'unavailable', message: errorMessageOf(first?.reason) }
  }

  return { kind: 'empty' }
}
