# Today Points-League Data Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Today board work on points leagues (Yahoo + ESPN) by wiring in a roster/free-agent source, valuing drops by projected rest-of-season points, and displaying raw projected points — reusing the already-built complete-move engine.

**Architecture:** One small new pure module (`pointsRosValue.ts`) computes projected ROS points per player. `useToday.ts` gains: an ESPN-points data source (`useEspnPointsTeamData`), three-way roster/FA routing, generalized triggers (Yahoo any-type + ESPN points), a points drop-currency switch (`rosValueByKey`), a points display branch (raw points + a pool-scaled `barPct`), and points loading-gate branches. The view bars off `barPct` (falling back to `score`) and renders a `pts` suffix on points leagues. Category behavior is unchanged (all points logic is behind `isPointsLeague`/`isEspnPointsLeague` guards).

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-today-points-data-path-design.md`

**Scope guardrails (deferred — do NOT build):** constraint engine (adds/IP/games caps), board reorganization. Category-league behavior must remain byte-unchanged.

**No transient breakage:** every task leaves type-check + build green (the new `barPct`/`isPoints` are additive; the points branches are guarded).

---

## Task 1: `pointsRosValue.ts` — projected ROS points per player (pure)

**Files:**
- Create: `src/today/pointsRosValue.ts`
- Test: `src/today/__tests__/pointsRosValue.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/today/__tests__/pointsRosValue.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pointsRosValue } from '../pointsRosValue'
import type { FGProjection } from '@/services/projectionService'

// Minimal stub matcher: returns a canned FGProjection for known names, null otherwise.
function stubMatcher(byName: Record<string, FGProjection>) {
  return (p: { full_name?: string }) => byName[p.full_name ?? ''] ?? null
}

describe('pointsRosValue', () => {
  it('sets an entry for every matched player; omits no-team and unmatched players', () => {
    const fg = {} as unknown as FGProjection // matched but unmappable → total 0, still keyed
    const m = pointsRosValue(
      [
        { playerKey: 'matched', name: 'Bat Man', team: 'LAD' },
        { playerKey: 'noTeam', name: 'FA Guy', team: 'FA' },
        { playerKey: 'blankTeam', name: 'Blank', team: '' },
        { playerKey: 'noMatch', name: 'Ghost', team: 'NYY' },
      ],
      stubMatcher({ 'Bat Man': fg }),
      { R: 1 },
    )
    expect(m.has('matched')).toBe(true)
    expect(m.has('noTeam')).toBe(false)
    expect(m.has('blankTeam')).toBe(false)
    expect(m.has('noMatch')).toBe(false)
  })

  it('returns the projectPlayerPoints total for a matched player (numeric)', () => {
    const fg = {} as unknown as FGProjection
    const m = pointsRosValue([{ playerKey: 'k', name: 'X', team: 'LAD' }], stubMatcher({ X: fg }), { R: 1 })
    expect(typeof m.get('k')).toBe('number')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/today/__tests__/pointsRosValue.test.ts`
Expected: FAIL — `Cannot find module '../pointsRosValue'`.

- [ ] **Step 3: Implement `src/today/pointsRosValue.ts`**

```ts
import { projectPlayerPoints } from '@/myteam/pointsValue'
import type { FGProjection } from '@/services/projectionService'

/**
 * Projected rest-of-season fantasy points per player — the Today board's points-league drop
 * currency (the category value model needs categories a points league doesn't have). Reuses the
 * FG-match → projectPlayerPoints path used by pointsDailyValue and the Wire. Players with no MLB
 * team ('FA'/blank) or no FanGraphs match carry no projectable value and are omitted from the map.
 */
export function pointsRosValue(
  players: { playerKey: string; name: string; team?: string }[],
  matchFG: (p: { full_name?: string; mlb_team?: string }) => FGProjection | null,
  weights: Record<string, number>,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of players) {
    const hasTeam = !!p.team && p.team.toUpperCase() !== 'FA'
    const fg = hasTeam ? matchFG({ full_name: p.name, mlb_team: p.team }) : null
    if (!fg) continue
    out.set(p.playerKey, projectPlayerPoints(fg, weights).total)
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/today/__tests__/pointsRosValue.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/today/pointsRosValue.ts src/today/__tests__/pointsRosValue.test.ts
git commit -m "feat: Today pointsRosValue — projected ROS points per player (points drop currency)"
```
(Ignore gc.log / bad-ref warnings; confirm with `git log --oneline -1`.)

---

## Task 2: `useToday.ts` (+ `todayBoard.ts`) — wire the points data path

**Files:**
- Modify: `src/composables/useToday.ts`
- Modify: `src/today/todayBoard.ts` (one field)

Read `src/composables/useToday.ts` first. All edits are guarded so category behavior is unchanged.

- [ ] **Step 1: `todayBoard.ts` — add the optional bar field.** In `src/today/todayBoard.ts`, in the `ScoredPlay` interface, immediately after the `score: number` line, add:

```ts
  barPct?: number // 0..100 bar fill; when unset the view falls back to `score` (category)
```

- [ ] **Step 2: `useToday.ts` imports.** After the existing imports, add:

```ts
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { pointsRosValue } from '@/today/pointsRosValue'
```

- [ ] **Step 3: ESPN-points data source + league flags.** After `const espn = useEspnCategoryTeamData()`, add:

```ts
  const espnPoints = useEspnPointsTeamData()
```

After the `isEspnCategoryLeague` computed, add:

```ts
  const isEspnPointsLeague = computed(
    () => leagueStore.activePlatform === 'espn' && espnPoints.supported.value === true,
  )
  const isYahooPointsLeague = computed(
    () => leagueStore.activePlatform === 'yahoo' && isPointsLeague.value,
  )
```

(`isPointsLeague` is defined lower in the file; these are computeds, so referencing it before its definition is fine.)

- [ ] **Step 4: Three-way roster / FA routing.** Replace the `rosterPlayers`, `rawFreeAgents`, and `freeAgents` computeds with:

```ts
  const rosterPlayers = computed(() =>
    isEspnCategoryLeague.value
      ? espn.rosterPlayers.value
      : isEspnPointsLeague.value
        ? espnPoints.rosterPlayers.value
        : yahooRosterPlayers.value,
  )
  const rawFreeAgents = computed<AvailablePlayer[]>(() =>
    isEspnCategoryLeague.value
      ? espn.freeAgents.value
      : isEspnPointsLeague.value
        ? espnPoints.freeAgents.value
        : yahooFreeAgentsRaw.value,
  )
  // ESPN's free-agent feed leaks rostered players (see useWire.ts) — exclude anyone already in
  // that ESPN source's league-wide pool. Yahoo's feed doesn't need the guard.
  const freeAgents = computed<AvailablePlayer[]>(() => {
    const espnSrc = isEspnCategoryLeague.value ? espn : isEspnPointsLeague.value ? espnPoints : null
    if (!espnSrc) return rawFreeAgents.value
    const guard = espnSrc.pool.value.length > 0
    const rostered = new Set(espnSrc.pool.value.map((p) => p.playerKey))
    return rawFreeAgents.value.filter((fa) => !guard || !rostered.has(fa.playerKey))
  })
```

Verification note: confirm `useEspnPointsTeamData` returns `pool` (it defines `const pool = ref<PoolPlayer[]>([])`). If `pool` is NOT in its return object, add `pool` to that composable's returned object (it's already declared) — a one-line addition, not a behavior change.

- [ ] **Step 5: Generalize triggers to load points rosters.** Replace `maybeLoadEspn`, `maybeLoadYahoo`, and `yahooRosterReady`:

```ts
  function maybeLoadEspn() {
    if (leagueStore.activePlatform === 'espn') {
      espn.load() // self-bails unless H2H_CATEGORY
      espnPoints.load() // self-bails unless points
    }
  }
  function maybeLoadYahoo() {
    if (leagueStore.activePlatform !== 'yahoo') return
    if (!yahooRosterPlayers.value.length) loadYahooRoster()
    if (!yahooFreeAgentsRaw.value.length) loadYahooFreeAgents()
  }
```

```ts
  const yahooRosterReady = computed(
    () => leagueStore.activePlatform === 'yahoo' && !!leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key,
  )
```

(Leave `maybeLoadSeasonData` category-gated — points leagues don't use season category data.)

- [ ] **Step 6: Points drop currency.** After the `roleValueByKey` computed, add:

```ts
  // Points-league drop currency: projected rest-of-season points per player (roster + FA). Empty
  // until the FG matcher is ready (gated by pointsScoringReady in dataReady, so the board waits).
  const pointsValueByKey = computed<Map<string, number>>(() => {
    const matchFG = matchFGRef.value
    if (!matchFG || !isPointsLeague.value) return new Map()
    return pointsRosValue(
      [...rosterPlayers.value, ...freeAgents.value].map((p) => ({
        playerKey: p.playerKey,
        name: p.name,
        team: p.team,
      })),
      matchFG,
      scoring.weights.value,
    )
  })

  // The drop currency for THIS league: category roleValue, or points ROS points.
  const rosValueByKey = computed<Map<string, number>>(() =>
    isPointsLeague.value ? pointsValueByKey.value : roleValueByKey.value,
  )
```

Then in BOTH `replacementBySide` and `droppableToday`, change the line `const rv = roleValueByKey.value` to:

```ts
    const rv = rosValueByKey.value
```

- [ ] **Step 7: Points display branch.** Replace the `scoredPlays` computed and add `pointsRanked` after it:

```ts
  const scoredPlays = computed<ScoredPlay[]>(() => {
    const scored = candidates.value.map(scoreCandidate)
    const filtered = !isPointsLeague.value
      ? scored
      : scored.filter((p) => p.value > 0 && !outFaKeys.value.has(p.playerKey))
    const ranked = isPointsLeague.value ? pointsRanked(filtered) : normalizeMoves(filtered)
    return attachDrops(ranked)
  })

  // Points display: no percentile normalization — `score` IS the raw per-game points (so the board
  // sorts by real points and a pitcher's start correctly tops a hitter-game), and `barPct` fills
  // proportional to the day's top move (points are cross-type comparable).
  function pointsRanked(plays: ScoredPlay[]): ScoredPlay[] {
    const max = plays.reduce((m, p) => Math.max(m, p.value), 0)
    return plays.map((p) => ({
      ...p,
      score: p.value,
      barPct: max > 0 ? Math.round((p.value / max) * 100) : 0,
    }))
  }
```

(`pointsRanked` is a function declaration, so hoisting lets `scoredPlays` reference it. `attachDrops` sorts by `score`, which is now raw points on a points board — correct.)

- [ ] **Step 8: Loading-gate points branches.** Replace `boardInputsReady`:

```ts
  const boardInputsReady = computed(() => {
    if (isEspnCategoryLeague.value) return espn.loaded.value && valueBaselineSvc.ready.value
    if (isEspnPointsLeague.value) return espnPoints.loaded.value
    if (isYahooCategoryLeague.value)
      return yahooRosterLoaded.value && yahooFaLoaded.value && valueBaselineSvc.ready.value
    if (isYahooPointsLeague.value) return yahooRosterLoaded.value && yahooFaLoaded.value
    return true
  })
```

(`dataReady` already ANDs `pointsScoringReady`, so the FG matcher + weights readiness for the points drop values is covered.)

- [ ] **Step 9: Expose `isPoints` to the view.** In the `useToday()` return-type annotation (top of the function), add `isPoints: ComputedRef<boolean>`:

```ts
export function useToday(): {
  vm: ComputedRef<TodayBoard>
  loading: Ref<boolean>
  error: Ref<string | null>
  load: () => Promise<void>
  isPoints: ComputedRef<boolean>
} {
```

And change the final return to:

```ts
  return { vm, loading: isLoading, error, load, isPoints: isPointsLeague }
```

- [ ] **Step 10: Type-check + tests + build.**

Run: `npm run type-check 2>&1 | grep -iE "useToday|today/"` → expect no output.
Run: `npx vitest run src/today` → expect all PASS.
Run: `npm run build 2>&1 | tail -3` → expect `✓ built`.
If type-check flags a real signature mismatch (e.g. `espnPoints.pool` / `.loaded` / `.supported` not exposed, or `AvailablePlayer.team` shape), read `src/composables/useEspnPointsTeamData.ts` and `src/players/types.ts` and reconcile to the real types without changing intended behavior; report any adaptation.

- [ ] **Step 11: Commit**

```bash
git add src/composables/useToday.ts src/today/todayBoard.ts
git commit -m "feat: useToday — points-league data path (Yahoo+ESPN), points drop currency + raw-points display"
```
(Ignore gc.log / bad-ref warnings; confirm `git log --oneline -1`.)

---

## Task 3: `TodayView.vue` — points number (`pts` suffix) + `barPct` bar

**Files:**
- Modify: `src/views/TodayView.vue`

Read the file first. The move number currently renders `{{ p.score }}` and the bar `{{ scoreBar(p.score) }}` (or `scoreBar(board.hero.score)` / `scoreBar(slot.fill.score)`). This task routes both through helpers so points leagues show `N pts` and the bar uses `barPct`.

- [ ] **Step 1: Destructure `isPoints`.** Change the `useToday()` call:

```ts
const { vm, loading, error, load, isPoints } = useToday()
```

- [ ] **Step 2: Add display helpers.** After the existing `scoreBar` function, add:

```ts
const moveBar = (p: ScoredPlay) => scoreBar(p.barPct ?? p.score)
const scoreText = (p: ScoredPlay) => (isPoints.value ? `${Math.round(p.score)} pts` : String(p.score))
```

- [ ] **Step 3: Hero.** In the hero section, change the bar and the big number:
- `{{ scoreBar(board.hero.score) }}` → `{{ moveBar(board.hero) }}`
- the number `<div class="font-display text-2xl font-bold text-primary tabular-nums">{{ board.hero.score }}</div>` → `{{ scoreText(board.hero) }}`

- [ ] **Step 4: Streaming rows.** In the `v-for="p in board.streamers"` row:
- `{{ scoreBar(p.score) }}` → `{{ moveBar(p) }}`
- the number `<span class="shrink-0 font-mono text-sm font-bold text-primary tabular-nums">{{ p.score }}</span>` → `{{ scoreText(p) }}`

- [ ] **Step 5: Upgrade rows.** In the `v-for="p in board.upgrades"` row:
- `{{ scoreBar(p.score) }}` → `{{ moveBar(p) }}`
- `{{ p.score }}` (the bold number) → `{{ scoreText(p) }}`

- [ ] **Step 6: Open-slot fill.** In the open-slots fill block:
- `{{ scoreBar(slot.fill.score) }}` → `{{ moveBar(slot.fill) }}`

(Leave `sitAlerts` rows unchanged — they keep `bar(p.bucket)` and their red styling.)

- [ ] **Step 7: Type-check + build.**

Run: `npm run type-check 2>&1 | grep -iE "TodayView"` → expect no output.
Run: `npm run build 2>&1 | tail -3` → expect `✓ built`.

- [ ] **Step 8: Commit**

```bash
git add src/views/TodayView.vue
git commit -m "feat: Today view — points 'N pts' number + barPct-driven bar"
```
(Ignore gc.log / bad-ref warnings; confirm `git log --oneline -1`.)

---

## Task 4: Full verification

- [ ] **Step 1: Full test suite.** Run: `npm test` → expect all pass (adds `pointsRosValue` 2 tests; category tests unchanged).

- [ ] **Step 2: Type-check + build.** Run: `npm run type-check 2>&1 | grep -iE "today|useToday"` → no output; `npm run build 2>&1 | tail -3` → `✓ built`. (Pre-existing unrelated type errors in `yahoo-daily-stats-methods.ts` / `DraftPage` / `HistoryPage` / `MatchupsPage.vue` are not this work's — confirm via `git status --short` showing only the touched files.)

- [ ] **Step 3: Manual smoke (user).**
  - **Yahoo points league (the Lopez-for-Miles one):** Today now renders a board — streams/upgrades show `→ add <FA> · drop <Body> (off today | IL | benched)` (or `no clean drop`), each with an `≈N pts` figure and a bar scaled to the day's best move; the obvious add/drop surfaces instead of "you're set."
  - **ESPN points league:** same behavior.
  - No "you're set" flash while loading (gate holds "Reading today's slate…").
  - **Category leagues unchanged:** still 0–100 scores + `helps <CAT>` chips, no `pts` suffix.
- [ ] **Step 4:** commit any smoke fix.

## Self-Review

- **Spec coverage:** data-source routing + triggers (Task 2 Steps 3–5) → both platforms load; points drop currency via `pointsRosValue` + `rosValueByKey` (Task 1, Task 2 Step 6); raw-points display with `barPct` (Task 2 Step 7, Task 3); loading-gate points branches (Task 2 Step 8); `isPoints` to view (Task 2 Step 9, Task 3 Step 1). All spec sections map to a task.
- **Type consistency:** `barPct?: number` added to `ScoredPlay` (Task 2 Step 1), set by `pointsRanked` (Step 7), read by `moveBar` (Task 3 Step 2); `pointsRosValue` signature matches its call site (Task 2 Step 6); `isPoints: ComputedRef<boolean>` return type matches `isPointsLeague` (a computed) and the view destructure.
- **No transient breakage:** `barPct`/`isPoints` are additive; points branches are guarded by `isPointsLeague`/`isEspnPointsLeague`; each task type-checks + builds.
- **Category untouched:** every points path is behind a guard; `normalizeMoves`/chips/0–100 score unchanged for category; `barPct` unset on category → view falls back to `score`.
- **YAGNI:** no constraint engine, no board reorg.
