# NFL Projection Feed (Football Foundation, Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the football analog of `fgByKey` — a per-player `{ stats, points }` projection map keyed to the active league's players, sourced from Sleeper's free NFL projections.

**Architecture:** A pure summing helper + I/O fetcher (`footballProjections.ts`) sum Sleeper's weekly NFL projections across the rest-of-season week range; a pure keyer (`buildFootballProjections.ts`) maps those raw stats to the platform's player keys (Sleeper id direct; ESPN/Yahoo name+position match) and computes points via the existing sport-config `calculatePoints`. A thin composable (`useFootballProjections.ts`) wires the async pieces together.

**Tech Stack:** TypeScript, Vitest, Vue 3, existing `sleeperService` + `@/config/sports`.

**Spec:** `docs/superpowers/specs/2026-07-28-nfl-projection-feed-design.md`

**Standing constraint:** Local only — commit, never push/deploy. Build with `npm run build`; test with `npx vitest run <path>`.

---

## File Structure

- **Modify** `src/services/sleeper.ts` — add `getNflState()`.
- **Create** `src/services/footballProjections.ts` — `sumWeekProjections` (pure) + `fetchSeasonProjectionStats` (I/O).
- **Create** `src/football/buildFootballProjections.ts` — `normalizeNflName` + `buildFootballProjectionsByKey` (pure) + types.
- **Create** `src/composables/useFootballProjections.ts` — async wiring composable.
- **Tests:** `src/services/__tests__/footballProjections.test.ts`, `src/football/__tests__/buildFootballProjections.test.ts`.

---

### Task 1: `sleeperService.getNflState()`

**Files:**
- Modify: `src/services/sleeper.ts` (add a method to the service class/object; `BASE_URL = 'https://api.sleeper.app/v1'` already exists at the top)

No unit test — trivial I/O, matches the codebase's untested service methods; verified by build + downstream use.

- [ ] **Step 1: Add the method**

Add this method alongside the other `sleeperService` methods in `src/services/sleeper.ts` (e.g. right after `getAllWeekProjections`):

```ts
  /**
   * Current NFL state (week/season) from Sleeper. Used to bound the rest-of-season
   * projection range. Any failure returns a full-season default (week 1) so preseason
   * and off-season degrade to a whole-season projection rather than throwing.
   */
  async getNflState(): Promise<{ week: number; season: string; season_type: string }> {
    try {
      const res = await fetch(`${BASE_URL}/state/nfl`)
      if (!res.ok) throw new Error(`state ${res.status}`)
      const d = await res.json()
      return {
        week: Number(d.week) || 1,
        season: String(d.season || new Date().getFullYear()),
        season_type: d.season_type || 'regular',
      }
    } catch (e) {
      console.warn('[sleeper] getNflState failed — defaulting to full season', e)
      return { week: 1, season: String(new Date().getFullYear()), season_type: 'regular' }
    }
  }
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: `✓ built in …`, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/sleeper.ts
git commit -m "feat: sleeperService.getNflState — current NFL week/season"
```
(A harmless git gc `bad object refs/remotes/origin/main` warning may print; ignore it — verify with `git log --oneline -1`.)

---

### Task 2: `footballProjections.ts` — sum weekly projections (TDD)

**Files:**
- Create: `src/services/footballProjections.ts`
- Test: `src/services/__tests__/footballProjections.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/footballProjections.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sumWeekProjections, type WeekProjections } from '../footballProjections'

describe('sumWeekProjections', () => {
  const keys = ['pass_yd', 'pass_td', 'rush_yd', 'rec']

  it('sums a stat across weeks per player', () => {
    const weeks: WeekProjections[] = [
      { '1': { pass_yd: 250, pass_td: 2 } },
      { '1': { pass_yd: 300, pass_td: 1 } },
    ]
    const out = sumWeekProjections(weeks, keys)
    expect(out['1'].pass_yd).toBe(550)
    expect(out['1'].pass_td).toBe(3)
  })

  it('skips a missing/empty week without error', () => {
    const weeks: WeekProjections[] = [{ '1': { rush_yd: 80 } }, {}, { '1': { rush_yd: 20 } }]
    expect(sumWeekProjections(weeks, keys)['1'].rush_yd).toBe(100)
  })

  it('keeps only the allowlisted stat keys and ignores non-numeric values', () => {
    const weeks: WeekProjections[] = [{ '1': { pass_yd: 250, gp: 1, foo: 'x' as unknown as number } }]
    const out = sumWeekProjections(weeks, keys)
    expect(out['1'].pass_yd).toBe(250)
    expect(out['1'].gp).toBeUndefined()
    expect(out['1'].foo).toBeUndefined()
  })

  it('never produces NaN from a NaN/Infinity value', () => {
    const weeks: WeekProjections[] = [{ '1': { rec: NaN } }, { '1': { rec: 5 } }]
    expect(sumWeekProjections(weeks, keys)['1'].rec).toBe(5)
  })

  it('empty input → empty map', () => {
    expect(sumWeekProjections([], keys)).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/footballProjections.test.ts`
Expected: FAIL — unresolved import `../footballProjections`.

- [ ] **Step 3: Write the implementation**

Create `src/services/footballProjections.ts`:

```ts
import { sleeperService } from './sleeper'
import { getSportConfig } from '@/config/sports'

/** Scoring-relevant NFL stat keys — reuse the football sport-config so summing and
 * scoring stay in sync. */
const NFL_STAT_KEYS: string[] = getSportConfig('football').pointsConfig.statKeys

/** playerId -> raw stat map (Sleeper's weekly projection shape). */
export type WeekProjections = Record<string, Record<string, number>>

/**
 * Sum an array of per-week projection maps into one playerId -> summed-stats map,
 * keeping only `statKeys` and only finite numbers. Pure; never throws or yields NaN.
 */
export function sumWeekProjections(
  weeks: WeekProjections[],
  statKeys: string[] = NFL_STAT_KEYS,
): WeekProjections {
  const out: WeekProjections = {}
  for (const week of weeks) {
    for (const [playerId, stats] of Object.entries(week || {})) {
      if (!stats || typeof stats !== 'object') continue
      const acc = out[playerId] ?? (out[playerId] = {})
      for (const k of statKeys) {
        const v = (stats as Record<string, number>)[k]
        if (typeof v === 'number' && Number.isFinite(v)) acc[k] = (acc[k] ?? 0) + v
      }
    }
  }
  return out
}

/**
 * Fetch Sleeper NFL weekly projections for [startWeek..endWeek] and sum into per-player
 * raw projected stats. A missing/failed week contributes nothing (getAllWeekProjections
 * returns {} on failure). The endpoint requests QB/RB/WR/TE only (v1).
 */
export async function fetchSeasonProjectionStats(
  season: string,
  startWeek: number,
  endWeek: number,
): Promise<WeekProjections> {
  const weeks: WeekProjections[] = []
  for (let w = startWeek; w <= endWeek; w++) {
    // getWeekProjections NORMALIZES Sleeper's raw array/object response into a flat
    // player_id -> stats map (extracting the nested `.stats`) and caches it — that
    // normalized shape is what sumWeekProjections expects. (getAllWeekProjections
    // returns the RAW array and would accumulate nothing — see the final-review fix.)
    weeks.push(await sleeperService.getWeekProjections('football', season, w))
  }
  return sumWeekProjections(weeks)
}
```
> **Note (final-review correction):** use `sleeperService.getWeekProjections('football', season, w)` (sleeper.ts:598, returns a normalized `player_id → stats` map), **not** `getAllWeekProjections` (which returns Sleeper's raw array with nested `.stats` — it would sum to nothing). A regression test asserts `getWeekProjections('football', …)` is the method called.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/footballProjections.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/footballProjections.ts src/services/__tests__/footballProjections.test.ts
git commit -m "feat: footballProjections — sum Sleeper NFL weekly projections over the season"
```

---

### Task 3: `buildFootballProjections.ts` — key + score (TDD)

**Files:**
- Create: `src/football/buildFootballProjections.ts`
- Test: `src/football/__tests__/buildFootballProjections.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/football/__tests__/buildFootballProjections.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  normalizeNflName,
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type SleeperPlayerMeta,
} from '../buildFootballProjections'
import type { WeekProjections } from '@/services/footballProjections'

// Standard PPR-ish scoring subset for deterministic points.
const scoring = { pass_yd: 0.04, pass_td: 4, rush_yd: 0.1, rush_td: 6, rec: 1, rec_yd: 0.1, rec_td: 6 }

describe('normalizeNflName', () => {
  it('lowercases, strips punctuation and suffixes', () => {
    expect(normalizeNflName("Ke'Shawn Vaughn Jr.")).toBe('keshawn vaughn')
    expect(normalizeNflName('A.J. Brown')).toBe('aj brown')
    expect(normalizeNflName('Michael Pittman II')).toBe('michael pittman')
  })
})

describe('buildFootballProjectionsByKey', () => {
  const summed: WeekProjections = {
    'sleep_qb': { pass_yd: 4000, pass_td: 30 },
    'sleep_rb': { rush_yd: 1200, rush_td: 10, rec: 40, rec_yd: 300 },
  }
  const meta: Record<string, SleeperPlayerMeta> = {
    'sleep_qb': { name: 'Josh Allen', position: 'QB' },
    'sleep_rb': { name: 'Bijan Robinson', position: 'RB' },
  }

  it('Sleeper players match by sleeperId and get correct points', () => {
    const players: ProjPlayer[] = [{ key: 'k_qb', name: 'Josh Allen', position: 'QB', sleeperId: 'sleep_qb' }]
    const out = buildFootballProjectionsByKey(players, summed, meta, scoring)
    // 4000*0.04 + 30*4 = 160 + 120 = 280
    expect(out['k_qb'].points).toBeCloseTo(280, 5)
    expect(out['k_qb'].stats.pass_yd).toBe(4000)
  })

  it('ESPN/Yahoo players (no sleeperId) match by normalized name + position', () => {
    const players: ProjPlayer[] = [{ key: 'espn_rb', name: 'Bijan Robinson', position: 'RB' }]
    const out = buildFootballProjectionsByKey(players, summed, meta, scoring)
    // 1200*0.1 + 10*6 + 40*1 + 300*0.1 = 120 + 60 + 40 + 30 = 250
    expect(out['espn_rb'].points).toBeCloseTo(250, 5)
  })

  it('does NOT match a same-name different-position player', () => {
    const players: ProjPlayer[] = [{ key: 'x', name: 'Josh Allen', position: 'RB' }]
    expect(buildFootballProjectionsByKey(players, summed, meta, scoring)['x']).toBeUndefined()
  })

  it('omits players with no projection match', () => {
    const players: ProjPlayer[] = [{ key: 'ghost', name: 'Nobody Here', position: 'WR' }]
    expect(Object.keys(buildFootballProjectionsByKey(players, summed, meta, scoring))).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/football/__tests__/buildFootballProjections.test.ts`
Expected: FAIL — unresolved import `../buildFootballProjections`.

- [ ] **Step 3: Write the implementation**

Create `src/football/buildFootballProjections.ts`:

```ts
import { calculatePoints } from '@/config/sports'
import type { WeekProjections } from '@/services/footballProjections'

export interface FootballProjection {
  stats: Record<string, number>
  points: number
}

/** A league player to attach a projection to. `sleeperId` is present for Sleeper
 * leagues; ESPN/Yahoo players match by name+position instead. */
export interface ProjPlayer {
  key: string
  name: string
  position: string
  sleeperId?: string
}

export interface SleeperPlayerMeta {
  name: string
  position: string
}

/** Normalize an NFL player name for cross-platform matching. */
export function normalizeNflName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[.'’,]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build the football fgByKey analog: per-player { stats, points } keyed by the platform
 * player key. Sleeper players match by sleeperId; ESPN/Yahoo match by normalized
 * name + position against the Sleeper player-meta map. Unmatched players are omitted
 * (consumers treat an absent key as 0, same as MLB unmatched).
 */
export function buildFootballProjectionsByKey(
  players: ProjPlayer[],
  summedStats: WeekProjections,
  sleeperMeta: Record<string, SleeperPlayerMeta>,
  scoring: Record<string, number>,
): Record<string, FootballProjection> {
  const nameIndex = new Map<string, string>()
  for (const [id, meta] of Object.entries(sleeperMeta)) {
    if (!meta) continue
    nameIndex.set(`${normalizeNflName(meta.name)}|${(meta.position || '').toUpperCase()}`, id)
  }
  const out: Record<string, FootballProjection> = {}
  for (const p of players) {
    const sleeperId =
      p.sleeperId ?? nameIndex.get(`${normalizeNflName(p.name)}|${(p.position || '').toUpperCase()}`)
    if (!sleeperId) continue
    const stats = summedStats[sleeperId]
    if (!stats) continue
    out[p.key] = { stats, points: calculatePoints('football', stats, scoring) }
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/football/__tests__/buildFootballProjections.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/football/buildFootballProjections.ts src/football/__tests__/buildFootballProjections.test.ts
git commit -m "feat: buildFootballProjectionsByKey — key + score NFL projections per player"
```

---

### Task 4: `useFootballProjections.ts` — wiring composable

**Files:**
- Create: `src/composables/useFootballProjections.ts`

No unit test — async I/O composable (matches the codebase's untested composables); verified by build + real-league smoke.

- [ ] **Step 1: Create the composable**

Create `src/composables/useFootballProjections.ts`:

```ts
import { ref, watch, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats } from '@/services/footballProjections'
import {
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type FootballProjection,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'

/**
 * The football fgByKey analog. Given the active league's players, its scoring settings,
 * and the season, produces Record<playerKey, { stats, points }> from Sleeper NFL
 * projections summed over the rest of the season. `enabled` gates it to football leagues.
 */
export function useFootballProjections(inputs: {
  players: Ref<ProjPlayer[]>
  scoring: Ref<Record<string, number>>
  season: Ref<string>
  enabled: Ref<boolean>
}) {
  const projByKey = ref<Record<string, FootballProjection>>({})
  const loading = ref(false)

  async function load() {
    if (!inputs.enabled.value || inputs.players.value.length === 0) {
      projByKey.value = {}
      return
    }
    loading.value = true
    try {
      const state = await sleeperService.getNflState()
      const startWeek = Math.max(1, state.week || 1)
      const endWeek = 18
      const season = inputs.season.value || state.season
      const [summed, playersMap] = await Promise.all([
        fetchSeasonProjectionStats(season, startWeek, endWeek),
        sleeperService.getPlayers(),
      ])
      const sleeperMeta: Record<string, SleeperPlayerMeta> = {}
      for (const [id, pl] of Object.entries(playersMap)) {
        sleeperMeta[id] = { name: (pl as any)?.full_name || '', position: (pl as any)?.position || '' }
      }
      projByKey.value = buildFootballProjectionsByKey(
        inputs.players.value,
        summed,
        sleeperMeta,
        inputs.scoring.value,
      )
    } catch (e) {
      console.error('[useFootballProjections] load failed', e)
      projByKey.value = {}
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, inputs.players, inputs.season], load, { immediate: true })

  return { projByKey, loading, load }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: `✓ built in …`, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useFootballProjections.ts
git commit -m "feat: useFootballProjections — wire the football projection feed per league"
```

---

## Final verification

- [ ] `npx vitest run src/services/__tests__/footballProjections.test.ts src/football/__tests__/buildFootballProjections.test.ts` → all PASS.
- [ ] `npm run build` → clean.
- [ ] Hand back for smoke: the composable isn't consumed by any view yet (that's the value-model refactor phase), so smoke is a follow-up once it's wired. The unit tests + build are this phase's gate.

## Notes / scope reminders

- **This phase produces the feed only.** No view consumes `useFootballProjections` yet — wiring it into My Team / Matchup / Wire / Trades is the value-model refactor phase; threading football positions through the roster-slot layer is the next phase.
- ESPN/Yahoo use `football.ts` default scoring in v1 (real per-platform scoring mapping is deferred); Sleeper passes its own `scoring_settings` as `inputs.scoring`.
- Skill positions only (QB/RB/WR/TE) — the Sleeper endpoint requests those; K/DEF/IDP deferred.
