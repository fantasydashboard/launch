# Football Value Engine (Phase 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the points-league value engine sport-generic and route Sleeper NFL projections through it, so the redesign's My Team / Wire / Trades (and, for baseball, Matchup / Today / Season Outlook) compute value from a normalized `PlayerValue` instead of a baseball `FGProjection`.

**Architecture:** A new `PlayerValue { total, games, perStat, side?, weeklyCap }` is the single currency. Two edge builders (`buildBaseballValue`, `buildFootballValue`) produce it; a new `usePointsValue` composable owns the sport dispatch (baseball via `FGProjection`, football via `buildFootballProjectionsByKey`). Every points engine swaps its `fgByKey + weights` params for one `valueByKey`, guarding baseball-only behavior on the presence of `side`. `FGProjection` is untouched (the category engine shares it). Each engine's signature change lands with all its call sites in the same task so `npm run build` stays green throughout.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-29-football-value-engine-design.md`

**Non-regression rule (applies to EVERY task):** existing baseball points tests must stay green. `buildBaseballValue` + the new `weeklyRate(value, weeksLeft)` must reproduce today's numbers exactly. Run the full points suite after each task:
`npx vitest run src/myteam src/league src/today src/composables`

---

### Task 1: `playerValue.ts` — the normalized value + builders

**Files:**
- Create: `src/myteam/playerValue.ts`
- Create: `src/myteam/__tests__/playerValue.test.ts`

- [ ] **Step 1: Write the failing test**

`src/myteam/__tests__/playerValue.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildBaseballValue, buildFootballValue, weeklyRate } from '@/myteam/playerValue'
import type { FGProjection } from '@/services/projectionService'
import type { FootballProjection } from '@/football/buildFootballProjections'

const batter = (over: Partial<FGProjection> = {}): FGProjection => ({
  mlbam_id: 1, player_name: 'Bat', team: 'NYY', position: 'OF', player_type: 'batter',
  g: 150, hr: 30, r: 90, rbi: 90, sb: 10, ...over,
})
const starter = (over: Partial<FGProjection> = {}): FGProjection => ({
  mlbam_id: 2, player_name: 'Ace', team: 'NYY', position: 'SP', player_type: 'pitcher',
  gs: 30, gp: 30, ip: 190, k: 220, w: 14, ...over,
})

describe('buildBaseballValue', () => {
  it('produces a PlayerValue per key with side + weeklyCap', () => {
    const v = buildBaseballValue({ a: batter(), b: starter() }, { HR: 4, R: 1, RBI: 1, SB: 1, K: 1, W: 5, IP: 1 })
    expect(v.a.side).toBe('hit')
    expect(v.a.weeklyCap).toBe(6.5)
    expect(v.a.total).toBeGreaterThan(0)
    expect(v.b.side).toBe('pit')
    expect(v.b.weeklyCap).toBe(1.3) // gs >= gp*0.5 ⇒ starter
  })

  it('gives relievers the reliever cap', () => {
    const v = buildBaseballValue({ r: starter({ position: 'RP', gs: 0, gp: 60, ip: 65, k: 80 }) }, { K: 1, IP: 1 })
    expect(v.r.weeklyCap).toBe(3.5)
  })

  it('null projection ⇒ zero value, cap harmless', () => {
    const v = buildBaseballValue({ x: null }, { HR: 4 })
    expect(v.x.total).toBe(0)
    expect(weeklyRate(v.x, 4)).toBe(0)
  })
})

describe('weeklyRate', () => {
  it('is perGame × min(games/weeksLeft, cap)', () => {
    const v = buildBaseballValue({ a: batter({ g: 24 }) }, { HR: 4, R: 1, RBI: 1, SB: 1 })
    // perGame = total/24; games/weeksLeft = 24/4 = 6 < cap 6.5 ⇒ rate = perGame*6
    const expected = (v.a.total / 24) * 6
    expect(weeklyRate(v.a, 4)).toBeCloseTo(expected, 6)
  })
  it('caps a two-start-week spike (starter cap 1.3)', () => {
    const v = buildBaseballValue({ b: starter({ gs: 4, gp: 4, ip: 26, k: 30 }) }, { K: 1, IP: 1 })
    // games/weeksLeft = 4/1 = 4 > cap 1.3 ⇒ rate = perGame*1.3
    const expected = (v.b.total / 4) * 1.3
    expect(weeklyRate(v.b, 1)).toBeCloseTo(expected, 6)
  })
})

describe('buildFootballValue', () => {
  const proj = (points: number): FootballProjection => ({ stats: {}, points })
  it('per-week: total=points, games=weeksLeft, side undefined, cap high', () => {
    const v = buildFootballValue({ q: proj(300) }, 15)
    expect(v.q.total).toBe(300)
    expect(v.q.games).toBe(15)
    expect(v.q.side).toBeUndefined()
    expect(v.q.weeklyCap).toBe(999)
    // perGame (the per-week display number) = 300/15 = 20
    expect(v.q.total / v.q.games).toBe(20)
  })
  it('clamps weeksLeft to >= 1', () => {
    const v = buildFootballValue({ q: proj(50) }, 0)
    expect(v.q.games).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/playerValue.test.ts`
Expected: FAIL — module `@/myteam/playerValue` not found.

- [ ] **Step 3: Implement `playerValue.ts`**

`src/myteam/playerValue.ts`:
```ts
/**
 * The normalized player value both sports produce and every points engine
 * consumes. Baseball builds it from a FanGraphs projection; football from a
 * summed Sleeper NFL projection. Engines read `total` / `games` / `perStat` /
 * `side` / `weeklyCap` and never touch a raw FGProjection again — that is what
 * makes them sport-agnostic. `side === undefined` marks a football player.
 */
import { projectPlayerPoints, type PointsSide } from '@/myteam/pointsValue'
import type { FGProjection } from '@/services/projectionService'
import type { FootballProjection } from '@/football/buildFootballProjections'

export interface PlayerValue {
  total: number // projected rest-of-season fantasy points
  games: number // projected games (→ perGame = total / games)
  perStat: Record<string, number> // unified stat key → points contributed
  side?: PointsSide // 'hit' | 'pit' (baseball); undefined ⇒ football
  weeklyCap: number // games-per-week ceiling for weeklyRate
}
export type ValueByKey = Record<string, PlayerValue>

export const ZERO_VALUE: PlayerValue = { total: 0, games: 0, perStat: {}, weeklyCap: 0 }

/** Role-based games-per-week ceiling — folds the one thing weeklyRate used to
 *  read off raw fg (starter-vs-reliever) into the value object. */
function baseballCap(side: PointsSide, fg: FGProjection | null | undefined): number {
  if (side === 'hit') return 6.5
  const gs = Number(fg?.gs ?? 0)
  const gp = Number(fg?.gp ?? fg?.gs ?? 0)
  const isStarter = gs >= gp * 0.5
  return isStarter ? 1.3 : 3.5
}

/** Single baseball player → PlayerValue (also used by the free-agent resolver). */
export function baseballValueOne(fg: FGProjection | null | undefined, weights: Record<string, number>): PlayerValue {
  const pp = projectPlayerPoints(fg, weights)
  return { total: pp.total, games: pp.games, perStat: pp.perStat, side: pp.side, weeklyCap: baseballCap(pp.side, fg) }
}

export function buildBaseballValue(
  fgByKey: Record<string, FGProjection | null>,
  weights: Record<string, number>,
): ValueByKey {
  const out: ValueByKey = {}
  for (const [key, fg] of Object.entries(fgByKey)) out[key] = baseballValueOne(fg, weights)
  return out
}

/** Single football player → PlayerValue (per-week basis; see buildFootballValue). */
export function footballValueOne(proj: FootballProjection | null | undefined, weeksLeft: number): PlayerValue {
  const wl = Math.max(1, weeksLeft)
  if (!proj) return { ...ZERO_VALUE, games: wl }
  return { total: proj.points, games: wl, perStat: {}, side: undefined, weeklyCap: 999 }
}

export function buildFootballValue(
  projByKey: Record<string, FootballProjection>,
  weeksLeft: number,
): ValueByKey {
  const out: ValueByKey = {}
  for (const [key, proj] of Object.entries(projByKey)) out[key] = footballValueOne(proj, weeksLeft)
  return out
}

/**
 * Schedule-neutral WEEKLY production rate for talent ranking (moved here from
 * pointsValue.ts and re-based on PlayerValue). rate = perGame × games-per-week,
 * where games-per-week is the player's own remaining-window usage CAPPED at a
 * role-normal ceiling (weeklyCap). The cap throttles a late-season two-start
 * spike while leaving everyday volume intact. Football's cap (999) never binds.
 */
export function weeklyRate(v: PlayerValue, weeksLeft: number): number {
  if (v.games <= 0 || v.total === 0) return 0
  const wl = Math.max(1, weeksLeft)
  return (v.total / v.games) * Math.min(v.games / wl, v.weeklyCap)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/playerValue.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/playerValue.ts src/myteam/__tests__/playerValue.test.ts
git commit -m "feat: PlayerValue normalized currency + baseball/football builders + weeklyRate"
```

---

### Task 2: `defaultWeights(sport)` in `pointsScoring.ts`

**Files:**
- Modify: `src/myteam/pointsScoring.ts:29-31`
- Test: `src/myteam/__tests__/pointsScoring.test.ts` (create if absent, else append)

- [ ] **Step 1: Write the failing test**

Append to (or create) `src/myteam/__tests__/pointsScoring.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { defaultWeights } from '@/myteam/pointsScoring'

describe('defaultWeights(sport)', () => {
  it('defaults to baseball (HR present, no pass_td)', () => {
    const w = defaultWeights()
    expect(w.HR).toBeDefined()
    expect(w.pass_td).toBeUndefined()
  })
  it("football returns football config defaults (pass_td present)", () => {
    const w = defaultWeights('football')
    expect(w.pass_td).toBe(4)
    expect(w.rec).toBe(1)
    expect(w.HR).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/pointsScoring.test.ts`
Expected: FAIL — `defaultWeights('football')` returns baseball defaults (`pass_td` undefined).

- [ ] **Step 3: Implement**

In `src/myteam/pointsScoring.ts`, find the football config import (baseball is imported as `baseballConfig`; add football). At top with the other sport-config imports add:
```ts
import { getSportConfig } from '@/config/sports'
```
Replace `defaultWeights` (lines 29-31):
```ts
export function defaultWeights(sport: string = 'baseball'): Record<string, number> {
  const cfg = getSportConfig(sport)
  return { ...((cfg?.pointsConfig?.defaults ?? {}) as Record<string, number>) }
}
```
(If `getSportConfig` is not already the accessor used in this repo, use the existing baseball import for `'baseball'` and `import footballConfig` for `'football'` — check `src/config/sports/index.ts` exports first and match the established pattern.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/pointsScoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify no baseball caller broke + commit**

Run: `npx vitest run src/myteam src/composables && npm run build`
Expected: PASS, clean build (`defaultWeights()` callers use the baseball default).
```bash
git add src/myteam/pointsScoring.ts src/myteam/__tests__/pointsScoring.test.ts
git commit -m "feat: defaultWeights(sport) — football starts from football pointsConfig defaults"
```

---

### Task 3: `usePointsValue` composable (sport dispatch)

**Files:**
- Create: `src/composables/usePointsValue.ts`
- Create: `src/composables/__tests__/usePointsValue.test.ts`

Note: this composable owns its own `useLeagueScoring()` (per-instance; `load()` is idempotent) and, for football, a `useFootballProjections()` instance. It exposes `valueByKey` (for pool players) AND `valueOf(player)` (arbitrary players — free agents, Today) so Wire/Today resolve too.

- [ ] **Step 1: Write the failing test** (unit-test the pure mapping helpers this composable exports; the reactive wiring is exercised by the smoke test)

`src/composables/__tests__/usePointsValue.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { poolToProjPlayers, footballNamePosIndex } from '@/composables/usePointsValue'
import type { FootballProjection } from '@/football/buildFootballProjections'

describe('poolToProjPlayers', () => {
  it('maps pool → ProjPlayer {key,name,position}', () => {
    const out = poolToProjPlayers([
      { playerKey: 'k1', name: 'Josh Allen', position: 'QB', teamKey: 't' } as any,
    ])
    expect(out).toEqual([{ key: 'k1', name: 'Josh Allen', position: 'QB' }])
  })
})

describe('footballNamePosIndex', () => {
  it('indexes projections by normalized name+position for FA lookup', () => {
    const projByKey: Record<string, FootballProjection> = { k1: { stats: {}, points: 100 } }
    const pool = [{ playerKey: 'k1', name: 'Bijan Robinson', position: 'RB', teamKey: 't' } as any]
    const idx = footballNamePosIndex(projByKey, pool)
    expect(idx.get('bijan robinson|RB')?.points).toBe(100)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/composables/__tests__/usePointsValue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `usePointsValue.ts`**

`src/composables/usePointsValue.ts`:
```ts
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { FGProjection } from '@/services/projectionService'
import type { FootballProjection, ProjPlayer } from '@/football/buildFootballProjections'
import { normalizeNflName } from '@/football/buildFootballProjections'
import {
  buildBaseballValue, buildFootballValue, baseballValueOne, footballValueOne,
  type PlayerValue, type ValueByKey,
} from '@/myteam/playerValue'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { useFootballProjections } from '@/composables/useFootballProjections'
import { usePowerTrajectory } from '@/composables/usePowerTrajectory'
import { buildPlayerMatchers } from '@/services/projectionService'
import { defaultWeights } from '@/myteam/pointsScoring'

export function poolToProjPlayers(pool: PointsPoolPlayer[]): ProjPlayer[] {
  return pool.map((p) => ({ key: p.playerKey, name: p.name, position: p.position }))
}

/** name+position → FootballProjection, for resolving players not in valueByKey (free agents). */
export function footballNamePosIndex(
  projByKey: Record<string, FootballProjection>,
  pool: PointsPoolPlayer[],
): Map<string, FootballProjection> {
  const idx = new Map<string, FootballProjection>()
  for (const p of pool) {
    const proj = projByKey[p.playerKey]
    if (proj) idx.set(`${normalizeNflName(p.name)}|${(p.position || '').toUpperCase().split(/[,/|]/)[0]}`, proj)
  }
  return idx
}

export function usePointsValue(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  sport: Ref<string>
  season: Ref<string>
}): {
  valueByKey: ComputedRef<ValueByKey>
  valueOf: ComputedRef<(p: { name?: string; position?: string; team?: string }) => PlayerValue | null>
  loading: Ref<boolean>
  load: () => void
} {
  const isFootball = computed(() => inputs.sport.value === 'football')

  const scoring = useLeagueScoring()
  const trajectory = usePowerTrajectory()
  const weeksLeft = computed(() => Math.max(1, trajectory.weeksLeft?.value ?? 1))

  const projPlayers = computed(() => (isFootball.value ? poolToProjPlayers(inputs.pool.value) : []))
  // v1: football uses the football pointsConfig defaults, NOT useLeagueScoring
  // (whose weights + normalizers are baseball-only). Custom football scoring is later.
  const footballScoring = computed(() => defaultWeights('football'))
  const football = useFootballProjections({
    players: projPlayers,
    scoring: footballScoring,
    season: inputs.season,
    enabled: isFootball,
  })

  // Baseball free-agent matcher (name+team → FGProjection), lazy-loaded.
  const matchFG = ref<((p: { full_name?: string; mlb_team?: string }) => FGProjection | null) | null>(null)

  function load() {
    if (isFootball.value) {
      trajectory.load() // populates weeksLeft (defaults to 0 until loaded ⇒ Math.max(1,…) guards it)
      football.load()
    } else {
      scoring.load()
      if (!matchFG.value) buildPlayerMatchers().then((m) => { matchFG.value = m.matchFG })
    }
  }
  watch([inputs.sport, inputs.season], load, { immediate: true })

  const valueByKey = computed<ValueByKey>(() =>
    isFootball.value
      ? buildFootballValue(football.projByKey.value, weeksLeft.value)
      : buildBaseballValue(inputs.fgByKey.value, scoring.weights.value),
  )

  const faIndex = computed(() =>
    isFootball.value ? footballNamePosIndex(football.projByKey.value, inputs.pool.value) : new Map(),
  )

  const valueOf = computed(() => (p: { name?: string; position?: string; team?: string }): PlayerValue | null => {
    if (isFootball.value) {
      const key = `${normalizeNflName(p.name ?? '')}|${(p.position || '').toUpperCase().split(/[,/|]/)[0]}`
      const proj = faIndex.value.get(key)
      return proj ? footballValueOne(proj, weeksLeft.value) : null
    }
    const hasTeam = !!p.team && p.team.toUpperCase() !== 'FA'
    const fg = hasTeam && matchFG.value ? matchFG.value({ full_name: p.name, mlb_team: p.team }) : null
    return fg ? baseballValueOne(fg, scoring.weights.value) : null
  })

  return { valueByKey, valueOf, loading: scoring.loading, load }
}
```
(Confirm `buildPlayerMatchers` is exported from `projectionService.ts` — the map shows it at line 476. If it is not a top-level export, import from wherever the views import it.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/composables/__tests__/usePointsValue.test.ts`
Expected: PASS.

- [ ] **Step 5: Build + commit**

Run: `npm run build`
Expected: clean (composable not yet consumed).
```bash
git add src/composables/usePointsValue.ts src/composables/__tests__/usePointsValue.test.ts
git commit -m "feat: usePointsValue — sport dispatch producing valueByKey + valueOf resolver"
```

---

### Task 4: Migrate `buildPointsTeam` + all its callers to `valueByKey`

**Files:**
- Modify: `src/myteam/pointsTeam.ts` (signature + internals)
- Modify: `src/composables/useSeasonOutlook.ts:32-52`, `src/composables/useToday.ts:370`
- Modify: `src/views/PointsMyTeamView.vue`, `src/views/PointsWireView.vue`, `src/views/PowerRankingsRedesignView.vue`, `src/views/LeagueView.vue`
- Modify tests: `src/myteam/__tests__/*pointsTeam*`, `src/today/__tests__/pointsDropSet.test.ts`

**The transformation:** `buildPointsTeam(pool, fgByKey, weights, myTeamKey, slots, opts)` → `buildPointsTeam(pool, valueByKey, myTeamKey, slots, opts)`.

- [ ] **Step 1: Update the `pointsTeam.ts` tests first (they define the new signature)**

In each `pointsTeam` test, replace the `fgByKey`+`weights` args with a `valueByKey`. Build a `valueByKey` in the test via `buildBaseballValue(fgByKey, weights)` so the assertions stay identical:
```ts
import { buildBaseballValue } from '@/myteam/playerValue'
// old: buildPointsTeam(pool, fgByKey, weights, myKey, slots, opts)
// new:
const valueByKey = buildBaseballValue(fgByKey, weights)
buildPointsTeam(pool, valueByKey, myKey, slots, opts)
```
Add one football case:
```ts
it('football: undefined side ⇒ single group, no chips, ranks by total', () => {
  const valueByKey = {
    a: { total: 300, games: 15, perStat: {}, side: undefined, weeklyCap: 999 },
    b: { total: 150, games: 15, perStat: {}, side: undefined, weeklyCap: 999 },
  }
  const pool = [
    { playerKey: 'a', name: 'QB A', position: 'QB', teamKey: 'me' },
    { playerKey: 'b', name: 'RB B', position: 'RB', teamKey: 'me' },
  ]
  const m = buildPointsTeam(pool as any, valueByKey as any, 'me', { QB: 1, RB: 1 })
  expect(m.rosterRows.map((r) => r.player.playerKey)).toEqual(['a', 'b']) // by total desc
  expect(m.rosterRows.every((r) => r.chips.length === 0)).toBe(true)
})
```

- [ ] **Step 2: Run to verify tests fail**

Run: `npx vitest run src/myteam/__tests__ src/today/__tests__/pointsDropSet.test.ts`
Expected: FAIL — `buildPointsTeam` still has the old signature.

- [ ] **Step 3: Rewrite `pointsTeam.ts`**

Edit the import (line 11):
```ts
// remove weeklyRate/projectPlayerPoints from this import; keep PointsSide
import { type PointsSide } from '@/myteam/pointsValue'
import { weeklyRate, ZERO_VALUE, type ValueByKey } from '@/myteam/playerValue'
```
Remove the now-unused `import type { FGProjection }` if nothing else uses it.

Change the signature (lines ~99-114) — drop `fgByKey`/`weights`, add `valueByKey`:
```ts
export function buildPointsTeam(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  myTeamKey: string | null,
  slots: Record<string, number>,
  opts: { basis?: 'total' | 'perWeek'; weeksLeft?: number } = {},
): PointsTeamModel {
```
Replace the projection step (was `ptsByKey.set(p.playerKey, projectPlayerPoints(fgByKey[p.playerKey], weights))`):
```ts
  const ptsByKey = new Map<string, ReturnType<() => import('@/myteam/playerValue').PlayerValue>>()
  for (const p of pool) ptsByKey.set(p.playerKey, valueByKey[p.playerKey] ?? ZERO_VALUE)
```
(Simpler: type the map as `Map<string, PlayerValue>` and import `PlayerValue`.)

Replace `valueOf` (the per-week/total branch):
```ts
  const valueOf = (key: string): number => {
    const r = ptsByKey.get(key)
    if (!r) return 0
    const base = basis === 'perWeek' ? weeklyRate(r, weeksLeft) : r.total
    return base * discountOf(key)
  }
```
Replace `sideByKey` construction — source `side` from the value, fall back to position (football → undefined side → isPitcherPos('QB'/'RB'/…) is false → 'hit', i.e. one combined group):
```ts
  const sideByKey = new Map<string, PointsSide>()
  for (const p of pool) {
    const v = valueByKey[p.playerKey]
    sideByKey.set(p.playerKey, v?.side ?? (isPitcherPos(p.position) ? 'pit' : 'hit'))
  }
```
Everything else (`r.total`, `r.perStat`, `r.games`, chips, standings, slotRanks, pitching) is unchanged — those fields exist on `PlayerValue`. The chip logic naturally produces no chips for football (empty `perStat`).

- [ ] **Step 4: Update the callers**

`src/composables/useSeasonOutlook.ts` — this composable receives `fgByKey`/`weights` today; change it to receive `valueByKey`. Update its input type and the `buildPointsTeam` call (lines ~32-52):
```ts
// inputs: replace fgByKey + weights with valueByKey: Ref<ValueByKey>
const model = buildPointsTeam(pool, valueByKey.value, myTeamKey, rosterSlots, {
  basis: wl > 0 ? 'perWeek' : 'total', weeksLeft: wl,
})
```
`src/composables/useToday.ts:370` — Today is baseball-only functionally; provide a `valueByKey` (baseball). Wherever this composable currently derives `fgByKey`+`weights`, build `valueByKey = buildBaseballValue(fgByKey, weights)` (import it) and pass it:
```ts
buildPointsTeam(pool, valueByKey, myTeamKey, rosterSlots)
```
`PointsMyTeamView.vue` and `PointsWireView.vue` — add `usePointsValue` and pass `valueByKey`:
```ts
import { usePointsValue } from '@/composables/usePointsValue'
// after the pool/fgByKey computeds:
// No activeSeason accessor on the store; pass empty — useFootballProjections falls back to Sleeper NFL state season.
const season = computed(() => '')
const { valueByKey, valueOf } = usePointsValue({ pool, fgByKey, sport: computed(() => leagueStore.activeSport), season })
// buildPointsTeam call:
return buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)
```
Also pass `valueByKey` into `useSeasonOutlook({ ..., valueByKey, ... })` in `PointsMyTeamView.vue` (replace the `fgByKey`/`weights` inputs it used).
`PowerRankingsRedesignView.vue:129-132` and `LeagueView.vue:119-122` — same `usePointsValue` wiring, then:
```ts
const model = buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, {
  basis: wl > 0 ? 'perWeek' : 'total', weeksLeft: wl,
})
```

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run src/myteam src/today src/composables && npm run build`
Expected: PASS + clean build. Baseball numbers unchanged (non-regression).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: buildPointsTeam consumes valueByKey; wire usePointsValue into its callers"
```

---

### Task 5: Migrate `buildPointsMatchup`

**Files:**
- Modify: `src/myteam/pointsMatchup.ts:42-121`
- Modify: `src/views/PointsMatchupView.vue:71-81`
- Modify tests: `src/myteam/__tests__/*pointsMatchup*`

**Transformation:** `buildPointsMatchup(pool, fgByKey, weights, myKey, oppKey, slots, schedule)` → `buildPointsMatchup(pool, valueByKey, myKey, oppKey, slots, schedule)`; `teamWeek(players, fgByKey, weights, slots, schedule)` → `teamWeek(players, valueByKey, slots, schedule)`.

- [ ] **Step 1: Update matchup tests** to build `valueByKey = buildBaseballValue(fgByKey, weights)` and call the new signature. Keep assertions identical (non-regression). Run → FAIL.

- [ ] **Step 2: Rewrite `pointsMatchup.ts`**
- Import: drop `projectPlayerPoints`; `import { ZERO_VALUE, type ValueByKey } from '@/myteam/playerValue'`.
- `teamWeek`: replace `const ptsBy = new Map(players.map((p) => [p.playerKey, projectPlayerPoints(fgByKey[p.playerKey], weights)]))` with `const ptsBy = new Map(players.map((p) => [p.playerKey, valueByKey[p.playerKey] ?? ZERO_VALUE]))`.
- side line: `const side = pp/fg ? … : isPitcherPos` → source from `ptsBy.get(k)?.side ?? isPitcherPos(...)`.
- Everything using `pp.total` / `pp.games` unchanged.
- Update `buildPointsMatchup` signature + both `teamWeek(...)` calls.
- Add a code comment: football renders season-total lineup strength only; NFL weekly schedule is Phase 4.

- [ ] **Step 3: Update `PointsMatchupView.vue`** — add `usePointsValue` (reuse the pattern from Task 4) and pass `valueByKey.value` into both `buildPointsMatchup` calls (weekly + today). Pass `valueByKey` into its `useSeasonOutlook` call too.

- [ ] **Step 4: Tests + build**
Run: `npx vitest run src/myteam && npm run build`
Expected: PASS + clean.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "refactor: buildPointsMatchup consumes valueByKey (football season-total only, weekly=Phase 4)"
```

---

### Task 6: Migrate `buildPointsWire` + `today/pointsRosValue` + `today/pointsDailyValue`

**Files:**
- Modify: `src/myteam/pointsWire.ts:62-92`, `src/today/pointsRosValue.ts`, `src/today/pointsDailyValue.ts`
- Modify: `src/views/PointsWireView.vue:74-77`, `src/composables/useToday.ts` (rosValue/dailyValue call sites)
- Modify tests: `src/myteam/__tests__/*pointsWire*`, `src/today/__tests__/*`

**Transformation:** replace the `matchFG` resolver with a `valueOf` resolver returning `PlayerValue | null`.

- [ ] **Step 1: Update tests** — pass a `valueOf` stub (e.g. `(fa) => fa.team ? { total: 10, games: 100, perStat: {}, side: 'hit', weeklyCap: 6.5 } : null`) and assert the same shape. Run → FAIL.

- [ ] **Step 2: Rewrite `pointsWire.ts`**
```ts
import type { PlayerValue } from '@/myteam/playerValue'
export function buildPointsWire(
  freeAgents: AvailablePlayer[],
  valueOf: (fa: { name?: string; position?: string; team?: string }) => PlayerValue | null,
  schedule: WeekSchedule,
  myRoster: RosterBody[] = [],
): PointsWire {
  // …
  for (const fa of freeAgents) {
    if (isOut(fa.status)) continue
    const v = valueOf({ name: fa.name, position: fa.position, team: fa.team })
    const side: PointsSide = v?.side ?? (isPitcherPos(fa.position) ? 'pit' : 'hit')
    rows.push({
      player: fa, side,
      points: v?.total ?? 0,
      perGame: v && v.games > 0 ? v.total / v.games : 0,
      gamesThisWeek: schedule.gamesByTeam[fa.team] ?? 0,
      startsThisWeek: lookupStarts(schedule, fa.name).length,
      chips: [],
      perStat: v?.perStat ?? {},
    })
  }
```
- [ ] **Step 3: Rewrite `pointsRosValue.ts` / `pointsDailyValue.ts`** to take `valueOf` instead of `matchFG`+`weights`:
```ts
// pointsRosValue
export function pointsRosValue(
  players: { playerKey: string; name: string; team?: string; position?: string }[],
  valueOf: (p: { name?: string; position?: string; team?: string }) => import('@/myteam/playerValue').PlayerValue | null,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of players) {
    const v = valueOf({ name: p.name, team: p.team, position: p.position })
    if (v) out.set(p.playerKey, v.total)
  }
  return out
}
// pointsDailyValue
export function pointsDailyValue(
  name: string, team: string | undefined, position: string | undefined,
  valueOf: (p: { name?: string; position?: string; team?: string }) => import('@/myteam/playerValue').PlayerValue | null,
): number {
  const v = valueOf({ name, team, position })
  return v && v.games > 0 ? v.total / v.games : 0
}
```
- [ ] **Step 4: Update callers** — `PointsWireView.vue` passes `valueOf.value` (from `usePointsValue`) into `buildPointsWire`. `useToday.ts` passes its `valueOf` (baseball resolver from `usePointsValue` or an inline `(p) => baseballValueOne(matchFG(...), weights)`) into `pointsRosValue`/`pointsDailyValue`.

- [ ] **Step 5: Tests + build**
Run: `npx vitest run src/myteam src/today && npm run build`
Expected: PASS + clean.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "refactor: Wire + Today value resolvers consume valueOf(PlayerValue) — football FAs supported"
```

---

### Task 7: Migrate `buildPointsTrades` + `buildPointsTradeLandscape`

**Files:**
- Modify: `src/myteam/pointsTrades.ts:53-72`, `src/myteam/pointsTradeLandscape.ts:34-63`
- Modify: `src/views/PointsTradesView.vue:44-52`
- Modify tests: `src/myteam/__tests__/*pointsTrades*`, `src/myteam/__tests__/pointsTradeLandscape.test.ts`

**Transformation:** both drop `fgByKey`+`weights` for `valueByKey`.

- [ ] **Step 1: Update tests** to build `valueByKey = buildBaseballValue(fgByKey, weights)`; landscape keeps its trailing `sport` arg. New signatures:
  `buildPointsTrades(pool, valueByKey, myKey, slots, teamNames)`,
  `buildPointsTradeLandscape(pool, valueByKey, myKey, teamNames, sport)`.
  Run → FAIL.

- [ ] **Step 2: Rewrite both engines** — replace `projectPlayerPoints(fgByKey[key], weights).total` with `(valueByKey[key]?.total ?? 0)`. In `pointsTradeLandscape.ts` the `projectPlayerPoints(fgByKey[p.playerKey], weights).total` at line 48 becomes `(valueByKey[p.playerKey]?.total ?? 0)`. Drop the now-unused `projectPlayerPoints` import.

- [ ] **Step 3: Update `PointsTradesView.vue`** — add `usePointsValue`, pass `valueByKey.value`:
```ts
return buildPointsTrades(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, teamNames.value)
// …
return buildPointsTradeLandscape(pool.value, valueByKey.value, myTeamKey.value, teamNames.value, leagueStore.activeSport)
```

- [ ] **Step 4: Tests + build**
Run: `npx vitest run src/myteam && npm run build`
Expected: PASS + clean.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "refactor: Trades engine + landscape consume valueByKey"
```

---

### Task 8: Migrate `buildPointsPositional`

**Files:**
- Modify: `src/league/pointsPositional.ts:22-28`
- Modify: its caller (grep `buildPointsPositional` — likely `LeagueView.vue` / a league composable)
- Modify tests: `src/league/__tests__/*pointsPositional*` (if present)

**Transformation:** `buildPointsPositional(pool, fgByKey, weights, teamKeys)` → `buildPointsPositional(pool, valueByKey, teamKeys)`.

- [ ] **Step 1:** Update/author the test to build `valueByKey`, new signature. Run → FAIL.
- [ ] **Step 2:** Rewrite: `const ptsOf = (key: string) => valueByKey[key]?.total ?? 0`; drop the `projectPlayerPoints` import. Update the signature.
- [ ] **Step 3:** Update the caller (`valueByKey.value` from the already-wired `usePointsValue`).
- [ ] **Step 4:** Run: `npx vitest run src/league && npm run build` → PASS + clean.
- [ ] **Step 5:** Commit:
```bash
git add -A && git commit -m "refactor: buildPointsPositional consumes valueByKey"
```

---

### Task 9: Football display polish + audit panel + final verification

**Files:**
- Modify: `src/views/PointsMyTeamView.vue:175` (audit panel), and the roster-row headline number in the 3 skill-position views.

- [ ] **Step 1: Audit panel** — `PointsMyTeamView.vue:175` currently calls `projectPlayerPoints(fgByKey.value[key], weights)`. Change to read from the value map:
```ts
perStat: Object.entries((valueByKey.value[r.player.playerKey] ?? { perStat: {} }).perStat) …
```
- [ ] **Step 2: Football per-week headline** — in each of `PointsMyTeamView.vue`, `PointsWireView.vue`, `PointsTradesView.vue`, where the roster/row headline shows `points` (`total`), show `perGame` (which for football = per-week) when `leagueStore.activeSport === 'football'`. Minimal: a `displayValue = isFootball ? row.perGame : row.points` computed in the row template. (Baseball unchanged.)
- [ ] **Step 3: Full verification**
Run:
```bash
npx vitest run
npm run build
```
Expected: ALL tests pass, clean build.
- [ ] **Step 4: Grep for stragglers** — confirm no points engine still imports `projectPlayerPoints` except `playerValue.ts`:
```bash
grep -rn "projectPlayerPoints" src/myteam src/league src/today src/views | grep -v playerValue.ts
```
Expected: only the `?ptsaudit` path if any remains intentional (should be none after Step 1).
- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: football per-week display + audit panel on valueByKey; Phase 3a complete"
```

---

## Smoke test (manual, after Task 9)

On a real **ESPN football** league (set as active):
1. My Team — roster rows show per-week football points; QB/RB/WR/TE ranked; K/DEF show 0/omitted (expected v1).
2. Wire — free agents show per-week football value; adds ranked.
3. Trades — landscape shows QB/RB/WR/TE rows (Phase 2b) with football values in the cells.
4. Matchup — renders season-total lineup strength without error (weekly NFL schedule = Phase 4).

On a baseball league — **no visible change** (non-regression). Yahoo football is built but unverifiable until API access returns.

## Phase 3b (separate plan, next)

New `useSleeperLeaguePool` points source composable so Sleeper leagues reach the points views at all; it feeds the now sport-generic engine via `usePointsValue`.
