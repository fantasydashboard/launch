# My Team "Your Move" — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the My Team page around this-week and surface a ranked short-stack of "Your Move" recommendations, with the waiver-**add** generator live (start/sit + streaming generators follow in later plans).

**Architecture:** A unified candidate-action engine: generators propose `CandidateAction`s, one scorer ranks them by projected this-week win-probability lift (via existing `calcOverallWinProb`), `rankMoves` returns the short stack. Phase 1 ships the engine + the add generator + the page reconciliation. Pure logic in `src/myteam/yourMove/`, wired by `useYourMove`, rendered by `YourMove.vue`.

**Tech Stack:** Vue 3 `<script setup>` / TypeScript / Vitest + happy-dom. Reuses `categoryWinProbability.ts`, `useThisWeekMatchup.ts`, `useAvailablePlayers.ts`, `projectionService.ts`, `value.ts`.

**Spec:** `docs/superpowers/specs/2026-06-10-myteam-your-move-and-reconcile-design.md`

**Constraint:** LOCAL ONLY on `redesign/my-team-first`. No push / no deploy.

---

## File Structure

- `src/myteam/yourMove/types.ts` — `ActionKind`, `CandidateAction`, `ScoredContext`.
- `src/myteam/yourMove/projectRemainingWeek.ts` — per-player rest-of-week projection primitive.
- `src/myteam/yourMove/scoreCandidate.ts` — win-prob-lift scorer.
- `src/myteam/yourMove/generators/addGenerator.ts` — FA add candidates for flippable cats.
- `src/myteam/yourMove/rankMoves.ts` — run generators, score, floor, rank, return short stack.
- `src/composables/useYourMove.ts` — wire pools + snapshot into `rankMoves`.
- `src/components/myteam/YourMove.vue` — hero + next-best + empty/loading states.
- Tests alongside each pure module in `src/myteam/yourMove/__tests__/`.
- Modify `src/views/MyTeamView.vue` (section order, mount `YourMove`, demote season, punchy verdict).

---

## Task 1: Types + remaining-week projection primitive

**Files:**
- Create: `src/myteam/yourMove/types.ts`
- Create: `src/myteam/yourMove/projectRemainingWeek.ts`
- Test: `src/myteam/yourMove/__tests__/projectRemainingWeek.test.ts`

- [ ] **Step 1: Write types**

```ts
// src/myteam/yourMove/types.ts
import type { CatSpec } from '@/myteam/value'

export type ActionKind = 'add' | 'stream' | 'startSit'

export interface CandidateAction {
  kind: ActionKind
  player: { key: string; name: string; team: string; position: string }
  counterparty?: { key: string; name: string }
  categories: string[]
  winProbLift: number
  rationale: string
}

// Everything the scorer needs to evaluate a candidate against the live matchup.
export interface ScoredContext {
  cats: CatSpec[]
  categoryIds: string[]
  myStats: Record<string, number>     // this-week team totals (baseline)
  oppStats: Record<string, number>
  days: number                        // days remaining in the week
  platform: 'yahoo' | 'espn'
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/myteam/yourMove/__tests__/projectRemainingWeek.test.ts
import { describe, it, expect } from 'vitest'
import { projectRemainingWeek } from '../projectRemainingWeek'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'AVG', lowerIsBetter: false, side: 'hit', isRatio: true },
]

describe('projectRemainingWeek', () => {
  it('scales counting stats by the remaining fraction of the season', () => {
    // 30 HR full-season projection, ~6 of 183 days left -> ~0.98 HR
    const out = projectRemainingWeek({ HR: 18, AVG: 0.300 }, null, cats, 6, 0.6)
    // full-season HR = 18 / 0.6 = 30; remaining = 30 * 6/183
    expect(out.HR).toBeCloseTo(30 * (6 / 183), 3)
  })

  it('passes ratio stats through unchanged (scorer volume-weights them)', () => {
    const out = projectRemainingWeek({ HR: 18, AVG: 0.300 }, null, cats, 6, 0.6)
    expect(out.AVG).toBeCloseTo(0.300, 6)
  })

  it('prefers FanGraphs rest-of-season values when present', () => {
    const out = projectRemainingWeek({ HR: 18, AVG: 0.300 }, { AVG: 0.280 }, cats, 6, 0.6)
    expect(out.AVG).toBeCloseTo(0.280, 6)
  })

  it('zero days remaining -> zero counting contribution', () => {
    const out = projectRemainingWeek({ HR: 18 }, null, cats, 0, 0.6)
    expect(out.HR).toBe(0)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/myteam/yourMove/__tests__/projectRemainingWeek.test.ts`
Expected: FAIL ("projectRemainingWeek is not a function").

- [ ] **Step 4: Implement**

```ts
// src/myteam/yourMove/projectRemainingWeek.ts
import type { CatSpec } from '@/myteam/value'

// Regular-season length in days (~26 weeks). Used to turn a full-season projection
// into a rest-of-week contribution. Phase 2 replaces day-proportional scaling with
// real games-per-week from the schedule service.
const SEASON_DAYS = 183

/**
 * Project a player's stat accrual over the remaining days of the fantasy week.
 * Counting stats: full-season projection (YTD / seasonFractionComplete, or FG ROS)
 * scaled by remainingDays/SEASON_DAYS. Ratio stats pass through unchanged; the
 * scorer volume-weights them so a small sample can't swing a rate unrealistically.
 */
export function projectRemainingWeek(
  seasonStats: Record<string, number>,
  fgStats: Record<string, number> | null,
  cats: CatSpec[],
  remainingDays: number,
  seasonFractionComplete: number,
): Record<string, number> {
  const out: Record<string, number> = {}
  const frac = seasonFractionComplete > 0 ? seasonFractionComplete : 1
  for (const cat of cats) {
    if (cat.isRatio) {
      const fg = fgStats?.[cat.statId]
      out[cat.statId] = fg !== undefined && Number.isFinite(fg) ? fg : (seasonStats[cat.statId] ?? 0)
      continue
    }
    const fgCount = fgStats?.[cat.statId]
    const fullSeason =
      fgCount !== undefined && Number.isFinite(fgCount)
        ? fgCount
        : (seasonStats[cat.statId] ?? 0) / frac
    out[cat.statId] = fullSeason * (remainingDays / SEASON_DAYS)
  }
  return out
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/myteam/yourMove/__tests__/projectRemainingWeek.test.ts`
Expected: PASS (4/4).

- [ ] **Step 6: Commit**

```bash
git add src/myteam/yourMove/types.ts src/myteam/yourMove/projectRemainingWeek.ts src/myteam/yourMove/__tests__/projectRemainingWeek.test.ts
git commit -m "feat(yourMove): types + remaining-week projection primitive"
```

---

## Task 2: Win-prob-lift scorer

**Files:**
- Create: `src/myteam/yourMove/scoreCandidate.ts`
- Test: `src/myteam/yourMove/__tests__/scoreCandidate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/myteam/yourMove/__tests__/scoreCandidate.test.ts
import { describe, it, expect } from 'vitest'
import { scoreCandidate } from '../scoreCandidate'
import type { ScoredContext } from '../types'

const ctx: ScoredContext = {
  cats: [
    { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
    { statId: 'R', lowerIsBetter: false, side: 'hit', isRatio: false },
  ],
  categoryIds: ['HR', 'R'],
  myStats: { HR: 10, R: 30 },
  oppStats: { HR: 11, R: 30 },   // tied-ish: HR slightly behind
  days: 4,
  platform: 'yahoo',
}

describe('scoreCandidate', () => {
  it('a positive add raises win-prob lift', () => {
    const lift = scoreCandidate({ HR: 3, R: 5 }, ctx)
    expect(lift).toBeGreaterThan(0)
  })

  it('a zero contribution yields ~0 lift', () => {
    const lift = scoreCandidate({ HR: 0, R: 0 }, ctx)
    expect(Math.abs(lift)).toBeLessThan(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/myteam/yourMove/__tests__/scoreCandidate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/myteam/yourMove/scoreCandidate.ts
import { calcOverallWinProb } from '@/services/categoryWinProbability'
import type { ScoredContext } from './types'

/**
 * Win-probability lift (percentage points) of applying `delta` to my team's
 * this-week totals. `delta` is the candidate's projected remaining-week contribution
 * (positive to add, negative to remove). Counting stats add; ratio stats are taken
 * as the candidate's rate and blended toward it by the matchup engine.
 */
export function scoreCandidate(delta: Record<string, number>, ctx: ScoredContext): number {
  const base = calcOverallWinProb(ctx.myStats, ctx.oppStats, ctx.categoryIds, ctx.days, ctx.platform)
  const adjusted: Record<string, number> = { ...ctx.myStats }
  for (const cat of ctx.cats) {
    const d = delta[cat.statId]
    if (d === undefined || !Number.isFinite(d)) continue
    if (cat.isRatio) {
      // Blend the team rate halfway toward the candidate's rate as a conservative
      // proxy for one added contributor (Phase 2 volume-weights precisely).
      adjusted[cat.statId] = ((ctx.myStats[cat.statId] ?? 0) + d) / 2
    } else {
      adjusted[cat.statId] = (ctx.myStats[cat.statId] ?? 0) + d
    }
  }
  const next = calcOverallWinProb(adjusted, ctx.oppStats, ctx.categoryIds, ctx.days, ctx.platform)
  return next - base
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/myteam/yourMove/__tests__/scoreCandidate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/myteam/yourMove/scoreCandidate.ts src/myteam/yourMove/__tests__/scoreCandidate.test.ts
git commit -m "feat(yourMove): win-prob-lift scorer"
```

---

## Task 3: Add generator

**Files:**
- Create: `src/myteam/yourMove/generators/addGenerator.ts`
- Test: `src/myteam/yourMove/__tests__/addGenerator.test.ts`

**Context:** A flippable cat = a this-week category with status `tossup`, or `loss` within reach. Free agents come from `AvailablePlayer` (`src/players/types.ts`: `{ playerKey, name, position, team, percentOwned, stats }`). For each FA, project their remaining-week contribution, score it, and if it clears nothing yet (ranking/floor happens in Task 4) still return the candidate with its `winProbLift` and the cats it helps.

- [ ] **Step 1: Write the failing test**

```ts
// src/myteam/yourMove/__tests__/addGenerator.test.ts
import { describe, it, expect } from 'vitest'
import { addGenerator } from '../generators/addGenerator'
import type { ScoredContext } from '../types'
import type { AvailablePlayer } from '@/players/types'

const ctx: ScoredContext = {
  cats: [{ statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }],
  categoryIds: ['HR'],
  myStats: { HR: 8 },
  oppStats: { HR: 11 },
  days: 5,
  platform: 'yahoo',
}
const fas: AvailablePlayer[] = [
  { playerKey: 'fa1', name: 'Power Bat', position: 'OF', team: 'NYY', percentOwned: 20, stats: { HR: 24 } },
  { playerKey: 'fa2', name: 'Slap Hitter', position: '2B', team: 'SF', percentOwned: 5, stats: { HR: 2 } },
]

describe('addGenerator', () => {
  it('produces add candidates for flippable cats, tagged with helped cats', () => {
    const cands = addGenerator(fas, ['HR'], ctx, { HR: 0.6 })
    const power = cands.find((c) => c.player.key === 'fa1')!
    expect(power.kind).toBe('add')
    expect(power.categories).toContain('HR')
    expect(power.winProbLift).toBeGreaterThan(0)
  })

  it('returns nothing when there are no flippable cats', () => {
    expect(addGenerator(fas, [], ctx, { HR: 0.6 })).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/myteam/yourMove/__tests__/addGenerator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/myteam/yourMove/generators/addGenerator.ts
import type { AvailablePlayer } from '@/players/types'
import type { CandidateAction, ScoredContext } from '../types'
import { projectRemainingWeek } from '../projectRemainingWeek'
import { scoreCandidate } from '../scoreCandidate'

/**
 * Propose waiver-add candidates: for each free agent, project their rest-of-week
 * contribution, score the win-prob lift, and tag which flippable cats they help.
 * @param flippableCatIds this-week cats worth chasing (tossup / loss-in-reach)
 * @param seasonFractionComplete used to extrapolate FA counting stats to full-season
 */
export function addGenerator(
  freeAgents: AvailablePlayer[],
  flippableCatIds: string[],
  ctx: ScoredContext,
  fractionByNothing: Record<string, never> | unknown, // placeholder kept out; see note
): CandidateAction[] {
  if (flippableCatIds.length === 0) return []
  const flippable = new Set(flippableCatIds)
  const seasonFraction = 0.6 // TODO Task 5 passes the live value; default mirrors effectiveStats
  const out: CandidateAction[] = []
  for (const fa of freeAgents) {
    const delta = projectRemainingWeek(fa.stats, null, ctx.cats, ctx.days, seasonFraction)
    const helps = ctx.cats
      .filter((c) => flippable.has(c.statId))
      .filter((c) => (c.lowerIsBetter ? (delta[c.statId] ?? 0) < 0 : (delta[c.statId] ?? 0) > 0))
      .map((c) => c.statId)
    if (helps.length === 0) continue
    const winProbLift = scoreCandidate(delta, ctx)
    out.push({
      kind: 'add',
      player: { key: fa.playerKey, name: fa.name, team: fa.team ?? '', position: fa.position ?? '' },
      categories: helps,
      winProbLift,
      rationale: `Adds ${helps.join(', ')} you need this week`,
    })
  }
  return out
}
```

> **Implementer note:** drop the unused `fractionByNothing` parameter — it is a leftover. The real `seasonFractionComplete` is threaded from the composable in Task 5; for this task hardcode `0.6` and expose a `seasonFraction` parameter on the function signature instead: `addGenerator(freeAgents, flippableCatIds, ctx, seasonFraction = 0.6)`. Update the test call to match (`addGenerator(fas, ['HR'], ctx, 0.6)`).

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/myteam/yourMove/__tests__/addGenerator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/myteam/yourMove/generators/addGenerator.ts src/myteam/yourMove/__tests__/addGenerator.test.ts
git commit -m "feat(yourMove): waiver-add generator"
```

---

## Task 4: rankMoves orchestrator

**Files:**
- Create: `src/myteam/yourMove/rankMoves.ts`
- Test: `src/myteam/yourMove/__tests__/rankMoves.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/myteam/yourMove/__tests__/rankMoves.test.ts
import { describe, it, expect } from 'vitest'
import { rankMoves } from '../rankMoves'
import type { CandidateAction } from '../types'

const mk = (key: string, lift: number): CandidateAction => ({
  kind: 'add', player: { key, name: key, team: '', position: '' },
  categories: ['HR'], winProbLift: lift, rationale: '',
})

describe('rankMoves', () => {
  it('orders by lift desc and caps the stack', () => {
    const ranked = rankMoves([mk('a', 2), mk('b', 9), mk('c', 5)], { maxMoves: 2, liftFloor: 1 })
    expect(ranked.map((m) => m.player.key)).toEqual(['b', 'c'])
  })

  it('drops candidates below the lift floor', () => {
    const ranked = rankMoves([mk('a', 0.4), mk('b', 3)], { maxMoves: 4, liftFloor: 1 })
    expect(ranked.map((m) => m.player.key)).toEqual(['b'])
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/myteam/yourMove/__tests__/rankMoves.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/myteam/yourMove/rankMoves.ts
import type { CandidateAction } from './types'

export interface RankOptions {
  maxMoves?: number   // size of the short stack (hero + next-best)
  liftFloor?: number  // discard moves below this win-prob lift (pp)
}

// Given all candidate actions across generators, keep the meaningful ones and
// return the ranked short stack (highest lift first).
export function rankMoves(candidates: CandidateAction[], opts: RankOptions = {}): CandidateAction[] {
  const maxMoves = opts.maxMoves ?? 4
  const liftFloor = opts.liftFloor ?? 1
  return candidates
    .filter((c) => c.winProbLift >= liftFloor)
    .sort((a, b) => b.winProbLift - a.winProbLift)
    .slice(0, maxMoves)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/myteam/yourMove/__tests__/rankMoves.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite + build**

Run: `npm test` (expect all pass) then `npm run build` (expect success).

- [ ] **Step 6: Commit**

```bash
git add src/myteam/yourMove/rankMoves.ts src/myteam/yourMove/__tests__/rankMoves.test.ts
git commit -m "feat(yourMove): rank + short-stack orchestrator"
```

---

## Task 5: useYourMove composable

**Files:**
- Create: `src/composables/useYourMove.ts`

**Context (implementer must read first):**
- `src/composables/useThisWeekMatchup.ts` — `ThisWeekSnapshot` exposes `categories[]` (`{ statId, label, status, myWinPct }`), `daysRemaining`, and is fed by `myStats`/`oppStats` built internally. Expose those raw team totals if not already (add `myStats`/`oppStats` to the snapshot if missing — they are needed as the scorer baseline).
- `src/views/MyTeamView.vue` — how `catSpecs`, `players` (FA pool), `thisWeek` snapshot, platform, and `SEASON_FRACTION` are assembled. The composable should accept these as inputs rather than re-fetching.

- [ ] **Step 1: Build the composable**

Signature:
```ts
export function useYourMove(inputs: {
  catSpecs: Ref<CatSpec[]>
  freeAgents: Ref<AvailablePlayer[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  platform: Ref<'yahoo' | 'espn'>
  seasonFraction: Ref<number>
}): { moves: ComputedRef<CandidateAction[]> }
```

Logic (computed `moves`):
1. If no snapshot or it's `completed`, return `[]`.
2. Build `ScoredContext` from the snapshot: `categoryIds` = snapshot category statIds; `myStats`/`oppStats` from the snapshot's raw totals; `days` = `snapshot.daysRemaining`; `cats` = `catSpecs`.
3. `flippableCatIds` = snapshot categories with `status === 'tossup'`, plus `status === 'loss'` whose `myWinPct >= 30` (loss-in-reach).
4. Run `addGenerator(freeAgents, flippableCatIds, ctx, seasonFraction)`.
5. `return rankMoves(candidates, { maxMoves: 4, liftFloor: 1 })`.

- [ ] **Step 2: Verify build + types**

Run: `npx vue-tsc --noEmit -p tsconfig.json` (no new errors) then `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useYourMove.ts src/composables/useThisWeekMatchup.ts
git commit -m "feat(yourMove): useYourMove composable wiring pools + snapshot"
```

---

## Task 6: YourMove.vue component

**Files:**
- Create: `src/components/myteam/YourMove.vue`

**Context:** Match the existing terminal aesthetic (mono labels, lime primary, `text-[#F2B33A]` amber, `#FF5C5C` red) seen in `MatchupSnapshot.vue` and `RosterPanel.vue`. Props: `moves: CandidateAction[]`, `loading: boolean`, `record?: { wins: number; losses: number }` (for the empty state).

- [ ] **Step 1: Build the component**

Behavior:
- **Loading:** a single skeleton row. Never blank.
- **Empty (`moves.length === 0`):** calm one-liner — "No swing moves right now." Never a forced bad action.
- **Populated:** a `YOUR MOVE` header, then:
  - Hero (move[0]): the action verb + player name prominent; `+{lift}%` in lime; `flips {categories}` as chips; the `rationale` muted beneath.
  - Next-best (move[1..]): smaller rows, same structure, de-emphasized.
- Each row links to the relevant destination (Players page for adds) — reuse the existing router-link pattern from `MatchupSnapshot.vue`.
- Round `winProbLift` to a whole number for display; never show negative (already floored).

- [ ] **Step 2: Verify build**

Run: `npm run build` (success). Manually confirm no smart-quote / TS1127 issues (ASCII only in string literals).

- [ ] **Step 3: Commit**

```bash
git add src/components/myteam/YourMove.vue
git commit -m "feat(yourMove): YourMove hero + next-best component"
```

---

## Task 7: MyTeamView reconciliation

**Files:**
- Modify: `src/views/MyTeamView.vue`

**Context:** This is the integration task. The implementer must read the current `MyTeamView.vue` template/section order. Apply the new IA from the spec.

- [ ] **Step 1: Wire `useYourMove` + mount `YourMove`**

- Instantiate `useYourMove` with `catSpecs`, the canonical FA `players`, `thisWeek.snapshot`, the active platform, and `SEASON_FRACTION`.
- Mount `<YourMove :moves="yourMove.moves.value" :loading="rosterLoading" :record="record" />` directly under the verdict header, **above** the This Week band.

- [ ] **Step 2: Promote This Week, demote season**

- Keep `MatchupSnapshot` as the primary frame (already under the header). Remove its now-redundant `this week's matchup odds · season ranks below` footnote — the new IA makes the framing explicit.
- Wrap the existing "Where You're Losing / Your Edge" + "Category Profile" blocks in a section preceded by a muted divider labeled `SEASON`. Reduce their visual weight (the Profile stays as the single canonical category view).
- Remove the per-row "Add X → +N" suggestion from the **Losing** cards only if `YourMove` is rendering (avoid showing the same add twice); otherwise keep. Simplest: keep the Profile, turn the Losing/Edge cards into compact rank pointers without the inline add (the add now lives in Your Move). Confirm with a build + visual check.

- [ ] **Step 3: Punchier verdict copy**

- In the verdict source (`SituationStrip` props or the `verdict` computed), give the "Strongest / Biggest hole" line a take. Keep it one line, ASCII only, no em dashes. Example shape: `Elite K's. Can't buy a homer.` derived from the existing strongest/weakest cats.

- [ ] **Step 4: Verify**

Run: `npx vue-tsc --noEmit -p tsconfig.json` (no new errors), `npm test` (all pass), `npm run build` (success).

- [ ] **Step 5: Commit**

```bash
git add src/views/MyTeamView.vue src/components/myteam/SituationStrip.vue src/components/myteam/MatchupSnapshot.vue
git commit -m "feat(myteam): reconcile page around this-week + mount Your Move; demote season"
```

---

## Self-Review (controller, before dispatch)

- Spec coverage: reconcile IA (Task 7) ✓; Your Move engine (Tasks 1-4) ✓; adds generator (Task 3) ✓; short stack (Task 4/6) ✓; empty/loading states (Task 6) ✓; punchy copy (Task 7) ✓. Start/sit + streaming = later plans (out of Phase 1 scope, per spec phasing). ✓
- Type consistency: `CandidateAction`, `ScoredContext`, `RankOptions` used consistently; `addGenerator` signature corrected to `(freeAgents, flippableCatIds, ctx, seasonFraction)` per the implementer note in Task 3.
- Open integration risk: `useThisWeekMatchup` must expose raw `myStats`/`oppStats` for the scorer baseline (Task 5 Step 1 calls this out). If absent, add them there.

## Out of scope (later plans)

- Start/sit generator + lineup-slot plumbing (ESPN carries `lineupSlotId` but filters inactive slots; needs bench players retained).
- MLB StatsAPI schedule service + streaming generator (Phase 2).
- Yahoo `selected_position` parse (Phase 3).
- Within-position ranking (workstream 3), roster intelligence (workstream 4).
