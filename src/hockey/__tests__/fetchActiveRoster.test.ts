import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchActiveRoster } from '../fetchActiveRoster'
import { normalizeName } from '../normalizeName'

const ok = (body: unknown) => ({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => body })
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Player ${i}`, team: 'LAK' }))

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('fetchActiveRoster', () => {
  it('returns ids and normalized names', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ fetchedAt: 't', players: [...players(700), { id: 9, name: 'Anže Kopitar' }] })))
    const r = await fetchActiveRoster()
    expect(r?.ids.has(9)).toBe(true)
    expect(r?.names.has(normalizeName('Anze Kopitar'))).toBe(true)
  })

  it('refuses a list too short to be the whole league', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => ok({ players: players(300) })))
    expect(await fetchActiveRoster()).toBeNull()
  })

  it('is null on a failed or thrown request', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, headers: new Headers() })))
    expect(await fetchActiveRoster()).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
    expect(await fetchActiveRoster()).toBeNull()
  })
})
