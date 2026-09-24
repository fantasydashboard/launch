import { describe, it, expect, vi, afterEach } from 'vitest'
import handler from '../nhl-stats.js'

/*
 * The relay's paging, tested against an upstream that behaves like the real one.
 *
 * api.nhle.com returns rows in no guaranteed order. Ask it for rows 0-99 and then 100-199 and
 * the two pages are slices of two DIFFERENT orderings — so some players land on both pages and
 * an equal number land on neither. Measured against the live endpoint: 940 rows came back
 * carrying 933 distinct players, and the count moved between runs. A board built on that ranks
 * seven players twice and silently omits seven others, which is the kind of wrong nobody can
 * see from the outside.
 *
 * The fake below reproduces exactly that: it re-shuffles per request unless asked to sort.
 */

/** A response body in the endpoint's shape. */
const body = (rows, total) => ({ ok: true, json: async () => ({ total, data: rows }) })

function fakeNhl({ count = 250 } = {}) {
  const players = Array.from({ length: count }, (_, i) => ({ playerId: i + 1, points: i }))
  let call = 0
  return vi.fn(async (url) => {
    const u = new URL(url)
    const start = Number(u.searchParams.get('start'))
    const limit = Number(u.searchParams.get('limit'))
    /* Sorted: one stable ordering for every page. Unsorted: rotated per call, so consecutive
       pages are cut from different orderings — the real endpoint's behaviour. */
    const order = u.searchParams.has('sort')
      ? players
      : [...players.slice(call * 7), ...players.slice(0, call * 7)]
    call++
    return body(order.slice(start, start + limit), count)
  })
}

function mockRes() {
  return {
    headers: {},
    body: null,
    code: 0,
    setHeader(k, v) { this.headers[k] = v },
    status(c) { this.code = c; return this },
    json(b) { this.body = b; return this },
  }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('nhl-stats relay paging', () => {
  it('returns every player exactly once across pages', async () => {
    vi.stubGlobal('fetch', fakeNhl())
    const res = mockRes()
    await handler({ query: { report: 'skater/summary', seasonId: '20252026' } }, res)

    const ids = res.body.data.map((r) => r.playerId)
    expect(ids.length).toBe(250)
    expect(new Set(ids).size).toBe(250)
  })

  /* The fake proves it can fail: without a sort it duplicates and omits, which is what makes
     the test above a claim about the relay rather than about the fixture. */
  it('the unsorted upstream really does duplicate and omit, or the test above proves nothing', async () => {
    const f = fakeNhl()
    const pages = []
    for (let start = 0; start < 250; start += 100) {
      pages.push(await f(`https://x/y?limit=100&start=${start}&cayenneExp=z`))
    }
    const ids = (await Promise.all(pages.map((p) => p.json()))).flatMap((j) => j.data.map((r) => r.playerId))
    expect(ids.length).toBe(250)
    expect(new Set(ids).size).toBeLessThan(250)
  })
})
