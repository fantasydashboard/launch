# Draft Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live draft assistant for Sleeper football leagues that recommends a pick using VONA, opponent draft tendencies, and live pick sync.

**Architecture:** Six pure modules under `src/draft/room/` (ADP extraction, pick order, tendencies, survival simulation, board ranking, recommendation), orchestrated by `useDraftRoom` and rendered by `DraftRoomView.vue` at `/draft-room`. All football + Sleeper gated. Reuses the shipped VOR engine for projections and replacement levels.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest.

**Spec:** `docs/superpowers/specs/2026-08-06-draft-room-design.md`

## Global Constraints

- Sleeper football leagues only. Snake and linear drafts only; auction gets an explicit unsupported state.
- No new dependencies. ADP comes from the already-cached Sleeper projections payload.
- Existing surfaces unchanged: `/draft` (Draft Analysis), Wire, Trades, My Team, This Week.
- Pure modules must be deterministic — a recommendation that flickers between renders destroys trust. Seed the simulation.
- No `Math.random()` without an injected seed; no `Date.now()` inside pure functions.
- Every recommendation reason must cite a computed number, or it is not printed.
- Run tests with `npx vitest run <path>`; type-check with `npx vue-tsc --noEmit` (repo has ~62 pre-existing errors elsewhere — grep for your own files).
- All 691 existing tests must stay green.

---

## File Structure

**Create:**
- `src/draft/room/adp.ts` — ADP extraction + variant selection
- `src/draft/room/pickOrder.ts` — snake/linear pick sequencing
- `src/draft/room/tendencies.ts` — per-manager positional priors with shrinkage
- `src/draft/room/survival.ts` — Monte Carlo survival + expected best available
- `src/draft/room/board.ts` — ranking, tiers, value/reach flags
- `src/draft/room/recommend.ts` — the call + cited reasons + alternates
- `src/composables/useDraftRoom.ts` — orchestration, polling, draft state
- `src/views/DraftRoomView.vue` — Pick / Board / Room / Won't Last
- Tests alongside each pure module in `src/draft/room/__tests__/`

**Modify:**
- `src/services/footballProjections.ts` — add `fetchSeasonAdp` sibling over the cached payload
- `src/router/index.ts` — add `/draft-room`
- `src/App.vue` — football+Sleeper-gated nav entry

---

## Task 1: `adp.ts` — ADP extraction and variant selection

**Files:** Create `src/draft/room/adp.ts`, `src/draft/room/__tests__/adp.test.ts`; modify `src/services/footballProjections.ts`

**Interfaces produced:**
- `type AdpVariant = 'std' | 'ppr' | 'half_ppr' | '2qb' | 'dynasty_std' | 'dynasty_ppr' | 'dynasty_half_ppr' | 'dynasty_2qb'`
- `adpVariantFor(scoringSettings: Record<string, number>, slots: Record<string, number>, leagueType?: number): AdpVariant`
- `adpByKey(raw: any[], variant: AdpVariant): Record<string, number>`
- `fetchSeasonAdp(season: string, variant: AdpVariant): Promise<Record<string, number>>` in `footballProjections.ts`

- [ ] **Step 1: Failing tests** — `adpVariantFor` maps `rec: 1` → `ppr`, `rec: 0.5` → `half_ppr`, absent/0 → `std`; a `SUPER_FLEX` slot forces the `2qb` family; `leagueType === 2` forces the dynasty family. `adpByKey` reads `stats.adp_<variant>` keyed by `player_id`, skips non-finite values, tolerates `null`/`[]`.
- [ ] **Step 2: Run — expect failure** (`npx vitest run src/draft/room/__tests__/adp.test.ts`)
- [ ] **Step 3: Implement.** `fetchSeasonAdp` reuses `sleeperService.getSeasonProjections('football', season)` — already cached, so zero extra network. Note the payload is an ARRAY of records with `player_id` and `stats`, unlike the map shape `fetchSeasonProjectionStats` builds.
- [ ] **Step 4: Run — expect pass**
- [ ] **Step 5: Commit** — `feat: Sleeper ADP extraction + league-aware variant selection`

---

## Task 2: `pickOrder.ts` — snake/linear sequencing

The highest-risk arithmetic in the feature. Everything downstream depends on it.

**Files:** Create `src/draft/room/pickOrder.ts`, `src/draft/room/__tests__/pickOrder.test.ts`

**Interfaces produced:**
- `interface DraftShape { type: 'snake' | 'linear'; teams: number; rounds: number }`
- `slotAtPick(shape: DraftShape, overallPick: number): number` — 1-indexed draft slot picking at that overall pick
- `nextPickFor(shape: DraftShape, mySlot: number, afterOverallPick: number): number | null` — my next overall pick strictly after the given one; null if none remain
- `slotsBetween(shape: DraftShape, fromOverallPick: number, toOverallPick: number): number[]` — slots picking strictly between two overall picks, in order

- [ ] **Step 1: Failing tests.** For a 12-team snake: pick 1 → slot 1; pick 12 → slot 12; pick 13 → slot 12 (reversal); pick 24 → slot 1; pick 25 → slot 1. Linear: pick 13 → slot 1. `nextPickFor` from slot 4 in a 12-team snake after pick 4 → 21. `slotsBetween` returns the right count and order. Edge cases: slot 1 and slot 12 (back-to-back turns), final round, `rounds` exhausted → null.
- [ ] **Step 2: Run — expect failure**
- [ ] **Step 3: Implement.** Round = `ceil(pick / teams)`; index within round = `((pick - 1) % teams) + 1`; snake reverses on even rounds.
- [ ] **Step 4: Run — expect pass**
- [ ] **Step 5: Commit** — `feat: pickOrder — snake/linear draft slot arithmetic`

---

## Task 3: `tendencies.ts` — per-manager priors with shrinkage

**Files:** Create `src/draft/room/tendencies.ts`, `src/draft/room/__tests__/tendencies.test.ts`

**Interfaces produced:**
- `interface HistoricalPick { teamKey: string; position: string; round: number; keeper?: boolean }`
- `interface PositionPrior { byPosition: Record<string, number>; sample: number }` — probabilities summing to 1
- `buildTendencies(picks: HistoricalPick[], roundBucket: (round: number) => string): { byManager: Record<string, Record<string, PositionPrior>>; league: Record<string, PositionPrior> }`
- `priorFor(t, teamKey, bucket): PositionPrior` — shrunk blend, falls back to league prior

- [ ] **Step 1: Failing tests.** League prior aggregates all managers. A manager with 5 drafts weights mostly personal; with 1 draft weights mostly league; with 0 returns the league prior with `sample: 0`. Keeper picks excluded. Probabilities sum to ~1. Unknown manager → league prior.
- [ ] **Step 2: Run — expect failure**
- [ ] **Step 3: Implement.** Shrinkage `w = n / (n + k)`, `k = 4`. `roundBucket` groups rounds (default: early 1–3, mid 4–8, late 9+) so samples aren't split too thin.
- [ ] **Step 4: Run — expect pass**
- [ ] **Step 5: Commit** — `feat: tendencies — per-manager positional priors with shrinkage`

---

## Task 4: `survival.ts` — Monte Carlo

**Files:** Create `src/draft/room/survival.ts`, `src/draft/room/__tests__/survival.test.ts`

**Interfaces produced:**
- `interface SurvivalInput { available: { playerKey: string; position: string; adp: number; value: number }[]; upcomingSlots: number[]; priorForSlot: (slot: number) => PositionPrior; runs?: number; seed?: number }`
- `interface SurvivalResult { survival: Record<string, number>; expectedBestAtPosition: Record<string, number> }`
- `simulateSurvival(input: SurvivalInput): SurvivalResult`

- [ ] **Step 1: Failing tests.** All probabilities in `[0, 1]`. With zero upcoming picks every player survives with probability 1 and `expectedBestAtPosition` equals the current best. A player whose position is certain to be taken by every upcoming picker trends toward 0. Determinism: same seed and input → identical output. Players without ADP are never drawn but still appear in `expectedBestAtPosition` candidates.
- [ ] **Step 2: Run — expect failure**
- [ ] **Step 3: Implement.** Seeded PRNG (mulberry32 — small, deterministic, no dependency). Per run: copy the available pool, for each upcoming slot draw a position from that slot's prior, take the best undrafted player at that position by ADP, and continue. After the run record survivors and the best remaining value per position. Average across runs. Default `runs = 1000`.
- [ ] **Step 4: Run — expect pass**
- [ ] **Step 5: Commit** — `feat: survival — Monte Carlo over intervening picks`

---

## Task 5: `board.ts` — ranking, tiers, flags

**Files:** Create `src/draft/room/board.ts`, `src/draft/room/__tests__/board.test.ts`

**Interfaces produced:**
- `interface BoardRow { playerKey: string; name: string; position: string; proTeam?: string; value: number; vona: number; upside: number; score: number; survival: number; tier: number; flag: 'value' | 'reach' | '' ; adp: number | null }`
- `buildBoard(input): BoardRow[]` — consumes available players, `SurvivalResult`, ADP map, and `{ filledStarterSlots, totalStarterSlots }`

- [ ] **Step 1: Failing tests.** `vona = value − expectedBestAtPosition[pos]`. With `w = 0` score equals VONA; with `w = 1` score equals upside. Tier boundaries fall at outsized value gaps. `flag` is `value` when available well past ADP and `reach` when well before. Missing ADP → `adp: null`, `flag: ''`, still ranked.
- [ ] **Step 2: Run — expect failure**
- [ ] **Step 3: Implement** per spec §5.
- [ ] **Step 4: Run — expect pass**
- [ ] **Step 5: Commit** — `feat: board — VONA/upside ranking with tiers and value flags`

---

## Task 6: `recommend.ts` — the call

**Files:** Create `src/draft/room/recommend.ts`, `src/draft/room/__tests__/recommend.test.ts`

**Interfaces produced:**
- `interface Reason { kind: 'vona' | 'tendency' | 'tier' | 'survival'; text: string }`
- `interface Recommendation { pick: BoardRow; reasons: Reason[]; alternates: { row: BoardRow; note: string }[] }`
- `buildRecommendation(rows: BoardRow[], ctx): Recommendation | null`

- [ ] **Step 1: Failing tests.** Top row by score is the pick. Every reason cites a number present in the inputs — no reason is emitted without one. Alternates are the next rows by score, each carrying a survival note. Empty board → null.
- [ ] **Step 2: Run — expect failure**
- [ ] **Step 3: Implement.** Reasons in priority order: VONA gap, opponent tendency (only when `sample > 0`, and the text includes the sample), tier boundary, survival.
- [ ] **Step 4: Run — expect pass**
- [ ] **Step 5: Commit** — `feat: recommend — the pick with cited reasons`

---

## Task 7: `useDraftRoom.ts` — orchestration and live sync

**Files:** Create `src/composables/useDraftRoom.ts`

- [ ] **Step 1: Implement.** Compose `useActivePointsSource` + `useFootballVor` + `fetchSeasonAdp` + `leagueStore.historicalDrafts`. Fetch draft meta via `sleeperService.getDraft(leagueId)`. Poll `/draft/{id}/picks` every 5s while status is `drafting`, with backoff on error; stop on `complete`. Derive drafted set, my roster, current pick, my next pick. Expose a `manualDrafted` set that is always honored, unioned with synced picks, so the user is never stranded if sync fails. Gate: football + Sleeper + snake/linear.
- [ ] **Step 2: Type-check** — `npx vue-tsc --noEmit 2>&1 | grep useDraftRoom`
- [ ] **Step 3: Commit** — `feat: useDraftRoom — live pick sync + draft state`

---

## Task 8: `DraftRoomView.vue` + route + nav

**Files:** Create `src/views/DraftRoomView.vue`; modify `src/router/index.ts`, `src/App.vue`

- [ ] **Step 1: Implement the view.** Four tabs; **Pick** default. Pick shows the recommendation, its reasons, and alternates. Board shows ranked rows with tier separators, strikethrough for drafted, value/reach flags. Room shows roster slots with best available per hole. Won't Last shows survival percentages. Manual "mark drafted" control available in every view. Empty states: not a Sleeper football league, auction draft, draft not started, draft complete, no history (league-average priors notice).
- [ ] **Step 2: Route** `/draft-room` → `DraftRoomView.vue`.
- [ ] **Step 3: Nav** — football + Sleeper gated entry labeled "Draft Room".
- [ ] **Step 4: Build + type-check + full suite**
- [ ] **Step 5: Commit** — `feat: Draft Room view + route + nav`

---

## Task 9: Replay mode

**Files:** Create `src/draft/room/replay.ts`, `src/draft/room/__tests__/replay.test.ts`

- [ ] **Step 1: Failing tests.** Replaying a completed draft yields a recommendation at each of my picks. Calibration buckets predicted-survival against actual outcomes and returns counts per bucket.
- [ ] **Step 2: Run — expect failure**
- [ ] **Step 3: Implement.** `replayDraft(historicalPicks, shape, mySlot, …)` walks the draft pick by pick, rebuilding available players and calling the same `buildBoard`/`buildRecommendation` the live path uses. `calibration(results)` compares predicted survival to what actually happened.
- [ ] **Step 4: Run — expect pass**
- [ ] **Step 5: Commit** — `feat: replay — verify the engine against completed drafts`

---

## Self-Review

**Spec coverage:** §1 pickOrder → Task 2. §2 tendencies → Task 3. §3 survival → Task 4. §4 adp → Task 1. §5 board → Task 5. §6 recommend → Task 6. §7 composable + view → Tasks 7–8. §8 replay → Task 9. Error handling → Task 7 (manual override, gating) and Task 8 (empty states). Testing → per-task tests plus Task 9.

**Placeholder scan:** none — every task states its interfaces, test cases, and verification command.

**Type consistency:** `PositionPrior` (Task 3) is consumed by `SurvivalInput.priorForSlot` (Task 4). `SurvivalResult` (Task 4) feeds `buildBoard` (Task 5). `BoardRow` (Task 5) feeds `buildRecommendation` (Task 6) and the view (Task 8). `DraftShape` (Task 2) is used by Tasks 4, 7, and 9. `AdpVariant` (Task 1) is used by Task 7.

**Sequencing note:** Tasks 1–6 are pure and independently shippable; the feature is usable after Task 8. Task 9 is the verification harness and can precede Task 8 if the season timeline tightens.
