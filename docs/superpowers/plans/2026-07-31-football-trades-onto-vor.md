# Football Trades onto VOR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer the football VOR engine onto Trades — a ΣVOR fair-value readout on each trade idea, and a replacement-relative (VOR-based) strength ranking in the trade landscape/partners — without changing the existing lineup-marginal deal engine and with baseball byte-for-byte unchanged.

**Architecture:** Extract the VOR-building half of `useFootballWire` into a shared `useFootballVor` composable so Wire and Trades consume the same engine. Add an OPTIONAL `vorByKey` parameter to the two sport-agnostic builders (`buildPointsTrades`, `buildPointsTradeLandscape`): when present (football), it annotates trade sides with VOR and ranks positional strength by VOR; when absent (baseball), behavior is identical to today. The Trades view wires it in behind `isFootball`.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest. Builds on the football VOR engine (`src/football/footballVor.ts` `buildFootballVor`/`PlayerVor`, already built + tested) and `useFootballWire` (`src/composables/useFootballWire.ts`).

**Scope:** This is the Trades consumer from spec §6 (`docs/superpowers/specs/2026-07-30-football-vor-cheat-code-design.md`). The engine spine + Wire consumer already shipped (plan `2026-07-30-football-vor-engine-and-wire.md`). My Team onto VOR is a separate follow-on plan.

**Spec:** `docs/superpowers/specs/2026-07-30-football-vor-cheat-code-design.md` §6 Trades.

---

## File Structure

**Create:**
- `src/composables/useFootballVor.ts` — the VOR-building composable (season + next-4-week Sleeper projections → `buildFootballVor` → `vorByKey`). Extracted verbatim from `useFootballWire`'s internals so both surfaces share one engine.

**Modify:**
- `src/composables/useFootballWire.ts` — consume `useFootballVor` for `vorByKey` instead of building it inline; public return shape (`{ wire, loading, load }`) unchanged.
- `src/myteam/pointsTrades.ts` — optional `vorByKey` param; add `vor?` to `TradeSide`.
- `src/myteam/pointsTradeLandscape.ts` — optional `vorByKey` param; rank positional strength by VOR when supplied.
- `src/views/PointsTradesView.vue` — instantiate `useFootballVor`, pass `vorByKey` to the two builders for football, render the fair-value readout.
- `src/myteam/__tests__/pointsTrades.test.ts` + `src/myteam/__tests__/pointsTradeLandscape.test.ts` — append VOR cases (existing baseball cases must keep passing = non-regression).

**Design decisions (locked):**
- VOR is a `Record<string, { vorRos: number }>` param. `PlayerVor` (which has `vorRos`) is structurally assignable, so the view passes `vorByKey` straight through.
- The deal engine (`buildPointsTrades` optimal-lineup `myGain`/`theirGain`) stays on absolute projected POINTS — VOR is relative and must not drive lineup optimization. VOR only ANNOTATES sides (fair value).
- In the Trades view, `useFootballVor` is fed an EMPTY free-agent list, so replacement is calibrated on rostered players. Cross-team ranking is unaffected (uniform baseline); absolute vorRos may sit a touch below the Wire's (which includes FAs). This keeps Trades self-contained (no FA fetch) — acceptable for v1, noted for smoke.

---

## Task 1: Extract `useFootballVor` composable

Pull the VOR-building logic out of `useFootballWire` into a shared composable. Pure refactor — no behavior change. `useFootballWire`'s public API stays identical.

**Files:**
- Create: `src/composables/useFootballVor.ts`
- Modify: `src/composables/useFootballWire.ts`

- [ ] **Step 1: Create `src/composables/useFootballVor.ts`**

This is the VOR half of the current `useFootballWire` (everything except the `wire` computed and the `myTeamKey` input). Content:

```typescript
import { computed, ref, watch, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats, fetchWeekProjectionStats } from '@/services/footballProjections'
import {
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'
import { defaultWeights } from '@/myteam/pointsScoring'
import { buildFootballVor, type PlayerVor } from '@/football/footballVor'
import { playingTeams, zeroByeWeek } from '@/football/footballBye'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

const WEEKLY_HORIZON = 4 // next N weeks for streamability

/**
 * Builds per-player football VOR (`vorByKey`) from season + next-N-week Sleeper
 * projections calibrated to the league's replacement level. Shared by the Wire
 * and Trades surfaces so both read the same currency. Gated to football.
 */
export function useFootballVor(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  freeAgents: Ref<AvailablePlayer[]>
  slots: Ref<Record<string, number>>
  season: Ref<string>
  enabled: Ref<boolean>
}): { vorByKey: Ref<Record<string, PlayerVor>>; loading: Ref<boolean>; load: () => void } {
  const vorByKey = ref<Record<string, PlayerVor>>({})
  const loading = ref(false)

  const projPlayers = computed<ProjPlayer[]>(() => [
    ...inputs.pool.value.map((p) => ({ key: p.playerKey, name: p.name, position: p.position })),
    ...inputs.freeAgents.value.map((fa) => ({ key: fa.playerKey ?? `fa:${fa.name}`, name: fa.name, position: fa.position })),
  ])
  const positionByKey = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of inputs.pool.value) out[p.playerKey] = p.position
    for (const fa of inputs.freeAgents.value) out[fa.playerKey ?? `fa:${fa.name}`] = fa.position
    return out
  })
  const proTeamByKey = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of inputs.pool.value) out[p.playerKey] = (p.proTeam ?? '').toUpperCase()
    for (const fa of inputs.freeAgents.value) out[fa.playerKey ?? `fa:${fa.name}`] = (fa.team ?? '').toUpperCase()
    return out
  })

  async function load() {
    if (!inputs.enabled.value || projPlayers.value.length === 0) { vorByKey.value = {}; return }
    loading.value = true
    try {
      const state = await sleeperService.getNflState()
      const season = inputs.season.value || state.season
      const currentWeek = Number(state.week) || 1
      const scoring = defaultWeights('football')

      const [seasonStats, playersMap] = await Promise.all([
        fetchSeasonProjectionStats(season),
        sleeperService.getPlayers(),
      ])
      const meta: Record<string, SleeperPlayerMeta> = {}
      for (const [id, pl] of Object.entries(playersMap)) {
        meta[id] = { name: (pl as any)?.full_name || '', position: (pl as any)?.position || '' }
      }
      const seasonProj = buildFootballProjectionsByKey(projPlayers.value, seasonStats, meta, scoring)
      const points: Record<string, number> = {}
      for (const [k, v] of Object.entries(seasonProj)) points[k] = v.points

      const weeks = Array.from({ length: WEEKLY_HORIZON }, (_, i) => currentWeek + i)
      const weekly: Record<string, number>[] = []
      for (const wk of weeks) {
        try {
          const [wkStats, sched] = await Promise.all([
            fetchWeekProjectionStats(season, wk),
            sleeperService.getNflSchedule(season, wk),
          ])
          const wkProj = buildFootballProjectionsByKey(projPlayers.value, wkStats, meta, scoring)
          const wkPoints: Record<string, number> = {}
          for (const [k, v] of Object.entries(wkProj)) wkPoints[k] = v.points
          weekly.push(zeroByeWeek(wkPoints, proTeamByKey.value, playingTeams(sched)))
        } catch (e) {
          console.warn('[useFootballVor] weekly fetch failed for week', wk, e)
        }
      }

      vorByKey.value = buildFootballVor({
        points,
        positionByKey: positionByKey.value,
        slots: inputs.slots.value,
        teams: new Set(inputs.pool.value.map((p) => p.teamKey)).size,
        weekly: weekly.length ? weekly : undefined,
      })
    } catch (e) {
      console.error('[useFootballVor] load failed', e)
      vorByKey.value = {}
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, projPlayers, inputs.season], load, { immediate: true })

  return { vorByKey, loading, load }
}
```

- [ ] **Step 2: Refactor `src/composables/useFootballWire.ts` to consume it**

Replace the ENTIRE current contents of `src/composables/useFootballWire.ts` with:

```typescript
import { computed, type ComputedRef, type Ref } from 'vue'
import { buildFootballWire, type FootballWire } from '@/football/footballWire'
import { useFootballVor } from './useFootballVor'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

/**
 * The football Wire view-model: builds per-player VOR (via useFootballVor) and
 * assembles the best-available / upgrades / this-week / board model. Gated to
 * football; baseball callers never invoke it.
 */
export function useFootballWire(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  freeAgents: Ref<AvailablePlayer[]>
  slots: Ref<Record<string, number>>
  myTeamKey: Ref<string>
  season: Ref<string>
  enabled: Ref<boolean>
}): { wire: ComputedRef<FootballWire | null>; loading: Ref<boolean>; load: () => void } {
  const { vorByKey, loading, load } = useFootballVor({
    pool: inputs.pool,
    freeAgents: inputs.freeAgents,
    slots: inputs.slots,
    season: inputs.season,
    enabled: inputs.enabled,
  })

  const wire = computed<FootballWire | null>(() => {
    if (!inputs.enabled.value || !inputs.myTeamKey.value || !Object.keys(vorByKey.value).length) return null
    return buildFootballWire({
      freeAgents: inputs.freeAgents.value,
      vorByKey: vorByKey.value,
      pool: inputs.pool.value,
      slots: inputs.slots.value,
      myTeamKey: inputs.myTeamKey.value,
    })
  })

  return { wire, loading, load }
}
```

- [ ] **Step 3: Verify nothing regressed**

The football pure-function tests must still pass (they don't touch composables, but confirm the imports still resolve):

Run: `npx vitest run src/football/`
Expected: 7 files, 33 tests pass.

Type-check both composables:

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "useFootballVor|useFootballWire" || echo "no useFootballVor/useFootballWire type errors"`
Expected: "no useFootballVor/useFootballWire type errors".

Confirm the Wire view's consumption is unchanged (it destructures `{ wire, loading }` from `useFootballWire` — still exported):

Run: `grep -n "useFootballWire" src/views/PointsWireView.vue`
Expected: the import + the `const { wire: fbWire, loading: fbLoading } = useFootballWire({...})` call — both still valid against the unchanged return shape.

Build:

Run: `npm run build 2>&1 | tail -3`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useFootballVor.ts src/composables/useFootballWire.ts
git commit -m "refactor: extract useFootballVor — shared VOR engine for Wire + Trades

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: VOR fair-value on trade sides (`pointsTrades.ts`)

Add an optional `vorByKey` parameter; annotate each `TradeSide` with its `vorRos`. Baseball (no `vorByKey`) leaves `vor` undefined.

**Files:**
- Modify: `src/myteam/pointsTrades.ts`
- Test: `src/myteam/__tests__/pointsTrades.test.ts` (append)

- [ ] **Step 1: Write the failing tests — append to `src/myteam/__tests__/pointsTrades.test.ts`**

The file already has a `describe('buildPointsTrades', ...)` with a `pool`, `fg`, `weights`, `names`, and `slots` fixture where the win-win deal sends `A_OF2` (my surplus) and gets `B_SP2` (their surplus). Append these two tests INSIDE the existing `describe` block (so they reuse `pool`, `fg`, `weights`, `names`, `slots`), just before its closing `})`:

```typescript
  it('annotates each trade side with VOR when a vorByKey is supplied', () => {
    // Key VOR on the two surplus bodies the win-win moves: give A_OF2, get B_SP2.
    const vorByKey = { A_OF2: { vorRos: 25 }, B_SP2: { vorRos: 40 } }
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names, vorByKey)
    expect(ideas.length).toBeGreaterThan(0)
    expect(ideas[0].give.vor).toBe(25) // A_OF2
    expect(ideas[0].get.vor).toBe(40)  // B_SP2
  })

  it('leaves VOR undefined when no vorByKey is supplied (baseball default)', () => {
    const ideas = buildPointsTrades(pool, buildBaseballValue(fg, weights), 'A', slots, names)
    expect(ideas[0].give.vor).toBeUndefined()
    expect(ideas[0].get.vor).toBeUndefined()
  })
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/myteam/__tests__/pointsTrades.test.ts`
Expected: the two new tests FAIL (TS/`vor` undefined-as-property or the 6th arg not accepted); existing tests still pass.

- [ ] **Step 3: Implement — edit `src/myteam/pointsTrades.ts`**

(a) Add `vor?` to the `TradeSide` interface. Change:

```typescript
export interface TradeSide {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  points: number
}
```

to:

```typescript
export interface TradeSide {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  points: number
  vor?: number // football: value over replacement (season). undefined for baseball.
}
```

(b) Add the `vorByKey` parameter to `buildPointsTrades`. Change the signature:

```typescript
export function buildPointsTrades(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  myTeamKey: string,
  slots: Record<string, number>,
  teamNames: Record<string, string> = {},
): TradeIdea[] {
```

to:

```typescript
export function buildPointsTrades(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  myTeamKey: string,
  slots: Record<string, number>,
  teamNames: Record<string, string> = {},
  vorByKey: Record<string, { vorRos: number }> = {},
): TradeIdea[] {
```

(c) Populate `vor` in `sideOf`. Change:

```typescript
  const sideOf = (key: string): TradeSide => {
    const p = meta.get(key)!
    return { playerKey: key, name: p.name, position: p.position, proTeam: p.proTeam, headshot: p.headshot, points: ptsByKey.get(key) ?? 0 }
  }
```

to:

```typescript
  const sideOf = (key: string): TradeSide => {
    const p = meta.get(key)!
    return { playerKey: key, name: p.name, position: p.position, proTeam: p.proTeam, headshot: p.headshot, points: ptsByKey.get(key) ?? 0, vor: vorByKey[key]?.vorRos }
  }
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/myteam/__tests__/pointsTrades.test.ts`
Expected: ALL pass (existing baseball cases + the two new ones).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/pointsTrades.ts src/myteam/__tests__/pointsTrades.test.ts
git commit -m "feat: annotate trade sides with VOR fair value (football)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: VOR-based landscape strength (`pointsTradeLandscape.ts`)

Add an optional `vorByKey` parameter; when supplied (football), rank each team's positional strength by the best body's `vorRos` (replacement-relative, negatives allowed) instead of raw projected points. Baseball path is byte-for-byte unchanged.

**Files:**
- Modify: `src/myteam/pointsTradeLandscape.ts`
- Test: `src/myteam/__tests__/pointsTradeLandscape.test.ts` (append)

- [ ] **Step 1: Write the failing test — append to `src/myteam/__tests__/pointsTradeLandscape.test.ts`**

Append this NEW `describe` block at the end of the file (after the existing `describe('buildPointsTradeLandscape', ...)` closes):

```typescript
describe('buildPointsTradeLandscape — football VOR strength', () => {
  // 2 teams, RB position. A's RB is above replacement (+20), B's is BELOW (-8).
  // With a vorByKey, B's negative-VOR RB must still rank as a real body (rank 2), not "none".
  const fbPool: PointsPoolPlayer[] = [
    { playerKey: 'A_RB', name: 'A_RB', position: 'RB', teamKey: 'A', eligiblePositions: ['RB'] },
    { playerKey: 'B_RB', name: 'B_RB', position: 'RB', teamKey: 'B', eligiblePositions: ['RB'] },
  ]
  const vorByKey = { A_RB: { vorRos: 20 }, B_RB: { vorRos: -8 } }

  it('ranks by VOR including negatives when a vorByKey is supplied', () => {
    const ls = buildPointsTradeLandscape(fbPool, {}, {}, 'A', { A: 'Me', B: 'You' }, 'football', vorByKey)!
    expect(ls.positions).toContain('RB')
    expect(ls.rank.RB.A).toBe(1) // above replacement — best
    expect(ls.rank.RB.B).toBe(2) // below replacement, but a real body — ranked, not 0
    expect(ls.myStrong).toContain('RB') // A is top-third at RB
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/pointsTradeLandscape.test.ts`
Expected: the new test FAILS (7th arg not accepted, and/or `rank.RB.B` is `0` because the current code zeroes non-positive values); existing tests still pass.

- [ ] **Step 3: Implement — edit `src/myteam/pointsTradeLandscape.ts`**

(a) Add the `vorByKey` parameter. Change the signature:

```typescript
export function buildPointsTradeLandscape(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  fgByKey: Record<string, FGProjection | null>,
  myTeamKey: string,
  teamNames: Record<string, string> = {},
  sport: string = 'baseball',
): PointsTradeLandscape | null {
```

to:

```typescript
export function buildPointsTradeLandscape(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  fgByKey: Record<string, FGProjection | null>,
  myTeamKey: string,
  teamNames: Record<string, string> = {},
  sport: string = 'baseball',
  vorByKey?: Record<string, { vorRos: number }>,
): PointsTradeLandscape | null {
```

(b) Source each player's per-position value from VOR when supplied. Change:

```typescript
  interface P { eligible: string[]; points: number }
  const byTeam = new Map<string, P[]>()
  for (const p of pool) {
    const points = valueByKey[p.playerKey]?.total ?? 0
    // Role-based eligibility: a starter counts for SP, a reliever for RP — ESPN
    // lists most pitchers as eligible for BOTH, which made the SP/RP rows identical.
    ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push({ eligible: lineupEligFor(p, fgByKey), points })
  }
```

to:

```typescript
  // Football ranks positional strength by VOR (replacement-relative, negatives real);
  // baseball keeps raw projected points (non-positive = no startable body).
  const useVor = !!vorByKey
  interface P { eligible: string[]; points: number }
  const byTeam = new Map<string, P[]>()
  for (const p of pool) {
    const points = useVor ? (vorByKey![p.playerKey]?.vorRos ?? 0) : (valueByKey[p.playerKey]?.total ?? 0)
    // Role-based eligibility: a starter counts for SP, a reliever for RP — ESPN
    // lists most pitchers as eligible for BOTH, which made the SP/RP rows identical.
    ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push({ eligible: lineupEligFor(p, fgByKey), points })
  }
```

(c) Make `bestAt` distinguish "no eligible body" (null) from a real body (any value, incl. negative), and branch the presence/none logic on `useVor`. Change:

```typescript
  // Best body's points per team per position, then rank teams (desc) at each position.
  const bestAt = (team: string, pos: string): number => {
    let best = 0
    for (const pl of byTeam.get(team) ?? []) if (coversSlot(pl.eligible, pos) && pl.points > best) best = pl.points
    return best
  }
  const positions = positionRowsFor(sport).filter((pos) => teamKeys.some((t) => bestAt(t, pos) > 0))
  const rank: Record<string, Record<string, number>> = {}
  for (const pos of positions) {
    const rows = teamKeys.map((t) => ({ t, v: bestAt(t, pos) })).sort((a, b) => b.v - a.v)
    const r: Record<string, number> = {}
    let prev = Infinity
    let rk = 0
    rows.forEach((row, i) => {
      if (row.v <= 0) { r[row.t] = 0; return }
      if (row.v < prev) { rk = i + 1; prev = row.v }
      r[row.t] = rk
    })
    rank[pos] = r
  }
```

to:

```typescript
  // Best body's value per team per position (null = no eligible body), then rank teams desc.
  const bestAt = (team: string, pos: string): number | null => {
    let best: number | null = null
    for (const pl of byTeam.get(team) ?? []) {
      if (!coversSlot(pl.eligible, pos)) continue
      if (best === null || pl.points > best) best = pl.points
    }
    return best
  }
  // A position "shows" if some team has a startable body there. Baseball keeps the
  // >0 gate (non-positive points = no real body); football (VOR) counts any eligible
  // body, since a below-replacement starter is still a real, rankable body.
  const present = (t: string, pos: string): boolean => {
    const v = bestAt(t, pos)
    return useVor ? v !== null : v !== null && v > 0
  }
  const positions = positionRowsFor(sport).filter((pos) => teamKeys.some((t) => present(t, pos)))
  const rank: Record<string, Record<string, number>> = {}
  for (const pos of positions) {
    const rows = teamKeys
      .map((t) => ({ t, v: bestAt(t, pos) }))
      .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity))
    const r: Record<string, number> = {}
    let prev = Infinity
    let rk = 0
    rows.forEach((row, i) => {
      const none = row.v === null || (!useVor && row.v <= 0)
      if (none) { r[row.t] = 0; return }
      if (row.v! < prev) { rk = i + 1; prev = row.v! }
      r[row.t] = rk
    })
    rank[pos] = r
  }
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/myteam/__tests__/pointsTradeLandscape.test.ts`
Expected: ALL pass (existing baseball cases unchanged + the new football VOR case).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/pointsTradeLandscape.ts src/myteam/__tests__/pointsTradeLandscape.test.ts
git commit -m "feat: VOR-based positional strength in trade landscape (football)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire VOR into the Trades view (`PointsTradesView.vue`)

Instantiate `useFootballVor`, pass `vorByKey` to both builders for football, and render a fair-value readout on each trade idea. Baseball path passes no `vorByKey` and is unchanged.

**Files:**
- Modify: `src/views/PointsTradesView.vue`

- [ ] **Step 1: Read the current view** `src/views/PointsTradesView.vue` (about 220 lines). Note: `source` (line 16), `pool`/`rosterSlots`/`myTeamKey`/`teamNames`/`fgByKey` (26-31), `season` (33), `valueByKey` from `usePointsValue` (34), `ideas`/`landscape` computeds (36-44), `isFootball` (13), `round` (61). The trade idea rows are rendered `v-for="(idea, i) in ideas"` starting ~line 115, with a footer row at ~line 158 (`they gain … both lineups improve`).

- [ ] **Step 2: Script — instantiate `useFootballVor` and thread `vorByKey`**

Add the import next to the other `@/composables` imports at the top:

```typescript
import { useFootballVor } from '@/composables/useFootballVor'
```

After the `usePointsValue` line (line 34), add:

```typescript
// Football VOR (shared engine). Replacement is calibrated on rostered players here
// (empty free-agent list) — cross-team ranking is unaffected; Trades stays self-contained.
const noFreeAgents = computed(() => [])
const { vorByKey: fbVor } = useFootballVor({
  pool,
  freeAgents: noFreeAgents,
  slots: rosterSlots,
  season,
  enabled: isFootball,
})
const tradeVor = computed(() => (isFootball.value ? fbVor.value : undefined))
```

(`computed` is already imported on line 2. `AvailablePlayer[]` typing: `computed(() => [])` infers `never[]`, which is assignable to the `Ref<AvailablePlayer[]>` input; if the build complains, type it as `computed<AvailablePlayer[]>(() => [])` and add `import type { AvailablePlayer } from '@/players/types'`.)

- [ ] **Step 3: Script — pass `tradeVor` to both builders**

Change the `ideas` computed (line ~38):

```typescript
  return buildPointsTrades(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, teamNames.value)
```

to:

```typescript
  return buildPointsTrades(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, teamNames.value, tradeVor.value)
```

Change the `landscape` computed (line ~43):

```typescript
  return buildPointsTradeLandscape(pool.value, valueByKey.value, fgByKey.value, myTeamKey.value, teamNames.value, leagueStore.activeSport)
```

to:

```typescript
  return buildPointsTradeLandscape(pool.value, valueByKey.value, fgByKey.value, myTeamKey.value, teamNames.value, leagueStore.activeSport, tradeVor.value)
```

- [ ] **Step 4: Template — render the fair-value readout on each idea**

In the idea's footer row (the `<div class="mt-2 flex items-center justify-between border-t …">` at ~line 158), replace:

```vue
        <div class="mt-2 flex items-center justify-between border-t border-dark-border/40 pt-2 font-mono text-[10px] text-dark-textMuted">
          <span>they gain <span class="text-[#e69a4a]">+{{ idea.theirGain }}</span> — {{ fairness(idea.myGain, idea.theirGain) }}</span>
          <span>both lineups improve</span>
        </div>
```

with:

```vue
        <div class="mt-2 flex items-center justify-between border-t border-dark-border/40 pt-2 font-mono text-[10px] text-dark-textMuted">
          <span>they gain <span class="text-[#e69a4a]">+{{ idea.theirGain }}</span> — {{ fairness(idea.myGain, idea.theirGain) }}</span>
          <span v-if="idea.get.vor != null && idea.give.vor != null" class="text-dark-textMuted">
            value <span class="text-primary">{{ idea.get.vor >= 0 ? '+' : '' }}{{ round(idea.get.vor) }}</span>
            ⇄ <span>{{ idea.give.vor >= 0 ? '+' : '' }}{{ round(idea.give.vor) }}</span>
          </span>
          <span v-else>both lineups improve</span>
        </div>
```

(This shows the VOR fair-value tally for football, and preserves the "both lineups improve" caption for baseball where `vor` is undefined.)

- [ ] **Step 5: Build + type-check**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds.

Run: `npx vue-tsc --noEmit 2>&1 | grep PointsTradesView || echo "no PointsTradesView type errors"`
Expected: "no PointsTradesView type errors".

- [ ] **Step 6: Manual smoke (local only — do NOT deploy)**

Run `npm run dev`, open a Sleeper football league, Trades tab. Verify: each trade idea shows a `value +X ⇄ +Y` VOR readout; the trade landscape heatmap ranks teams by VOR (a team deep with above-replacement bodies reads strong); partners/strong/weak still populate. Confirm a baseball league's Trades tab is unchanged (no VOR readout, "both lineups improve" caption intact).

- [ ] **Step 7: Commit**

```bash
git add src/views/PointsTradesView.vue
git commit -m "feat: Trades on VOR — fair-value readout + VOR landscape strength (football)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (§6 Trades):**
- "Fair value = compare ΣvorRos each side gives vs gets" → Task 2 annotates each `TradeSide` with `vor`; Task 4 renders `get.vor ⇄ give.vor`. (Deals are 1-for-1, so ΣVOR per side is that side's single body — the readout is the like-for-like VOR comparison.) ✓
- "Targets = teams with VOR surplus where I'm below replacement, and vice-versa (extends the existing surplus/need landscape onto VOR)" → Task 3 switches the landscape's per-position strength ranking to VOR; `myStrong`/`myWeak`/`partners` derive from that rank, so the surplus/need targeting is now VOR-relative. ✓
- Baseball untouched → Tasks 2 & 3 gate all new behavior on the optional `vorByKey` (absent for baseball); existing tests are the non-regression guard. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases" — every step shows complete before/after code. ✓

**3. Type consistency:** `vorByKey: Record<string, { vorRos: number }>` is used identically in Tasks 2, 3, 4. `PlayerVor` (from `footballVor.ts`, has `vorRos: number`) is structurally assignable to `{ vorRos: number }`, so `tradeVor` (=`Record<string, PlayerVor> | undefined`) passes to both builders. `TradeSide.vor?: number` defined in Task 2 is read in Task 4 (`idea.get.vor`, `idea.give.vor`). `useFootballVor`'s return `{ vorByKey, loading, load }` (Task 1) is consumed by `useFootballWire` (Task 1) and the Trades view (Task 4). ✓

**Note carried to smoke:** in the Trades view, VOR replacement is calibrated on rostered players only (empty FA list), so a player's absolute `vorRos` here can sit slightly below the Wire's (which includes FAs). Cross-team ranking and fair-value comparisons are internally consistent; this is an accepted v1 simplification.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-31-football-trades-onto-vor.md`.

**Follow-on:** My Team onto VOR (spec §6 My Team) — the last consumer, a separate plan.
