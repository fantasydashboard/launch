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
  const many = Array.from({ length: 320 }, (_, i) => sk(i + 1))
  const goalies = (n = 35, extra = {}) => Array.from({ length: n }, (_, i) => gk(i + 1, extra))
  const serve = (skRows, glPage) => vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true,
    text: async () => (String(url).includes('goalie') ? glPage : page(skRows)) })))
  const run = async () => { const r = res(); await handler({ method: 'GET', query: {} }, r); return r }
  const expect502 = (r) => { expect(r.statusCode).toBe(502); expect(r.headers['Cache-Control']).toBeUndefined() }

  it('502s when the skater table is too small', async () => {
    serve([sk(1)], page(goalies()))
    expect502(await run())
  })
  it('serves a cached baseline when both tables are healthy', async () => {
    serve(many, page(goalies()))
    const r = await run()
    expect(r.statusCode).toBe(200)
    expect(r.body.skaters).toHaveLength(320)
    expect(r.body.goalies).toHaveLength(35)
    expect(r.headers['Cache-Control']).toMatch(/s-maxage=86400/)
  })
  it('502s when fetch throws or answers not-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect502(await run())
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })))
    expect502(await run())
  })
  it('502s when the goalie page has no tableData', async () => {
    serve(many, '<html></html>')
    expect502(await run())
  })
  it('502s with fewer than 30 usable goalies', async () => {
    serve(many, page(goalies(29)))
    expect502(await run())
  })
  it('drops an out-of-range goalie (sv 91.2)', async () => {
    serve(many, page([...goalies(30), gk(999, { sv_pct_season_proj: 91.2 })]))
    const r = await run()
    expect(r.statusCode).toBe(200)
    expect(r.body.goalies.map((g) => g.playerId)).not.toContain(999)
    expect(r.body.goalies).toHaveLength(30)
  })
  it('502s when the skater scale is not per-season', async () => {
    const perGame = Array.from({ length: 320 }, (_, i) => sk(i + 1, { g_season_proj: 0.5 }))
    serve(perGame, page(goalies()))
    expect502(await run())
  })
})
