/*
 * Our category draft board against an outside consensus.
 *
 * Run: S=<dir> npx vite-node scripts/hockey-consensus-audit.ts
 * where <dir> holds espn2027.json (a saved /api/hockey-projections response) and analyst.json
 * ({ "<rank>": { name, pos } }, parsed from the published list).
 *
 * The comparison MUST re-rank both sides within the matched subset. A first pass compared our
 * raw ranks (1..940) against a 250-long list and produced a Spearman of -3.99, which is not a
 * number the statistic can take — the scales were different, not the orderings. See
 * docs/hockey-category-audit-2026.md for what it found once that was fixed.
 *
 * It also has to run the REAL board (buildHockeyBoard), not buildHockeyCategoryValue directly.
 * The raw z-total buries every goalie, because goalies score zero in eight skater columns; it
 * is the VOR step that pools by position and makes a goalie comparable to a goalie.
 */
import { readFileSync } from 'node:fs'
import { rateSkaters } from '@/hockey/nhlRates'
import { mergeHockeyProjections, normalizeName } from '@/hockey/hockeyProjectionSource'
import { buildHockeyBoard } from '@/hockey/hockeyBoard'
import { YAHOO_DEFAULT_CATEGORIES } from '@/hockey/manualRules'
const S = process.env.S ?? '.'
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
  leagueId: 'x', season: 2027, name: 'cmp', teams: 12, scoringType: 'H2H_CATEGORY',
  weights: {},
  categories: YAHOO_DEFAULT_CATEGORIES.map((k) => ({ key: k, statId: 0, reverse: k === 'GAA' })),
  slots: { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 0 },
  rosterSize: 20, unnamedScoredStatIds: [],
}
const board = buildHockeyBoard({ projections, rules, namesByKey: merged.namesByKey, teamsByKey: merged.teamByKey, drafted: new Set<string>() })
console.log(`board mode: ${board.mode}, rows: ${board.rows.length}`)
const ours = new Map(board.rows.map((r, i) => [normalizeName(r.name), { rank: i + 1, pos: r.position }]))
console.log('our top 12:', board.rows.slice(0, 12).map((r, i) => `${i+1}.${r.name}(${r.position})`).join('  '))
const goalieRanks = board.rows.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => r.position === 'G').slice(0, 6)
console.log('our top goalies:', goalieRanks.map((g) => `${g.name}#${g.rank}`).join('  '))

const analyst: Record<string, { name: string; pos: string }> = JSON.parse(readFileSync(S + '/analyst.json', 'utf8'))
const pairs: any[] = []
for (const [rk, a] of Object.entries(analyst)) {
  const m = ours.get(normalizeName(a.name))
  if (m) pairs.push({ name: a.name, pos: a.pos, theirs: Number(rk), ours: m.rank })
}
// proper Spearman: re-rank BOTH within the matched subset
const rank = (vals: number[]) => { const idx = vals.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]); const o = new Array(vals.length); idx.forEach(([, i], k) => { o[i] = k + 1 }); return o }
const a = rank(pairs.map((p) => p.ours)), b = rank(pairs.map((p) => p.theirs)), n = pairs.length
const d2 = a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0)
console.log(`\nmatched ${n} of 250`)
console.log(`Spearman vs DailyFaceoff consensus: ${(1 - 6 * d2 / (n * (n * n - 1))).toFixed(3)}`)
console.log(`mean absolute rank gap: ${(pairs.reduce((s, p) => s + Math.abs(p.ours - p.theirs), 0) / n).toFixed(1)} places`)
const sk = pairs.filter((p) => p.pos !== 'G'), go = pairs.filter((p) => p.pos === 'G')
const sp = (arr: any[]) => { const x = rank(arr.map((p) => p.ours)), y = rank(arr.map((p) => p.theirs)), m = arr.length
  return (1 - 6 * x.reduce((s: number, v: number, i: number) => s + (v - y[i]) ** 2, 0) / (m * (m * m - 1))).toFixed(3) }
console.log(`  skaters only (${sk.length}): ${sp(sk)}   goalies only (${go.length}): ${sp(go)}`)
console.log(`\nWE MUCH HIGHER:`)
for (const p of [...pairs].sort((x, y) => (x.ours - x.theirs) - (y.ours - y.theirs)).slice(0, 10))
  console.log(`  ${p.name.padEnd(22)} ${p.pos.padEnd(7)} us ${String(p.ours).padStart(4)}  them ${String(p.theirs).padStart(3)}`)
console.log(`\nTHEY MUCH HIGHER:`)
for (const p of [...pairs].sort((x, y) => (y.ours - y.theirs) - (x.ours - x.theirs)).slice(0, 10))
  console.log(`  ${p.name.padEnd(22)} ${p.pos.padEnd(7)} us ${String(p.ours).padStart(4)}  them ${String(p.theirs).padStart(3)}`)
