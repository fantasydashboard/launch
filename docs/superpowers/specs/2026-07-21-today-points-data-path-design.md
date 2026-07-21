# Today Points-League Data Path — Design

**Date:** 2026-07-21
**Branch:** redesign/my-team-first (local only — no push/prod until real-user testing)
**Status:** approved design, ready for implementation plan
**Builds on:** `2026-07-20-today-complete-moves-design.md` (the category complete-move engine this reuses)

## Goal

Light up the Today board on **points leagues (both Yahoo and ESPN)** so the already-built complete-move engine — safe `add X · drop Y`, "no clean drop", the droppable-today logic and wire-replacement bar — runs on them. Today is structurally empty on points leagues right now because `useToday` never loads a roster/free-agent source for them; this wires one in and feeds the drop logic a points-native value.

## Motivation

Real-league observation: on a Yahoo points league, Today shows "You're set for today — lineup's optimal" even when an obvious add/drop (e.g. add Reynaldo Lopez, drop Spencer Miles) is available. Cause: the board has no data for points leagues. Since most of the user's leagues are points, this is the highest-value unlock — it turns the finished category engine into a cheat code across the leagues actually played.

## Scope

**In:** Yahoo points + ESPN points Today boards — roster/FA data source, points-native drop valuation, points display (raw projected points). Category leagues untouched.

**Out (deferred):** constraint engine (adds-remaining / IP floor-ceiling / games caps), board reorganization. (Same deferrals as the category spec.)

## Key design decisions (user-approved)

1. **Both platforms in one release** (not Yahoo-first).
2. **Drop value currency = projected rest-of-season points** (`projectPlayerPoints(fg, weights).total`), because the category value model needs categories that points leagues lack. The safe-drop selector and replacement bar are currency-agnostic, so they run unchanged on this number.
3. **Display raw projected points, not a 0–100 normalized score.** Points *are* the currency — directly meaningful and legitimately comparable across bats and arms — so a pitcher's start outscoring a hitter-game is correct. No cat chips (points has no categories). This diverges intentionally from category leagues, which keep their 0–100 + chips.

## Architecture

All changes are in `useToday.ts` plus small view formatting; the pure move logic (`safeDrop.ts`, `normalizeValue.ts`) is reused, and one small new pure helper (`pointsRosValue`) is added for testability.

### Data sources — routing + triggering

Add `isEspnPointsLeague = computed(() => activePlatform==='espn' && espnPoints.supported.value === true)` where `espnPoints = useEspnPointsTeamData()`. Extend the `rosterPlayers` / `rawFreeAgents` routing to three branches:

- ESPN category → `espn.rosterPlayers` / `espn.freeAgents` *(existing)*
- **ESPN points → `espnPoints.rosterPlayers` / `espnPoints.freeAgents`** *(new)*
- else (Yahoo, category or points) → `yahooRosterPlayers` / `yahooFreeAgentsRaw` *(existing generic Yahoo loaders)*

Triggering (the actual "was empty" fix):
- **Yahoo:** generalize the Yahoo roster/FA trigger so it fires for **any** Yahoo league, not only category — i.e. the `yahooRosterReady` gate (my-team key present) drops its `isYahooCategoryLeague` requirement, and `maybeLoadYahoo` loads for any Yahoo league. `useMyRoster`/`useAvailablePlayers` are already platform-generic Yahoo loaders; they simply weren't being called for points.
- **ESPN:** call `espnPoints.load()` wherever `espn.load()` is called (the ESPN branch of `maybeLoadEspn` and the activeLeague/platform watch). `useEspnPointsTeamData.load()` self-bails (`supported=false`) on non-points ESPN leagues, mirroring the category loader.

### Drop valuation — points currency

New pure helper `src/today/pointsRosValue.ts`:
```
pointsRosValue(
  players: { playerKey: string; name: string; team?: string }[],
  matchFG: (p: { full_name?: string; mlb_team?: string }) => FGProjection | null,
  weights: Record<string, number>,
): Map<string, number>   // playerKey -> projected ROS points (projectPlayerPoints(fg, weights).total)
```
Skips players with no MLB team or no FG match (they carry no value; excluded, mirroring `pointsDailyValue`).

In `useToday`:
- `pointsValueByKey = computed(() => pointsRosValue([...roster, ...freeAgents], matchFGRef.value, scoring.weights.value))` (empty until the matcher + weights are ready — gated below).
- `rosValueByKey = computed(() => isPointsLeague.value ? pointsValueByKey.value : roleValueByKey.value)`.
- `droppableToday` and `replacementBySide` read `rosValueByKey` (instead of `roleValueByKey` directly). Everything else about the safe drop is unchanged.

### Display — raw points

The number a play displays and the bar's fill are on different scales for points, so `ScoredPlay` gains a dedicated bar field. Two fields drive the view: **`score`** (the number shown) and a new **`barPct: number`** (0–100, drives the bar). The view renders the number as `score` and the bar as `bar(round(barPct/100*6))`.

- **Category (unchanged behavior):** `score` = 0–100 percentile (from `normalizeMoves`); `barPct = score`. Chips from `helpsCats`. No `pts` suffix.
- **Points:** `normalizeMoves` is **skipped**. `score` = the play's **raw per-game projected points for today** (the existing `pointsDailyValue`-derived `value`), so the board (which sorts by `score`) sorts by real points and a pitcher's start correctly tops a hitter-game. `barPct = round(value / dayMaxValue * 100)` where `dayMaxValue` is the max `value` across **all** of today's plays (both sides) — so the single best move fills the bar and the rest scale under it, cross-type. `helpsCats` is empty → the chip `v-for` renders nothing (no view branch needed).
- The view receives an `isPoints` flag from `useToday` to render the `pts` suffix on the number (points only). The bar is uniform (`barPct`) across league types, so it needs no flag.

### Loading gate

`boardInputsReady` gains points branches:
- ESPN points → `espnPoints.loaded.value`
- Yahoo points → `yahooRosterLoaded.value && yahooFaLoaded.value`

`dataReady` already ANDs `pointsScoringReady` (`matchFgSettled && scoring.ready`), so the board holds the loading state until the points values (matcher + weights) are computable — no drop-less or empty flash.

## Data flow (points league)

```
schedule + roster + FA  (loaded; gated by boardInputsReady + pointsScoringReady)
   │
   ├─ pointsRosValue(roster+FA, matchFG, weights) ──► pointsValueByKey ──► rosValueByKey
   │        droppableToday + replacementBySide (points currency) ─┐
   │                                                              ▼
   ├─ dailyCandidates ─► scoreCandidate (baseValue = pointsDailyValue) ─► value (raw per-game pts)
   │                                                              │
   │                              (no normalizeMoves on points)   │
   │                                          attachDrops ────────┤ → drop / noCleanDrop
   │                                                              ▼
   └──────────────────────────────────────► buildTodayBoard (sort by raw points)
                                                              ▼
                                                       TodayView (pts suffix, pool-max bar)
```

## Error handling / degradation

- Matcher or weights not ready → `pointsValueByKey` empty and the board is held in the loading state (gated) — never renders drop-less.
- A rostered/FA player with no FG match or no MLB team → skipped by `pointsRosValue` (no value); the `v == null` guards in `droppableToday`/`replacementBySide` already handle a missing key.
- Empty wire on a side → replacement `-Infinity` → no clean drop (same conservative behavior as category).
- Never throws — a lookup miss yields no drop for that move, not a broken board.

## Testing

- `src/today/__tests__/pointsRosValue.test.ts`: projects ROS points from a stub matcher × weights; skips no-team / unmatched players; returns a keyed map.
- Existing `safeDrop`/`normalizeValue`/`todayBoard` tests already cover the currency-agnostic core (the points value is just a different number fed into the same `pickSafeDrop`).
- Full `npm test` + `npm run build` clean.
- **Smoke (user):** on the Yahoo points league (and an ESPN points league), Today now shows complete `add X · drop Y (reason)` moves with `≈N pts` figures; the obvious add/drop (Lopez-for-Miles) surfaces; no "you're set" flash while loading; category leagues unchanged.

## Self-review notes

- **Reuse:** the entire safe-drop + board + view machinery is reused; the only new pure code is `pointsRosValue` (tested). The composable adds routing, one value switch, and points display handling.
- **Isolation:** `pointsRosValue` is pure and independently tested; the currency switch (`rosValueByKey`) keeps the drop logic ignorant of league type.
- **Consistency:** category behavior is byte-unchanged — every points branch is additive (`isPointsLeague`/`isEspnPointsLeague` guards).
- **YAGNI:** no constraint engine, no board reorg — deferred.
- **The thing to watch in smoke:** points bar scaling (pool-max, cross-type) and the `pts`-suffix formatting reading cleanly on real data.
