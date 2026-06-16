# Matchup Weekly Battle Plan — View (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Matchup data-dump page with the decision-first "Weekly Battle Plan" view, wiring the Plan-1 engines + `useYourMove` + the live snapshot into one view-model and rendering it.

**Architecture:** One integration composable (`useMatchupBattlePlan`) assembles a single reactive **view-model** by mirroring `MyTeamView.vue`'s existing data wiring and layering the four Plan-1 engines. A thin presentational view (`MatchupBattlePlanView.vue`) renders that view-model. Then the league Matchup route is pointed at the new view.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-16-matchup-weekly-battle-plan-design.md`. **Plan 1 (engines) is already built** (`projectFinalStats`, `seasonStakes`, `matchupPlan`, `volumeEdge`).

**Scope (v1):** versus header + daily/weekly cadence; stakes read + override; adaptive path; volume edge; coin-flips with the move that flips each (Yahoo + ESPN); lineup check (**Yahoo only**); banked/conceded(+swing). **Out of scope → Plan 3:** the win-prob trend chart (the app has no real per-day history — the current line is synthetic; doing it right needs a daily-snapshot capture first). Win-prob engine consolidation (deleting the inlined dup in `CategoryMatchupsView.vue`) is also Plan 3 (that view is being un-routed here, not deleted).

**Approved visual reference:** `.superpowers/brainstorm/77095-1781613166/content/full-page.html` (the full-page mockup) — match its layout/section order; use the existing dark/mono card + chip styles from `TradesView.vue`/`OpportunityCard.vue` for the visual treatment (no banned side-stripes; section accents via `text-primary` + ★).

**Constraints (CLAUDE.md + standing rules):**
- Stay **local** on `redesign/my-team-first`. NEVER push/deploy/PR.
- Commit with `git -c gc.auto=0` + trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **`npm run build` does NOT type-check.** Real check: **`npm run type-check`** (`vue-tsc`, `tsconfig.json` — NO `tsconfig.app.json`). Pre-existing unrelated errors exist; confirm touched files are absent from the error list.
- NO auto-import; a green build won't catch a dangling Vue ref — eyeball templates.
- zsh exclamation issues → write throwaway scripts to `/tmp/`.

---

## Known shapes (from the codebase — do not redefine)

- Engines (Plan 1): `seasonStakes({rank, leagueSize, weeksLeft, playoffSpots}) → { mode: StakesMode, reasoning }`; `matchupPlan(categories: PlanCategory[], mode) → { path, fight, swing, concede }` where `PlanCategory = {statId, status:'safe'|'tossup'|'loss', myWinPct}`; `volumeEdge(mine: VolPlayer[], opp: VolPlayer[], schedule) → { myGames, myStarts, oppGames, oppStarts, read }` where `VolPlayer = {name, teamAbbr, isPitcher}`. `StakesMode = 'clinch'|'maximize'|'must-win'|'coast'`.
- `useThisWeekMatchup()` → `{ snapshot, loading, loaded, load(catSpecs:{statId,label}[]) }`; `ThisWeekSnapshot` has `opponentName`, `oppAvatar?`, `winPct/tiePct/lossPct`, `projWins/Losses/Ties`, `daysRemaining`, `completed`, `categories: SnapshotCategory[]`, `myStats`, `oppStats`, `platform`. `SnapshotCategory = {statId, label, status:'win'|'loss'|'tossup'|'notApplicable', myWinPct}`. **Note:** snapshot `status` uses `'win'`/`'notApplicable'`; `matchupPlan`/`bucketCategory` use `'safe'`/`'tossup'`/`'loss'` — map `'win'→'safe'`, drop `'notApplicable'`.
- `useYourMove({ catSpecs, freeAgents, roster, snapshot, seasonFraction, cadence })` → `{ moves: CandidateAction[] }`; `CandidateAction = { kind:'add'|'stream'|'startSit', player:{key,name,team,position}, counterparty?:{key,name}, categories:string[], winProbLift:number, rationale:string, layer?:'today'|'longTerm' }`.
- `useMyRoster()` → roster of `RosterPlayer { name, position, team /* MLB abbr */, started, eligiblePositions? }`. `useAvailablePlayers()` → the free-agent pool.
- `mlbSchedule.getWeekSchedule(startISO, endISO)` → `WeekSchedule`.
- Standings: `leagueStore.yahooTeams` (each `{ rank, wins, losses, is_my_team }`); league size = `useLeaguesStore().activeLeague?.league_size ?? yahooTeams.length`. **`playoffSpots` does not exist → default `Math.round(leagueSize/2)`.** `leagueStore.playoffWeekStart` + `leagueStore.currentWeek` → `weeksLeft = max(0, playoffWeekStart - currentWeek)`.
- catSpecs: `MyTeamView.vue` already builds the `CatSpec[]` (`{statId, lowerIsBetter, side, isRatio, volumeStatId?}`) and the `{statId,label}[]` for `load()` — mirror it.
- Route: `src/router/index.ts` child `{ path: 'matchups', name: 'my-league-matchups', component: () => import('@/views/CategoryDemoMatchupsView.vue') }` under `/leagues/:leagueId`.

---

## Task 1: `useMatchupBattlePlan` — the integration composable (the view-model)

**Files:** Create `src/composables/useMatchupBattlePlan.ts`. **Read `src/views/MyTeamView.vue` first** — it is the wiring template for `useThisWeekMatchup` + `useAvailablePlayers` + `useMyRoster` + catSpecs + cadence → `useYourMove`. Mirror that wiring; do not invent new loaders.

- [ ] **Step 1: Define the view-model contract.** The composable exposes one reactive object:

```ts
export interface CoinFlip {
  statId: string
  label: string
  myWinPct: number // 0..100
  move?: { text: string; lift: number; today: boolean } // best useYourMove action that helps this cat
}
export interface BattlePlanVM {
  ready: boolean
  // versus header
  me: { name: string; avatar?: string; winPct: number }
  opp: { name: string; avatar?: string; winPct: number }
  week: number
  daysLeft: number
  tiePct: number
  projWins: number
  projLosses: number
  // cadence
  cadence: 'daily' | 'weekly'
  // stakes
  stakes: { mode: StakesMode; reasoning: string } // mode reflects the override if set, else auto
  // plan
  path: string
  coinFlips: CoinFlip[] // contested cats, closest-to-flip first, each with its best move
  banked: { statId: string; label: string }[]
  conceded: { statId: string; label: string }[]
  swing: { statId: string; label: string }[]
  // volume edge
  volume: { myGames: number; myStarts: number; oppGames: number; oppStarts: number; read: string }
  // lineup check (Yahoo only; null when unsupported/ESPN)
  lineupCheck: { ok: boolean; message: string } | null
}
```

- [ ] **Step 2: Wire it.** `useMatchupBattlePlan()` returns `{ vm: ComputedRef<BattlePlanVM>, cadence: Ref<'daily'|'weekly'>, override: Ref<StakesMode | 'auto'>, refresh: () => Promise<void> }`. Wiring rules:
  - **catSpecs + snapshot:** mirror `MyTeamView.vue` — build `catSpecs: CatSpec[]` and the `{statId,label}[]`, call `useThisWeekMatchup().load(...)`; `snapshot` drives most of the VM.
  - **moves:** build the `useYourMove` inputs exactly as `MyTeamView.vue` does (catSpecs, `useAvailablePlayers()` → freeAgents, `useMyRoster()` → roster, snapshot, seasonFraction, `cadence`). For each `coinFlip`, pick the highest-`winProbLift` move whose `categories` includes that `statId`; `move.today = (action.layer === 'today')`; `move.text` = a short imperative from the action (`kind`/`player.name`/`counterparty?.name`, e.g. `stream ${player.name}`, `start ${player.name} over ${counterparty.name}`, `add ${player.name}`). If none, `move` is undefined.
  - **status mapping:** map snapshot `SnapshotCategory.status` → `PlanCategory.status`: `'win'→'safe'`, `'tossup'→'tossup'`, `'loss'→'loss'`, skip `'notApplicable'`. Feed the mapped list to `matchupPlan(mapped, mode)`. `coinFlips` = the `'tossup'` cats sorted by `myWinPct` ascending; `banked` = `matchupPlan.fight`? No — `banked` = the safe cats, `conceded` = `plan.concede`, `swing` = `plan.swing` (resolve statId→label via the snapshot's category labels).
  - **stakes:** `mode = override.value === 'auto' ? seasonStakes(stakeInput).mode : override.value`; `reasoning = override===auto ? seasonStakes(...).reasoning : 'Goal set manually.'`. `stakeInput` from standings: `rank` (the `is_my_team` row's rank), `leagueSize`, `weeksLeft = max(0, playoffWeekStart - currentWeek)`, `playoffSpots = Math.round(leagueSize/2)`.
  - **volume:** map roster → `VolPlayer[]` (`teamAbbr = player.team`, `isPitcher` from position containing SP/RP/P), opponent roster if available else `[]`; fetch `mlbSchedule.getWeekSchedule(startOfWeekISO, endOfWeekISO)` for the **remaining** days; `volume = volumeEdge(mine, opp, schedule)`.
  - **lineupCheck:** **Yahoo only** (`snapshot.platform === 'yahoo'`). Reuse the `useYourMove` `layer:'today'` "fill empty slot" signal if present, OR detect an empty active slot from the roster's `started`/slot data the way `useLineupLeaks` does. `{ ok, message }`; on ESPN or when unknown, `lineupCheck = null` (the view hides the section — never assert "all set" on ESPN).
  - **ready:** `snapshot != null && loaded`.

- [ ] **Step 3: Verify (no unit test — composable wiring; covered by build + the view's manual reload).**
  - `npm run type-check 2>&1 | grep useMatchupBattlePlan || echo clean` → `clean`.
  - `npm run build` → succeeds.

- [ ] **Step 4: Commit.**
```bash
git -c gc.auto=0 add src/composables/useMatchupBattlePlan.ts
git -c gc.auto=0 commit -m "$(printf 'feat: useMatchupBattlePlan — assemble the weekly battle plan view-model\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

**If blocked** (e.g. MyTeamView's wiring is unclear, or freeAgents/roster shapes don't line up with `useYourMove`'s inputs), STOP and report NEEDS_CONTEXT with what you found — do NOT guess the wiring.

---

## Task 2: `MatchupBattlePlanView.vue` — render the view-model

**Files:** Create `src/views/MatchupBattlePlanView.vue`. Visual reference: `.superpowers/brainstorm/77095-1781613166/content/full-page.html`. Reuse the dark/mono card + chip aesthetic from `TradesView.vue`.

- [ ] **Step 1: Build the view** consuming `useMatchupBattlePlan()`. Sections, top to bottom (match the mockup; data straight from the VM):
  1. **Versus header** — `me.avatar`/`me.name`/`me.winPct` left, `opp...` right (your side cyan-ish, opp amber, as the mockup), `Week {week} · {daysLeft}d left`, `{tiePct}% tie · projected {projWins}–{projLosses}`, and a **Mutual-style segmented `daily | weekly` toggle** bound to `cadence`.
  2. **Stakes read** — `stakes.reasoning` + a small **goal override** segmented control (`auto · clinch · maximize · must-win · coast`) bound to `override`.
  3. **★ Your Path** — `path` (the centerpiece; `text-primary` + ★ heading, no side-stripe).
  4. **Volume edge** — `volume.read`, with `{myGames} games & {myStarts} starts` vs `{oppGames} & {oppStarts}`.
  5. **Coin-flips · fight these** — `v-for` `coinFlips`: `{label}  {myWinPct}%  {move.text}` with a `TODAY` chip when `move.today`, and `+{move.lift}%` in green; "held — no move" when `move` is undefined.
  6. **Lineup check** — `v-if="lineupCheck"` only; `lineupCheck.ok ? '✓ ' : '⚠ '` + `message`. (Hidden entirely when `lineupCheck === null`.)
  7. **Banked / Conceded (+ swing)** — chips from `banked` / `conceded` / `swing` (swing only shown when non-empty; the mockup's tiers/colors).
  - Loading state when `!vm.ready` (a simple skeleton/"loading your matchup…"); empty state when no matchup (bye/offseason).

- [ ] **Step 2: Verify.**
  - `npm run type-check 2>&1 | grep MatchupBattlePlanView || echo clean` → `clean`.
  - `npm run build` → succeeds. `npx vitest run` → existing tests green.
  - **Eyeball** the template: every binding maps to a real VM field; no dangling refs; no banned side-stripe; the cadence/override controls write back to the composable refs.

- [ ] **Step 3: Commit.**
```bash
git -c gc.auto=0 add src/views/MatchupBattlePlanView.vue
git -c gc.auto=0 commit -m "$(printf 'feat: MatchupBattlePlanView — render the weekly battle plan\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: Point the Matchup route at the new view

**Files:** Modify `src/router/index.ts`.

- [ ] **Step 1: Swap the route component.** Find the child route under `/leagues/:leagueId`:
```ts
        { path: 'matchups', name: 'my-league-matchups', component: () => import('@/views/CategoryDemoMatchupsView.vue') },
```
Change the component to the new view:
```ts
        { path: 'matchups', name: 'my-league-matchups', component: () => import('@/views/MatchupBattlePlanView.vue') },
```
Leave `CategoryDemoMatchupsView.vue` on disk (Plan 3 reuses its trend math) — just stop routing the user to it. Do NOT touch the other matchup routes (`/matchups`, `/matchup`, demo routes).

- [ ] **Step 2: Verify.**
  - `npm run type-check 2>&1 | grep "router/index\|MatchupBattlePlan" || echo clean` → `clean`.
  - `npm run build` → succeeds.
  - **Manual reload:** navigate to a league's **Matchup** tab — the new Weekly Battle Plan renders (not the old Category Matchups data dump). Verify on **Yahoo** (lineup check shows) and **ESPN** (lineup check hidden, everything else renders). Toggle daily/weekly (coin-flip `TODAY` tags change) and the goal override (path re-aims). Screenshot for the user.

- [ ] **Step 3: Commit.**
```bash
git -c gc.auto=0 add src/router/index.ts
git -c gc.auto=0 commit -m "$(printf 'feat: route the league Matchup tab to the Weekly Battle Plan\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification (after all tasks)

- [ ] `npx vitest run` — existing suite green (this plan adds no unit tests; the engines are already tested in Plan 1).
- [ ] `npm run type-check` — touched files clean (ignore pre-existing unrelated errors).
- [ ] `npm run build` — succeeds.
- [ ] Manual reload, both platforms: the Matchup tab is the Weekly Battle Plan; the old data dump is gone from the user path. Do NOT push/deploy — report + screenshot for the user.

---

## Self-Review

**Spec coverage (view portion):**
- Versus header + daily/weekly → Task 2 §1. ✓
- Stakes read + override → Task 1 (mode/override) + Task 2 §2. ✓
- Adaptive path → `matchupPlan` (Plan 1) wired in Task 1, rendered Task 2 §3. ✓
- Volume edge → Task 1 (volumeEdge wiring) + Task 2 §4. ✓
- Coin-flips with the move that flips each → Task 1 (useYourMove → CoinFlip.move) + Task 2 §5. ✓
- Lineup check (Yahoo only, hidden on ESPN) → Task 1 (lineupCheck null on ESPN) + Task 2 §6. ✓
- Banked/Conceded/swing → Task 1 + Task 2 §7. ✓
- Cut the data dump → Task 3 (route swap away from CategoryDemoMatchupsView). ✓
- Trend, win-prob consolidation → **Plan 3** (explicitly deferred; the actual line is synthetic today). ✓

**Placeholder scan:** The view-model contract is fully specified; the engine calls are exact. The data-loading wiring is "mirror `MyTeamView.vue`" rather than reproduced verbatim — this is an integration task against a proven existing call site, with an explicit STOP-and-ask if the shapes don't line up (not a guess). Styling references the approved mockup + existing patterns (standard for a UI view).

**Type consistency:** `BattlePlanVM`/`CoinFlip` defined in Task 1, consumed field-by-field in Task 2. `StakesMode` reused from `seasonStakes`. The snapshot `'win'/'notApplicable'` → `'safe'`/drop mapping is called out explicitly so `matchupPlan` (which expects `'safe'|'tossup'|'loss'`) receives valid input. Route name `my-league-matchups` matches the real router entry.
