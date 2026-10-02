import type { Baseline } from './baselineBlend'

/** The public baseline, or null. Soft by design: without it the board is ours alone, as before. */
export async function fetchBaseline(url = '/api/hockey-baseline'): Promise<Baseline | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) { console.warn(`[hockey baseline] ${url} -> ${res.status}`); return null }
    const type = res.headers.get('content-type') ?? ''
    if (!/json/i.test(type)) { console.warn(`[hockey baseline] ${url} answered '${type}', not JSON`); return null }
    const b = await res.json()
    return Array.isArray(b?.skaters) && Array.isArray(b?.goalies) ? (b as Baseline) : null
  } catch (e) {
    console.warn('[hockey baseline] unavailable', e)
    return null
  }
}
