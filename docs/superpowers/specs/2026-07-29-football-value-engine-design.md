# Football Value Engine (Phase 3a) — Design

**Date:** 2026-07-29
**Branch:** `redesign/my-team-first`
**Status:** Design — awaiting user review

## Goal

Make the points-league value engine sport-generic and wire football (Sleeper NFL) projections into the **ESPN** and **Yahoo** points sources, so the redesign's My Team / Matchup / Wire / Trades views compute **football** value from Sleeper projections instead of always computing baseball value from FanGraphs data.

This is **Phase 3a**. A separate **Phase 3b** (net-new Sleeper points source composable) follows — the points views today have no Sleeper source at all (binary `isEspn ? espn : yahoo`), so Sleeper football leagues cannot reach these views until 3b. 3a is provable end-to-end on an **ESPN football** league; the Yahoo football branch is built code-complete this phase but is **unverifiable until Yahoo API access returns** ([[yahoo-fantasy-api-access]]).

## Scope decisions (locked)

- **Value basis:** per-week average (rest-of-season points ÷ weeks left). The ranking currency for football in My Team / Trades / Wire.
- **Platforms:** ESPN + Yahoo roster sources this phase (Yahoo built-but-unverified). Sleeper source = Phase 3b.
- **Positions:** skill positions QB/RB/WR/TE only. K/DEF stay unvalued in v1 (the Phase-1 projection feed skips them).
- **Football scoring weights (v1 simplification):** ESPN and Yahoo football leagues use `football.ts` `pointsConfig.defaults`, matching the Phase-1 precedent. Reading each league's custom football scoring settings is a later refinement, not this phase.
- **Category engine untouched:** `FGProjection` shape is **not** changed (the category z-score engine shares it). The new value type lives alongside it.

## Non-goals

- Sleeper points source composable (Phase 3b).
- Weekly start/sit first tab and sport-gating "Today" out of nav for football (Phase 4).
- Custom ESPN/Yahoo football scoring-settings parsing.
- K/DEF projection + value.

## Architecture

Approach A — **normalized value provider**. All sport-specific projection logic lives at the data-source edge; everything downstream consumes one normalized value shape and is sport-agnostic. The absence of a baseball-only field (`side`) is the football signal — there are **no `if (football)` branches downstream**.

### §1 — Normalized value interface

New file `src/myteam/playerValue.ts`. `PlayerValue` carries the **raw rest-of-season ingredients** every engine needs — not a pre-resolved basis — because different engines consume different bases *simultaneously* (matchup needs season-total AND per-game; tiers need total while lineup value can switch to per-week). Basis math stays downstream, but sourced entirely from `PlayerValue` (no raw `FGProjection`), which is what makes the engines sport-agnostic.

```ts
import type { PointsSide } from '@/myteam/pointsValue'  // 'hit' | 'pit'

export interface PlayerValue {
  total: number                    // projected rest-of-season fantasy points
  games: number                    // projected games (→ perGame = total / games)
  perStat: Record<string, number>  // unified stat key → points contributed (audit panel)
  side?: PointsSide                // baseball 'hit'|'pit'; undefined ⇒ football (no side split)
  weeklyCap: number                // games-per-week ceiling for weeklyRate (baseball role-based; football set high so it never binds)
}
export type ValueByKey = Record<string, PlayerValue>
```

`PlayerValue` is what `projectPlayerPoints` already produces (`total`/`perStat`/`side`/`games`) **plus** a precomputed `weeklyCap` and an optional `side`. `FGProjection` is untouched. `weeklyCap` folds the one thing `weeklyRate` currently reads off raw `fg` (the pitcher starter-vs-reliever flag: `6.5` hitters, `1.3` starters, `3.5` relievers) into the value object, so `weeklyRate` no longer needs `fg`.

### §2 — Edge builders + `weeklyRate` on `PlayerValue`

Two builders emit `ValueByKey`; the shared `weeklyRate` helper is refactored to read a `PlayerValue` instead of `(PlayerPoints, fg)`:

```ts
export function weeklyRate(v: PlayerValue, weeksLeft: number): number {
  if (v.games <= 0 || v.total === 0) return 0
  const wl = Math.max(1, weeksLeft)
  return (v.total / v.games) * Math.min(v.games / wl, v.weeklyCap)
}
```

- `buildBaseballValue(fgByKey, weights): ValueByKey` — per key: `projectPlayerPoints(fg, weights)` → `PlayerValue` with `weeklyCap` computed from the same `gs/gp` starter logic `weeklyRate` uses today. Numbers **identical** to today's baseball path (no-regression tests enforce this). No basis/`weeksLeft` arg — basis stays in the engines.
- `buildFootballValue(projByKey: Record<string, FootballProjection>, weeksLeft): ValueByKey` — per key: `total = points` (ROS), `games = max(1, weeksLeft)` (each NFL player plays ~once/week, so `perGame = total/games` **is** the per-week average — the chosen football currency), `perStat` from `stats`, `side = undefined`, `weeklyCap = 999` (never binds; ranking by `.total` is order-identical to per-week since `weeksLeft` is uniform across NFL players).

### §3 — Downstream swap + neutralized baseball concepts

The consumers swap their `fgByKey: Record<string, FGProjection | null>` + `weights` params for a single `valueByKey: ValueByKey`, and read `valueByKey[key]` where they used to call `projectPlayerPoints(fgByKey[key], weights)`:

`buildPointsTeam`, `buildPointsMatchup`, `buildPointsWire`, `buildPointsTrades`, `buildPointsTradeLandscape`, `buildPointsPositional`, `today/pointsRosValue`, `today/pointsDailyValue`, and the `?ptsaudit` panel in `PointsMyTeamView.vue`.

`buildPointsTeam` keeps its `opts: { basis; weeksLeft }` and calls the new `weeklyRate(valueByKey[key], weeksLeft)` for the `perWeek` branch (no more raw `fg`). All other engines are pure `.total` / `perGame` consumers and drop `weights` entirely.

Baseball-only reads become optional-guarded on `side`:
- `side === undefined` ⇒ one combined ranking group instead of the batter/pitcher (`['hit','pit']`) split.
- No `side` ⇒ no SB/SV/HLD/QS specialist chips.
- No `side` ⇒ generic slot ordering (players flow through the non-pitcher path; `PITCHER_SLOTS` set is empty for football rosters anyway).

There are no `if (football)` branches — absence of `side` is the only signal.

`pointsWire`'s separate `matchFG` free-agent entry point (`buildPointsWire(freeAgents, matchFG, …)`) is refactored to take a `valueOf: (fa) => PlayerValue | null` resolver so football free agents score through the same `buildFootballValue` path. The two `today/` helpers (`pointsRosValue`, `pointsDailyValue`) get the same `valueOf`-resolver treatment.

**Matchup schedule coupling (scope boundary):** `buildPointsMatchup` derives its *weekly* figures from an MLB schedule (`schedule.gamesByTeam`, two-start pitchers, reliever appearances). Its value sourcing becomes sport-generic in this phase (reads `valueByKey`, guards `side`), so it compiles and works unchanged for baseball, and for football renders **season-total lineup strength** (`startingPoints`) without crashing. Football's true NFL-schedule-driven weekly matchup — one game per team, no two-start logic — lands in **Phase 4** alongside the weekly start/sit tab and the NFL schedule feed. This phase does not build an NFL schedule.

### §4 — Sport dispatch in the ESPN and Yahoo sources

Both `useEspnPointsTeamData` and `useYahooLeaguePool` gain a football branch and expose a new `valueByKey` ref **alongside** the existing `fgByKey` (kept for the category engine and other consumers; the points views switch to `valueByKey`):

- **Baseball branch (unchanged behavior):** build `fgByKey` as today via `buildPlayerMatchers()` + `matchFG`, then `valueByKey = buildBaseballValue(fgByKey, weights)`. Weights come from `useLeagueScoring()`, which each view already loads; the composables read the same scoring so the value is built once at the source. (`weeklyRate`'s `weeksLeft` is applied later, in the engines, exactly as today.)
- **Football branch:** roster players (name + position + proTeam) → Sleeper NFL projections via the Phase-1 `buildFootballProjectionsByKey` name+position match → `valueByKey = buildFootballValue(projByKey, weeksLeft)`, keyed by the platform's own `playerKey`. `weeksLeft` from `usePowerTrajectory()` (the existing `end_week − current_week + 1`).
- Sport is chosen from `leagueStore.activeSport === 'football'`.
- Football scoring = `football.ts` defaults (v1); a `defaultWeights('football')` overload in `pointsScoring.ts` returns `footballConfig.pointsConfig.defaults`.

Views: the `fgByKey` computed feeding the points engines becomes a `valueByKey` computed (`isEspn ? espn.valueByKey : yahoo.valueByKey`); `buildPointsTeam` etc. receive `valueByKey`; the audit panel reads `valueByKey[key].perStat`. **Football per-week display:** the views already surface `perGame` (`total/games`); for football `games = weeksLeft`, so `perGame` **is** the per-week average — the headline number for football skill players.

### §5 — Data flow

```
activeSport === 'football'
  ├─ ESPN roster ─┐
  ├─ Yahoo roster ┼─ name+position ─→ buildFootballProjectionsByKey ─→ Record<key, FootballProjection>
  │  (Sleeper NFL projections, Phase 1)                                      │
  │                                                                          ▼
  │                                                          buildFootballValue({ weeksLeft })
  │                                                                          │
activeSport === 'baseball'                                                   ▼
  ├─ ESPN/Yahoo roster ─→ matchFG ─→ fgByKey ─→ buildBaseballValue ──→   ValueByKey
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────► every points engine
                                                                        (ranks by .total; guards on .side)
```

## Error handling

- Missing projection for a player ⇒ absent from `valueByKey`; engines that index `valueByKey[key]` must treat a missing entry as a zero-value player (`total: 0, games: 0, perStat: {}, side: undefined, weeklyCap: 0`) so a projection-less player scores 0 rather than throwing — matching today's `projectPlayerPoints(null, …)` behavior.
- `weeksLeft <= 0` ⇒ clamp to 1 (avoid divide-by-zero in `weeklyRate` and in football `games = max(1, weeksLeft)`).
- Yahoo football branch runs but returns empty while Yahoo API access is revoked; the existing outage banner already covers the user-facing state.

## Testing

- **New unit tests:** `buildFootballValue` (per-week math; `side`/`games` undefined; `weeksLeft` clamp); ESPN and Yahoo football source name-match (roster name → Sleeper projection → value).
- **No-regression (critical):** every existing baseball points engine test stays green after the `fgByKey`→`valueByKey` swap. `buildBaseballValue` must reproduce today's numbers exactly.
- **Football-shaped engine tests:** each swapped engine gets one test on the undefined-`side` path (no specialist chips, generic slot ordering, ranks by `.total`).
- **Smoke:** real ESPN football league renders My Team / Matchup / Wire / Trades with per-week football value. Yahoo football deferred to when API access returns.

## Files

- **Create:** `src/myteam/playerValue.ts` (`PlayerValue`/`ValueByKey` + `buildBaseballValue` + `buildFootballValue` + the new `weeklyRate(v, weeksLeft)`), `src/myteam/__tests__/playerValue.test.ts`.
- **Modify (value math):** `pointsValue.ts` — move `weeklyRate` out (or re-export from `playerValue.ts`); `projectPlayerPoints` keeps producing `PlayerPoints` (baseball edge builder consumes it and adds `weeklyCap`/`side`).
- **Modify (downstream swap — `fgByKey`+`weights` → `valueByKey`):** `pointsTeam.ts`, `pointsMatchup.ts`, `pointsWire.ts` (incl. `matchFG`→`valueOf` resolver), `pointsTrades.ts`, `pointsTradeLandscape.ts`, `league/pointsPositional.ts`, `today/pointsRosValue.ts`, `today/pointsDailyValue.ts`, and their tests.
- **Modify (other `buildPointsTeam` callers — must migrate to `valueByKey` in the same swap):** `useSeasonOutlook.ts`, `useToday.ts`, `PowerRankingsRedesignView.vue`, `LeagueView.vue` (these pass `fgByKey`+`weights` today; the ripple is unavoidable but mechanical — each already has a `valueByKey` available from its source composable). These views are **baseball-behavior-preserving only** — no football wiring in this phase, just the signature migration.
- **Modify (scoring):** `pointsScoring.ts` — `defaultWeights(sport = 'baseball')` returns `footballConfig.pointsConfig.defaults` for football.
- **Modify (sources):** `useEspnPointsTeamData.ts`, `useYahooLeaguePool.ts` — add `valueByKey` ref + football branch.
- **Modify (points views):** `PointsMyTeamView.vue`, `PointsMatchupView.vue`, `PointsWireView.vue`, `PointsTradesView.vue` — feed `valueByKey`; football per-week display via `perGame`.

**Build-green strategy:** because `buildPointsTeam` (and the other engines) have callers beyond the 4 points views, each engine's signature swap must land **together with all its call sites** in the same task, so `npm run build` stays green after every task. Task order below is arranged accordingly.
