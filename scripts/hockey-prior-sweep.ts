/*
 * How many seasons should a pre-season rate be built from, and at what weights?
 *
 * Pre-season the board has no current games, so a player's rate IS the prior — one season of
 * it. That makes an injured or down year a player's new true talent: Auston Matthews at 0.88
 * P/GP (60 games) instead of the 1.03 his last two seasons say, ranked 123 against a consensus
 * 17. It cuts the other way for risers, so a flat multi-year mean is not the answer either —
 * Bedard drops 13% on a two-year average and that is also wrong.
 *
 * So: sweep it. Weights are per-season multipliers, most recent first, applied to both the
 * counting totals and the games, which keeps every rate a real ratio rather than a mean of
 * ratios (a 20-game season and an 82-game season must not count equally).
 *
 * Run: S=<dir> npx vite-node scripts/hockey-prior-sweep.ts
 */
import { readFileSync } from 'node:fs'
import { rateSkaters } from '@/hockey/nhlRates'
import { mergeHockeyProjections, normalizeName } from '@/hockey/hockeyProjectionSource'
import { buildHockeyBoard } from '@/hockey/hockeyBoard'
import { YAHOO_DEFAULT_CATEGORIES } from '@/hockey/manualRules'

const S = process.env.S ?? '.'
const sort = encodeURIComponent(JSON.stringify([{ property: 'playerId', direction: 'ASC' }]))
const SEASONS = ['20252026', '20242025', '20232024']

/* Through OUR relay, not api.nhle.com directly. A tight loop against the NHL host gets
   rate-limited and answers with an HTML error page rather than a status code, which a bare
   .json() turns into "Unexpected token '<'" several seasons deep — losing the whole run. The
   relay pages server-side and caches, so this is one request per report per season. */
const RELAY = process.env.RELAY ?? 'https://www.ultimatefantasydashboard.com/api/nhl-stats'

async function page(path: string, season: string) {
  const url = `${RELAY}?report=${encodeURIComponent(path)}&seasonId=${season}`
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url)
      const type = r.headers.get('content-type') ?? ''
      if (r.ok && /json/i.test(type)) {
        const j: any = await r.json()
        if (Array.isArray(j?.data)) return j.data
      }
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 600 * 2 ** i))
  }
  throw new Error(`relay gave no data for ${path} ${season}`)
}

const CATS = ['goals','assists','points','plusMinus','penaltyMinutes','ppPoints','shots','hits','blockedShots','ppGoals','shGoals','shPoints','gamesPlayed']

/* Ice time is fetched for the CURRENT season only and reused. It feeds the power-play minutes
   signal, which is the most stable thing about a player across a summer, and pulling it for
   every season triples the request count against a host that is already throttling us. */
async function seasonRows(season: string, withIce: boolean) {
  const sum = await page('skater/summary', season)
  const rt = await page('skater/realtime', season)
  const ice = withIce ? await page('skater/timeonice', season) : []
  const by = new Map(rt.map((r: any) => [r.playerId, r]))
  const full = sum.map((r: any) => ({ ...r, hits: by.get(r.playerId)?.hits ?? 0, blockedShots: by.get(r.playerId)?.blockedShots ?? 0 }))
  return { full, ice }
}

const data = [] as { full: any[]; ice: any[] }[]
for (const [i, s] of SEASONS.entries()) {
  try { data.push(await seasonRows(s, i === 0)); process.stderr.write(`  fetched ${s}\n`) }
  catch (e) {
    /* A season the host would not serve is reported and skipped, not fatal. Any grid row that
       needed it is simply measured on fewer seasons, which the output must say. */
    process.stderr.write(`  SKIPPED ${s} — ${(e as Error).message}\n`)
    break
  }
}
process.stderr.write(`  seasons available: ${data.length}\n`)

/* Blend: weighted totals over weighted games. A player absent from a season simply contributes
   nothing to either side, so a rookie is unaffected rather than diluted toward zero. */
function blend(weights: number[]) {
  const acc = new Map<number, any>()
  data.forEach((d, i) => {
    const w = weights[i] ?? 0
    if (!w) return
    for (const r of d.full) {
      const cur = acc.get(r.playerId) ?? { ...r, ...Object.fromEntries(CATS.map(c => [c, 0])) }
      for (const c of CATS) cur[c] = (cur[c] ?? 0) + (r[c] ?? 0) * w
      /* Identity from the most recent season the player appears in. */
      if (i === data.findIndex(dd => dd.full.some((x: any) => x.playerId === r.playerId))) {
        cur.skaterFullName = r.skaterFullName; cur.positionCode = r.positionCode
      }
      acc.set(r.playerId, cur)
    }
  })
  return [...acc.values()]
}

const espn = JSON.parse(readFileSync(S + '/espn2027.json', 'utf8')).players
const analyst: Record<string, { name: string; pos: string }> = JSON.parse(readFileSync(S + '/analyst.json', 'utf8'))
const W = (r: number) => 1 / Math.log2(r + 1)
const rerank = (vals: number[]) => {
  const idx = vals.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0])
  const o = new Array(vals.length); idx.forEach(([, i], k) => { o[i] = k + 1 }); return o
}

function score(weights: number[]) {
  const rows = blend(weights)
  /* Pre-season: no current games. Counters zeroed so the rate IS the blended prior, which is
     exactly what the live app does on opening night. */
  const zeroed = rows.map(r => ({ ...r, ...Object.fromEntries(CATS.filter(c => c !== 'gamesPlayed').map(c => [c, 0])), gamesPlayed: 0 }))
  const rates = rateSkaters(zeroed as any, data[0].ice as any, rows as any)
  const merged = mergeHockeyProjections({ espn, rates })
  const projections = Object.fromEntries(Object.entries(merged.projections).filter(([k]) => !k.startsWith('nhl:')))
  const rules: any = {
    leagueId: 'x', season: 2027, name: 'cmp', teams: 12, scoringType: 'H2H_CATEGORY', weights: {},
    categories: YAHOO_DEFAULT_CATEGORIES.map((k) => ({ key: k, statId: 0, reverse: k === 'GAA' })),
    slots: { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 0 }, rosterSize: 20, unnamedScoredStatIds: [],
  }
  const board = buildHockeyBoard({ projections, rules, namesByKey: merged.namesByKey, teamsByKey: merged.teamByKey, drafted: new Set<string>() })
  const ours = new Map(board.rows.map((r, i) => [normalizeName(r.name), i + 1]))
  const raw: { t: number; o: number }[] = []
  for (const [rk, a] of Object.entries(analyst)) {
    const m = ours.get(normalizeName(a.name))
    if (m) raw.push({ t: Number(rk), o: m })
  }
  const ra = rerank(raw.map(p => p.o)), rb = rerank(raw.map(p => p.t))
  const pairs = raw.map((p, i) => ({ ours: ra[i], theirs: rb[i] }))
  const wsum = pairs.reduce((s, p) => s + W(p.theirs), 0)
  const wmae = pairs.reduce((s, p) => s + W(p.theirs) * Math.abs(p.ours - p.theirs), 0) / wsum
  const n = pairs.length
  const d2 = pairs.reduce((s, p) => s + (p.ours - p.theirs) ** 2, 0)
  const rho = 1 - 6 * d2 / (n * (n * n - 1))
  const top = (k: number) => {
    const t = new Set(pairs.filter(p => p.theirs <= k).map(p => p.theirs))
    return pairs.filter(p => p.theirs <= k && p.ours <= k).length / t.size
  }
  return { wmae, rho, t12: top(12), t25: top(25), t50: top(50), n }
}

const GRID: [string, number[]][] = [
  ['1yr  (current)   ', [1, 0, 0]],
  ['2yr  6/4         ', [6, 4, 0]],
  ['2yr  7/3         ', [7, 3, 0]],
  ['2yr  8/2         ', [8, 2, 0]],
  ['3yr  5/4/3       ', [5, 4, 3]],
  ['3yr  6/3/1       ', [6, 3, 1]],
  ['3yr  7/2/1       ', [7, 2, 1]],
  ['3yr  5/3/2       ', [5, 3, 2]],
]
console.log(`seasons available: ${data.length} of ${SEASONS.length}`)
console.log(`${'prior'.padEnd(18)} wMAE   rho    top12  top25  top50`)
for (const [label, w] of GRID) {
  if (w.filter(x => x > 0).length > data.length) continue
  const r = score(w)
  console.log(`${label} ${r.wmae.toFixed(1).padStart(5)}  ${r.rho.toFixed(3)}  ${(r.t12*100).toFixed(0).padStart(4)}%  ${(r.t25*100).toFixed(0).padStart(4)}%  ${(r.t50*100).toFixed(0).padStart(4)}%`)
}
