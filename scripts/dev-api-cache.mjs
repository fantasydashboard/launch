/**
 * The edge cache the dev server does not have.
 *
 * WHY IT EXISTS. `api/*` handlers set `Cache-Control: s-maxage=…` and in production Vercel's
 * CDN honours it: one fetch of the NHL slate serves every user for ten minutes, and the NHL
 * sees roughly six requests an hour however many people are setting lineups. `s-maxage` is an
 * instruction to a shared cache, and the dev server is not one — it ignored the header
 * completely, so every league a developer opened went straight to the upstream.
 *
 * That difference is not a small one, and it does not fail honestly. Opening four leagues on
 * localhost fired eight requests at an endpoint that rate-limits, and what came back — a
 * throttled schedule rendered as "no game" beside every player — looks exactly like a product
 * bug that production does not have. A dev server that hammers upstreams production never
 * touches makes every local check suspect in both directions: real failures hide among the
 * false ones, and a fix cannot be told from a lull.
 *
 * ONLY SUCCESSES ARE STORED, which is the rule api/nhl-stats.js already states for itself:
 * "caching the 429 would serve the outage to everyone". Here it would be worse — a cached
 * failure would outlive the throttle that caused it and follow the developer through the
 * session.
 *
 * NOT A CDN. No revalidation, no request coalescing, no size bound, no sharing between
 * processes; it lives as long as the dev server does. It reproduces the one behaviour whose
 * absence was actively misleading, and stops there.
 */

/** A response's lifetime, as a shared cache reads it. Zero means "do not store". */
export function parseCacheControl(header) {
  const directives = {}
  for (const part of String(header ?? '').split(',')) {
    const [rawKey, rawValue] = part.trim().split('=')
    if (!rawKey) continue
    directives[rawKey.toLowerCase()] = rawValue == null ? true : Number(rawValue)
  }
  if (directives['no-store'] || directives['no-cache']) {
    return { maxAge: 0, staleWhileRevalidate: 0 }
  }
  /* s-maxage is addressed to the shared cache and wins, exactly as it does at the edge. */
  const shared = directives['s-maxage']
  const browser = directives['max-age']
  const maxAge = Number.isFinite(shared) ? shared : Number.isFinite(browser) ? browser : 0
  const swr = directives['stale-while-revalidate']
  return {
    maxAge: maxAge > 0 ? maxAge : 0,
    staleWhileRevalidate: Number.isFinite(swr) && swr > 0 ? swr : 0,
  }
}

export function createDevApiCache({ now = Date.now } = {}) {
  const entries = new Map()

  return {
    /**
     * The stored answer, with whether it is still fresh.
     *
     * A STALE ENTRY IS RETURNED RATHER THAN DROPPED so the caller can fall back to it when the
     * upstream has just failed — which is the case this whole module is for. Null means there
     * is nothing usable at all.
     */
    lookup(key) {
      const hit = entries.get(key)
      if (!hit) return null
      const age = (now() - hit.storedAt) / 1000
      if (age > hit.maxAge + hit.staleWhileRevalidate) {
        entries.delete(key)
        return null
      }
      return { status: hit.status, headers: hit.headers, body: hit.body, fresh: age <= hit.maxAge }
    },

    /** Stores a successful, explicitly cacheable answer. Returns whether it kept it. */
    store(key, { status, headers, body }) {
      if (!(status >= 200 && status < 300)) return false
      const { maxAge, staleWhileRevalidate } = parseCacheControl(headers?.['cache-control'])
      if (!maxAge) return false
      entries.set(key, { status, headers, body, maxAge, staleWhileRevalidate, storedAt: now() })
      return true
    },

    clear() { entries.clear() },
    get size() { return entries.size },
  }
}
