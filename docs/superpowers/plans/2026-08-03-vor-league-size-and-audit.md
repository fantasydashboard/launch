# VOR League Size Fix + Audit View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive football league size from the league's team list instead of inferring it from the player pool (a silent correctness bug), and add a `/vor-audit` diagnostic that exposes exactly how every VOR number was produced.

**Architecture:** A pure `resolveLeagueSize` helper feeds a new `leagueSize` off `useActivePointsSource`, which `useFootballVor` takes as an input instead of counting distinct `teamKey`s. `computeReplacementLevels` is refactored to delegate to a new `computeReplacementDetail` that also returns startable counts; a new pure `buildFootballVorAudit` consumes the same `FootballVorInput` object the engine consumes, so the audit cannot disagree with the engine. `VorAuditView.vue` renders it at `/vor-audit`.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-vor-league-size-and-audit-design.md`

## Global Constraints

- Football only. Baseball and all non-football surfaces are untouched.
- No new network calls, dependencies, or Supabase/schema changes.
- `buildFootballVor`'s signature and return type are unchanged (nine test call sites depend on them).
- `computeReplacementLevels`'s signature and return type are unchanged (seven test call sites depend on them).
- League size must never resolve to `0` or `1`. A real league has at least two teams; `1` is the pathological value this whole plan exists to eliminate.
- Run tests with `npx vitest run <path>`. Type-check with `npx vue-tsc --noEmit` (the repo has ~62 pre-existing errors in unrelated files — grep for your own files).
- All 655 existing tests must stay green.

---

## File Structure

**Create:**
- `src/views/VorAuditView.vue` — the diagnostic view.

**Modify:**
- `src/composables/useActivePointsSource.ts` — add pure `resolveLeagueSize` + `leagueSize`/`leagueSizeSource`.
- `src/composables/__tests__/useActivePointsSource.test.ts` — append `resolveLeagueSize` tests.
- `src/composables/useFootballVor.ts` — take `teams` as an input; expose `audit`.
- `src/composables/useFootballWire.ts` — pass `teams` through.
- `src/composables/useWeeklyBoard.ts` — pass `teams`.
- `src/views/PointsMyTeamView.vue`, `src/views/PointsTradesView.vue`, `src/views/PointsWireView.vue` — pass `teams`.
- `src/football/footballReplacement.ts` — add `computeReplacementDetail`; `computeReplacementLevels` delegates.
- `src/football/__tests__/footballReplacement.test.ts` — append detail tests.
- `src/football/footballVor.ts` — add `buildFootballVorAudit` + its types.
- `src/football/__tests__/footballVor.test.ts` — append audit-agreement tests.
- `src/router/index.ts` — add the `/vor-audit` route.

---

## Task 1: `resolveLeagueSize` (pure)

The fallback chain that replaces pool inference. Lives in `useActivePointsSource.ts` next to the other exported pure helpers (`yahooMyTeamKey`, `espnTeamMeta`), matching the file's established pattern.

**Files:**
- Modify: `src/composables/useActivePointsSource.ts`
- Test: `src/composables/__tests__/useActivePointsSource.test.ts` (append)

**Interfaces:**
- Produces: `resolveLeagueSize(teamNames: Record<string, string>, totalRosters: number | undefined, pool: { teamKey: string }[]): LeagueSizeResolution` and `interface LeagueSizeResolution { size: number; source: 'teams' | 'settings' | 'pool' | 'default' }`.

- [ ] **Step 1: Write the failing tests — append to `src/composables/__tests__/useActivePointsSource.test.ts`**

READ the file first. Add `resolveLeagueSize` to the existing `@/composables/useActivePointsSource` import, then append:

```typescript
describe('resolveLeagueSize', () => {
  const pool = [{ teamKey: 'a' }, { teamKey: 'b' }, { teamKey: 'c' }]

  it('prefers the team list — correct even when rosters are empty', () => {
    const names = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' }
    expect(resolveLeagueSize(names, 12, [])).toEqual({ size: 4, source: 'teams' })
  })

  it('falls back to league settings when there is no team list', () => {
    expect(resolveLeagueSize({}, 12, [])).toEqual({ size: 12, source: 'settings' })
  })

  it('falls back to distinct pool teamKeys when team list and settings are absent', () => {
    expect(resolveLeagueSize({}, undefined, pool)).toEqual({ size: 3, source: 'pool' })
  })

  it('defaults to 12 when nothing is known', () => {
    expect(resolveLeagueSize({}, undefined, [])).toEqual({ size: 12, source: 'default' })
  })

  it('never returns 1 — a one-entry source falls through to the next rung', () => {
    expect(resolveLeagueSize({ '1': 'Only' }, 10, [])).toEqual({ size: 10, source: 'settings' })
    expect(resolveLeagueSize({ '1': 'Only' }, undefined, [{ teamKey: 'a' }])).toEqual({ size: 12, source: 'default' })
  })

  it('ignores non-finite or absurd settings values', () => {
    expect(resolveLeagueSize({}, NaN, pool)).toEqual({ size: 3, source: 'pool' })
    expect(resolveLeagueSize({}, 0, pool)).toEqual({ size: 3, source: 'pool' })
  })

  it('tolerates null/undefined inputs', () => {
    expect(resolveLeagueSize(null as any, undefined, null as any)).toEqual({ size: 12, source: 'default' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/composables/__tests__/useActivePointsSource.test.ts`
Expected: the new tests FAIL (`resolveLeagueSize` is not exported); the four existing tests still pass.

- [ ] **Step 3: Implement — add to `src/composables/useActivePointsSource.ts`**

Add below the existing `espnTeamMeta` helper (around line 35), before `export interface ActivePointsSource`:

```typescript
export interface LeagueSizeResolution {
  size: number
  source: 'teams' | 'settings' | 'pool' | 'default'
}

/**
 * League size for replacement-level math. The team list comes first because every
 * platform builds it from the league's TEAMS, not from rostered players — so it
 * stays correct when rosters are empty (pre-draft) or thin, which is exactly when
 * counting distinct pool teamKeys collapses to 0 and silently yields one-team
 * replacement levels. Each rung must clear 2 teams to be believed; a
 * wrong-but-typical 12 produces sane baselines where 1 produces nonsense.
 */
export function resolveLeagueSize(
  teamNames: Record<string, string>,
  totalRosters: number | undefined,
  pool: { teamKey: string }[],
): LeagueSizeResolution {
  const named = Object.keys(teamNames ?? {}).length
  if (named > 1) return { size: named, source: 'teams' }
  const settings = Number(totalRosters)
  if (Number.isFinite(settings) && settings > 1) return { size: Math.floor(settings), source: 'settings' }
  const pooled = new Set((pool ?? []).map((p) => p.teamKey)).size
  if (pooled > 1) return { size: pooled, source: 'pool' }
  return { size: 12, source: 'default' }
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/composables/__tests__/useActivePointsSource.test.ts`
Expected: ALL pass (4 existing + 7 new).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useActivePointsSource.ts src/composables/__tests__/useActivePointsSource.test.ts
git commit -m "feat: resolveLeagueSize — league size from the team list, never 1

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Wire `leagueSize` through the engine

Expose it on `ActivePointsSource`, make `useFootballVor` take it, and update every call site. This is the task that actually fixes the bug.

**Files:**
- Modify: `src/composables/useActivePointsSource.ts`, `src/composables/useFootballVor.ts`, `src/composables/useFootballWire.ts`, `src/composables/useWeeklyBoard.ts`, `src/views/PointsMyTeamView.vue`, `src/views/PointsTradesView.vue`, `src/views/PointsWireView.vue`

**Interfaces:**
- Consumes: `resolveLeagueSize` from Task 1.
- Produces: `ActivePointsSource.leagueSize: ComputedRef<number>`, `ActivePointsSource.leagueSizeSource: ComputedRef<LeagueSizeResolution['source']>`, and a required `teams: Ref<number>` field on `useFootballVor`'s and `useFootballWire`'s input objects.

- [ ] **Step 1: Add `leagueSize` to `ActivePointsSource` in `src/composables/useActivePointsSource.ts`**

Add these two lines to the `ActivePointsSource` interface, after `myRecord`:

```typescript
  leagueSize: ComputedRef<number>
  leagueSizeSource: ComputedRef<LeagueSizeResolution['source']>
```

Then, inside `useActivePointsSource()`, add after the `teamLogos` computed (around line 98):

```typescript
  // League size drives replacement level. Sourced from the team list first — it is
  // built from the league's teams on every platform, so it survives empty rosters.
  const leagueSizeResolution = computed(() =>
    resolveLeagueSize(teamNames.value, (leagueStore.currentLeague as any)?.total_rosters, pool.value),
  )
  const leagueSize = computed(() => leagueSizeResolution.value.size)
  const leagueSizeSource = computed(() => leagueSizeResolution.value.source)
```

Finally add `leagueSize, leagueSizeSource` to the returned object on the last line of the function.

- [ ] **Step 2: Make `useFootballVor` take `teams` — modify `src/composables/useFootballVor.ts`**

Add to the `inputs` parameter type, after `slots`:

```typescript
  teams: Ref<number>
```

Then replace line 106:

```typescript
        teams: new Set(inputs.pool.value.map((p) => p.teamKey)).size,
```

with:

```typescript
        teams: inputs.teams.value,
```

- [ ] **Step 3: Pass `teams` through `useFootballWire` — modify `src/composables/useFootballWire.ts`**

Add to the `inputs` parameter type, after `slots`:

```typescript
  teams: Ref<number>
```

And add `teams: inputs.teams,` to the `useFootballVor({ … })` call after `slots: inputs.slots,`.

- [ ] **Step 4: Pass `teams` at the four view/composable call sites**

In `src/composables/useWeeklyBoard.ts`, add `teams: src.leagueSize,` to the `useFootballVor({ … })` call, after `slots: src.rosterSlots,`.

In `src/views/PointsMyTeamView.vue`, add near the other `source.` bindings (after line 36, `const loading = source.loading`):

```typescript
const leagueSize = source.leagueSize
```

and add `teams: leagueSize,` to the `useFootballVor({ … })` call after `slots: rosterSlots,`.

In `src/views/PointsTradesView.vue`, add after line 31 (`const loading = source.loading`):

```typescript
const leagueSize = source.leagueSize
```

and add `teams: leagueSize,` to the `useFootballVor({ … })` call after `slots: rosterSlots,`.

In `src/views/PointsWireView.vue`, add after line 42 (`const myTeamKey = source.myTeamKey`):

```typescript
const leagueSize = source.leagueSize
```

and add `teams: leagueSize,` to the `useFootballWire({ … })` call after `slots: rosterSlots,`.

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "useActivePointsSource|useFootballVor|useFootballWire|useWeeklyBoard|PointsMyTeamView|PointsTradesView|PointsWireView" || echo "no type errors in touched files"`
Expected: "no type errors in touched files". If a call site is missing `teams`, TypeScript reports it here — that is the intended safety net.

Run: `npx vitest run`
Expected: all 662 tests pass (655 existing + 7 from Task 1).

- [ ] **Step 6: Commit**

```bash
git add src/composables/useActivePointsSource.ts src/composables/useFootballVor.ts src/composables/useFootballWire.ts src/composables/useWeeklyBoard.ts src/views/PointsMyTeamView.vue src/views/PointsTradesView.vue src/views/PointsWireView.vue
git commit -m "fix: league size from team list, not pool inference

An empty or thin pool made teams=0, which Math.max(1, teams) turned into a
one-team league — silently producing wrong replacement levels, and therefore
wrong VOR, on all four football surfaces.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `computeReplacementDetail` (pure)

The audit needs the startable counts that produced each replacement level. Rather than duplicate the flex-allocation logic, extract it: `computeReplacementDetail` does the work and returns both, and `computeReplacementLevels` becomes a one-line delegate so its seven existing call sites are untouched.

**Files:**
- Modify: `src/football/footballReplacement.ts`
- Test: `src/football/__tests__/footballReplacement.test.ts` (append)

**Interfaces:**
- Produces: `computeReplacementDetail(players: RepPlayer[], slots: Record<string, number>, teams: number): ReplacementDetail` and `interface ReplacementDetail { levels: ReplacementLevels; startable: Record<string, number>; countByPos: Record<string, number> }`.

- [ ] **Step 1: Write the failing tests — append to `src/football/__tests__/footballReplacement.test.ts`**

READ the file first. Add `computeReplacementDetail` to the existing `../footballReplacement` import, then append:

```typescript
describe('computeReplacementDetail', () => {
  const players = [
    { playerKey: 'rb1', position: 'RB', points: 300 },
    { playerKey: 'rb2', position: 'RB', points: 200 },
    { playerKey: 'rb3', position: 'RB', points: 100 },
    { playerKey: 'rb4', position: 'RB', points: 50 },
    { playerKey: 'qb1', position: 'QB', points: 400 },
    { playerKey: 'qb2', position: 'QB', points: 250 },
  ]

  it('reports the same levels computeReplacementLevels returns', () => {
    const slots = { QB: 1, RB: 2 }
    expect(computeReplacementDetail(players, slots, 1).levels).toEqual(
      computeReplacementLevels(players, slots, 1),
    )
  })

  it('reports startable counts and per-position player counts', () => {
    const d = computeReplacementDetail(players, { QB: 1, RB: 2 }, 1)
    expect(d.startable.RB).toBe(2)
    expect(d.startable.QB).toBe(1)
    expect(d.countByPos.RB).toBe(4)
    expect(d.countByPos.QB).toBe(2)
  })

  it('startable grows with league size', () => {
    const d = computeReplacementDetail(players, { QB: 1, RB: 2 }, 2)
    expect(d.startable.RB).toBe(4)
    expect(d.startable.QB).toBe(2)
  })

  it('flex openings raise the startable count of the position that fills them', () => {
    const d = computeReplacementDetail(players, { RB: 2, FLEX: 1 }, 1)
    expect(d.startable.RB).toBe(3) // 2 dedicated + the FLEX taken by rb3
    expect(d.levels.RB).toBe(50)   // first RB off the startable list
  })

  it('is total on empty input', () => {
    const d = computeReplacementDetail([], { RB: 2 }, 12)
    expect(d.levels.RB).toBe(0)
    expect(d.countByPos.RB ?? 0).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/football/__tests__/footballReplacement.test.ts`
Expected: the new tests FAIL (`computeReplacementDetail` not exported); the seven existing tests still pass.

- [ ] **Step 3: Refactor `src/football/footballReplacement.ts`**

Add the type below `export type ReplacementLevels = Record<string, number>` (line 11):

```typescript
export interface ReplacementDetail {
  levels: ReplacementLevels
  startable: Record<string, number>   // players at this position who start league-wide
  countByPos: Record<string, number>  // players available at this position
}
```

Rename the existing `computeReplacementLevels` function to `computeReplacementDetail`, change its return type to `ReplacementDetail`, and replace its final `return levels` (line 88) with:

```typescript
  const countByPos: Record<string, number> = {}
  for (const [pos, arr] of byPos) countByPos[pos] = arr.length
  return { levels, startable, countByPos }
```

Then add this delegate immediately after it, preserving the original doc comment on the new wrapper:

```typescript
/**
 * Standard value-based-drafting replacement level, calibrated to the league.
 * Thin wrapper over `computeReplacementDetail` — the levels only.
 */
export function computeReplacementLevels(
  players: RepPlayer[],
  slots: Record<string, number>,
  teams: number,
): ReplacementLevels {
  return computeReplacementDetail(players, slots, teams).levels
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/football/__tests__/footballReplacement.test.ts`
Expected: ALL pass (7 existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/football/footballReplacement.ts src/football/__tests__/footballReplacement.test.ts
git commit -m "refactor: computeReplacementDetail exposes startable counts

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `buildFootballVorAudit` (pure)

The audit builder. Takes the identical `FootballVorInput` the engine takes, so its numbers are the engine's numbers by construction.

**Files:**
- Modify: `src/football/footballVor.ts`
- Test: `src/football/__tests__/footballVor.test.ts` (append)

**Interfaces:**
- Consumes: `computeReplacementDetail`, `ReplacementDetail` (Task 3); the existing `FootballVorInput`.
- Produces: `buildFootballVorAudit(input: FootballVorInput): VorAudit`, `interface VorAuditPosition { position: string; startable: number; replacement: number; replacementWeek1: number; playersAtPosition: number }`, `interface VorAudit { teams: number; slots: Record<string, number>; positions: VorAuditPosition[]; playerCount: number; weeklyMapCount: number }`.

- [ ] **Step 1: Write the failing tests — append to `src/football/__tests__/footballVor.test.ts`**

READ the file first. Add `buildFootballVorAudit` to the existing `../footballVor` import, then append:

```typescript
describe('buildFootballVorAudit', () => {
  const points = { rb1: 300, rb2: 200, rb3: 100, qb1: 400 }
  const positionByKey = { rb1: 'RB', rb2: 'RB', rb3: 'RB', qb1: 'QB' }
  const input = { points, positionByKey, slots: { QB: 1, RB: 2 }, teams: 1 }

  it('reports the replacement levels the engine actually subtracted', () => {
    const vor = buildFootballVor(input)
    const audit = buildFootballVorAudit(input)
    const rb = audit.positions.find((p) => p.position === 'RB')!
    // Reconstructing VOR from the audit must reproduce the engine's number.
    expect(points.rb1 - rb.replacement).toBe(vor.rb1.vorRos)
    expect(points.rb2 - rb.replacement).toBe(vor.rb2.vorRos)
  })

  it('echoes its inputs', () => {
    const audit = buildFootballVorAudit(input)
    expect(audit.teams).toBe(1)
    expect(audit.slots).toEqual({ QB: 1, RB: 2 })
    expect(audit.playerCount).toBe(4)
    expect(audit.weeklyMapCount).toBe(0)
  })

  it('reports startable counts and per-position availability', () => {
    const rb = buildFootballVorAudit(input).positions.find((p) => p.position === 'RB')!
    expect(rb.startable).toBe(2)
    expect(rb.playersAtPosition).toBe(3)
  })

  it('carries week-1 replacement when weekly maps are supplied', () => {
    const audit = buildFootballVorAudit({
      ...input,
      weekly: [{ rb1: 20, rb2: 15, rb3: 10, qb1: 25 }],
    })
    const rb = audit.positions.find((p) => p.position === 'RB')!
    expect(rb.replacementWeek1).toBe(10)
    expect(audit.weeklyMapCount).toBe(1)
  })

  it('is total on empty input', () => {
    const audit = buildFootballVorAudit({ points: {}, positionByKey: {}, slots: {}, teams: 12 })
    expect(audit.playerCount).toBe(0)
    expect(audit.weeklyMapCount).toBe(0)
    expect(Array.isArray(audit.positions)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/football/__tests__/footballVor.test.ts`
Expected: the new tests FAIL (`buildFootballVorAudit` not exported); the five existing tests still pass.

- [ ] **Step 3: Implement — append to `src/football/footballVor.ts`**

Change the import on line 1 to pull in the detail function:

```typescript
import { computeReplacementDetail, computeReplacementLevels, type RepPlayer } from './footballReplacement'
```

Then append at the end of the file:

```typescript
export interface VorAuditPosition {
  position: string
  startable: number         // players at this position who start league-wide
  replacement: number       // ROS replacement level (points)
  replacementWeek1: number  // next-week replacement level; 0 when no weekly maps
  playersAtPosition: number
}

export interface VorAudit {
  teams: number
  slots: Record<string, number>
  positions: VorAuditPosition[]
  playerCount: number
  weeklyMapCount: number
}

/**
 * How the VOR numbers were produced, for `/vor-audit`. Takes the SAME
 * FootballVorInput object the engine takes and recomputes with the same pure
 * helpers, so the reported replacement levels are the levels the engine
 * subtracted — an audit that could disagree with the engine would be worse
 * than none. Pure and total.
 */
export function buildFootballVorAudit(input: FootballVorInput): VorAudit {
  const { points, positionByKey, slots, teams, weekly } = input
  const ros = computeReplacementDetail(repPlayers(points, positionByKey), slots, teams)
  const week1 = weekly?.length
    ? computeReplacementDetail(repPlayers(weekly[0], positionByKey), slots, teams)
    : null

  const positions: VorAuditPosition[] = Object.keys(ros.levels)
    .map((position) => ({
      position,
      startable: ros.startable[position] ?? 0,
      replacement: ros.levels[position] ?? 0,
      replacementWeek1: week1?.levels[position] ?? 0,
      playersAtPosition: ros.countByPos[position] ?? 0,
    }))
    .sort((a, b) => b.playersAtPosition - a.playersAtPosition || a.position.localeCompare(b.position))

  return {
    teams,
    slots,
    positions,
    playerCount: Object.keys(points).length,
    weeklyMapCount: weekly?.length ?? 0,
  }
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/football/__tests__/`
Expected: ALL pass (46 existing football tests + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/football/footballVor.ts src/football/__tests__/footballVor.test.ts
git commit -m "feat: buildFootballVorAudit — replacement levels the engine actually used

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `/vor-audit` view

Expose the audit and the resolved league size. Not in the nav — a diagnostic reachable by URL.

**Files:**
- Create: `src/views/VorAuditView.vue`
- Modify: `src/composables/useFootballVor.ts`, `src/router/index.ts`

**Interfaces:**
- Consumes: `buildFootballVorAudit`, `VorAudit` (Task 4); `ActivePointsSource.leagueSize`/`leagueSizeSource` (Task 2).
- Produces: `useFootballVor(...).audit: Ref<VorAudit | null>`.

- [ ] **Step 1: Expose `audit` from `src/composables/useFootballVor.ts`**

Add `buildFootballVorAudit` and `type VorAudit` to the existing `@/football/footballVor` import on line 10.

Add next to the `vorByKey` ref (around line 30):

```typescript
  const audit = ref<VorAudit | null>(null)
```

In `load()`, replace the `vorByKey.value = buildFootballVor({ … })` call with a single shared input object so the audit cannot drift from the engine:

```typescript
      const vorInput = {
        points,
        positionByKey: positionByKey.value,
        slots: inputs.slots.value,
        teams: inputs.teams.value,
        weekly: weekly.length ? weekly : undefined,
        opportunityByKey,
      }
      vorByKey.value = buildFootballVor(vorInput)
      audit.value = buildFootballVorAudit(vorInput)
```

In the `catch` block, add `audit.value = null` next to `vorByKey.value = {}`. Add `audit` to the returned object and to the function's declared return type:

```typescript
): { vorByKey: Ref<Record<string, PlayerVor>>; audit: Ref<VorAudit | null>; loading: Ref<boolean>; load: () => void } {
```

- [ ] **Step 2: Create `src/views/VorAuditView.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballVor } from '@/composables/useFootballVor'

const leagueStore = useLeagueStore()
const isFootball = computed(() => leagueStore.activeSport === 'football')
const source = useActivePointsSource()
const season = computed(() => '')

const { vorByKey, audit, loading } = useFootballVor({
  pool: source.pool,
  freeAgents: source.freeAgents,
  slots: source.rosterSlots,
  teams: source.leagueSize,
  season,
  enabled: isFootball,
})

function loadAll() {
  source.load()
  source.loadFreeAgents(200)
}
onMounted(loadAll)
watch(() => leagueStore.activeLeagueId, loadAll)

const round = (n: number) => Math.round(n * 10) / 10

// Every player, best VOR first — the derivation table.
const rows = computed(() =>
  Object.values(vorByKey.value)
    .map((v) => ({
      playerKey: v.playerKey,
      position: v.position,
      pointsRos: v.pointsRos,
      vorRos: v.vorRos,
      replacement: v.pointsRos - v.vorRos,
      confidence: v.confidence,
    }))
    .sort((a, b) => b.vorRos - a.vorRos)
    .slice(0, 200),
)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">VOR Audit</h1>
      <p class="font-mono text-xs text-dark-textMuted">how every football VOR number was produced</p>
    </header>

    <div v-if="!isFootball" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">Football only</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">The VOR engine runs for football leagues. Switch to one to audit it.</p>
    </div>

    <div v-else-if="loading && !audit" class="py-16 text-center text-dark-textMuted">Loading the engine…</div>

    <div v-else-if="!audit" class="py-16 text-center text-dark-textMuted">No VOR output to audit yet.</div>

    <template v-else>
      <!-- INPUTS -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Inputs</h2>
        <dl class="grid grid-cols-2 gap-y-2 font-mono text-xs sm:grid-cols-4">
          <div>
            <dt class="text-dark-textMuted">league size</dt>
            <dd class="text-sm font-bold text-dark-text">{{ audit.teams }}</dd>
          </div>
          <div>
            <dt class="text-dark-textMuted">size source</dt>
            <dd class="text-sm text-dark-text" :class="source.leagueSizeSource.value === 'default' ? 'text-amber-400' : ''">
              {{ source.leagueSizeSource.value }}
            </dd>
          </div>
          <div>
            <dt class="text-dark-textMuted">players</dt>
            <dd class="text-sm text-dark-text">{{ audit.playerCount }}</dd>
          </div>
          <div>
            <dt class="text-dark-textMuted">weekly maps</dt>
            <dd class="text-sm text-dark-text">{{ audit.weeklyMapCount }}</dd>
          </div>
        </dl>
        <p class="mt-3 font-mono text-[10px] text-dark-textMuted">
          slots: <span class="text-dark-text">{{ JSON.stringify(audit.slots) }}</span>
        </p>
      </section>

      <!-- REPLACEMENT LEVELS -->
      <section class="mb-5 overflow-x-auto rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Replacement levels</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">replacement = points of the first player off the startable list</p>
        <table class="w-full min-w-[28rem] text-left font-mono text-xs">
          <thead class="text-dark-textMuted">
            <tr class="border-b border-dark-border">
              <th class="py-1.5 pr-3">pos</th>
              <th class="py-1.5 pr-3 text-right">startable</th>
              <th class="py-1.5 pr-3 text-right">available</th>
              <th class="py-1.5 pr-3 text-right">repl (ROS)</th>
              <th class="py-1.5 text-right">repl (wk 1)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in audit.positions" :key="p.position" class="border-b border-dark-border/40 last:border-0">
              <td class="py-1.5 pr-3 font-semibold text-dark-text">{{ p.position }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-text">{{ p.startable }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-textMuted">{{ p.playersAtPosition }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-text">{{ round(p.replacement) }}</td>
              <td class="py-1.5 text-right text-dark-textMuted">{{ round(p.replacementWeek1) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- PLAYER DERIVATION -->
      <section class="overflow-x-auto rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Player derivation</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">points − replacement = VOR · top 200 by VOR</p>
        <table class="w-full min-w-[30rem] text-left font-mono text-xs">
          <thead class="text-dark-textMuted">
            <tr class="border-b border-dark-border">
              <th class="py-1.5 pr-3">key</th>
              <th class="py-1.5 pr-3">pos</th>
              <th class="py-1.5 pr-3 text-right">points</th>
              <th class="py-1.5 pr-3 text-right">− repl</th>
              <th class="py-1.5 pr-3 text-right">= VOR</th>
              <th class="py-1.5 text-right">conf</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.playerKey" class="border-b border-dark-border/40 last:border-0">
              <td class="py-1.5 pr-3 text-dark-textMuted">{{ r.playerKey }}</td>
              <td class="py-1.5 pr-3 text-dark-text">{{ r.position }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-text">{{ round(r.pointsRos) }}</td>
              <td class="py-1.5 pr-3 text-right text-dark-textMuted">{{ round(r.replacement) }}</td>
              <td class="py-1.5 pr-3 text-right font-bold text-dark-text">{{ round(r.vorRos) }}</td>
              <td class="py-1.5 text-right" :class="r.confidence === 'low' ? 'text-amber-400' : 'text-dark-textMuted'">{{ r.confidence }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
```

- [ ] **Step 3: Add the route in `src/router/index.ts`**

Find the `/this-week` route object added by the previous plan:

```typescript
    {
      path: '/this-week',
      name: 'this-week',
      component: () => import('@/views/WeeklyView.vue')
    },
```

Add this immediately after it:

```typescript
    {
      path: '/vor-audit',
      name: 'vor-audit',
      component: () => import('@/views/VorAuditView.vue')
    },
```

Do NOT add it to `App.vue`'s `tabs` — it is a diagnostic, not a product surface.

- [ ] **Step 4: Build, type-check, and run the full suite**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds.

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "VorAuditView|useFootballVor" || echo "no type errors in touched files"`
Expected: "no type errors in touched files".

Run: `npx vitest run`
Expected: all 672 tests pass (655 existing + 7 + 5 + 5).

- [ ] **Step 5: Manual smoke (local only — do NOT deploy)**

`npm run dev`, open a Sleeper football league, visit `/vor-audit`. Confirm: **league size matches the real league** (12 for a 12-team) and **size source reads `teams`, not `default`** — if it reads `default`, the resolution chain is not finding the team list and that is a real finding, not a cosmetic one. Confirm replacement levels are non-zero and ordered sensibly (QB replacement above RB in a 1-QB league). Confirm a baseball league shows the "Football only" state.

- [ ] **Step 6: Commit**

```bash
git add src/views/VorAuditView.vue src/composables/useFootballVor.ts src/router/index.ts
git commit -m "feat: /vor-audit — replacement levels and per-player VOR derivation

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §1 League size (`leagueSize`, `leagueSizeSource`, four-rung chain, per-platform team list) → Tasks 1–2. ✓
- §2 Audit builder (`buildFootballVorAudit`, `VorAudit`, `VorAuditPosition`, same-object no-drift) → Task 4, plus Task 3 for the startable counts it needs. ✓
- §3 Audit view (`/vor-audit`, not in nav, three sections, football-only note) → Task 5. ✓
- §4 Error handling (never 0/NaN/negative; empty state; audit totality) → Task 1 chain + Task 4 totality test + Task 5 empty states. ✓
- Testing (resolution order, the regression, audit agreement, totality) → Tasks 1, 3, 4. ✓
- Boundaries (`buildFootballVor` and `computeReplacementLevels` signatures unchanged; football only; no new fetches) → Task 3 delegate keeps the old signature; Task 4 adds a sibling; Task 5 is football-gated. ✓

**2. Placeholder scan:** No TBD/TODO. Every code step carries its actual content. ✓

**3. Type consistency:** `LeagueSizeResolution` (Task 1) → `ActivePointsSource.leagueSizeSource` (Task 2) → the view's source badge (Task 5). `ReplacementDetail` (Task 3) → `buildFootballVorAudit` (Task 4). `VorAudit`/`VorAuditPosition` (Task 4) → `useFootballVor.audit` and the view (Task 5). `teams: Ref<number>` is added to `useFootballVor` (Task 2 Step 2), passed by `useFootballWire` (Step 3) and all four call sites (Step 4), and supplied again by the audit view (Task 5 Step 2). `repPlayers` and `FootballVorInput` already exist in `footballVor.ts` and are reused, not redefined. ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-03-vor-league-size-and-audit.md`. Task 2 is the correctness fix; Tasks 3–5 make the engine checkable before the season makes it load-bearing.
