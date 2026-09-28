/*
 * The hockey board, as JSON, for anything outside this repo that needs to rank players.
 *
 * WHY IT EXISTS. The social cards computed their own points from the raw projection feed —
 * stats times weights — which is not what the product does. The product ages a three-season
 * prior, scales it by expected games, and prices the result against positional replacement.
 * Under IDENTICAL scoring the two had already diverged: the published centres card carried
 * Mika Zibanejad 7th and Vincent Trocheck 10th, and our own board has neither inside the top
 * twelve. Both are 32, which is the aging curve doing its job.
 *
 * A card that ranks differently from the product it advertises is worse than no card, so the
 * cards now read this and nobody maintains a second model in another language.
 *
 * Usage:
 *   MODE=points  WEIGHTS='{"G":3,...}' npx vite-node scripts/hockey-board-export.ts
 *   MODE=categories CATS='["G","A",...]' npx vite-node scripts/hockey-board-export.ts
 *
 * Emits one JSON array on stdout — every diagnostic goes to stderr, so a caller can pipe it.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'https://www.ultimatefantasydashboard.com'
const MODE = (process.env.MODE ?? 'points') as 'points' | 'categories'
const TEAMS = Number(process.env.TEAMS ?? 12)
const SLOTS = JSON.parse(process.env.SLOTS ?? '{"C":2,"LW":2,"RW":2,"D":4,"G":2,"UTIL":1}')
const WEIGHTS = JSON.parse(process.env.WEIGHTS ?? '{}')
const CATS: string[] = JSON.parse(process.env.CATS ?? '[]')

/* Optional disk cache. The upstream answers 429 under repeated runs and the service layer then
   degrades softly to [] — which would emit a complete, plausible, wrong board. See the guard. */
const CACHE = process.env.CACHE_DIR
if (CACHE) mkdirSync(CACHE, { recursive: true })
const orig = globalThis.fetch
globalThis.fetch = (async (i: any, init?: any) => {
  const u = typeof i === 'string' ? i : i.url
  const full = u.startsWith('/') ? `${BASE}${u}` : u
  if (!CACHE || !/\/api\//.test(full)) return orig(full, init)
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
const { mergeHockeyProjections } = await import('@/hockey/hockeyProjectionSource')
const { buildHockeyBoard } = await import('@/hockey/hockeyBoard')

const feed = await loadNhlFeed(2027)
/* A softly-degraded upstream still produces a board, from ESPN alone. Publishing that under
   our name is the failure this whole file exists to prevent, so refuse instead. */
if (feed.rates.length < 500) {
  throw new Error(`feed has only ${feed.rates.length} rated skaters — upstream degraded, refusing to emit a board`)
}
/*
 * AND REFUSE WITHOUT AGES. The birth-date read degrades softly when a relay does not serve
 * skater/bios — which production does not, until this ships — leaving the board with no aging
 * applied and no sign that anything is missing. A card generated that way silently reverts to
 * the old rankings while claiming to be the new ones, which is exactly what this file was
 * written to prevent.
 */
if ((feed.agesKnown ?? 0) < 500) {
  throw new Error(
    `only ${feed.agesKnown ?? 0} birth dates loaded — the aging curve would be skipped silently. `
    + `Point BASE at a host whose relay serves skater/bios (BASE=http://localhost:5173 during development).`)
}
process.stderr.write(`[export] rates=${feed.rates.length} espn=${feed.espn.length} ages=${feed.agesKnown} mode=${MODE}\n`)

const merged = mergeHockeyProjections({ espn: feed.espn as any, rates: feed.rates as any, historyGames: feed.historyGames })
const projections = Object.fromEntries(Object.entries(merged.projections).filter(([k]) => !k.startsWith('nhl:')))

const rules: any = {
  leagueId: 'export', season: 2027, name: 'export', teams: TEAMS,
  scoringType: MODE === 'categories' ? 'H2H_CATEGORY' : 'H2H_POINTS',
  weights: WEIGHTS,
  categories: CATS.map((k) => ({ key: k, statId: 0, reverse: k === 'GAA' })),
  slots: SLOTS, rosterSize: 16, unnamedScoredStatIds: [],
}
const board = buildHockeyBoard({
  projections, rules, namesByKey: merged.namesByKey, teamsByKey: merged.teamByKey, drafted: new Set<string>(),
})

const out = board.rows.map((r: any) => {
  /* The column he is furthest ahead in, which is what a category card prints beside the name.
     Taken from the board's own per-category z so the card cannot disagree about that either. */
  let tag = ''
  if (MODE === 'categories') {
    const per = (board as any).perCategoryByKey?.[r.playerKey] ?? {}
    let bestZ = -Infinity
    for (const [k, z] of Object.entries(per)) {
      if (typeof z === 'number' && z > bestZ) { bestZ = z; tag = k }
    }
  }
  return {
    sid: r.playerKey, name: r.name, pos: r.position,
    /* `value` orders the board (VOR); `projected` is the player's own total. A points card
       prints the total a reader can check against a stat line; ordering stays ours. */
    value: r.value, projected: r.projected, adp: r.adp ?? null, tag,
  }
})
process.stdout.write(JSON.stringify(out))
