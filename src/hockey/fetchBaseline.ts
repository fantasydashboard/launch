import type { Baseline } from './baselineBlend'

/** The public baseline, or null. Soft by design: without it the board is ours alone, as before. */
export async function fetchBaseline(url = '/api/hockey-baseline'): Promise<Baseline | null> {
  try {
    const res = await fetch(url, typeof AbortSignal?.timeout === 'function' ? { signal: AbortSignal.timeout(6000) } : undefined)
    if (!res.ok) { console.warn(`[hockey baseline] ${url} -> ${res.status}`); return null }
    const type = res.headers.get('content-type') ?? ''
    if (!/json/i.test(type)) { console.warn(`[hockey baseline] ${url} answered '${type}', not JSON`); return null }
    const b = await res.json()
    if (!Array.isArray(b?.skaters) || !Array.isArray(b?.goalies)) return null
    /* One null element must not be able to throw inside the blend and empty the feed. */
    const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
    return {
      ...b,
      skaters: b.skaters.filter((s: any) => fin(s?.playerId) && s.perGame && typeof s.perGame === 'object'),
      goalies: b.goalies.filter((g: any) => fin(g?.playerId) && fin(g.savePct) && fin(g.winsPerStart) && fin(g.shutoutsPerStart)),
    } as Baseline
  } catch (e) {
    console.warn('[hockey baseline] unavailable', e)
    return null
  }
}
