/*
 * The CATEGORY board against a consensus, through the shipped feed.
 *
 * Companion to hockey-points-baseline.ts, and deliberately built on loadNhlFeed rather than a
 * local re-implementation of the pipeline: a sweep that measures a copy of the model is
 * measuring something no user will ever see.
 *
 * Reads the same disk cache, because the upstream answers 429 partway through a sweep and the
 * service layer then degrades softly to [] — producing a full set of plausible numbers from a
 * feed with no rates in it, identical at every setting, which reads exactly like "this feature
 * does nothing". A guard below refuses to report on a degraded feed for the same reason.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
const S = process.env.S ?? '.'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const CACHE = `${S}/nhlcache`
mkdirSync(CACHE, { recursive: true })
const orig = globalThis.fetch
globalThis.fetch = (async (i: any, init?: any) => {
  const u = typeof i === 'string' ? i : i.url
  const full = u.startsWith('/') ? `${BASE}${u}` : u
  if (!/\/api\//.test(full)) return orig(full, init)
  const rel = full.replace(/^https?:\/\/[^/]+/, '')
  const key = `${CACHE}/${Buffer.from(rel).toString('base64url').slice(-120)}.json`
  if (existsSync(key)) return new Response(readFileSync(key), { status: 200, headers: { 'content-type': 'application/json' } })
  const r = await orig(full, init)
  if (r.ok && /json/i.test(r.headers.get('content-type') ?? '')) {
    const t = await r.text(); writeFileSync(key, t)
    return new Response(t, { status: 200, headers: { 'content-type': 'application/json' } })
  }
  return r
}) as any

const { loadNhlFeed } = await import('@/composables/useNhlFeed')
const { mergeHockeyProjections, normalizeName } = await import('@/hockey/hockeyProjectionSource')
const { buildHockeyBoard } = await import('@/hockey/hockeyBoard')
const { YAHOO_DEFAULT_CATEGORIES } = await import('@/hockey/manualRules')
const { AGE_STRENGTH } = await import('@/hockey/agingCurve')

const feed = await loadNhlFeed(2027)
if (feed.rates.length < 500) throw new Error(`feed has only ${feed.rates.length} rated skaters — upstream degraded, refusing to report`)
const merged = mergeHockeyProjections({ espn: feed.espn as any, rates: feed.rates as any, historyGames: feed.historyGames, goalieProjections: feed.goalieProjections })
const projections = Object.fromEntries(Object.entries(merged.projections).filter(([k]) => !k.startsWith('nhl:')))
const rules: any = {
  leagueId: 'x', season: 2027, name: 'cat', teams: 12, scoringType: 'H2H_CATEGORY', weights: {},
  categories: YAHOO_DEFAULT_CATEGORIES.map((k: string) => ({ key: k, statId: 0, reverse: k === 'GAA' })),
  slots: { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 0 }, rosterSize: 20, unnamedScoredStatIds: [],
}
const board = buildHockeyBoard({ projections, rules, namesByKey: merged.namesByKey, teamsByKey: merged.teamByKey, drafted: new Set<string>() })
const ours = new Map(board.rows.map((r, i) => [normalizeName(r.name), i + 1]))

const analyst: Record<string, { name: string; pos: string }> = JSON.parse(readFileSync(S + '/analyst.json', 'utf8'))
const raw: { name: string; pos: string; t: number; o: number }[] = []
for (const [rk, a] of Object.entries(analyst)) {
  const o = ours.get(normalizeName(a.name))
  if (o != null) raw.push({ name: a.name, pos: a.pos, t: Number(rk), o })
}
const rerank = (v: number[]) => { const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]); const out = new Array(v.length); idx.forEach(([, i], k) => { out[i] = k + 1 }); return out }
const ra = rerank(raw.map(p => p.o)), rb = rerank(raw.map(p => p.t))
const pairs = raw.map((p, i) => ({ ...p, ours: ra[i], theirs: rb[i], d: ra[i] - rb[i] }))

const W = (r: number) => 1 / Math.log2(r + 1)
const wsum = pairs.reduce((s, p) => s + W(p.theirs), 0)
const wmae = pairs.reduce((s, p) => s + W(p.theirs) * Math.abs(p.d), 0) / wsum
const n = pairs.length
const rho = 1 - 6 * pairs.reduce((s, p) => s + (p.ours - p.theirs) ** 2, 0) / (n * (n * n - 1))
console.log(`AGE_STRENGTH=${AGE_STRENGTH}  rates=${feed.rates.length}  matched=${n}`)
console.log(`  weighted |gap| ${wmae.toFixed(1)}   rho ${rho.toFixed(3)}`)
const band = (lo: number, hi: number) => {
  const b = pairs.filter(p => p.theirs >= lo && p.theirs <= hi)
  return b.length ? (b.reduce((s, p) => s + Math.abs(p.d), 0) / b.length).toFixed(1) : '-'
}
console.log(`  bands  1-10=${band(1,10)} 11-20=${band(11,20)} 21-30=${band(21,30)} 31-50=${band(31,50)} 51-100=${band(51,100)}`)
const watch = ['Connor Bedard','Adam Fantilli','Logan Cooley','Auston Matthews','Alex Ovechkin','Jack Hughes']
console.log(`  ${'player'.padEnd(18)} ours theirs`)
for (const w of watch) {
  const p = pairs.find(x => normalizeName(x.name) === normalizeName(w))
  if (p) console.log(`  ${w.padEnd(18)} ${String(p.ours).padStart(4)} ${String(p.theirs).padStart(6)}`)
}
