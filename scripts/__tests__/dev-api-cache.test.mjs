import { describe, it, expect } from 'vitest'
import { parseCacheControl, createDevApiCache } from '../dev-api-cache.mjs'

const body = (s) => Buffer.from(s)

describe('parseCacheControl', () => {
  /* s-maxage is the CDN's instruction and max-age is the browser's. Vercel honours the first;
     a dev server standing in for Vercel has to read the same one. */
  it('prefers the shared cache directive over the browser one', () => {
    expect(parseCacheControl('s-maxage=600, max-age=30').maxAge).toBe(600)
    expect(parseCacheControl('max-age=30').maxAge).toBe(30)
  })

  it('reads stale-while-revalidate', () => {
    expect(parseCacheControl('s-maxage=600, stale-while-revalidate=3600').staleWhileRevalidate).toBe(3600)
    expect(parseCacheControl('s-maxage=600').staleWhileRevalidate).toBe(0)
  })

  it('treats a header with no lifetime as uncacheable', () => {
    for (const h of ['', undefined, 'no-store', 'private', 'public']) {
      expect(parseCacheControl(h).maxAge).toBe(0)
    }
  })

  it('refuses to cache when told not to, whatever else it says', () => {
    expect(parseCacheControl('s-maxage=600, no-store').maxAge).toBe(0)
  })
})

describe('the dev API cache', () => {
  const make = () => {
    let clock = 1_000_000
    const cache = createDevApiCache({ now: () => clock })
    return { cache, tick: (s) => { clock += s * 1000 } }
  }
  const ok = { status: 200, headers: { 'cache-control': 's-maxage=600, stale-while-revalidate=3600' }, body: body('{"a":1}') }

  it('serves a stored answer back while it is fresh', () => {
    const { cache, tick } = make()
    expect(cache.store('k', ok)).toBe(true)
    tick(599)
    const hit = cache.lookup('k')
    expect(hit.fresh).toBe(true)
    expect(hit.body.toString()).toBe('{"a":1}')
  })

  it('calls it stale once its lifetime is up, without throwing it away', () => {
    const { cache, tick } = make()
    cache.store('k', ok)
    tick(700)
    expect(cache.lookup('k').fresh).toBe(false)
  })

  it('forgets it entirely once even the stale window has passed', () => {
    const { cache, tick } = make()
    cache.store('k', ok)
    tick(600 + 3600 + 1)
    expect(cache.lookup('k')).toBeNull()
  })

  /*
   * THE RULE THE RELAY ALREADY HAD, AND THE WHOLE POINT OF THIS CACHE. api/nhl-stats.js says
   * it: "Only a good answer is cached — caching the 429 would serve the outage to everyone."
   * A dev cache that stored failures would take one throttle and make it permanent for the
   * session, which is worse than no cache at all.
   */
  it('never stores a failure', () => {
    const { cache } = make()
    for (const status of [429, 500, 404, 302]) {
      expect(cache.store('k', { ...ok, status })).toBe(false)
    }
    expect(cache.lookup('k')).toBeNull()
  })

  it('never stores an answer the handler did not mark cacheable', () => {
    const { cache } = make()
    expect(cache.store('k', { status: 200, headers: {}, body: body('x') })).toBe(false)
    expect(cache.store('k', { status: 200, headers: { 'cache-control': 'no-store' }, body: body('x') })).toBe(false)
    expect(cache.lookup('k')).toBeNull()
  })

  it('keeps different requests apart', () => {
    const { cache } = make()
    cache.store('a', ok)
    expect(cache.lookup('b')).toBeNull()
  })

  it('replaces an entry when a fresher answer arrives', () => {
    const { cache, tick } = make()
    cache.store('k', ok)
    tick(700)
    cache.store('k', { ...ok, body: body('{"a":2}') })
    const hit = cache.lookup('k')
    expect(hit.fresh).toBe(true)
    expect(hit.body.toString()).toBe('{"a":2}')
  })
})
