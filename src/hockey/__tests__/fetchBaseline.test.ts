import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchBaseline } from '../fetchBaseline'
const ok = (body: unknown, type = 'application/json') =>
  ({ ok: true, headers: { get: () => type }, json: async () => body })
describe('fetchBaseline', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('returns the baseline on a healthy JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ fetchedAt: 't', skaters: [], goalies: [] })))
    expect((await fetchBaseline())?.fetchedAt).toBe('t')
  })
  it('treats a non-JSON 200 as a failure (dev server serving source)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok('// source', 'text/javascript')))
    expect(await fetchBaseline()).toBeNull()
  })
  it('treats a 502 and a thrown fetch as failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, headers: { get: () => 'application/json' } })))
    expect(await fetchBaseline()).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await fetchBaseline()).toBeNull()
  })
})
