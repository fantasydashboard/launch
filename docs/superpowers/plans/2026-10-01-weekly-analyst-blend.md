# Weekly Analyst Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The football weekly board (`/this-week`) ranks players by a 50/50 blend of Sleeper's weekly projection and an admin-published analyst list for the current NFL week. Questionable players are ranked as if they play; lineup advice still applies the injury cut.

**Architecture:** A pure blend function and a pure week detector live in `src/football/weeklyBlend.ts`. A Supabase table `weekly_rankings` holds one published list per (sport, season, week), and `src/services/weeklyRankings.ts` reads and writes it. `useWeeklyBoard` swaps the browser-only `week` list for the published one. `buildWeeklyBoard` splits its single `week()` value into a ranking value (no Q/D cut) and a lineup value (with the cut).

**Tech Stack:** Vue 3, TypeScript, Pinia, Supabase JS client, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-weekly-analyst-blend-design.md`

## Global Constraints

- Football only. Hockey, the draft room (`applyRankingOrder`) and `/rankings` must be unchanged.
- Blend: within a position, `mapped = ladder[min(rank ?? lastRank + 1, ladder.length) - 1]`, then `(value + mapped) / 2`. Must stay identical to `blend_with_baseline` in `ufd-graphics/position-tiers.py`.
- Ranking value has NO Questionable/Doubtful cut; ruled-out players (`RULED_OUT`) are still 0. Lineup value = today's behaviour (`WEEKLY_INJURY_DISCOUNT`: Q 0.65, D 0.25, Out 0).
- When a published list is active, skip `adjustQbForEnvironment` and ignore the analyst's own tiers (tiers are drawn on blended points).
- With no published list for the current week, or on any fetch error, the board must behave exactly as it does today.
- Source label: "UFD weekly rankings" with a list, "UFD" without. The analyst is not named on the page.
- Week detection: the file's team/opponent pairs must match one week's schedule at 80% or better, or the publish is refused.
- Do NOT commit, push or deploy unless the user asks (the user's standing rule overrides the skill's "commit" steps). Migrations go to a shared prod DB (UFD + TLB): show the SQL to the user and apply only on their OK.
- Vue: there is no auto-import. Every new import must be verified at runtime, because a green build does not catch a missing import.

## Review Focus

1. **Name mismatches between the analyst file and our player names** ("Kenneth Walker III", "DJ Moore" vs "D.J. Moore"): an unmatched name is treated as unranked and pushed to the bottom of the ladder. Expect: suffix and punctuation differences still match. Pinned in Task 1 (`blendBoardWithList` suffix test).
2. **Monday/Tuesday before the new list:** the current week has no row, but last week's does. Expect: Sleeper-only for the new week, never last week's list. Pinned in Task 4 (the service queries the exact week) and in Task 5's manual check.
3. **Supabase unavailable** (`supabase` is null when env vars are missing, or the request errors). Expect: Sleeper-only board, no crash. Pinned in Task 4 (null client returns null).
4. **A ruled-Out player** is still a zero in the RANKING, not "as if he plays". Pinned in Task 3.
5. **A wide file containing DEF/K/FLEX blocks.** Expect: they are ignored and QB/RB/WR/TE still blend. Pinned in Task 1 (fixture includes a FLEX block).

---

### Task 1: Pure blend (`weeklyBlend.ts`)

**Files:**
- Create: `src/football/weeklyBlend.ts`
- Test: `src/football/__tests__/weeklyBlend.test.ts`

**Interfaces:**
- Consumes: `splitWideRankings`, `parseRankings`, `matchRankings` from `@/draft/room/customRankings`.
- Produces:
  - `blendWithAnalyst(entries: BlendEntry[], rankByKey: Record<string, number>): Record<string, number>`
  - `blendBoardWithList(entries: BlendEntry[], names: { playerKey: string; name: string; position: string }[], text: string): Record<string, number> | null` (null when the text yields no usable positions)
  - `export interface BlendEntry { playerKey: string; value: number; position: string }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/football/__tests__/weeklyBlend.test.ts
import { describe, it, expect } from 'vitest'
import { blendWithAnalyst, blendBoardWithList } from '../weeklyBlend'

const te = [
  { playerKey: 'mcb', value: 13.8, position: 'TE' },
  { playerKey: 'bow', value: 12.2, position: 'TE' },
  { playerKey: 'fan', value: 10.0, position: 'TE' },
  { playerKey: 'kit', value: 9.7, position: 'TE' },
]

describe('blendWithAnalyst', () => {
  it('maps an analyst rank onto the ladder and averages', () => {
    // analyst: bow 1, mcb 2, kit 3, fan 4
    const out = blendWithAnalyst(te, { bow: 1, mcb: 2, kit: 3, fan: 4 })
    expect(out.mcb).toBeCloseTo((13.8 + 12.2) / 2)
    expect(out.bow).toBeCloseTo((12.2 + 13.8) / 2)
    expect(out.fan).toBeCloseTo((10.0 + 9.7) / 2)   // his TE4 = ladder[3]
    expect(out.kit).toBeCloseTo((9.7 + 10.0) / 2)
  })

  it('places an unranked player one slot past the last rank', () => {
    const out = blendWithAnalyst(te, { mcb: 1, bow: 2 })   // lastRank 2 -> slot 3
    expect(out.fan).toBeCloseTo((10.0 + 10.0) / 2)
    expect(out.kit).toBeCloseTo((9.7 + 10.0) / 2)
  })

  it('clamps a rank deeper than the pool to the last slot', () => {
    const out = blendWithAnalyst(te, { kit: 40 })
    expect(out.kit).toBeCloseTo((9.7 + 9.7) / 2)
  })

  it('leaves a position the list says nothing about unchanged', () => {
    const qb = [{ playerKey: 'allen', value: 23.1, position: 'QB' }]
    const out = blendWithAnalyst([...te, ...qb], { mcb: 1 })
    expect(out.allen).toBe(23.1)
  })

  it('matches the graphics script on the week-4 TE example', () => {
    // position-tiers.py: Fannin Sleeper TE3 (10.0), analyst TE10 -> blended ~9.4 with a deeper ladder
    const ladder = [13.8, 12.2, 10.0, 9.8, 9.7, 9.7, 9.6, 9.5, 9.3, 8.6].map((v, i) => ({
      playerKey: `t${i}`, value: v, position: 'TE',
    }))
    const out = blendWithAnalyst(ladder, { t2: 10 })
    expect(out.t2).toBeCloseTo((10.0 + 8.6) / 2)
  })
})

const WIDE = [
  '"QB Rank","QB Player","QB Team","QB Opponent","QB Tier","TE Rank","TE Player","TE Team","TE Opponent","TE Tier","FLEX Rank","FLEX Player","FLEX Team","FLEX Pos"',
  '"1","Josh Allen","BUF","NE","1","1","Brock Bowers","LV","KC","1","1","Jahmyr Gibbs","DET","RB"',
  '"2","Lamar Jackson","BAL","TEN","1","2","Trey McBride","ARI","NYG","1","2","Bijan Robinson","ATL","RB"',
].join('\n')

describe('blendBoardWithList', () => {
  const names = [
    { playerKey: 'allen', name: 'Josh Allen', position: 'QB' },
    { playerKey: 'lamar', name: 'Lamar Jackson', position: 'QB' },
    { playerKey: 'mcb', name: 'Trey McBride', position: 'TE' },
    { playerKey: 'bow', name: 'Brock Bowers', position: 'TE' },
  ]
  const entries = [
    { playerKey: 'allen', value: 23.1, position: 'QB' },
    { playerKey: 'lamar', value: 21.9, position: 'QB' },
    { playerKey: 'mcb', value: 13.8, position: 'TE' },
    { playerKey: 'bow', value: 12.2, position: 'TE' },
  ]

  it('parses a wide sheet, ignores FLEX, and blends per position', () => {
    const out = blendBoardWithList(entries, names, WIDE)!
    expect(out.bow).toBeCloseTo((12.2 + 13.8) / 2)
    expect(out.allen).toBeCloseTo(23.1)
  })

  it('matches across a generational suffix', () => {
    const text = WIDE.replace('Lamar Jackson', 'Lamar Jackson Jr.')
    const out = blendBoardWithList(entries, names, text)!
    expect(out.lamar).toBeCloseTo(21.9)   // still matched at QB2, not pushed past the end
  })

  it('returns null for text with no usable positions', () => {
    expect(blendBoardWithList(entries, names, 'nothing here')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/football/__tests__/weeklyBlend.test.ts`
Expected: FAIL, "Failed to resolve import ../weeklyBlend".

- [ ] **Step 3: Write the implementation**

```ts
// src/football/weeklyBlend.ts
import { splitWideRankings, parseRankings, matchRankings } from '@/draft/room/customRankings'

/**
 * HALF SLEEPER, HALF A HUMAN RANKER (2026-10-01).
 *
 * Four seasons of backtest (2022-25) found nothing in the box score that beats Sleeper's weekly
 * ORDER, and the raw order read badly (Harold Fannin TE3). The analyst publishes ranks, not
 * points, so his rank is converted to points on our own ladder for that position: his TE10 is
 * worth whatever our TE10 projects. The two are averaged. Where both agree nothing moves.
 *
 * MUST stay identical to blend_with_baseline in ufd-graphics/position-tiers.py, or the posts
 * and the site disagree.
 */
export interface BlendEntry { playerKey: string; value: number; position: string }

const posOf = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

export function blendWithAnalyst(
  entries: BlendEntry[],
  rankByKey: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  const byPos = new Map<string, BlendEntry[]>()
  for (const e of entries) {
    out[e.playerKey] = e.value
    const p = posOf(e.position)
    byPos.set(p, [...(byPos.get(p) ?? []), e])
  }
  for (const group of byPos.values()) {
    const ranks = group.map((e) => rankByKey[e.playerKey]).filter((r): r is number => typeof r === 'number')
    if (!ranks.length) continue                      // the list says nothing about this position
    const lastRank = Math.max(...ranks)
    const ladder = group.map((e) => e.value).sort((a, b) => b - a)
    for (const e of group) {
      const r = rankByKey[e.playerKey] ?? lastRank + 1
      const mapped = ladder[Math.min(r, ladder.length) - 1]
      out[e.playerKey] = (e.value + mapped) / 2
    }
  }
  return out
}

/** Parse a published wide sheet, match names, blend. Null when nothing usable was found. */
export function blendBoardWithList(
  entries: BlendEntry[],
  names: { playerKey: string; name: string; position: string }[],
  text: string,
): Record<string, number> | null {
  const wide = splitWideRankings(text)
  if (!wide || !wide.parts.length) return null
  const rankByKey: Record<string, number> = {}
  for (const part of wide.parts) {
    const pos = part.position.toUpperCase()
    const pool = names.filter((n) => posOf(n.position) === pos)
    const parsed = parseRankings(part.text).map((r) => ({ ...r, position: pos }))
    Object.assign(rankByKey, matchRankings(parsed, pool).rankByKey)
  }
  if (!Object.keys(rankByKey).length) return null
  return blendWithAnalyst(entries, rankByKey)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/football/__tests__/weeklyBlend.test.ts`
Expected: PASS (8 tests). If the suffix test fails, check `normalizeName` in `customRankings.ts`. It strips `jr/sr/ii/iii/iv/v`, so the failure is in how the name reaches it, not in the normaliser.

- [ ] **Step 5: Checkpoint.** No commit (user rule). Run `git status` and confirm only the two new files.

---

### Task 2: Week detection

**Files:**
- Modify: `src/football/weeklyBlend.ts` (append)
- Test: `src/football/__tests__/weeklyBlend.test.ts` (append)

**Interfaces:**
- Consumes: `splitCsvLine` from `@/draft/room/customRankings`.
- Produces: `detectListWeek(text: string, gamesByWeek: Record<number, { home: string; away: string }[]>): { week: number; share: number } | null`

- [ ] **Step 1: Write the failing tests**

```ts
import { detectListWeek } from '../weeklyBlend'

const games = {
  3: [{ home: 'NE', away: 'BUF' }, { home: 'KC', away: 'LV' }],
  4: [{ home: 'BUF', away: 'NE' }, { home: 'LV', away: 'KC' }, { home: 'CAR', away: 'DET' }],
}
const wk4 = [
  '"QB Rank","QB Player","QB Team","QB Opponent","TE Rank","TE Player","TE Team","TE Opponent"',
  '"1","Josh Allen","BUF","NE","1","Brock Bowers","LV","KC"',
  '"2","Jared Goff","DET","CAR","2","Sam LaPorta","DET","CAR"',
].join('\n')

describe('detectListWeek', () => {
  it('finds the week whose schedule the file matches', () => {
    expect(detectListWeek(wk4, games)?.week).toBe(4)
  })
  it('ignores home/away order and JAC/JAX spelling', () => {
    // wk4 lists BUF vs NE from the away side; the schedule has BUF at home. Same game.
    expect(detectListWeek(wk4, games)?.share).toBe(1)
    const jac = { 4: [{ home: 'JAX', away: 'CIN' }] }
    const t2 = '"QB Rank","QB Player","QB Team","QB Opponent","RB Rank","RB Player","RB Team","RB Opponent"\n"1","Trevor Lawrence","JAC","CIN","1","Chase Brown","CIN","JAC"'
    expect(detectListWeek(t2, jac)?.week).toBe(4)
  })
  it('refuses a file that matches no week at 80%', () => {
    expect(detectListWeek(wk4, { 3: games[3] })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/football/__tests__/weeklyBlend.test.ts -t detectListWeek`
Expected: FAIL, "detectListWeek is not a function".

- [ ] **Step 3: Write the implementation (append to `weeklyBlend.ts`)**

```ts
import { splitCsvLine } from '@/draft/room/customRankings'

const TEAM_ALIAS: Record<string, string> = { JAC: 'JAX', WSH: 'WAS', LA: 'LAR' }
const team = (t: string) => { const u = (t || '').trim().toUpperCase(); return TEAM_ALIAS[u] ?? u }
const pairKey = (a: string, b: string) => [team(a), team(b)].sort().join('-')

/**
 * Which NFL week a wide analyst sheet is for, read from its own Team/Opponent columns.
 * Typed-in weeks get mistyped; the file already says which games it covers.
 */
export function detectListWeek(
  text: string,
  gamesByWeek: Record<number, { home: string; away: string }[]>,
): { week: number; share: number } | null {
  const lines = (text || '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return null
  const header = splitCsvLine(lines[0].replace(/﻿/g, ''))
  const cols: [number, number][] = []
  header.forEach((h, i) => {
    const m = /^(\w+)\s+Team$/i.exec(h.trim())
    if (!m) return
    const opp = header.findIndex((x) => x.trim().toLowerCase() === `${m[1].toLowerCase()} opponent`)
    if (opp >= 0) cols.push([i, opp])
  })
  const pairs = new Set<string>()
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    for (const [t, o] of cols) if (cells[t]?.trim() && cells[o]?.trim()) pairs.add(pairKey(cells[t], cells[o]))
  }
  if (!pairs.size) return null
  let best: { week: number; share: number } | null = null
  for (const [w, games] of Object.entries(gamesByWeek)) {
    const sched = new Set(games.map((g) => pairKey(g.home, g.away)))
    const hit = [...pairs].filter((p) => sched.has(p)).length
    const share = hit / pairs.size
    if (!best || share > best.share) best = { week: Number(w), share }
  }
  return best && best.share >= 0.8 ? best : null
}
```

Merge the `splitCsvLine` import into the existing import line at the top of the file. Do not leave two imports from the same module.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/football/__tests__/weeklyBlend.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Checkpoint.** No commit.

---

### Task 3: Ranking value vs lineup value in `buildWeeklyBoard`

**Files:**
- Modify: `src/football/weeklyBoard.ts` (around 661-700 for `injuryFactor`/`week`/`rankable`, and around 1203 for board-row `weekPoints`)
- Test: `src/football/__tests__/weeklyBoard.test.ts` (append)

**Interfaces:**
- Consumes: the existing `buildWeeklyBoard` input (the `pool[].status` injury tag).
- Produces: board rows and ranks (`posRank`, `flexRank`, row `weekPoints`) on the RANKING value. Lineup, moves, matchup and streamers stay on the LINEUP value (today's `week()`).

- [ ] **Step 1: Write the failing tests** (append; reuses `pv`, `slots`, `opp` from the top of the file)

```ts
describe('Questionable: ranked as if he plays, started on the cut value', () => {
  const qpool: PointsPoolPlayer[] = [
    { playerKey: 'qb', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
    { playerKey: 'rbQ', name: 'Hurt Back', position: 'RB', teamKey: 'me', proTeam: 'KC', status: 'Questionable' } as any,
    { playerKey: 'rbH', name: 'Healthy Back', position: 'RB', teamKey: 'me', proTeam: 'SF' },
    { playerKey: 'rb3', name: 'Third Back', position: 'RB', teamKey: 'me', proTeam: 'DAL' },
    { playerKey: 'rbOut', name: 'Out Back', position: 'RB', teamKey: 'me', proTeam: 'GB', status: 'Out' } as any,
  ]
  const vor = { qb: pv(20), rbQ: pv(18), rbH: pv(14), rb3: pv(10), rbOut: pv(25) }
  const b = buildWeeklyBoard({
    pool: qpool, vorByKey: vor, slots: { QB: 1, RB: 1 }, myTeamKey: 'me', currentStarters: [],
    freeAgents: [], opponentByTeam: opp,
  } as any)!

  it('ranks the Questionable back on his full projection', () => {
    const rank = (k: string) => [...b.starters, ...b.bench].find((r: any) => r.playerKey === k)!.posRank
    expect(rank('rbQ')).toBe(1)            // 18 beats 14, no 0.65 cut in the ranking
  })
  it('still starts the healthy back, because the lineup uses 18 x 0.65 = 11.7', () => {
    expect(b.starters.some((s: any) => s.playerKey === 'rbH')).toBe(true)
    expect(b.starters.some((s: any) => s.playerKey === 'rbQ')).toBe(false)
  })
  it('keeps a ruled-Out player at zero in the ranking too', () => {
    const r = [...b.starters, ...b.bench].find((x: any) => x.playerKey === 'rbOut')!
    expect(r.posRank).toBeGreaterThan(3)
  })
})
```

If `buildWeeklyBoard` needs more required input fields than the cast covers, copy the call shape from the first `describe` block in this test file and keep the new pool, vor and slots.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/football/__tests__/weeklyBoard.test.ts -t "Questionable: ranked"`
Expected: FAIL on the first test (today the rank uses the cut value, so rbQ = 11.7 ranks below rbH = 14).

- [ ] **Step 3: Implement.** Next to `injuryFactor` (around line 661), add a ranking factor and value:

```ts
  /*
   * TWO NUMBERS SINCE 2026-10-01. The RANK is "where he lands if he plays", which is how
   * a ranking is read and how the analyst we blend with ranks. Ruled-out is still zero,
   * because that one is not a guess. The LINEUP keeps the expected-value cut below, so the
   * optimiser never starts a coin-flip at full value.
   */
  const rankFactor = (key: string): number => (RULED_OUT.has(tagByKey.get(key) ?? '') ? 0 : 1)
  const rankPts = (key: string): number =>
    banked(key) ? actualPoints![key] : (vorByKey[key]?.pointsNextWeek ?? 0) * rankFactor(key)
```

Then change ONLY these call sites from `week(...)` to `rankPts(...)`:
- the two `rankable.push({ ... pts: week(...) })` lines (around 693 and 700)
- the board-row builder's `weekPoints: week(key)` (around 1203, inside the function that returns `WeeklyBoardRow` with `injuryTag`)

Leave every other `week(...)` (starters, bench, moves, `myDepth`, `oppDepth`, `oppPoints`, streamers) untouched.

- [ ] **Step 4: Run the whole football suite**

Run: `npx vitest run src/football`
Expected: all pass. If an older test asserted that a Questionable player RANKS lower, update it to the new rule and leave a one-line comment citing this plan. Do not change any lineup assertion.

- [ ] **Step 5: Checkpoint.** No commit.

---

### Task 4: Table and service

**Files:**
- Create: `supabase/migrations/20261001_weekly_rankings.sql`
- Create: `src/services/weeklyRankings.ts`
- Test: `src/services/__tests__/weeklyRankings.test.ts`

**Interfaces:**
- Produces:
  - `fetchPublishedWeekly(sport: 'football', season: number, week: number): Promise<PublishedWeekly | null>`
  - `publishWeekly(row: { sport: 'football'; season: number; week: number; source_name: string; body: string }): Promise<{ ok: true } | { ok: false; error: string }>`
  - `export interface PublishedWeekly { season: number; week: number; source_name: string; body: string; published_at: string }`

- [ ] **Step 1: Write the migration file** (do NOT apply it yet)

```sql
-- One published analyst weekly list per sport/season/week, read by every user's board.
-- Additive only: no triggers, nothing on existing tables (this DB is shared with TLB).
create table if not exists public.weekly_rankings (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  season int not null,
  week int not null check (week between 1 and 22),
  source_name text not null,
  body text not null,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  unique (sport, season, week)
);
alter table public.weekly_rankings enable row level security;

create policy weekly_rankings_read on public.weekly_rankings
  for select to anon, authenticated using (true);

create policy weekly_rankings_admin_insert on public.weekly_rankings
  for insert to authenticated
  with check (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.subscription_tier = 'admin'));

create policy weekly_rankings_admin_update on public.weekly_rankings
  for update to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.subscription_tier = 'admin'))
  with check (exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.subscription_tier = 'admin'));
```

- [ ] **Step 2: Write the failing test**

```ts
// src/services/__tests__/weeklyRankings.test.ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: null }))
import { fetchPublishedWeekly, publishWeekly } from '../weeklyRankings'

describe('weeklyRankings without a client', () => {
  it('fetch returns null so the board falls back to Sleeper', async () => {
    expect(await fetchPublishedWeekly('football', 2026, 4)).toBeNull()
  })
  it('publish reports an error instead of throwing', async () => {
    const r = await publishWeekly({ sport: 'football', season: 2026, week: 4, source_name: 'x.csv', body: 'x' })
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/services/__tests__/weeklyRankings.test.ts`
Expected: FAIL, "Failed to resolve import ../weeklyRankings".

- [ ] **Step 4: Implement**

```ts
// src/services/weeklyRankings.ts
import { supabase } from '@/lib/supabase'

export interface PublishedWeekly {
  season: number; week: number; source_name: string; body: string; published_at: string
}

/* The table is newer than the generated Database types, hence the narrow cast. */
const table = () => (supabase as any)?.from('weekly_rankings')

/** The list for exactly this week, or null. Never last week's: the board falls back instead. */
export async function fetchPublishedWeekly(
  sport: 'football', season: number, week: number,
): Promise<PublishedWeekly | null> {
  try {
    const t = table()
    if (!t) return null
    const { data, error } = await t
      .select('season, week, source_name, body, published_at')
      .eq('sport', sport).eq('season', season).eq('week', week)
      .maybeSingle()
    if (error) { console.warn('[weeklyRankings] fetch failed', error.message); return null }
    return (data as PublishedWeekly) ?? null
  } catch (e) {
    console.warn('[weeklyRankings] fetch threw', e)
    return null
  }
}

export async function publishWeekly(row: {
  sport: 'football'; season: number; week: number; source_name: string; body: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const t = table()
    if (!t) return { ok: false, error: 'Database not configured' }
    const { data: auth } = await (supabase as any).auth.getUser()
    const { error } = await t.upsert(
      { ...row, published_by: auth?.user?.id ?? null, published_at: new Date().toISOString() },
      { onConflict: 'sport,season,week' },
    )
    return error ? { ok: false, error: error.message } : { ok: true }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/weeklyRankings.test.ts`
Expected: PASS.

- [ ] **Step 6: STOP and show the user the migration SQL.** Apply it to the shared Supabase project (`ergxtydfgffqgkddclvr`) only after they say OK, using the method they choose (the SQL editor or `supabase db push`). Then verify with an anonymous read of the table, expecting 0 rows and no error.

---

### Task 5: Wire the published list into `useWeeklyBoard`

**Files:**
- Modify: `src/composables/useWeeklyBoard.ts` (imports 13-14; `loadWeek` around 68-82; `environmentVor` around 182-196; `effectiveVor` around 198-240; `weekTierByKey` around 256-264; returned `weekSource`/`sourceTiers` around 356-357)

**Interfaces:**
- Consumes: `fetchPublishedWeekly` (Task 4) and `blendBoardWithList` (Task 1).
- Produces: `publishedWeek: Ref<PublishedWeekly | null>` and `reloadPublished(): Promise<void>` returned from the composable (Task 6 uses them). `weekSource` becomes `'UFD weekly rankings' | 'UFD'`.

- [ ] **Step 1: Implement.**
  1. Replace `import { useCustomRankings } ...` and `import { applyRankingOrder } ...` with:
     ```ts
     import { fetchPublishedWeekly, type PublishedWeekly } from '@/services/weeklyRankings'
     import { blendBoardWithList } from '@/football/weeklyBlend'
     ```
  2. Delete `const weekRankings = useCustomRankings('week')`. Add:
     ```ts
     const publishedWeek = ref<PublishedWeekly | null>(null)
     const nflSeason = ref(0)
     async function reloadPublished() {
       publishedWeek.value = live.value && nflSeason.value && currentWeek.value
         ? await fetchPublishedWeekly('football', nflSeason.value, currentWeek.value)
         : null
     }
     ```
  3. In `loadWeek`, after `currentWeek.value = ...`, set `nflSeason.value = Number(state.season) || 0`. At the end of the `try`, call `await reloadPublished()`.
  4. In `environmentVor`, return `base` unchanged when `publishedWeek.value` is set. The QB implied-total adjustment was fitted to this analyst, so it is skipped when he is blended in:
     ```ts
     if (publishedWeek.value || !mean || !Object.keys(base).length) return base
     ```
  5. Rewrite `effectiveVor`:
     ```ts
     const effectiveVor = computed(() => {
       const base = environmentVor.value
       const list = publishedWeek.value
       if (!list || !Object.keys(base).length) return base
       const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()
       const entries = Object.entries(base).map(([k, v]) => ({
         playerKey: k, value: v.pointsNextWeek, position: normPos(nameByKey.value.get(k)?.position ?? ''),
       }))
       const names = entries.map((e) => ({ playerKey: e.playerKey, name: nameByKey.value.get(e.playerKey)?.name ?? '', position: e.position }))
       const blended = blendBoardWithList(entries, names, list.body)
       if (!blended) return base
       const out: typeof base = {}
       for (const [k, v] of Object.entries(base)) out[k] = { ...v, pointsNextWeek: blended[k] ?? v.pointsNextWeek }
       return out
     })
     ```
  6. Make `weekTierByKey` always return `{}` (tiers are drawn on the blended points), and delete its now-dead body.
  7. Return values:
     ```ts
     weekSource: computed(() => (publishedWeek.value ? 'UFD weekly rankings' : 'UFD')),
     sourceTiers: computed(() => false),
     publishedWeek,
     reloadPublished,
     ```
     Add `publishedWeek: Ref<PublishedWeekly | null>` and `reloadPublished: () => Promise<void>` to the composable's return interface.

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -v "src/wire/__tests__/streamBoard.test.ts"`
Expected: no output (the streamBoard errors are pre-existing and unrelated).

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 4: Checkpoint.** No commit.

---

### Task 6: Admin publish control and labels in `WeeklyView.vue`

**Files:**
- Create: `src/components/PublishWeeklyRankings.vue`
- Modify: `src/views/WeeklyView.vue` (the `RankingPicker kind="week"` around line 751, the `weekSource` label around 754-756, the tier-source line around 801, and the Q tooltip around 833-834)

**Interfaces:**
- Consumes: `publishWeekly` (Task 4), `detectListWeek` (Task 2), `sleeperService.getNflSchedule`, and `publishedWeek`/`reloadPublished` from `useWeeklyBoard` (Task 5).

- [ ] **Step 1: Create the component**

```vue
<!-- src/components/PublishWeeklyRankings.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { publishWeekly, type PublishedWeekly } from '@/services/weeklyRankings'
import { detectListWeek } from '@/football/weeklyBlend'
import { sleeperService } from '@/services/sleeper'

const props = defineProps<{ season: number; published: PublishedWeekly | null }>()
const emit = defineEmits<{ (e: 'published'): void }>()
const status = ref('')
const busy = ref(false)

const label = computed(() => {
  const p = props.published
  if (!p) return 'No list this week · Sleeper only'
  const when = new Date(p.published_at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return `Week ${p.week} · ${p.source_name} · published ${when}`
})

async function onFile(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true; status.value = 'Checking which week this file is for…'
  try {
    const body = await file.text()
    const byWeek: Record<number, { home: string; away: string }[]> = {}
    for (let w = 1; w <= 18; w++) {
      byWeek[w] = (await sleeperService.getNflSchedule(String(props.season), w))
        .map((g: any) => ({ home: g.home, away: g.away }))
    }
    const hit = detectListWeek(body, byWeek)
    if (!hit) { status.value = "This file doesn't match any week's schedule. Not published."; return }
    const r = await publishWeekly({ sport: 'football', season: props.season, week: hit.week, source_name: file.name, body })
    status.value = r.ok ? `Published for week ${hit.week}.` : `Publish failed: ${r.error}`
    if (r.ok) emit('published')
  } finally {
    busy.value = false
    ;(ev.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] text-dark-textMuted">
    <span>{{ label }}</span>
    <label class="cursor-pointer rounded border border-dark-border px-2 py-0.5 hover:text-dark-text"
           :class="{ 'pointer-events-none opacity-50': busy }">
      Publish weekly rankings
      <input type="file" accept=".csv,text/csv" class="hidden" @change="onFile" />
    </label>
    <span v-if="status">{{ status }}</span>
  </div>
</template>
```

`getNflSchedule` caches the season-level request, so the 18 calls cost one network fetch.

- [ ] **Step 2: Wire it into `WeeklyView.vue`**
  1. Add `publishedWeek, reloadPublished` to the destructure from `useWeeklyBoard()` (line 17).
  2. Add `import PublishWeeklyRankings from '@/components/PublishWeeklyRankings.vue'`. Remove the `RankingPicker` import if nothing else in the file uses it (check with grep first).
  3. Replace `<RankingPicker v-if="isAdmin" kind="week" />` with:
     ```vue
     <PublishWeeklyRankings v-if="isAdmin" :season="publishedWeek?.season ?? new Date().getFullYear()"
                            :published="publishedWeek" @published="reloadPublished" />
     ```
  4. Replace the `weekSource` span body with:
     ```vue
     <span v-if="weekSource !== 'UFD'" class="font-mono text-[10px] text-dark-textMuted/70">UFD weekly rankings</span>
     ```
  5. Delete the `row.tierSource && row.tierDrop == null` template branch (around line 801). It can no longer occur because `tierByKey` is now `{}`.
  6. Change the Q/D tooltip (around line 834) to:
     ```
     `${row.injuryTag}: ranked as if he plays. Lineup advice counts him at ${Math.round((WEEKLY_INJURY_DISCOUNT[row.injuryTag.toUpperCase()] ?? 1) * 100)}% because roughly seven in ten play.`
     ```

- [ ] **Step 3: Typecheck and build**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -v streamBoard.test.ts; npm run build 2>&1 | tail -5`
Expected: no type errors; build succeeds.

- [ ] **Step 4: Runtime check** (the build doesn't catch a missing import). Run `npm run dev`, log in as admin, and open `/this-week` on a football league:
  - The page renders with no console errors; the control reads "No list this week · Sleeper only" (before the migration it reads that too, because the fetch fails soft).
  - The ranks match the current Sleeper-only board, with Q players now ranked on their full projection.
- [ ] **Step 5: Checkpoint.** No commit.

---

### Task 7: End-to-end check with the real file (after the migration is applied)

- [ ] **Step 1:** With the dev server on `/this-week` as admin, publish `~/Downloads/all-8.csv`. Expect "Published for week 4." and the label "Week 4 · all-8.csv · published …".
- [ ] **Step 2:** Compare the board's top tens with the cards (`python3 ~/Projects/ufd-graphics/position-tiers.py 4 QB RB WR TE`) for a half-PPR league. Expect the same names in the same order, with neighbours only possibly swapping where scoring differs. Lamar QB2 with a Q tag; Fannin TE8.
- [ ] **Step 3:** In a lineup where a Q player is rostered, confirm the suggested lineup still benches him when the 65% value loses.
- [ ] **Step 4:** Publish a file whose matchups are from another week (e.g. `all-6.csv`). Expect the refusal message; the existing week-4 row is unchanged.
- [ ] **Step 5:** Log out (anon) and reload the page in a private window with a league. Expect the blended board (anyone can read the table).
- [ ] **Step 6:** Report the results to the user. Do not commit, push or deploy. They test locally with their users first (standing rule).
