# Matchup → "Weekly Battle Plan" — Design

**Date:** 2026-06-16
**Branch:** `redesign/my-team-first` (local only — no push/deploy until real-user testing)
**Status:** Approved design, pending spec review → implementation plan

## Goal

Turn the Matchup page from a *data dump* into a decision-first **Weekly Battle Plan**: for your live H2H category matchup, it tells you which categories to fight, how to flip them this week/today, which to concede, and — crucially — it **adapts the objective to your season stakes** (just clinch vs. make up ground vs. must-win vs. coast). It owns exactly one lever: **win this week**.

## Why

Per the one-lever architecture ([[user-pages-one-lever-architecture]] / the spec set), each non-league page owns one way to win a category season. Matchup owns **this week's tactics**. Today it's the worst data-dump offender (a 25-row category table, an all-league grid, a near-flat win-prob chart, scouting reports) — it shows everything and decides nothing. Meanwhile the single best decision-first artifact in the app — the **coin-flips / safe / loss split + the PATH line** ("concede the lost, fight the contested, here's how") — is currently buried on My Team. This redesign makes that the centerpiece, attaches the **move that flips each contested category**, and makes the whole plan **stakes-aware** so it reads like a strategist, not a fixed optimizer.

Native ESPN/Yahoo show the matchup score; none tell you which categories are winnable, what to start/stream/add to flip them, your games-left volume edge, or how your goal shifts with the standings. That decision layer is the edge.

## Page structure (top to bottom)

1. **Versus header** — both team logos, your win% vs theirs, week + days left, and a **daily / weekly** cadence toggle. (`20% tie · projected 10–10` subline.)
2. **Stakes read** — one line stating your season situation and the resulting objective, with a manual goal override. (See "Stakes engine.")
3. **★ Your Path** — the coin-flips sentence, **adapted to the stakes mode** (the centerpiece).
4. **Volume Edge** — games & starts left this week, you vs opponent — the counting-stat lever.
5. **Coin-flips · fight these** — each contested category with the highest-leverage **move that flips it** (+win%), `TODAY`-tagged in daily mode.
6. **Lineup Check** — empty-starting-slot warning + lock urgency (Yahoo v1; ESPN fast-follow).
7. **Banked / Conceded** — chips: protect the safe, don't spend on the lost. (In maximize/must-win modes a **"worth a swing"** tier appears between them.)
8. **Trend** — daily win-probability, **solid = actual so far, dotted = projected finish**, both teams (yours the bright hero, opponent dim), with green **move-markers** (phase-2).

**Cut entirely:** the 25-row Category Breakdown table, the all-league "Select Matchup" grid + league summary, the standalone Monte-Carlo trend chart section, the Scouting Reports, the Statistical Comparison, the Season Series. (These are league-voyeur / raw data, not your weekly decision.)

---

## The win-probability engine (consolidate first)

There are two copies of the engine: `src/services/categoryWinProbability.ts` (`calcOverallWinProb`, `calcCatWinProb`, `bucketCategory`, `overallWinProbClosed`) and an **inlined duplicate** in `src/views/CategoryMatchupsView.vue`. They use the same algorithm (10k Monte-Carlo per-category normal-variance model) but differ in **days-remaining** (the snapshot uses an approximate `daysUntilWeekEnd()`; the view uses exact week dates) — that's the ~34% vs ~44% discrepancy.

**v1 task:** the new Matchup page uses **only** `categoryWinProbability.ts`; delete the inlined duplicate; standardize days-remaining to the **exact week dates** (not the approximation) so the page and the My Team snapshot agree. Use `overallWinProbClosed()` (deterministic) where flicker-free repeated evaluation matters (the move scorer already does).

---

## Section detail + data sources

### 1. Versus header + daily/weekly
- Data: `useThisWeekMatchup` (opponent name/avatar, `winPct`/`tiePct`/`lossPct`, `projWins/Losses/Ties`, `daysRemaining`). Both logos already available (opponent via matchup or standings fallback; mine via league store).
- The **cadence** (`daily` | `weekly`) drives `useYourMove`'s `cadence` input and whether moves foreground `TODAY`. Default from league settings if derivable, else `weekly`; user can toggle.

### 2. Stakes read — see "Stakes engine" below.

### 3. ★ Your Path (stakes-adaptive)
- Base: `src/myteam/matchupPath.ts` (`matchupPath(categories)` → the coin-flip sentence from safe/tossup/loss counts).
- **Extend** it to take the stakes mode and produce the mode-specific path (clinch / maximize / must-win / coast — see modes). The `categories` statuses come from the snapshot (`SnapshotCategory.status`).

### 4. Volume Edge
- Data: `src/services/mlbSchedule.ts` `getWeekSchedule(startDate, endDate)` → `gamesByTeam` + `startsByPitcher`.
- Compute, over the **remaining** days of the week: sum games for the MLB teams of my rostered (started) hitters → "hitter-games left"; count my rostered SPs' probable starts → "starts left." Same for the opponent's roster. Display the comparison + a one-line read ("the volume is on your side — push the counting cats").
- Coarse-but-honest: team-level games, not per-player PA. Good enough for the "who has more bites at the apple" read. If opponent roster isn't available, show just your side.

### 5. Coin-flips + moves
- Statuses: snapshot `categories` (status `tossup` = coin-flip, `safe`, `loss`) + `myWinPct`.
- Moves: `src/composables/useYourMove.ts` → `moves: CandidateAction[]` with `layer: 'today' | 'longTerm'` and a win% lift. For each **tossup** category, surface the highest-lift move that improves it (start/sit, stream, fill-slot, add). `TODAY`-tag `layer === 'today'` moves. If a tossup has no actionable move, show "held / no move available."
- Cap the list to the contested categories (typically 3–7), sorted **closest-to-flip first** (`myWinPct` ascending) so the most-winnable fights are on top.

### 6. Lineup Check
- Data: `useMyRoster` `RosterPlayer.started` (Yahoo) + `useYourMove`'s today-layer "fill an empty slot" candidate (already detects empty active slots for today's games on Yahoo).
- Show: "✓ all slots set today" or "⚠ empty [slot] in today's lineup — fill it (+X%)", plus a lock-time hint if available.
- **Platform scope:** **Yahoo v1.** ESPN rosters don't carry the `started` flag (`useEspnCategoryTeamData` defaults all to started) → on ESPN, **hide the Lineup Check** in v1 (don't show a false "all set"). ESPN support is a fast-follow once the started flag is extracted from the ESPN API.

### 7. Banked / Conceded (+ "worth a swing")
- From snapshot statuses: `safe` → Banked, `loss` → Conceded. In **maximize/must-win** modes, losses whose `myWinPct` is within a flip threshold (e.g. ≥ 35%) move to a **"worth a swing"** tier instead of Conceded.

### 8. Trend (actual + projected)
- **Actual (solid):** daily win% per team. The live per-day computation already exists in `CategoryMatchupsView`'s chart cache (`matchupChartCache` store: `d1[]`, `d2[]`, `labels[]`), recomputed from cumulative daily stats via Monte-Carlo. v1 reuses this live computation (no DB dependency).
- **Projected (dotted):** a new helper `projectFinalStats(currentStats, daysLeft, categories)` extrapolates current pace to end-of-week, then `calcOverallWinProb` gives the **projected finish %**; draw a dotted segment from today's actual point to that finish, for both teams. Dotted strictly means "projected."
- **Asymmetry:** your line bright/solid→dotted; opponent dim. Optional faint lean-fill between lines (cut-first if busy).
- **Move-markers (phase-2):** green dots on the actual segment annotating *your* adds/lineup moves and their win% impact. Requires filtering `getTransactions` to my team + bucketing by day + matching to the win% delta — deferred. v1 ships the two-line actual/projected trend without markers.
- **Persisted history (phase-2):** `matchupSnapshots` (Supabase) exists but isn't auto-captured; v1 uses the live session computation. A daily snapshot job is a later enhancement (enables cross-session history + accurate marker timing).

---

## Stakes engine (the adaptive objective)

The page's objective is not fixed at "win the majority" — it's a **mode** derived from season stakes. The mode re-aims the Path, the fight/concede split, and how aggressively the page tells you to spend resources.

### Modes
- **Clinch (default):** comfortably positioned / normal week. *Win the majority efficiently; conserve FAAB/streamers.* Full Conceded bucket.
- **Maximize / make-up-ground:** chasing a spot where extra category wins matter (seeding/total-cats). *Push beyond the majority; fight the close losses.* Conceded shrinks; "worth a swing" tier appears.
- **Must-win / elimination:** late, on the bubble, a loss likely ends you. *Empty the tank — every lifting move, stream aggressively, no next week to save for.* Almost everything is a fight.
- **Coast / locked-in:** seed clinched or week meaningless. *Save FAAB/streamers for the playoffs; don't burn moves.* Recommendations dial down.

### Detection (conservative, transparent)
- Inputs available (`stores/league.ts` + `useUnifiedLeague`): my **rank**, **record**, **category record**; **`playoffWeekStart`**; league size; **current week** → **weeks remaining = playoffWeekStart − currentWeek**.
- Reliable auto-detect: **clinch** (rank safely inside a reasonable playoff cut with enough cushion / few weeks left), **must-win** (near/below the cut with ≤1–2 weeks left), **coast** (rank locked given weeks left). **Maximize** needs seeding-by-total-cats knowledge we can't parse → **not auto-detected**; reached via override (or a clearly-labeled "you're near the cut — consider Maximize" nudge).
- **Always show the reasoning** ("9th, 2 spots out, 3 weeks left") — never a black-box mode.
- **Manual override** (`auto · clinch · maximize · must-win · coast`) — the safety valve for league nuances (tiebreakers, division rules) we can't infer. Persist the user's choice for the session.

### Architecture boundary (important)
Computing "your season stakes / playoff picture" is **My Team's** job (season position). So the **stakes mode + its reasoning live in a shared season-context composable** (built with the My Team work — `useSeasonStakes` or similar), and the **Matchup page consumes it**. v1 of Matchup may include a **minimal inline stakes detector** (clinch/must-win/coast from rank + weeks-left) so it ships independently; when the My Team season-context engine lands, Matchup switches to consuming it (and gains maximize). The Wire page will consume the same engine ("must-win → spend FAAB freely").

---

## Components & files

- **New:** `src/views/MatchupBattlePlanView.vue` (the page) composed of focused child components: `VersusHeader.vue`, `StakesBanner.vue`, `YourPath.vue`, `VolumeEdge.vue`, `CoinFlips.vue` (rows = category + move + lift), `LineupCheck.vue`, `BankedConceded.vue`, `WinProbTrend.vue`. Keep each small/single-purpose.
- **New pure logic:** `src/myteam/matchupPath.ts` extended for modes (or a sibling `matchupPlan.ts`); `src/myteam/volumeEdge.ts` (games/starts-left from schedule + roster); `src/services/categoryWinProbability.ts` gains `projectFinalStats()` + a projected-finish helper; `src/myteam/seasonStakes.ts` (mode detection from standings/weeks — minimal v1, shared later).
- **Reuse:** `useThisWeekMatchup`, `useYourMove`, `useMyRoster`, `mlbSchedule`, `matchupChartCache`, `categoryWinProbability`.
- **Route:** point the existing Matchup route to the new view; retire `CategoryMatchupsView.vue` (and its inlined engine) from the user path (leave demo/points variants alone).

## Data flow

```
useThisWeekMatchup ──► snapshot (statuses, win/tie/loss%, proj, myStats/oppStats, days)
        │
        ├─► matchupPath(+ stakes mode) ──► ★ Your Path
        ├─► categories(status) ──► Coin-flips / Banked / Conceded buckets
        └─► myStats/oppStats + days ──► categoryWinProbability ──► header win% + trend
useYourMove(snapshot, roster, FAs, cadence) ──► moves ──► the "move that flips" per coin-flip + Lineup Check
mlbSchedule.getWeekSchedule ──► volumeEdge(roster) ──► Volume Edge
seasonStakes(standings, playoffWeekStart, week) ──► mode + reasoning ──► Stakes read (re-aims Path + split)
matchupChartCache (live daily win%) + projectFinalStats ──► Trend (actual solid + projected dotted)
```

## Error handling & edge cases

- **No matchup loaded / bye week / offseason:** show a clean empty state, not a broken plan.
- **ESPN lineup data absent:** hide Lineup Check (don't assert "all set").
- **Schedule fetch fails:** Volume Edge degrades to "schedule unavailable" (don't block the page); `mlbSchedule` already returns empty on error.
- **Opponent roster unavailable:** Volume Edge shows only your side; trend still shows both win% lines (those come from team stat totals, not rosters).
- **Completed week (`daysRemaining <= 0`):** path/moves become a recap ("week's over — you won/lost N cats"); trend is all-solid (no projection).
- **Mode mis-detection:** the visible reasoning + override are the mitigation; default to **clinch** when uncertain (never auto-"must-win" without clear signal).
- **Sleeper:** out of scope (category snapshot path already returns early for Sleeper).

## Testing

Pure logic is unit-tested (Vitest); presentation is build + type-check + manual reload (consistent with the rest of the redesign).
- `matchupPath`/`matchupPlan`: each mode produces the right sentence + fight/concede/swing split for a fixture of statuses (clinch concedes losses; must-win fights them; maximize adds the swing tier). Extend the existing `matchupPath.test.ts`.
- `volumeEdge`: games/starts-left summed correctly from a schedule + roster fixture; opponent-missing degrades.
- `seasonStakes`: rank + weeks-left fixtures map to clinch/must-win/coast; uncertain → clinch.
- `projectFinalStats`: pace extrapolation correct; ratio cats handled.
- Manual reload (Yahoo + ESPN): the eight sections render; daily/weekly toggle changes `TODAY` tags; stakes override re-aims the path; ESPN hides Lineup Check; trend shows solid+dotted both teams.
- `npm run type-check` clean on touched files; `npm run build` succeeds; existing tests green.

## Phasing

- **v1:** versus header + cadence; consolidated win-prob; stakes read (clinch/must-win/coast auto + full override, maximize via override); adaptive path; volume edge; coin-flips+moves; **Yahoo** lineup check; banked/conceded(+swing); actual+projected trend (no markers); cut the data dump.
- **Phase-2:** trend move-markers (transaction filtering); ESPN lineup check (started-flag extraction); maximize auto-detect (when season-context engine knows seeding); persisted daily snapshots (cross-session history).

## Out of scope (deferred / other pages)

- Drop candidates / weak link / season category profile → My Team.
- The full add/drop waiver board → the Wire. (Matchup surfaces only the single add that flips a contested category this week.)
- Trades → Trades.
- Opponent's plan / probable-pitcher expansion / IL alerts → considered, deferred to phase-2.

## Constraints

- All work stays **local** on `redesign/my-team-first`. No push/deploy/PR.
- **`npm run build` does NOT type-check** — the real check is **`npm run type-check`** (`vue-tsc` against `tsconfig.json`; there is no `tsconfig.app.json`). Confirm touched files are absent from the error list (pre-existing unrelated errors exist).
- NO auto-import; a green build won't catch a dangling Vue ref — eyeball templates.
- zsh exclamation issues → write throwaway scripts to `/tmp/`.
