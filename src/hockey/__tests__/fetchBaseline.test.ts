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
  it('resolves null when the request hangs until the timeout aborts it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctl = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(ctl.signal)
    vi.stubGlobal('fetch', vi.fn((_u: string, init?: { signal?: AbortSignal }) => new Promise((_res, rej) => {
      init?.signal?.addEventListener('abort', () => rej(new Error('aborted')))
    })))
    const p = fetchBaseline()
    ctl.abort()
    expect(await p).toBeNull()
    expect(timeout).toHaveBeenCalledWith(6000)
    timeout.mockRestore(); warn.mockRestore()
  })
  it('drops malformed elements instead of passing them to the blend', async () => {
    const good = { playerId: 1, name: 'a', perGame: { goals: 0.4 } }
    const goodG = { playerId: 9, name: 'g', savePct: 0.91, winsPerStart: 0.5, shutoutsPerStart: 0.05 }
    vi.stubGlobal('fetch', vi.fn(async () => ok({ fetchedAt: 't',
      skaters: [null, good, { playerId: 'x', perGame: {} }, { playerId: 2 }],
      goalies: [null, goodG, { playerId: 10, savePct: 'x', winsPerStart: 0.5, shutoutsPerStart: 0 }, { playerId: 11, savePct: 0.9 }] })))
    const b = await fetchBaseline()
    expect(b?.skaters).toEqual([good])
    expect(b?.goalies).toEqual([goodG])
  })
})
