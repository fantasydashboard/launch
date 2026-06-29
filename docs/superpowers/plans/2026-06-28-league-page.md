# League Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the UFD **League** page — a comparison "command center" (Standings anchor + all-team Landscape) that answers "how do I stack up against everyone?", as a separate page alongside Power Rankings.

**Architecture:** A `LeagueView` behind a `LeagueWrapper` that branches on scoring type (points / category / roto), in the terminal/mono visual language of `PowerRankingsRedesignView.vue`. It REUSES existing engines — `buildPowerRankings` (talent rank + luck + records, already used by Power Rankings), `useCategoryStrength` + `useLeagueLandscape` + `buildEngine` (the all-team category landscape), `buildPointsTeam` (points strength), `seasonStakes` + `usePowerTrajectory` (clinched/eliminated/bubble) — plus three small new PURE builders that are unit-tested.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Tailwind. Vitest. No backend changes.

**Standing constraints (carry through every task):**
- LOCAL ONLY on branch `redesign/my-team-first`. NEVER push / deploy / PR / merge.
- type-check baseline MUST stay at **62 errors** with NONE in touched files. Verify each task: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` prints `62`, and `... | grep -E "League|leagueHeatmap|leagueStandings|pointsPositional|useCategoryStrength"` prints nothing.
- `npm run build` must stay clean; `npx vitest run` must stay green.
- Do NOT change My Team / Power Rankings behavior. `useCategoryStrength`'s existing public outputs and `buildPointsTeam`'s default basis must be preserved.
- Commit each task with `git -c gc.auto=0 commit -q -F - <<'EOF' … EOF`, message ending with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. No push.
- zsh exclamation issues: write any throwaway scripts to `/tmp/fixN.py`.

---

## File Structure

**New:**
- `src/league/leagueHeatmap.ts` — `buildCategoryHeatmap(view: LandscapeView): Heatmap`. Pure: transposes the league landscape (every team's rank in every category) into team-rows of rank cells + a 0..1 color value. Tested.
- `src/league/leagueStandings.ts` — `buildLeagueStandings(rows: PowerRow[], stakes, myTeamKey): StandingRow[]`. Pure: re-sorts the power-ranking rows into STANDINGS order (by record) and attaches the playoff-stakes tag + the talent-rank/luck connector. Tested.
- `src/league/pointsPositional.ts` — `buildPointsPositional(pool, fgByKey, weights): PositionalGrid`. Pure: each team's best projected-points player at each lineup position, ranked across the league (the points-league analog of the category landscape). Tested.
- `src/views/LeagueView.vue` — the page. Branches points vs category; renders Standings + Landscape.
- `src/views/LeagueWrapper.vue` — scoring-type branch (roto → legacy `CategoryPowerRankingsView` fallback message / standings-only; else `LeagueView`). Mirrors `PowerRankingsWrapper.vue`.
- `src/league/__tests__/leagueHeatmap.test.ts`, `src/league/__tests__/leagueStandings.test.ts`, `src/league/__tests__/pointsPositional.test.ts`.

**Modified:**
- `src/composables/useCategoryStrength.ts` — additively expose the assembled `engine`, `fgByKey`, `catSpecs`, `labelOf`, `teamNameByKey`, `pool` (already computed internally) so the League page can build the landscape. Non-breaking (existing return keys unchanged).
- `src/router/index.ts` — add the `/leagues/:leagueId/league` route (and the demo-categories sibling).
- `src/views/MyLeagueLayout.vue` — add a "League" tab to the nav.

**Reused as-is (read for exact signatures):**
- `src/league/powerRankings.ts` — `buildPowerRankings(teams: PowerTeamInput[]): { rows: PowerRow[], pretenders, sleepers }`. `PowerRow` has `teamKey, teamName, teamLogo, strength, strengthRank, recordRank, wins, losses, ties, winPct, luck, tier`.
- `src/composables/useLeagueLandscape.ts` — `useLeagueLandscape(inputs): { view: ComputedRef<LandscapeView | null> }`. `LandscapeView = { teams: {key,label,name,isMe}[], categoryRows: {key,label,ranks:(number|null)[]}[], positionRows: same, numTeams }`. Inputs: `{ pool, fgByKey, catSpecs, landscape, roleValueByKey, myTeamKey, teamNameByKey, labelOf }`.
- `src/myteam/seasonStakes.ts` — `seasonStakes({ rank, leagueSize, weeksLeft, playoffSpots }): { mode, coastKind? }`.
- `src/composables/usePowerTrajectory.ts` — exposes `weeksLeft`, `playoffSpots`.
- `src/myteam/pointsTeam.ts` — `buildPointsTeam(pool, fgByKey, weights, myTeamKey, slots, opts).standings`.
- `src/views/PowerRankingsRedesignView.vue` — the visual reference for table rows, the YOU highlight (`color-mix` primary tint — the theme `primary` var has NO alpha slot, so `bg-primary/NN` renders nothing; use `color-mix(in srgb, var(--color-primary,#C6FF3A) NN%, transparent)`), stakes badges, and `rounded-xl border border-dark-border bg-dark-card` sections.

---

### Task 1: Expose the assembled engine from `useCategoryStrength`

**Files:**
- Modify: `src/composables/useCategoryStrength.ts`

The League landscape needs the assembled trade engine and its inputs, which `useCategoryStrength` already computes internally but doesn't return. Add them to the return object (purely additive — existing keys stay).

- [ ] **Step 1: Add the new fields to the return**

Find the final `return { strengths, teamMeta, myTeamKey, catCount, loading, load }` and replace with:

```ts
  return {
    strengths, teamMeta, myTeamKey, catCount, loading, load,
    // Exposed for the League page's all-team landscape (already computed above).
    engine, fgByKey, catSpecs, labelOf, teamNameByKey, pool,
  }
```

`engine`, `fgByKey`, `catSpecs`, `pool` are existing `computed`s in this file; `labelOf` is the existing function; `teamNameByKey` is NOT yet defined — add it as a `computed` next to `teamMeta`:

```ts
  // teamKey -> name, for the landscape (which keys names separately from records).
  const teamNameByKey = computed(() => {
    const m = new Map<string, string>()
    for (const [k, v] of Object.entries(teamMeta.value)) m.set(k, v.name)
    return m
  })
```

- [ ] **Step 2: Verify nothing broke**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `62`

Run: `npx vitest run src/league src/myteam 2>&1 | tail -3`
Expected: all pass.

Run: `npm run build 2>&1 | tail -1`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: expose assembled engine from useCategoryStrength

Additively return engine/fgByKey/catSpecs/labelOf/teamNameByKey/pool (already
computed internally) so the League page can build the all-team landscape. Existing
public outputs unchanged; Power Rankings unaffected.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: `buildCategoryHeatmap` (pure)

**Files:**
- Create: `src/league/leagueHeatmap.ts`
- Test: `src/league/__tests__/leagueHeatmap.test.ts`

Transposes `LandscapeView` (rows = categories, ranks aligned to teams) into team-rows of per-category rank cells, with a 0..1 color value (1 = best/rank 1, 0 = worst).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildCategoryHeatmap } from '../leagueHeatmap'

const view = {
  teams: [
    { key: 'A', label: 'A', name: 'A', isMe: true },
    { key: 'B', label: 'B', name: 'B', isMe: false },
    { key: 'C', label: 'C', name: 'C', isMe: false },
  ],
  categoryRows: [
    { key: 'HR', label: 'HR', ranks: [1, 2, 3] }, // A best in HR
    { key: 'ERA', label: 'ERA', ranks: [3, 1, 2] }, // A worst in ERA
  ],
  positionRows: [],
  numTeams: 3,
}

describe('buildCategoryHeatmap', () => {
  it('transposes landscape into team rows of per-category cells', () => {
    const hm = buildCategoryHeatmap(view as any)
    expect(hm.categories.map((c) => c.key)).toEqual(['HR', 'ERA'])
    const a = hm.rows.find((r) => r.teamKey === 'A')!
    expect(a.isMe).toBe(true)
    expect(a.cells.map((c) => c.rank)).toEqual([1, 3]) // HR rank 1, ERA rank 3
  })

  it('colors rank 1 = 1.0 (best) and last = 0 (worst); null rank stays null', () => {
    const hm = buildCategoryHeatmap(view as any)
    const a = hm.rows.find((r) => r.teamKey === 'A')!
    expect(a.cells[0].pct).toBeCloseTo(1, 5) // HR rank 1 of 3 -> (3-1)/(3-1)=1
    expect(a.cells[1].pct).toBeCloseTo(0, 5) // ERA rank 3 of 3 -> (3-3)/2=0

    const withNull = { ...view, categoryRows: [{ key: 'SV', label: 'SV', ranks: [1, null, 2] }] }
    const hm2 = buildCategoryHeatmap(withNull as any)
    const b = hm2.rows.find((r) => r.teamKey === 'B')!
    expect(b.cells[0].rank).toBeNull()
    expect(b.cells[0].pct).toBeNull()
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/league/__tests__/leagueHeatmap.test.ts`
Expected: FAIL (module not found / `buildCategoryHeatmap` not defined).

- [ ] **Step 3: Implement**

```ts
import type { LandscapeView } from '@/composables/useLeagueLandscape'

export interface HeatCell {
  rank: number | null
  pct: number | null // 0..1 for color (1 = best). null when the team fields nobody in the cat.
}
export interface HeatRow {
  teamKey: string
  teamName: string
  isMe: boolean
  cells: HeatCell[] // aligned to `categories`
}
export interface Heatmap {
  categories: { key: string; label: string }[]
  rows: HeatRow[] // one per team, in the landscape's team order (YOU first)
}

/** Transpose the league landscape into a team × category heatmap of ranks (1 = best),
 *  with a 0..1 colour value so the UI can scale strong → weak. */
export function buildCategoryHeatmap(view: LandscapeView): Heatmap {
  const n = view.numTeams
  const categories = view.categoryRows.map((c) => ({ key: c.key, label: c.label }))
  const rows: HeatRow[] = view.teams.map((t, ti) => ({
    teamKey: t.key,
    teamName: t.name,
    isMe: t.isMe,
    cells: view.categoryRows.map((c) => {
      const rank = c.ranks[ti]
      const pct = rank == null || n <= 1 ? (rank == null ? null : 0.5) : (n - rank) / (n - 1)
      return { rank: rank ?? null, pct }
    }),
  }))
  return { categories, rows }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/league/__tests__/leagueHeatmap.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: buildCategoryHeatmap (team × category rank grid)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: `buildLeagueStandings` (pure)

**Files:**
- Create: `src/league/leagueStandings.ts`
- Test: `src/league/__tests__/leagueStandings.test.ts`

Re-sorts `buildPowerRankings(...).rows` into STANDINGS order (by `recordRank`) and attaches the playoff-stakes tag + keeps the talent-rank/luck connector. The page feeds it the SAME `PowerRow[]` Power Rankings already computes.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildLeagueStandings } from '../leagueStandings'
import type { PowerRow } from '../powerRankings'

function row(p: Partial<PowerRow>): PowerRow {
  return {
    teamKey: 'x', teamName: 'X', teamLogo: '', strength: 0, strengthRank: 1, recordRank: 1,
    wins: 0, losses: 0, ties: 0, winPct: 0, luckDelta: 0, luck: 'legit', tier: 'Bubble',
    managerless: false, move: '', blurb: '', ...p,
  }
}

describe('buildLeagueStandings', () => {
  const rows = [
    row({ teamKey: 'A', recordRank: 2, strengthRank: 1, luck: 'sleeper' }),
    row({ teamKey: 'B', recordRank: 1, strengthRank: 3, luck: 'pretender' }),
    row({ teamKey: 'C', recordRank: 3, strengthRank: 2, luck: 'legit' }),
  ]
  const stakes = new Map([['B', 'clinched' as const], ['C', 'eliminated' as const]])

  it('sorts into standings order (by record) and attaches stakes + talent connector', () => {
    const out = buildLeagueStandings(rows, stakes, 'A')
    expect(out.map((r) => r.teamKey)).toEqual(['B', 'A', 'C']) // recordRank 1,2,3
    expect(out[0].stakes).toBe('clinched')
    expect(out[0].talentRank).toBe(3) // B's strengthRank
    expect(out[0].luck).toBe('pretender')
    expect(out.find((r) => r.teamKey === 'A')!.isMe).toBe(true)
  })

  it('null stakes when none provided', () => {
    const out = buildLeagueStandings(rows, new Map(), 'A')
    expect(out.every((r) => r.stakes === null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/league/__tests__/leagueStandings.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { PowerRow, LuckStatus } from './powerRankings'

export type StakesTag = 'clinched' | 'eliminated' | 'bubble'

export interface StandingRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  isMe: boolean
  wins: number
  losses: number
  ties: number
  recordRank: number
  talentRank: number // strengthRank — the Power Rankings connector
  luck: LuckStatus
  stakes: StakesTag | null
}

/** Standings-ordered view (by record) of the power-ranking rows, with the playoff-stakes
 *  tag and the talent-rank/luck connector to Power Rankings. */
export function buildLeagueStandings(
  rows: PowerRow[],
  stakes: Map<string, StakesTag>,
  myTeamKey: string,
): StandingRow[] {
  return [...rows]
    .sort((a, b) => a.recordRank - b.recordRank)
    .map((r) => ({
      teamKey: r.teamKey,
      teamName: r.teamName,
      teamLogo: r.teamLogo,
      isMe: r.teamKey === myTeamKey,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      recordRank: r.recordRank,
      talentRank: r.strengthRank,
      luck: r.luck,
      stakes: stakes.get(r.teamKey) ?? null,
    }))
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/league/__tests__/leagueStandings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: buildLeagueStandings (record-ordered rows + stakes + PR connector)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: `buildPointsPositional` (pure)

**Files:**
- Create: `src/league/pointsPositional.ts`
- Test: `src/league/__tests__/pointsPositional.test.ts`

The points-league analog of the category landscape: each team's BEST projected-points player at each lineup position, ranked across the league. Reuses `projectPlayerPoints` (`src/myteam/pointsValue.ts`) and `parseEligible` (`src/myteam/pointsTeam.ts`) — read those for exact signatures (`projectPlayerPoints(fg, weights).total`, `parseEligible(player)` → string[]).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildPointsPositional } from '../pointsPositional'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'

// Minimal pool: two teams, one OF each (T1's is better).
const pool: PointsPoolPlayer[] = [
  { playerKey: 'p1', name: 'Star OF', position: 'OF', teamKey: 'T1' },
  { playerKey: 'p2', name: 'Weak OF', position: 'OF', teamKey: 'T2' },
]
const weights = { HR: 4 }
const fgByKey = {
  p1: { player_type: 'batter', hr: 40, g: 150 } as any,
  p2: { player_type: 'batter', hr: 10, g: 150 } as any,
}

describe('buildPointsPositional', () => {
  it('ranks each team\'s best body per position by projected points', () => {
    const grid = buildPointsPositional(pool, fgByKey, weights, ['T1', 'T2'])
    const of = grid.positions.find((p) => p.position === 'OF')!
    // T1's star (40 HR) outranks T2's weak OF (10 HR).
    expect(of.cells.find((c) => c.teamKey === 'T1')!.rank).toBe(1)
    expect(of.cells.find((c) => c.teamKey === 'T2')!.rank).toBe(2)
    expect(of.cells.find((c) => c.teamKey === 'T1')!.points).toBeGreaterThan(
      of.cells.find((c) => c.teamKey === 'T2')!.points,
    )
  })

  it('a team with nobody at a position gets a null cell', () => {
    const grid = buildPointsPositional(pool, fgByKey, weights, ['T1', 'T2'])
    const c = grid.positions.find((p) => p.position === 'C')
    if (c) {
      expect(c.cells.every((x) => x.rank === null)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/league/__tests__/pointsPositional.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { projectPlayerPoints } from '@/myteam/pointsValue'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { FGProjection } from '@/services/projectionService'

const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']

export interface PosCell {
  teamKey: string
  points: number | null // best startable player's projected points at this position; null = none
  rank: number | null // 1 = best in the league at this position
}
export interface PosRow {
  position: string
  cells: PosCell[] // aligned to the teamKeys passed in
}
export interface PositionalGrid {
  positions: PosRow[]
}

/** Each team's best projected-points player at each lineup position, ranked across the
 *  league — the points-league analog of the category landscape. */
export function buildPointsPositional(
  pool: PointsPoolPlayer[],
  fgByKey: Record<string, FGProjection | null>,
  weights: Record<string, number>,
  teamKeys: string[],
): PositionalGrid {
  const ptsOf = (key: string) => projectPlayerPoints(fgByKey[key], weights).total
  // best[pos][teamKey] = best player's points (or undefined)
  const positions: PosRow[] = POSITIONS.map((pos) => {
    const best = new Map<string, number>()
    for (const p of pool) {
      if (!parseEligible(p).includes(pos)) continue
      const pts = ptsOf(p.playerKey)
      if (!best.has(p.teamKey) || pts > best.get(p.teamKey)!) best.set(p.teamKey, pts)
    }
    // Rank teams that have a body here (desc by points); teams with none → null.
    const ranked = [...best.entries()].sort((a, b) => b[1] - a[1])
    const rankByTeam = new Map<string, number>()
    ranked.forEach(([k], i) => rankByTeam.set(k, i + 1))
    const cells: PosCell[] = teamKeys.map((tk) => ({
      teamKey: tk,
      points: best.has(tk) ? best.get(tk)! : null,
      rank: rankByTeam.get(tk) ?? null,
    }))
    return { position: pos, cells }
  }).filter((row) => row.cells.some((c) => c.rank != null)) // drop unused positions
  return { positions }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/league/__tests__/pointsPositional.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: buildPointsPositional (best body per position, ranked) for points leagues

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 5: `LeagueWrapper` + `LeagueView` scaffold + route + nav

**Files:**
- Create: `src/views/LeagueView.vue`
- Create: `src/views/LeagueWrapper.vue`
- Modify: `src/router/index.ts`
- Modify: `src/views/MyLeagueLayout.vue`

Scaffold the page (header + loading states), the scoring branch, and the navigation/route so it's reachable. Defer the section content to Tasks 6–7.

- [ ] **Step 1: Create `LeagueWrapper.vue`** (mirror `src/views/PowerRankingsWrapper.vue`'s scoring detection — copy its `scoringType` resolution + `isRoto` + `isCategoryLeague` computeds verbatim, swapping the rendered components):

```vue
<template>
  <!-- Roto keeps the legacy category view for now (deferred, like Power Rankings) -->
  <CategoryPowerRankings v-if="isRoto" />
  <LeagueView v-else :scoring="isCategoryLeague ? 'category' : 'points'" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
// COPY the scoringType ref + loadLeagueType() + isRoto + isCategoryLeague computeds
// from src/views/PowerRankingsWrapper.vue (identical detection logic).
const CategoryPowerRankings = defineAsyncComponent(() => import('@/views/CategoryPowerRankingsView.vue'))
const LeagueView = defineAsyncComponent(() => import('@/views/LeagueView.vue'))
// … paste detection logic here …
</script>
```

- [ ] **Step 2: Create `LeagueView.vue` scaffold** (header + loading; sections come next):

```vue
<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ scoring?: 'points' | 'category' }>(), { scoring: 'points' })
const isCategory = computed(() => props.scoring === 'category')
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">League</h1>
      <p class="font-mono text-xs text-dark-textMuted">How you stack up against the field.</p>
    </header>
    <!-- Standings (Task 6/7) -->
    <!-- Landscape (Task 6/7) -->
  </div>
</template>
```

- [ ] **Step 3: Add the route** in `src/router/index.ts`. Find the `/leagues/:leagueId` children (the block with `power-rankings`) and add a sibling:

```ts
      { path: 'league', name: 'league', component: () => import('@/views/LeagueWrapper.vue') },
```

Add the same under the `/demo-categories` children block.

- [ ] **Step 4: Add the nav tab** in `src/views/MyLeagueLayout.vue`. Find the league-nav block (the `Home / Power Rankings / Matchups / Draft / History` links) and add a `League` link in the same style/component, pointing to the `league` route (use the same `<router-link>`/tab pattern already there, with the active-state class the others use).

- [ ] **Step 5: Verify it renders**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`
Run: `npx vue-tsc --noEmit 2>&1 | grep -E "League"` → nothing
Run: `npm run build 2>&1 | tail -1` → `✓ built`

- [ ] **Step 6: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: scaffold LeagueWrapper + LeagueView + route + nav tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 6: `LeagueView` — category branch (Standings + Heatmap + Position strip)

**Files:**
- Modify: `src/views/LeagueView.vue`

Wire the category data. Read `src/views/PowerRankingsRedesignView.vue` for the exact row/badge styling, the YOU `color-mix` primary tint, and the stakes-badge computed (`rowStakes`) — reuse those conventions.

- [ ] **Step 1: Category data wiring (script)** — add to `LeagueView.vue`'s `<script setup>`:

```ts
import { onMounted, watch, ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useCategoryStrength } from '@/composables/useCategoryStrength'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { useLeagueLandscape } from '@/composables/useLeagueLandscape'
import { buildPowerRankings, type PowerTeamInput } from '@/league/powerRankings'
import { buildLeagueStandings, type StakesTag } from '@/league/leagueStandings'
import { buildCategoryHeatmap } from '@/league/leagueHeatmap'
import { seasonStakes } from '@/myteam/seasonStakes'

const leagueStore = useLeagueStore()
const cat = useCategoryStrength()
const trajectory = usePowerTrajectory()

function loadAll() {
  if (isCategory.value) { cat.load(); trajectory.load() }
  // points branch load added in Task 7
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

// Power-ranking rows (talent rank + luck + records) — same inputs the PR page uses.
const catRankings = computed(() => {
  const s = cat.strengths.value
  if (!s.length || !cat.myTeamKey.value) return null
  const meta = cat.teamMeta.value
  const inputs: PowerTeamInput[] = s.map((x) => {
    const m = meta[x.teamKey] ?? { name: 'Team', logo: '', wins: 0, losses: 0, ties: 0 }
    return { teamKey: x.teamKey, teamName: m.name, teamLogo: m.logo, strength: x.strength, wins: m.wins, losses: m.losses, ties: m.ties }
  })
  return buildPowerRankings(inputs)
})

// Stakes (ESPN only; playoffSpots 0 on Yahoo -> no badges) — copy rowStakes from PR view.
const stakesMap = computed(() => {
  const out = new Map<string, StakesTag>()
  const rows = catRankings.value?.rows ?? []
  const spots = trajectory.playoffSpots.value
  const wl = trajectory.weeksLeft.value
  if (!spots || !wl || !rows.length) return out
  for (const r of rows) {
    const sk = seasonStakes({ rank: r.recordRank, leagueSize: rows.length, weeksLeft: wl, playoffSpots: spots })
    if (sk.coastKind === 'clinched') out.set(r.teamKey, 'clinched')
    else if (sk.coastKind === 'eliminated') out.set(r.teamKey, 'eliminated')
    else if (sk.mode === 'must-win') out.set(r.teamKey, 'bubble')
  }
  return out
})

const standings = computed(() =>
  catRankings.value ? buildLeagueStandings(catRankings.value.rows, stakesMap.value, cat.myTeamKey.value) : [],
)

// The all-team category landscape -> heatmap.
const { view: landscapeView } = useLeagueLandscape({
  pool: cat.pool, fgByKey: cat.fgByKey, catSpecs: cat.catSpecs,
  landscape: computed(() => cat.engine.value?.landscape ?? new Map()),
  roleValueByKey: computed(() => cat.engine.value?.roleValueByKey ?? new Map()),
  myTeamKey: cat.myTeamKey, teamNameByKey: cat.teamNameByKey, labelOf: cat.labelOf,
})
const heatmap = computed(() => (landscapeView.value ? buildCategoryHeatmap(landscapeView.value) : null))
```

- [ ] **Step 2: Render the Standings table (template, category)** — a `rounded-xl border border-dark-border bg-dark-card` section with one row per `standings` entry: rank · logo · name (YOU tint via `color-mix` primary when `isMe`) · `wins-losses-ties` · a stakes badge (clinched=primary, eliminated=muted, bubble=amber `#e69a4a`, like the PR view) · a small "talent #N" + luck arrow (▲ primary if `luck==='sleeper'`, ▼ `#e69a4a` if `luck==='pretender'`, else nothing). Use `font-mono` labels at 11–13px, matching the PR board.

- [ ] **Step 3: Render the Heatmap (template, category)** — below standings, a section with a horizontally-scrollable grid (`overflow-x-auto`): a header row of `heatmap.categories[].label` (rotated/compact mono, ~9px), then one row per `heatmap.rows` entry (team name pinned left, YOU tint), each cell a fixed-width box showing `cell.rank` with background `:style="{ backgroundColor: cell.pct == null ? 'transparent' : \`color-mix(in srgb, var(--color-primary,#C6FF3A) ${Math.round(cell.pct*70)}%, transparent)\` }"` (best = most lime, worst = transparent). Null cells render blank. Add a one-line legend ("brighter = stronger in that category · your row highlighted").

- [ ] **Step 4: Render the Position strip (template, category)** — a compact grid from `landscapeView.positionRows` (each row: position label + each team's rank), same cell treatment, under a "Position strength" subhead. Reuse the heatmap cell component/markup.

- [ ] **Step 5: Verify**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`; `... | grep -E "League"` → nothing.
Run: `npm run build 2>&1 | tail -1` → `✓ built`.
Run: `npx vitest run 2>&1 | grep -E "Tests "` → all pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: category branch — standings + category heatmap + position strength

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 7: `LeagueView` — points branch (Standings + Positional + Projected points)

**Files:**
- Modify: `src/views/LeagueView.vue`

Mirror the category branch with the points data path (copy the points wiring from `PowerRankingsRedesignView.vue`: `useYahooLeaguePool` / `useEspnPointsTeamData` / `useLeagueScoring`, the `pool`/`fgByKey`/`rosterSlots`/`myTeamKey`/`teamMeta` computeds, and `buildPointsTeam(...).standings` for strength).

- [ ] **Step 1: Points data wiring (script)** — add the points composables and a `pointsRankings` computed (build `PowerTeamInput[]` from `buildPointsTeam(pool, fgByKey, weights, myTeamKey, slots, { basis: weeksLeft>0?'perWeek':'total', weeksLeft }).standings` + the points `teamMeta`, then `buildPowerRankings`). Add `pointsPositional = buildPointsPositional(pool, fgByKey, weights, teamKeys)`. Extend `loadAll()` to load the points composables when `!isCategory`. Make `standings` select `catRankings` vs `pointsRankings` by `isCategory` (mirror the PR view's `rankings` switch). Extend `stakesMap`/`standings` to use the active rankings.

- [ ] **Step 2: Render the points Landscape (template, points)** — when `!isCategory`: a "Projected points / week" bar comparison (one bar per team from the points strength, leader-anchored, like the PR strength bars) + the `pointsPositional` grid (positions × teams, each cell the team's rank at that position, same cell treatment as the heatmap; show `points` rounded on hover/title). Standings section is shared (already record-ordered from `pointsRankings`).

- [ ] **Step 3: Verify**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`; `... | grep -E "League"` → nothing.
Run: `npm run build 2>&1 | tail -1` → `✓ built`.
Run: `npx vitest run 2>&1 | grep -E "Tests "` → all pass.

- [ ] **Step 4: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: points branch — standings + positional strength + projected-points bars

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 8: Final verification & graceful degradation

**Files:**
- Modify: `src/views/LeagueView.vue` (degradation guards only)

- [ ] **Step 1: Degradation guards** — in `LeagueView.vue`: a loading state (`cat.loading` / points loading) showing "Sizing up the league…"; an empty state when no data ("Couldn't assemble the league yet. Try a refresh."); and the **Landscape section hidden** when `heatmap`/`pointsPositional` is null/empty (Sleeper or missing category data → standings-only). Match the PR view's loading/empty copy + styling.

- [ ] **Step 2: Full gate**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`
Run: `npx vitest run 2>&1 | grep -E "Test Files|Tests "` → all pass (note the new count = previous + 6 new tests).
Run: `npm run build 2>&1 | tail -1` → `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add -A && git -c gc.auto=0 commit -q -F - <<'EOF'
League: loading/empty states + standings-only graceful degradation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

- [ ] **Step 4: Hand off for visual review** — the controller reports completion and asks the user to screenshot the League page on their ESPN + Yahoo points and H2H-category leagues (the page can't be visually validated headlessly).

---

## Notes for the implementer
- The heatmap and position grids should share one small cell markup/treatment (DRY) — extract a tiny inline component or a `<template>` snippet within `LeagueView.vue` rather than duplicating the `color-mix` cell three times.
- Do NOT reach for `bg-primary/NN` — the theme `primary` var has no alpha slot; use `color-mix(in srgb, var(--color-primary,#C6FF3A) NN%, transparent)` (this bit Power Rankings already).
- The heatmap colour uses `pct*70` (cap at 70%) so even the league-best cell isn't a solid blinding block; tune if it reads too strong on screenshot.
- Roto and Sleeper paths must never throw — they degrade (legacy view / standings-only).
