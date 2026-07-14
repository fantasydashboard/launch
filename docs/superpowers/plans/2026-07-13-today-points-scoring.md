# Today Board — Points-League Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Today board rank daily plays on points leagues by giving each candidate a projected-per-game-points base value (instead of the empty-catSpecs category delta that scores ~0).

**Architecture:** A pure `pointsDailyValue(name, team, matchFG, weights)` computes a player's projected per-game fantasy points (reusing `projectPlayerPoints`, the exact path `buildPointsWire` uses for free agents). `useToday`'s `baseValue` branches on `isPointsLeague` to use it; on points leagues the scored plays are filtered to projectable, non-IL candidates. `dailyCandidates`, `scoreToday`, and `todayBoard` are untouched.

**Tech Stack:** Vue 3 / TypeScript / Vitest. Reuses `projectPlayerPoints` (`src/myteam/pointsValue.ts`), `injuryTier` (`src/myteam/injuryStatus.ts`, Phase 2), `useLeagueScoring`, and `useToday`'s existing `matchFGRef`.

**Local only** — no push/prod.

---

## File Structure

- **Create** `src/today/pointsDailyValue.ts` — pure: a candidate's points-league daily base value.
- **Create** `src/today/__tests__/pointsDailyValue.test.ts`.
- **Modify** `src/composables/useToday.ts` — source league `weights`; make `baseValue` points-aware; filter unprojectable / IL candidates on points leagues.

**Reference — current `useToday` internals (do not change beyond what's specified):**
- `isPointsLeague` computed (~line 176).
- `matchFGRef` — a `Ref<((p:{full_name?;mlb_team?})=>FGProjection|null)|null>` already populated (~line 192).
- `candidates` computed → `MoveCandidate[]` (~line 236). `MoveCandidate` has `{ kind, player:{key,name,team,position}, side:'hit'|'pit', addDelta:Record<string,number>, detail }` and is already imported.
- `baseValue(delta: Record<string, number>)` (~line 244) — currently sums delta values; points branch sums the (empty) delta → 0.
- `scoreCandidate(candidate)` (~line 286) calls `scoreToday(baseValue(candidate.addDelta), {...})`. Also invoked for the synthetic `startedCandidate` in `sitAlerts` (~line 339).
- `scoredPlays` computed = `candidates.value.map(scoreCandidate)` (~line 308); feeds both `sitAlerts` and `board`.
- `freeAgents` — `AvailablePlayer[]` with `.playerKey` and `.status` (already in scope, passed to `dailyCandidates`).

---

## Task 1: `pointsDailyValue` pure function

**Files:**
- Create: `src/today/pointsDailyValue.ts`
- Test: `src/today/__tests__/pointsDailyValue.test.ts`

- [ ] **Step 1: Write the failing test** — `src/today/__tests__/pointsDailyValue.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { pointsDailyValue } from '@/today/pointsDailyValue'
import type { FGProjection } from '@/services/projectionService'

const weights = { HR: 4, R: 1, RBI: 1, W: 5, K: 1 }

// FG fixtures mirror src/myteam/__tests__/pointsTeam.test.ts's bat()/arm() shape.
const batFG: FGProjection = { mlbam_id: 1, player_name: 'Bat Man', team: 'NYY', position: 'OF', player_type: 'batter', hr: 30, r: 90, rbi: 90, g: 150 } as unknown as FGProjection
const armFG: FGProjection = { mlbam_id: 2, player_name: 'Arm Man', team: 'LAD', position: 'SP', player_type: 'pitcher', w: 15, so: 220, ip: 200, er: 70, gp: 32, gs: 32 } as unknown as FGProjection

const matchFG = (p: { full_name?: string; mlb_team?: string }): FGProjection | null =>
  p.full_name === 'Bat Man' ? batFG : p.full_name === 'Arm Man' ? armFG : null

describe('pointsDailyValue', () => {
  it('returns a hitter\'s projected per-game points (total / games)', () => {
    // total = 30*4 + 90 + 90 = 300; games = 150 -> 2.0/game
    expect(pointsDailyValue('Bat Man', 'NYY', matchFG, weights)).toBeCloseTo(300 / 150, 5)
  })

  it('returns a pitcher\'s per-appearance points', () => {
    // total = 15*5 + 220 = 295; games = gp 32 -> ~9.219
    expect(pointsDailyValue('Arm Man', 'LAD', matchFG, weights)).toBeCloseTo(295 / 32, 5)
  })

  it('returns 0 for a free agent with no real team', () => {
    expect(pointsDailyValue('Bat Man', 'FA', matchFG, weights)).toBe(0)
    expect(pointsDailyValue('Bat Man', '', matchFG, weights)).toBe(0)
    expect(pointsDailyValue('Bat Man', undefined, matchFG, weights)).toBe(0)
  })

  it('returns 0 when no FanGraphs projection matches', () => {
    expect(pointsDailyValue('Ghost', 'NYY', matchFG, weights)).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/today/__tests__/pointsDailyValue.test.ts`
Expected: FAIL — "Cannot find module '@/today/pointsDailyValue'".

- [ ] **Step 3: Implement** — `src/today/pointsDailyValue.ts`

```ts
import { projectPlayerPoints } from '@/myteam/pointsValue'
import type { FGProjection } from '@/services/projectionService'

/**
 * A daily play's points-league base value = the player's projected per-game fantasy points.
 * Reuses the same FG-match → projectPlayerPoints path buildPointsWire uses for free agents.
 * Returns 0 when the player has no real MLB team ('FA'/blank) or no FanGraphs match — those
 * players can't be projected and must sink out of the board (mirrors the Wire's points>0 filter).
 */
export function pointsDailyValue(
  name: string,
  team: string | undefined,
  matchFG: (p: { full_name?: string; mlb_team?: string }) => FGProjection | null,
  weights: Record<string, number>,
): number {
  const hasTeam = !!team && team.toUpperCase() !== 'FA'
  const fg = hasTeam ? matchFG({ full_name: name, mlb_team: team }) : null
  if (!fg) return 0
  const pp = projectPlayerPoints(fg, weights)
  return pp.games > 0 ? pp.total / pp.games : 0
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/today/__tests__/pointsDailyValue.test.ts`
Expected: PASS (4 tests). If the pitcher assertion is off because `projectPlayerPoints` maps `ip`/`er` into the total (it shouldn't here — `weights` only has W/K, and unmapped stats contribute 0), do NOT change the assertion; re-check that the weights object only contains `W` and `K` for the pitcher path. The batter case is the primary guarantee.

- [ ] **Step 5: Commit**

```bash
git add src/today/pointsDailyValue.ts src/today/__tests__/pointsDailyValue.test.ts
git commit -m "feat: pointsDailyValue — per-game projected points for a daily play"
```
(A harmless `.git/gc.log` / "bad object" warning may print on commit — ignore it; the commit succeeds. Verify with `git log --oneline -1`.)

---

## Task 2: Wire points scoring into `useToday`

**Files:**
- Modify: `src/composables/useToday.ts`

READ the file first. Locate blocks by content, not line number.

- [ ] **Step 1: Add imports**

Near the other imports at the top of `src/composables/useToday.ts`, add:
```ts
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { pointsDailyValue } from '@/today/pointsDailyValue'
import { injuryTier } from '@/myteam/injuryStatus'
```

- [ ] **Step 2: Source league scoring weights**

Inside the composable body, near the other source composables / refs (e.g. after `isPointsLeague`), add:
```ts
  // League points weights (for the points-league daily base value). Loaded alongside the
  // other sources; empty until loaded, which keeps the board on its loading/empty state.
  const scoring = useLeagueScoring()
```
Then find where the composable loads its other sources (the function/effect that calls the platform loaders — e.g. an `async function load()` / `refresh()` or an `onMounted`/`watch` that triggers the ESPN/Yahoo fetches). Add `scoring.load()` there so weights load with everything else. If load happens in more than one place (mount + a league-change watch), add `scoring.load()` to the same place(s) the other loaders are called.

- [ ] **Step 3: Make `baseValue` points-aware**

Replace the existing `baseValue` function:
```ts
  function baseValue(delta: Record<string, number>): number {
    const vals = Object.values(delta).filter((v) => Number.isFinite(v))
    if (!vals.length) return 0
    if (isPointsLeague.value) return vals.reduce((s, v) => s + v, 0)
    return vals.reduce((s, v) => s + (v > 0 ? v : 0), 0)
  }
```
with a version that takes the whole candidate and, on points leagues, uses the projected per-game points:
```ts
  function baseValue(candidate: MoveCandidate): number {
    if (isPointsLeague.value) {
      const matchFG = matchFGRef.value
      if (!matchFG) return 0
      return pointsDailyValue(candidate.player.name, candidate.player.team, matchFG, scoring.weights.value)
    }
    // Category league: sum of the positive (helped-cat) deltas — a single comparable magnitude.
    const vals = Object.values(candidate.addDelta).filter((v) => Number.isFinite(v))
    return vals.reduce((s, v) => s + (v > 0 ? v : 0), 0)
  }
```

- [ ] **Step 4: Update the `baseValue` call site**

In `scoreCandidate`, change the `scoreToday(...)` call from passing `candidate.addDelta` to passing the whole candidate:
```ts
    const { value, bucket } = scoreToday(baseValue(candidate), {
      parkFactor: parkVal,
      spFactor: spFactorFor(candidate),
    })
```
(The synthetic `startedCandidate` in `sitAlerts` is scored through this same `scoreCandidate`, so it becomes points-aware automatically — no change needed there. Confirm there are no OTHER call sites of `baseValue` via a search; there should be exactly one.)

- [ ] **Step 5: Filter unprojectable / IL candidates on points leagues**

Add a set of injured free-agent keys near the other computeds (after `benched`/`freeAgents` are in scope):
```ts
  // Free agents on the IL/OUT are never a stream — skip them on the points board. DTD stays
  // (still likely to play today). Reuses the Phase-2 injury tier. Only FAs carry a status here.
  const outFaKeys = computed(() => {
    const s = new Set<string>()
    for (const fa of freeAgents.value) if (injuryTier(fa.status) === 'il') s.add(fa.playerKey)
    return s
  })
```
Then change the `scoredPlays` computed from:
```ts
  const scoredPlays = computed<ScoredPlay[]>(() => candidates.value.map(scoreCandidate))
```
to drop unprojectable (0-value) and IL-FA plays on points leagues, leaving category behavior unchanged:
```ts
  const scoredPlays = computed<ScoredPlay[]>(() => {
    const scored = candidates.value.map(scoreCandidate)
    if (!isPointsLeague.value) return scored
    return scored.filter((p) => p.value > 0 && !outFaKeys.value.has(p.playerKey))
  })
```
(`ScoredPlay.playerKey` is `candidate.player.key`; `freeAgents`' key is `.playerKey` — both are the same platform player key, so the set lookup lines up. `AvailablePlayer.status` is the field `injuryTier` reads.)

- [ ] **Step 6: Type-check**

Run: `npm run type-check 2>&1 | grep -i useToday`
Expected: no output. (If `AvailablePlayer` has no `status` field in the type, use `(fa as any).status` is NOT acceptable — instead confirm the field name by reading `src/players/types.ts`; the Wire reads `fa.status`, so it exists. If truly absent, STOP and report.)

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 8: Commit**

```bash
git add src/composables/useToday.ts
git commit -m "feat: useToday — rank the Today board on points leagues (per-game points base)"
```
(Ignore the harmless gc.log warning; verify with `git log --oneline -1`.)

---

## Task 3: Full verification

**Files:** none.

- [ ] **Step 1: Full unit suite**

Run: `npm test`
Expected: all pass, count up by 4 (the new `pointsDailyValue` tests), none regressed.

- [ ] **Step 2: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: build succeeds; type-check error count not above the repo's pre-existing baseline (62) for unrelated files.

- [ ] **Step 3: Manual smoke (dev server) — REQUIRED (the `useToday` branch can't be unit-checked end-to-end)**

Run `npm run dev`, open the **Today** tab on a **points** league with games today. Confirm:
- Plays now carry distinct projected-points values and **rank** (a clear hero = highest-value play), not a flat zero tie.
- The ▓▓▓ matchup bar still reflects park / opposing-SP (unchanged).
- Unprojectable / `FA` / unmatched names don't clutter the board (filtered).
- An OUT/IL free agent is not surfaced as a stream (a DTD one may still appear).
- Open the Today tab on a **category** league and confirm it is unchanged.
- Check both an ESPN and a Yahoo points league.

- [ ] **Step 4: Commit any smoke fix (only if needed)**

```bash
git add -A && git commit -m "fix: Today points scoring — <smoke finding>"
```

---

## Self-Review Notes (reconciled)

- **Spec coverage:** pure `pointsDailyValue` (Task 1); wired into `useToday`'s `isPointsLeague` base-value branch with `weights` from `useLeagueScoring` and the existing `matchFGRef` (Task 2 Steps 1–4); projectable-only + IL-FA filter on points (Task 2 Step 5); `dailyCandidates`/`scoreToday`/`todayBoard` untouched; category path unchanged (guarded by `isPointsLeague`). Out-of-scope items (useYourMove/Matchup daily, Vegas/platoon) not touched.
- **Type consistency:** `baseValue` signature changes from `(delta: Record<string, number>)` to `(candidate: MoveCandidate)`; its single call site in `scoreCandidate` is updated in the same task. `pointsDailyValue` signature identical between Task 1 definition and Task 2 call. `outFaKeys` uses `injuryTier(fa.status)` from Phase 2.
- **Placeholder scan:** none — every step has concrete code.
- **Injury tie-in:** only IL-tier FAs are skipped (DTD still plays); reuses `injuryTier`, consistent with Phase 2.
