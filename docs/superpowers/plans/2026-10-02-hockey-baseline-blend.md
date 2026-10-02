# Hockey Baseline Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Average our hockey per-game skater rates and goalie quality rates 50/50 with 5v5
Hockey's free projections, while keeping our games played and goalie starts, so every hockey
surface stays near the consensus.

**Architecture:**
- A server endpoint pulls and reduces 5v5's two embedded tables once a day.
- A pure module blends them into our `SkaterRate[]` and `GoalieProjection[]`, joined by NHL id.
- `useNhlFeed` applies the blend once, so every surface (all of which read `mergeFeed(feed)`)
  inherits it.
- If the pull fails, the feed is left exactly as it is today.

**Tech Stack:** Vercel serverless (Node ESM), Vue 3 + TS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-02-hockey-baseline-blend-design.md`

## Global Constraints

- **Weight:** `BASELINE_WEIGHT = 0.5`.
- **Skater rate** = `*_season_proj ÷ 84`. Never use `*_ros` columns and never average totals.
- **Skaters:** blend goals, assists, plusMinus, penaltyMinutes, ppPoints, shots, hits and
  blockedShots, then set `points = goals + assists`.
  - `ppGoals` keeps our `ppGoals/ppPoints` ratio, applied to the blended ppPoints.
  - shGoals, shPoints, gamesPlayed, confidence and ppSecondsPerGame stay ours.
- **Goalies:** blend savePct, wins-per-start and shutouts-per-start. Keep starts and
  shotsAgainst. Recompute `wins = starts·winRate`, `shutouts = starts·soRate`,
  `saves = shotsAgainst·savePct`, `goalsAgainst = shotsAgainst − saves`.
- **Joins** use the NHL `playerId`, which is 5v5's `player_nhl_id`. No name matching.
- **Failures:**
  - On 5v5 failure, fewer than 300 skaters, or no `tableData`, the endpoint responds 502 and
    the client applies nothing. A failed baseline never blocks or alters the feed.
  - A skater row whose season_proj columns are all 0 is skipped.
- **Caching:** `Cache-Control: s-maxage=86400, stale-while-revalidate=86400`.
- **Git and deploy:**
  - Commit locally on branch `hockey-baseline-blend`.
  - Never push or deploy.
  - Never commit `src/data/landingBoard.json`.
- There is no Vue auto-import. Every import must resolve.

## Review Focus

1. **5v5 serves the page but the JSON shape changes** (e.g. renamed keys). Every value would
   come back undefined, so NaN would leak into rates. Expect: rows without finite numbers are
   skipped; fewer than 300 valid skaters gives a 502. Pinned in Task 2.
2. **A goalie with 0 starts in our projection.** Division by zero when computing per-start
   rates. Expect: left unchanged. Pinned in Task 1.
3. **A skater with ppPoints 0 in ours but > 0 blended.** The ppGoals ratio is undefined.
   Expect: use the league-typical 1/3. Pinned in Task 1.
4. **The dev server answers `/api/hockey-baseline` with a non-JSON 200** (the documented
   ESPN gotcha). Expect: treated as a failure; the feed is unchanged. Pinned in Task 3.
5. **Duplicate `player_nhl_id` rows on 5v5.** Expect: the first wins, and no double-blending.
   Pinned in Task 2.

---

### Task 1: Pure blend (`src/hockey/baselineBlend.ts`)

**Files:** Create `src/hockey/baselineBlend.ts`; test `src/hockey/__tests__/baselineBlend.test.ts`.

**Interfaces:**
- Consumes: `SkaterRate` from `src/hockey/nhlRates.ts` (`{playerId, name, position, team,
  gamesPlayed, perGame: Record<string, number>, ppSecondsPerGame, confidence}`), and
  `GoalieProjection` from `src/hockey/goalieProjection.ts` (`{playerId, name, team, starts,
  wins, saves, goalsAgainst, shutouts, savePct, shotsAgainst}`).
- Produces:
  ```ts
  export interface BaselineSkater { playerId: number; name: string; perGame: Record<string, number> }
  export interface BaselineGoalie { playerId: number; name: string; savePct: number; winsPerStart: number; shutoutsPerStart: number }
  export interface Baseline { fetchedAt: string; skaters: BaselineSkater[]; goalies: BaselineGoalie[] }
  export const BASELINE_WEIGHT = 0.5
  export const BLENDED_SKATER_CATEGORIES: readonly string[]  // goals, assists, plusMinus, penaltyMinutes, ppPoints, shots, hits, blockedShots
  export function blendSkaterRates(rates: SkaterRate[], baseline: Baseline, w?: number): { rates: SkaterRate[]; matched: number }
  export function blendGoalieProjections(goalies: GoalieProjection[], baseline: Baseline, w?: number): { goalies: GoalieProjection[]; matched: number }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { blendSkaterRates, blendGoalieProjections, type Baseline } from '../baselineBlend'

const rate = (playerId: number, perGame: Record<string, number>) => ({
  playerId, name: `P${playerId}`, position: 'C', team: 'COL', gamesPlayed: 80,
  perGame, ppSecondsPerGame: 180, confidence: 0.9,
})
const base: Baseline = {
  fetchedAt: '2026-10-02T00:00:00Z',
  skaters: [{ playerId: 1, name: 'P1', perGame: { goals: 0.6, assists: 0.8, plusMinus: 0.2, penaltyMinutes: 0.4,
                                                   ppPoints: 0.3, shots: 4, hits: 1, blockedShots: 0.5 } }],
  goalies: [{ playerId: 9, name: 'G9', savePct: 0.920, winsPerStart: 0.6, shutoutsPerStart: 0.1 }],
}

describe('blendSkaterRates', () => {
  const ours = rate(1, { goals: 0.4, assists: 0.6, points: 1.0, plusMinus: 0, penaltyMinutes: 0.2,
                         ppPoints: 0.3, ppGoals: 0.1, shots: 3, hits: 2, blockedShots: 0.5, shGoals: 0.01, shPoints: 0.02 })
  it('averages each covered category 50/50', () => {
    const { rates, matched } = blendSkaterRates([ours], base)
    const g = rates[0].perGame
    expect(matched).toBe(1)
    expect(g.goals).toBeCloseTo(0.5); expect(g.assists).toBeCloseTo(0.7); expect(g.shots).toBeCloseTo(3.5)
    expect(g.hits).toBeCloseTo(1.5); expect(g.penaltyMinutes).toBeCloseTo(0.3)
  })
  it('keeps points = goals + assists, ppGoals on our ratio, short-handed ours', () => {
    const g = blendSkaterRates([ours], base).rates[0].perGame
    expect(g.points).toBeCloseTo(1.2)
    expect(g.ppGoals).toBeCloseTo(0.3 * (0.1 / 0.3))
    expect(g.shGoals).toBe(0.01); expect(g.shPoints).toBe(0.02)
  })
  it('uses 1/3 for ppGoals when our ppPoints is 0', () => {
    const z = rate(1, { goals: 0.4, assists: 0.6, points: 1, ppPoints: 0, ppGoals: 0, shots: 3 })
    const g = blendSkaterRates([z], base).rates[0].perGame
    expect(g.ppPoints).toBeCloseTo(0.15)
    expect(g.ppGoals).toBeCloseTo(0.05)
  })
  it('leaves unmatched players and keeps games played', () => {
    const other = rate(2, { goals: 0.4 })
    const r = blendSkaterRates([ours, other], base).rates
    expect(r[1]).toEqual(other)
    expect(r[0].gamesPlayed).toBe(80)
  })
  it('does not mutate the input', () => {
    const before = JSON.stringify(ours)
    blendSkaterRates([ours], base)
    expect(JSON.stringify(ours)).toBe(before)
  })
})

describe('blendGoalieProjections', () => {
  const g = { playerId: 9, name: 'G9', team: 'TB', starts: 60, wins: 30, saves: 1600, goalsAgainst: 160,
              shutouts: 3, savePct: 0.909, shotsAgainst: 1760 }
  it('blends quality, keeps starts and shots, stays internally consistent', () => {
    const { goalies, matched } = blendGoalieProjections([g], base)
    const b = goalies[0]
    expect(matched).toBe(1)
    expect(b.starts).toBe(60); expect(b.shotsAgainst).toBe(1760)
    expect(b.savePct).toBeCloseTo((0.909 + 0.92) / 2)
    expect(b.wins).toBeCloseTo(60 * ((30 / 60 + 0.6) / 2))
    expect(b.shutouts).toBeCloseTo(60 * ((3 / 60 + 0.1) / 2))
    expect(b.saves + b.goalsAgainst).toBeCloseTo(1760)
  })
  it('leaves a goalie with 0 starts unchanged', () => {
    const z = { ...g, starts: 0, wins: 0, shutouts: 0 }
    expect(blendGoalieProjections([z], base).goalies[0]).toEqual(z)
  })
})
```

- [ ] **Step 2: Run to verify it fails.** Run:
  `npx vitest run src/hockey/__tests__/baselineBlend.test.ts`. Expected: FAIL (cannot resolve
  `../baselineBlend`).
- [ ] **Step 3: Implement.**

```ts
// src/hockey/baselineBlend.ts
import type { SkaterRate } from './nhlRates'
import type { GoalieProjection } from './goalieProjection'

/**
 * OUR RATES, HALF-WEIGHTED TOWARD A FREE PUBLIC BASELINE (5v5 Hockey), so the board cannot
 * drift far from consensus. The same idea as football's weekly analyst blend.
 *
 * Rates, never totals: their rest-of-season columns zero out 70 skaters and give everyone else
 * a flat 84 games, so they have no playing-time model to average with. We keep our games played
 * and our goalie starts (theirs are templated at about 76 for a starter and 21 for a backup),
 * and average only how good each player is per game or per start.
 * Measured 2026-10-02: skater top-10s agreed within about 2 ranks; 21-30 drifted 7-14.
 */
export interface BaselineSkater { playerId: number; name: string; perGame: Record<string, number> }
export interface BaselineGoalie { playerId: number; name: string; savePct: number; winsPerStart: number; shutoutsPerStart: number }
export interface Baseline { fetchedAt: string; skaters: BaselineSkater[]; goalies: BaselineGoalie[] }

export const BASELINE_WEIGHT = 0.5
export const BLENDED_SKATER_CATEGORIES = [
  'goals', 'assists', 'plusMinus', 'penaltyMinutes', 'ppPoints', 'shots', 'hits', 'blockedShots',
] as const

const mix = (a: number, b: number, w: number) => a * (1 - w) + b * w

export function blendSkaterRates(rates: SkaterRate[], baseline: Baseline, w = BASELINE_WEIGHT) {
  const theirs = new Map(baseline.skaters.map((s) => [s.playerId, s]))
  let matched = 0
  const out = rates.map((r) => {
    const t = theirs.get(r.playerId)
    if (!t) return r
    matched++
    const pg = { ...r.perGame }
    for (const c of BLENDED_SKATER_CATEGORIES) {
      const ours = pg[c], their = t.perGame[c]
      if (Number.isFinite(ours) && Number.isFinite(their)) pg[c] = mix(ours, their, w)
    }
    pg.points = (pg.goals ?? 0) + (pg.assists ?? 0)
    const ppShare = r.perGame.ppPoints > 0 ? (r.perGame.ppGoals ?? 0) / r.perGame.ppPoints : 1 / 3
    if (Number.isFinite(pg.ppPoints)) pg.ppGoals = pg.ppPoints * ppShare
    return { ...r, perGame: pg }
  })
  return { rates: out, matched }
}

export function blendGoalieProjections(goalies: GoalieProjection[], baseline: Baseline, w = BASELINE_WEIGHT) {
  const theirs = new Map(baseline.goalies.map((g) => [g.playerId, g]))
  let matched = 0
  const out = goalies.map((g) => {
    const t = theirs.get(g.playerId)
    if (!t || !(g.starts > 0)) return g
    matched++
    const savePct = mix(g.savePct, t.savePct, w)
    const winRate = mix(g.wins / g.starts, t.winsPerStart, w)
    const soRate = mix(g.shutouts / g.starts, t.shutoutsPerStart, w)
    const saves = g.shotsAgainst * savePct
    return { ...g, savePct, wins: g.starts * winRate, shutouts: g.starts * soRate,
             saves, goalsAgainst: g.shotsAgainst - saves }
  })
  return { goalies: out, matched }
}
```

- [ ] **Step 4: Run to verify it passes.** Run:
  `npx vitest run src/hockey/__tests__/baselineBlend.test.ts`. Expected: PASS (7 tests).
- [ ] **Step 5: Commit**:
  `git add src/hockey/baselineBlend.ts src/hockey/__tests__/baselineBlend.test.ts && git commit -m "hockey: blend our rates with a public baseline, rates not totals, our games kept"`

---

### Task 2: Endpoint (`api/hockey-baseline.js`)

**Files:** Create `api/hockey-baseline.js`; test `api/__tests__/hockey-baseline.test.js`.

**Interfaces:**
- Produces:
  - `export function extractTableData(html: string): any[] | null`
  - `export function toBaseline(skaterRows: any[], goalieRows: any[], fetchedAt: string): Baseline`
    (the shape is in Task 1)
  - `export default async function handler(req, res)`
- Mirror `api/hockey-projections.js` for style: CORS headers, OPTIONS → 200, and the
  `Cache-Control` usage.

- [ ] **Step 1: Write the failing tests**

```js
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
  it('502s when the skater table is too small', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => page([sk(1)]) })))
    const r = res(); await handler({ method: 'GET', query: {} }, r)
    expect(r.statusCode).toBe(502)
  })
  it('serves a cached baseline when both tables are healthy', async () => {
    const many = Array.from({ length: 320 }, (_, i) => sk(i + 1))
    vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true, text: async () => page(String(url).includes('goalie') ? [gk(9)] : many) })))
    const r = res(); await handler({ method: 'GET', query: {} }, r)
    expect(r.statusCode).toBe(200)
    expect(r.body.skaters).toHaveLength(320)
    expect(r.headers['Cache-Control']).toMatch(/s-maxage=86400/)
  })
})
```

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run api/__tests__/hockey-baseline.test.js`.
  Expected: FAIL (module not found).
- [ ] **Step 3: Implement.**

```js
// api/hockey-baseline.js
//
// 5v5 Hockey's free rest-of-season projections, reduced to per-game rates for the hockey
// baseline blend (src/hockey/baselineBlend.ts). Both tables are embedded in their pages as
// `const tableData = [...]`. At most one pull per day reaches them (s-maxage=86400).
//
// Rates come from the FULL-SEASON columns divided by 84 games. Their rest-of-season columns
// zero out about 70 skaters and give the rest a flat 84 games, so they are not usable as totals.
// Anything that doesn't look like their real table is a 502, never a partial baseline.

const SKATERS_URL = 'https://5v5hockey.com/ros-projections-embedded/'
const GOALIES_URL = 'https://5v5hockey.com/goalie-ros-projections-embedded/'
const SEASON_GP = 84
const MIN_SKATERS = 300
const SKATER_KEYS = { goals: 'g', assists: 'a', plusMinus: 'plus_minus', penaltyMinutes: 'pim',
  ppPoints: 'ppp', shots: 'sog', hits: 'hit', blockedShots: 'blk' }

export function extractTableData(html) {
  const marker = 'const tableData = '
  const i = typeof html === 'string' ? html.indexOf(marker) : -1
  if (i < 0) return null
  const start = i + marker.length
  // The array ends at the first "];" that closes it; parse greedily up to there.
  const end = html.indexOf('];', start)
  if (end < 0) return null
  try {
    const rows = JSON.parse(html.slice(start, end + 1))
    return Array.isArray(rows) ? rows : null
  } catch { return null }
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function toBaseline(skaterRows, goalieRows, fetchedAt) {
  const skaters = []
  const seen = new Set()
  for (const r of skaterRows ?? []) {
    const id = num(r?.player_nhl_id)
    if (id === null || seen.has(id)) continue
    const perGame = {}
    let ok = true, any = false
    for (const [cat, k] of Object.entries(SKATER_KEYS)) {
      const v = num(r[`${k}_season_proj`])
      if (v === null) { ok = false; break }
      if (v !== 0) any = true
      perGame[cat] = v / SEASON_GP
    }
    if (!ok || !any) continue
    seen.add(id)
    skaters.push({ playerId: id, name: String(r.player_name ?? ''), perGame })
  }
  const goalies = []
  const seenG = new Set()
  for (const g of goalieRows ?? []) {
    const id = num(g?.player_nhl_id), gs = num(g?.gs_season_proj)
    const w = num(g?.w_season_proj), so = num(g?.so_season_proj), sv = num(g?.sv_pct_season_proj)
    if (id === null || seenG.has(id) || !gs || gs <= 0 || w === null || so === null || sv === null) continue
    seenG.add(id)
    goalies.push({ playerId: id, name: String(g.player_name ?? ''), savePct: sv, winsPerStart: w / gs, shutoutsPerStart: so / gs })
  }
  return { fetchedAt, skaters, goalies }
}

async function page(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (UFD baseline; once daily)' } })
  if (!r.ok) throw new Error(`${url} -> ${r.status}`)
  return extractTableData(await r.text())
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const [sk, gl] = await Promise.all([page(SKATERS_URL), page(GOALIES_URL)])
    if (!sk) return res.status(502).json({ error: 'skater table not found' })
    const baseline = toBaseline(sk, gl ?? [], new Date().toISOString())
    if (baseline.skaters.length < MIN_SKATERS) {
      return res.status(502).json({ error: `only ${baseline.skaters.length} usable skaters` })
    }
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400')
    return res.status(200).json(baseline)
  } catch (e) {
    return res.status(502).json({ error: String(e?.message ?? e) })
  }
}
```

  Note: check `extractTableData` against the real page:
  `curl -sSL https://5v5hockey.com/ros-projections-embedded/ | node -e "..."`. If `'];'`
  appears inside the JSON (it shouldn't), switch to a bracket-depth scan, and add a test case
  for it.

- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run api/__tests__/hockey-baseline.test.js`.
  Then do one live check:
  `node -e "import('./api/hockey-baseline.js').then(async m=>{const r={setHeader(){},status(c){this.c=c;return this},json(b){console.log(this.c, b.skaters?.length, b.goalies?.length);return this},end(){}};await m.default({method:'GET',query:{}},r)})"`.
  Expected: `200 <about 540> <about 90>`.
- [ ] **Step 5: Commit**:
  `git add api/hockey-baseline.js api/__tests__/hockey-baseline.test.js && git commit -m "api: hockey baseline, 5v5's free projections as per-game rates, once a day"`

---

### Task 3: Wire into the feed (`src/composables/useNhlFeed.ts`)

**Files:**
- Modify `src/composables/useNhlFeed.ts`: `loadFeed` (around lines 102-330) and the `NhlFeed`
  interface (around line 28).
- Create `src/hockey/fetchBaseline.ts`.
- Test `src/hockey/__tests__/fetchBaseline.test.ts`.

**Interfaces:**
- Consumes: `Baseline`, `blendSkaterRates` and `blendGoalieProjections` (Task 1), and the
  endpoint `/api/hockey-baseline` (Task 2).
- Produces:
  - `export async function fetchBaseline(url = '/api/hockey-baseline'): Promise<Baseline | null>`
    returns null on non-OK, non-JSON content-type, a thrown fetch, or a payload without
    `skaters` as an array. On failure it calls `console.warn` and never throws.
  - `NhlFeed.baseline?: { fetchedAt: string; skatersMatched: number; goaliesMatched: number }`.

- [ ] **Step 1: Write the failing tests** (for `fetchBaseline`):

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchBaseline } from '../fetchBaseline'
const ok = (body: unknown, type = 'application/json') =>
  ({ ok: true, headers: { get: () => type }, json: async () => body })
describe('fetchBaseline', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('returns the baseline on a healthy JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ fetchedAt: 't', skaters: [], goalies: [] })))
    expect((await fetchBaseline())?.fetchedAt).toBe('t')
  })
  it('treats a non-JSON 200 as a failure (dev server serving source)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok('// source', 'text/javascript')))
    expect(await fetchBaseline()).toBeNull()
  })
  it('treats a 502 and a thrown fetch as failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, headers: { get: () => 'application/json' } })))
    expect(await fetchBaseline()).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await fetchBaseline()).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails, then implement `src/hockey/fetchBaseline.ts`:**

```ts
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
```

- [ ] **Step 3: Wire into `loadFeed`.**
  1. Start `fetchBaseline()` in parallel with the existing fetches, as early as
     `fetchEspn(...)` starts, and await it just before the final `return {...}`.
  2. If it returns non-null, apply both blends:
     ```ts
     const { rates: blendedRates, matched: skatersMatched } = blendSkaterRates(rates, baseline)
     const { goalies: blendedGoalies, matched: goaliesMatched } = blendGoalieProjections(goalieProjections, baseline)
     ```
  3. Return the blended values in place of `rates` and `goalieProjections`, plus
     `baseline: { fetchedAt, skatersMatched, goaliesMatched }`.
  4. When it returns null, return exactly what is returned today, with no `baseline` key.
  5. Add `baseline?` to the `NhlFeed` interface with a one-line comment.
  6. Import `fetchBaseline`, `blendSkaterRates` and `blendGoalieProjections` explicitly.
  7. **Do not** change `loadNhlFeed`/`useNhlFeed`'s caching.
- [ ] **Step 4: Run** `npx vitest run src/hockey src/composables` (all green), then `npm run build`
  followed by `git checkout src/data/landingBoard.json`. Also run
  `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "useNhlFeed|baselineBlend|fetchBaseline"`,
  which should print nothing.
- [ ] **Step 5: Commit**:
  `git add src/composables/useNhlFeed.ts src/hockey/fetchBaseline.ts src/hockey/__tests__/fetchBaseline.test.ts && git commit -m "hockey feed: blend toward the public baseline when it answers, unchanged when it doesn't"`

---

### After the tasks (controller, not an implementer)

- Rerun the 10/02 gap report against the blended board. The cards' board export goes through
  BASE, so point it at the local dev server with this branch running. Expected: the 21–30
  skater gaps fall, and the top 10s barely move.
- Report the before/after table to the user.
