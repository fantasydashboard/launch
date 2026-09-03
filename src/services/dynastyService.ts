import type { DynastySource } from '@/football/dynastyValues'

/**
 * Dynasty values from FantasyCalc's public endpoint.
 *
 * WHY THIS PROVIDER
 *  - It carries `sleeperId` on every row, so the join to our players is exact rather than a
 *    name match. That alone rules out the failure mode this kind of feature usually dies of.
 *  - It returns dynasty AND redraft value on ONE internal scale, so "worth more now than
 *    later" is a comparison the source itself supports rather than something we invent.
 *  - It answers to league settings. Verified, not assumed: numQbs=2 moves Josh Allen from
 *    18th overall to 2nd, which is what superflex should do.
 *
 * WHAT I COULD NOT VERIFY: numTeams and ppr returned identical output in the same probe, so
 * we send them (they are documented and harmless) but do not claim the values adapt to them.
 *
 * COURTESY AND FRAGILITY. This is somebody else's unauthenticated endpoint with no SLA and
 * no grant to us. So: one request per browser per TTL, cached; a long TTL because dynasty
 * values move over weeks, not hours; and total failure degrades to "no dynasty data", never
 * to zeros. A zero would render as a real verdict about a real player.
 */

const ENDPOINT = 'https://api.fantasycalc.com/values/current'
const CACHE_KEY = 'ufd:dynastyValues'
/* Dynasty consensus moves on the scale of weeks. Refetching hourly would be noise for us and
   load for them, so half a day. */
const TTL_MS = 12 * 60 * 60 * 1000
const TIMEOUT_MS = 15000

export interface DynastyParams {
  /** 2 for superflex / 2QB, else 1. The one parameter shown to change the ordering. */
  numQbs: 1 | 2
  numTeams: number
  /** 1 full PPR, 0.5 half, 0 standard. */
  ppr: number
}

interface Cached {
  at: number
  params: DynastyParams
  rows: DynastySource[]
}

const memo = new Map<string, DynastySource[]>()
const paramKey = (p: DynastyParams) => `${p.numQbs}|${p.numTeams}|${p.ppr}`

function readCache(key: string): DynastySource[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Record<string, Cached>
    const hit = c?.[key]
    if (!hit || Date.now() - hit.at > TTL_MS || !Array.isArray(hit.rows)) return null
    return hit.rows
  } catch {
    return null
  }
}

function writeCache(key: string, params: DynastyParams, rows: DynastySource[]) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const c = raw ? (JSON.parse(raw) as Record<string, Cached>) : {}
    c[key] = { at: Date.now(), params, rows }
    localStorage.setItem(CACHE_KEY, JSON.stringify(c))
  } catch {
    /* private mode, or the quota — the memo still serves this tab */
  }
}

/** Map the provider's shape to ours, dropping anything we cannot key or value. */
export function normalizeFantasyCalc(payload: unknown): DynastySource[] {
  if (!Array.isArray(payload)) return []
  const out: DynastySource[] = []
  for (const row of payload as any[]) {
    const p = row?.player ?? {}
    const sleeperId = String(p.sleeperId ?? '').trim()
    const value = Number(row?.value)
    if (!sleeperId || !Number.isFinite(value)) continue
    out.push({
      sleeperId,
      name: String(p.name ?? ''),
      position: String(p.position ?? '').toUpperCase(),
      age: Number.isFinite(Number(p.maybeAge)) ? Number(p.maybeAge) : null,
      value,
      redraftValue: Number.isFinite(Number(row?.redraftValue)) ? Number(row.redraftValue) : 0,
      overallRank: Number(row?.overallRank) || 0,
      positionRank: Number(row?.positionRank) || 0,
    })
  }
  return out
}

/**
 * Fetch (or serve cached) dynasty values. Resolves to [] on any failure — callers treat an
 * empty list as "no dynasty data available" and hide the column rather than showing zeros.
 */
export async function getDynastyValues(params: DynastyParams): Promise<DynastySource[]> {
  const key = paramKey(params)
  const inMemo = memo.get(key)
  if (inMemo) return inMemo
  const cached = readCache(key)
  if (cached) {
    memo.set(key, cached)
    return cached
  }

  const url = `${ENDPOINT}?isDynasty=true&numQbs=${params.numQbs}&numTeams=${params.numTeams}&ppr=${params.ppr}`
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctl.signal })
    if (!res.ok) throw new Error(String(res.status))
    const rows = normalizeFantasyCalc(await res.json())
    if (!rows.length) return []
    memo.set(key, rows)
    writeCache(key, params, rows)
    return rows
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}
