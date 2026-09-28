/*
 * Our POINTS-league board against an outside baseline, band by band.
 *
 * Run: CSV=<path> npx vite-node scripts/hockey-points-baseline.ts
 *
 * WHY BANDS AND NOT ONE CORRELATION. A single rho hides where the error is, and in a draft the
 * error's location is most of its cost: three places wrong at pick 4 moves a first-rounder,
 * three places wrong at pick 140 is unobservable. So every band of ten is reported separately,
 * overall and within each position, which is how a drafter actually consumes a board — nobody
 * picks "the 34th player", they pick the best centre left.
 *
 * SCORING IS RECOVERED FROM THE BASELINE, NOT ASSUMED. Comparing two boards built on different
 * scoring systems measures the systems, not the projections. Least squares over the baseline's
 * own rows returns its rules exactly (R2 = 1.000000):
 *
 *     skaters  G 6   A 4   +/- 2   PPP 2   SOG 0.9   BLK 1
 *     goalies  W 5   SO 5   SV 0.6   GA -3
 *
 * and our board is then built with those same weights, so every gap below is a disagreement
 * about a PLAYER rather than about the rules.
 *
 * RANKED ON VAR, NOT RAW POINTS. Raw fantasy points are not comparable across positions — a
 * goalie out-scores every skater and a defenceman trails every forward — so the baseline's own
 * value-above-replacement column is the like-for-like comparison against our VOR.
 */
import { readFileSync } from 'node:fs'
import { mergeHockeyProjections, normalizeName } from '@/hockey/hockeyProjectionSource'
import { buildHockeyBoard } from '@/hockey/hockeyBoard'

const CSV = process.env.CSV ?? '/Users/joshdaniel/Downloads/all_pts_league.csv'
const TEAMS = Number(process.env.TEAMS ?? 12)

/* Recovered from the baseline itself — see the header. */
const WEIGHTS: Record<string, number> = {
  G: 6, A: 4, PLUSMINUS: 2, PPP: 2, SOG: 0.9, BLK: 1,
  W: 5, SHO: 5, SV: 0.6, GA: -3,
}

function parseCsv(text: string) {
  const out: Record<string, string>[] = []
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)
  const split = (line: string) => {
    const cells: string[] = []; let cur = ''; let q = false
    for (const ch of line) {
      if (ch === '"') { q = !q; continue }
      if (ch === ',' && !q) { cells.push(cur); cur = ''; continue }
      cur += ch
    }
    cells.push(cur); return cells
  }
  const head = split(lines[0])
  for (const line of lines.slice(1)) {
    const cells = split(line)
    out.push(Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ''])))
  }
  return out
}

const orig = globalThis.fetch
globalThis.fetch = ((i: any, init?: any) => {
  const u = typeof i === 'string' ? i : i.url
  return orig(u.startsWith('/') ? `https://www.ultimatefantasydashboard.com${u}` : u, init)
}) as any
const { loadNhlFeed } = await import('@/composables/useNhlFeed')

const feed = await loadNhlFeed(2027)
const merged = mergeHockeyProjections({ espn: feed.espn as any, rates: feed.rates as any, historyGames: feed.historyGames })
const projections = Object.fromEntries(Object.entries(merged.projections).filter(([k]) => !k.startsWith('nhl:')))

/*
 * SLOTS MATCHED TO THE BASELINE, not invented. Comparing against a roster it does not use
 * measures the roster. Its own replacement levels give it away: solving Points - VAR back into
 * its ranked pools puts the forward bar at the 74th forward, the defence bar at the 26th D and
 * the goalie bar at the 25th G — 6.2 F, 2.2 D and 2.1 G per team across twelve.
 *
 * A first pass used 2C/2LW/2RW/4D/2G/1UTIL, and the "defence replacement is 49 points too low"
 * it produced was that config, not the board.
 */
const SLOTS = JSON.parse(process.env.SLOTS ?? '{"F":6,"D":2,"G":2}')
const rules: any = {
  leagueId: 'x', season: 2027, name: 'pts', teams: TEAMS, scoringType: 'H2H_POINTS',
  weights: WEIGHTS, categories: [], slots: SLOTS,
  rosterSize: 20, unnamedScoredStatIds: [],
}
console.log('slots:', JSON.stringify(SLOTS))
const board = buildHockeyBoard({ projections, rules, namesByKey: merged.namesByKey, teamsByKey: merged.teamByKey, drafted: new Set<string>() })
console.log(`board mode: ${board.mode}   rows: ${board.rows.length}`)

const ourRank = new Map<string, number>()
const ourPos = new Map<string, string>()
board.rows.forEach((r, i) => { ourRank.set(normalizeName(r.name), i + 1); ourPos.set(normalizeName(r.name), r.position) })

const rows = parseCsv(readFileSync(CSV, 'utf8'))
const num = (v: string) => { const n = Number(String(v).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0 }
const base = rows
  .filter((r) => r.Player)
  .map((r) => ({ name: r.Player, pos: (r['Site Pos'] || r.Pos || '').toUpperCase(), var_: num(r.VAR), pts: num(r.Points) }))
  .filter((r) => r.var_ !== 0)
  .sort((a, b) => b.var_ - a.var_)
base.forEach((r, i) => ((r as any).rank = i + 1))

type Pair = { name: string; pos: string; theirs: number; ours: number; d: number }
const pairs: Pair[] = []
const missing: string[] = []
for (const b of base as any[]) {
  const o = ourRank.get(normalizeName(b.name))
  if (o == null) { missing.push(`${b.rank}. ${b.name} (${b.pos})`); continue }
  pairs.push({ name: b.name, pos: b.pos, theirs: b.rank, ours: o, d: o - b.rank })
}
console.log(`matched ${pairs.length} of ${base.length}   (unmatched ${missing.length})`)

function bandReport(label: string, list: Pair[], size = 10, upTo = 100) {
  console.log(`\n${label}`)
  console.log(`  band      n   mean|gap|  median  worst`)
  for (let lo = 1; lo <= upTo; lo += size) {
    const hi = lo + size - 1
    const b = list.filter((p) => p.theirs >= lo && p.theirs <= hi)
    if (!b.length) continue
    const gaps = b.map((p) => Math.abs(p.d)).sort((x, y) => x - y)
    const mean = gaps.reduce((s, v) => s + v, 0) / gaps.length
    const med = gaps[Math.floor(gaps.length / 2)]
    const worst = [...b].sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0]
    console.log(`  ${String(lo).padStart(3)}-${String(hi).padEnd(3)} ${String(b.length).padStart(4)}   ${mean.toFixed(1).padStart(7)}  ${String(med).padStart(6)}  ${worst.name} (${worst.ours} vs ${worst.theirs})`)
  }
}

bandReport('OVERALL — baseline rank vs ours', pairs)

/* Within position, re-ranked, because that is how a board is read: the best centre left. */
for (const pos of ['C', 'LW', 'RW', 'D', 'G']) {
  const sub = pairs.filter((p) => p.pos === pos)
  if (sub.length < 10) continue
  const byTheirs = [...sub].sort((a, b) => a.theirs - b.theirs)
  const byOurs = [...sub].sort((a, b) => a.ours - b.ours)
  const posRankOurs = new Map(byOurs.map((p, i) => [p.name, i + 1]))
  const re: Pair[] = byTheirs.map((p, i) => ({ ...p, theirs: i + 1, ours: posRankOurs.get(p.name)!, d: posRankOurs.get(p.name)! - (i + 1) }))
  bandReport(`${pos} — within position`, re, 10, 40)
}

console.log(`\nLARGEST DISAGREEMENTS IN THE BASELINE TOP 50`)
console.log(`  ${'player'.padEnd(24)} ${'pos'.padEnd(4)} ours  theirs   gap`)
for (const p of pairs.filter((x) => x.theirs <= 50).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 15)) {
  console.log(`  ${p.name.padEnd(24)} ${p.pos.padEnd(4)} ${String(p.ours).padStart(4)} ${String(p.theirs).padStart(7)} ${String(p.d).padStart(5)}`)
}

console.log(`\nIN OUR TOP 50, WAY DOWN THE BASELINE  (we like them, they do not)`)
for (const p of pairs.filter((x) => x.ours <= 50).sort((a, b) => b.theirs - a.theirs).slice(0, 12)) {
  console.log(`  ${p.name.padEnd(24)} ${p.pos.padEnd(4)} ours ${String(p.ours).padStart(3)}  theirs ${String(p.theirs).padStart(4)}`)
}

console.log(`\nUNMATCHED IN BASELINE TOP 50: ${missing.filter((m) => Number(m.split('.')[0]) <= 50).join(', ') || '(none)'}`)
