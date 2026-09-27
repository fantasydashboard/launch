/*
 * Where our board disagrees with consensus AT A COST.
 *
 * Run: S=<dir> npx vite-node scripts/hockey-consensus-weighted.ts
 *
 * WHY NOT JUST SPEARMAN. hockey-consensus-audit.ts answers "do the two lists broadly agree"
 * (0.705, last run). That is the right question for the model and the wrong one for a drafter:
 * it treats a 20-place disagreement at pick 3 exactly like a 20-place disagreement at pick 200.
 * The first one costs a first-round asset, the second is unobservable — nobody drafts the 200th
 * player differently because he "should" have been 220th.
 *
 * SO ERROR IS PRICED BY WHERE IT HAPPENS. Two ways, both reported, because they answer
 * different halves of the question:
 *
 *   ROUNDS. A gap in ranks converted to rounds in a 12-team league. Being 11 places off at
 *   pick 4 means taking a player a whole round early; being 11 off at pick 180 is the same
 *   round. This is the number a drafter feels.
 *
 *   DCG-STYLE WEIGHT. 1/log2(rank+1), the standard discount for ranked lists, so the top of
 *   the board dominates the summary statistic the way it dominates a draft.
 *
 * Both sides are re-ranked within the matched subset before anything is compared — comparing
 * our 1..940 against their 1..250 once produced a Spearman of -3.99, which is not a value the
 * statistic can take.
 */
import { readFileSync } from 'node:fs'
import { rateSkaters } from '@/hockey/nhlRates'
import { mergeHockeyProjections, normalizeName } from '@/hockey/hockeyProjectionSource'
import { buildHockeyBoard } from '@/hockey/hockeyBoard'
import { YAHOO_DEFAULT_CATEGORIES } from '@/hockey/manualRules'

const S = process.env.S ?? '.'
const TEAMS = Number(process.env.TEAMS ?? 12)
/* The league's ACTUAL columns. Defaults to Yahoo's 12, but a board is only comparable to a
   drafter's decision if it is priced on the categories that drafter is contesting — a set
   with HITS and BLK in it ranks defencemen for a league that does not score either. */
const CATS = (process.env.CATS ? process.env.CATS.split(',') : YAHOO_DEFAULT_CATEGORIES).map(c => c.trim())
const sort = encodeURIComponent(JSON.stringify([{ property: 'playerId', direction: 'ASC' }]))

async function page(path: string) {
  const exp = encodeURIComponent('seasonId=20252026 and gameTypeId=2')
  const out: any[] = []; let start = 0, total = 1
  while (start < total) {
    const j: any = await (await fetch(`https://api.nhle.com/stats/rest/en/${path}?limit=100&start=${start}&cayenneExp=${exp}&sort=${sort}`)).json()
    total = j.total; out.push(...j.data); start += 100; await new Promise(r => setTimeout(r, 90))
  }
  return out
}

const sum = await page('skater/summary'); const rt = await page('skater/realtime'); const ice = await page('skater/timeonice')
const by = new Map(rt.map((r: any) => [r.playerId, r]))
const full = sum.map((r: any) => ({ ...r, hits: by.get(r.playerId)?.hits ?? 0, blockedShots: by.get(r.playerId)?.blockedShots ?? 0 }))
const rates = rateSkaters(full as any, ice as any, full as any)
const espn = JSON.parse(readFileSync(S + '/espn2027.json', 'utf8')).players
const merged = mergeHockeyProjections({ espn, rates })
const projections = Object.fromEntries(Object.entries(merged.projections).filter(([k]) => !k.startsWith('nhl:')))

const rules: any = {
  leagueId: 'x', season: 2027, name: 'cmp', teams: TEAMS, scoringType: 'H2H_CATEGORY', weights: {},
  categories: CATS.map((k) => ({ key: k, statId: 0, reverse: k === 'GAA' })),
  slots: { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 0 }, rosterSize: 20, unnamedScoredStatIds: [],
}
const board = buildHockeyBoard({ projections, rules, namesByKey: merged.namesByKey, teamsByKey: merged.teamByKey, drafted: new Set<string>() })
const ours = new Map(board.rows.map((r, i) => [normalizeName(r.name), { rank: i + 1, pos: r.position }]))

const analyst: Record<string, { name: string; pos: string }> = JSON.parse(readFileSync(S + '/analyst.json', 'utf8'))
type Pair = { name: string; pos: string; theirsRaw: number; oursRaw: number; theirs: number; ours: number; d: number }
const raw: Pair[] = []
const unmatched: string[] = []
for (const [rk, a] of Object.entries(analyst)) {
  const m = ours.get(normalizeName(a.name))
  if (m) raw.push({ name: a.name, pos: a.pos, theirsRaw: Number(rk), oursRaw: m.rank, theirs: 0, ours: 0, d: 0 })
  else unmatched.push(`${rk}. ${a.name} (${a.pos})`)
}
/* Re-rank both within the matched subset, or the scales are different and nothing below means
   anything. */
const rerank = (vals: number[]) => {
  const idx = vals.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0])
  const o = new Array(vals.length); idx.forEach(([, i], k) => { o[i] = k + 1 }); return o
}
const ra = rerank(raw.map(p => p.oursRaw)), rb = rerank(raw.map(p => p.theirsRaw))
raw.forEach((p, i) => { p.ours = ra[i]; p.theirs = rb[i]; p.d = p.ours - p.theirs })
const pairs = raw

const W = (r: number) => 1 / Math.log2(r + 1)
const wsum = pairs.reduce((s, p) => s + W(p.theirs), 0)
const weightedMAE = pairs.reduce((s, p) => s + W(p.theirs) * Math.abs(p.d), 0) / wsum
const plainMAE = pairs.reduce((s, p) => s + Math.abs(p.d), 0) / pairs.length

console.log(`categories (${CATS.length}): ${CATS.join(' ')}`)
console.log(`matched ${pairs.length} of 250   (unmatched ${unmatched.length})`)
console.log(`plain mean |gap|      ${plainMAE.toFixed(1)} places`)
console.log(`WEIGHTED mean |gap|   ${weightedMAE.toFixed(1)} places  (1/log2 discount — top of board dominates)`)

console.log(`\nAGREEMENT AT THE TOP — how many of their top N are in our top N`)
for (const n of [10, 25, 50, 100, 150]) {
  const theirs = new Set(pairs.filter(p => p.theirs <= n).map(p => p.name))
  const oursN = new Set(pairs.filter(p => p.ours <= n).map(p => p.name))
  const hit = [...theirs].filter(x => oursN.has(x)).length
  console.log(`  top ${String(n).padStart(3)}: ${hit}/${theirs.size}  (${(100 * hit / theirs.size).toFixed(0)}%)`)
}

console.log(`\nERROR BY BAND — mean |gap| in ranks, and what that is in ${TEAMS}-team rounds`)
const bands: [string, number, number][] = [
  ['1-12   (rd 1)', 1, 12], ['13-36  (rd 2-3)', 13, 36], ['37-72  (rd 4-6)', 37, 72],
  ['73-120 (rd 7-10)', 73, 120], ['121+   (rd 11+)', 121, 9999],
]
for (const [label, lo, hi] of bands) {
  const b = pairs.filter(p => p.theirs >= lo && p.theirs <= hi)
  if (!b.length) continue
  const mae = b.reduce((s, p) => s + Math.abs(p.d), 0) / b.length
  console.log(`  ${label.padEnd(18)} n=${String(b.length).padStart(3)}  mean ${mae.toFixed(1)} places = ${(mae / TEAMS).toFixed(1)} rounds`)
}

/* The actionable list: disagreements ranked by what they cost, not by their size. */
const cost = (p: Pair) => Math.abs(p.d) * W(Math.min(p.theirs, p.ours))
console.log(`\nMOST EXPENSIVE DISAGREEMENTS  (gap x where it happens)`)
console.log(`  ${'player'.padEnd(22)} ${'pos'.padEnd(7)} ours theirs   gap  rounds`)
for (const p of [...pairs].sort((x, y) => cost(y) - cost(x)).slice(0, 20)) {
  const dir = p.d < 0 ? 'WE HIGH' : 'WE LOW '
  console.log(`  ${p.name.padEnd(22)} ${p.pos.padEnd(7)} ${String(p.ours).padStart(4)} ${String(p.theirs).padStart(6)} ${String(p.d).padStart(5)}  ${(Math.abs(p.d) / TEAMS).toFixed(1)}  ${dir}`)
}

console.log(`\nBY POSITION  (weighted mean |gap|)`)
const groups = new Map<string, Pair[]>()
for (const p of pairs) {
  const key = p.pos === 'G' ? 'G' : p.pos === 'D' ? 'D' : 'F'
  groups.set(key, [...(groups.get(key) ?? []), p])
}
for (const [k, g] of [...groups].sort()) {
  const w = g.reduce((s, p) => s + W(p.theirs), 0)
  const wm = g.reduce((s, p) => s + W(p.theirs) * Math.abs(p.d), 0) / w
  const bias = g.reduce((s, p) => s + p.d, 0) / g.length
  console.log(`  ${k}  n=${String(g.length).padStart(3)}  weighted ${wm.toFixed(1)}  mean signed ${bias > 0 ? '+' : ''}${bias.toFixed(1)} (${bias > 0 ? 'we rank lower' : 'we rank higher'})`)
}

console.log(`\nIN THEIR TOP 50, MISSING FROM OUR BOARD ENTIRELY:`)
const top50missing = unmatched.filter(u => Number(u.split('.')[0]) <= 50)
console.log(top50missing.length ? top50missing.map(x => '  ' + x).join('\n') : '  (none)')
