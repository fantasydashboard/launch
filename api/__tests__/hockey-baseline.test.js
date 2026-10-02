import { describe, it, expect, vi, afterEach } from 'vitest'
import handler, { extractTableData, toBaseline } from '../hockey-baseline.js'

const sk = (id, extra = {}) => ({ player_name: `S${id}`, player_nhl_id: id, g_season_proj: 42, a_season_proj: 63,
  plus_minus_season_proj: 8.4, pim_season_proj: 21, ppp_season_proj: 25.2, sog_season_proj: 252,
  hit_season_proj: 84, blk_season_proj: 42, ...extra })
const gk = (id, extra = {}) => ({ player_name: `G${id}`, player_nhl_id: id, gs_season_proj: 60, w_season_proj: 33,
  so_season_proj: 3, sv_pct_season_proj: 0.912, ...extra })
const page = (rows) => `<html><script>window.X=1; const tableData = ${JSON.stringify(rows)};\nfoo()</script></html>`

describe('extractTableData', () => {
  it('reads the embedded array', () => { expect(extractTableData(page([sk(1)]))).toHaveLength(1) })
  it('is not fooled by "];" or brackets inside a string value', () => {
    const rows = [sk(1, { player_name: 'Odd ]; "name" [' }), sk(2)]
    const out = extractTableData(page(rows))
    expect(out).toHaveLength(2)
    expect(out[0].player_name).toBe('Odd ]; "name" [')
  })
  it('returns null for an unterminated array', () => { expect(extractTableData('const tableData = [{"a": 1}')).toBeNull() })
  it('returns null without tableData', () => { expect(extractTableData('<html></html>')).toBeNull() })
})

describe('toBaseline', () => {
  it('turns season projections into per-game rates over 84 games', () => {
    const b = toBaseline([sk(1)], [gk(9)], 't')
    expect(b.skaters[0].perGame.goals).toBeCloseTo(0.5)
    expect(b.skaters[0].perGame.shots).toBeCloseTo(3)
    expect(b.goalies[0].winsPerStart).toBeCloseTo(0.55)
    expect(b.goalies[0].savePct).toBeCloseTo(0.912)
  })
  it('skips all-zero rows, non-numeric rows and duplicate ids', () => {
    const zero = sk(2, { g_season_proj: 0, a_season_proj: 0, plus_minus_season_proj: 0, pim_season_proj: 0,
                         ppp_season_proj: 0, sog_season_proj: 0, hit_season_proj: 0, blk_season_proj: 0 })
    const junk = sk(3, { g_season_proj: undefined, a_season_proj: 'x' })
    const b = toBaseline([sk(1), zero, junk, sk(1, { g_season_proj: 1 })], [gk(9, { gs_season_proj: 0 })], 't')
    expect(b.skaters.map((s) => s.playerId)).toEqual([1])
    expect(b.skaters[0].perGame.goals).toBeCloseTo(0.5)   // first row wins
    expect(b.goalies).toHaveLength(0)                    // 0 starts -> no per-start rates
  })
})

describe('handler', () => {
  afterEach(() => vi.unstubAllGlobals())
  const res = () => { const r = { headers: {}, statusCode: 0, body: null,
    setHeader(k, v) { this.headers[k] = v }, status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this }, end() { return this } }; return r }
  it('502s when the skater table is too small', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => page([sk(1)]) })))
    const r = res(); await handler({ method: 'GET', query: {} }, r)
    expect(r.statusCode).toBe(502)
  })
  it('serves a cached baseline when both tables are healthy', async () => {
    const many = Array.from({ length: 320 }, (_, i) => sk(i + 1))
    vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true, text: async () => page(String(url).includes('goalie') ? [gk(9)] : many) })))
    const r = res(); await handler({ method: 'GET', query: {} }, r)
    expect(r.statusCode).toBe(200)
    expect(r.body.skaters).toHaveLength(320)
    expect(r.headers['Cache-Control']).toMatch(/s-maxage=86400/)
  })
})
