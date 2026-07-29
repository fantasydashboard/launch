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

New file `src/myteam/playerValue.ts`:

```ts
export interface PlayerValue {
  total: number                    // ranking number, already resolved to the view's basis
  perStat: Record<string, number>  // unified stat key → points contributed (audit panel)
  side?: 'batter' | 'pitcher'      // baseball only; undefined ⇒ football
  games?: number                   // projected games remaining (baseball detail)
}
export type ValueByKey = Record<string, PlayerValue>
```

`PlayerValue` generalizes the existing `PlayerPoints` (`side`/`games` become optional). `FGProjection` is untouched.

### §2 — Edge builders (basis resolved at the edge)

Two builders, both emitting `ValueByKey`. **Basis (total vs per-week) is resolved here**, so no downstream engine does basis math — it ranks by `.total`.

- `buildBaseballValue(fgByKey, weights, opts: { basis: 'total' | 'perWeek'; weeksLeft: number }): ValueByKey`
  Wraps the existing `projectPlayerPoints` and the current per-week / pitcher-cadence logic (`weeklyRate`), emitting `PlayerValue` with `side` and `games` populated. Must produce numbers **identical** to today's baseball path (no-regression tests enforce this).

- `buildFootballValue(projByKey: Record<string, FootballProjection>, opts: { weeksLeft: number }): ValueByKey`
  From `FootballProjection { stats, points }`: `total = points / max(1, weeksLeft)` (per-week); `perStat` derived from `stats`; `side` and `games` undefined.

### §3 — Downstream swap + neutralized baseball concepts

The ~9 consumers swap their `fgByKey: Record<string, FGProjection | null>` (+ `weights`, + basis args where present) for a single `valueByKey: ValueByKey`:

`buildPointsTeam`, `buildPointsMatchup`, `buildPointsWire`, `buildPointsTrades`, `buildPointsTradeLandscape`, `pointsPositional`, `today/pointsRosValue`, `today/pointsDailyValue`, and the `?ptsaudit` panel in `PointsMyTeamView.vue`.

Baseball-only reads become optional-guarded on `side`:
- `side === undefined` ⇒ skip the batter/pitcher split.
- No `side` ⇒ no SB/SV/HLD specialist chips (`SPECIALIST_STATS`).
- No `side` ⇒ generic slot ordering (skip `PITCHER_SLOTS` special-casing).

`weeklyRate(pp, fg, weeksLeft)` stays a **baseball-internal** helper called only from `buildBaseballValue` (which has `fg` in scope). It is no longer called by any downstream engine — per-week is already baked into `.total` at the edge, so downstream engines never touch raw `fg` or basis math again.

`pointsWire`'s separate `matchFG` free-agent entry point (`buildPointsWire(freeAgents, matchFG, …)`) gets a parallel value-producing signature so football free agents score through the same `buildFootballValue` path.

### §4 — Sport dispatch in the ESPN and Yahoo sources

Both `useEspnPointsTeamData` and `useYahooLeaguePool` gain a football branch and expose `valueByKey` (replacing `fgByKey`):

- **Baseball branch (unchanged behavior):** build `fgByKey` as today via `buildPlayerMatchers()` + `matchFG`, then `buildBaseballValue(fgByKey, weights, { basis, weeksLeft })`.
- **Football branch:** roster players (name + position + proTeam) → Sleeper NFL projections via the Phase-1 `buildFootballProjectionsByKey` name+position match → `buildFootballValue(projByKey, { weeksLeft })`, keyed by the platform's own `playerKey`.
- Sport is chosen from `leagueStore.activeSport === 'football'`.
- Football scoring = `football.ts` defaults (v1).

Views: the `fgByKey` computed becomes a `valueByKey` computed (`isEspn ? espn.valueByKey : yahoo.valueByKey`); `buildPointsTeam` etc. receive `valueByKey`; the audit panel reads `value.perStat`.

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

- Missing projection for a player ⇒ omitted from `valueByKey` (already how unmatched players behave; downstream treats a missing key as "no projection", same as today's `!fgByKey[key]`).
- `weeksLeft <= 0` ⇒ clamp to 1 (avoid divide-by-zero in per-week).
- Yahoo football branch runs but returns empty while Yahoo API access is revoked; the existing outage banner already covers the user-facing state.

## Testing

- **New unit tests:** `buildFootballValue` (per-week math; `side`/`games` undefined; `weeksLeft` clamp); ESPN and Yahoo football source name-match (roster name → Sleeper projection → value).
- **No-regression (critical):** every existing baseball points engine test stays green after the `fgByKey`→`valueByKey` swap. `buildBaseballValue` must reproduce today's numbers exactly.
- **Football-shaped engine tests:** each swapped engine gets one test on the undefined-`side` path (no specialist chips, generic slot ordering, ranks by `.total`).
- **Smoke:** real ESPN football league renders My Team / Matchup / Wire / Trades with per-week football value. Yahoo football deferred to when API access returns.

## Files

- **Create:** `src/myteam/playerValue.ts` (interface + `buildBaseballValue` + `buildFootballValue`), `src/myteam/__tests__/playerValue.test.ts`.
- **Modify (downstream swap):** `pointsTeam.ts`, `pointsMatchup.ts`, `pointsWire.ts`, `pointsTrades.ts`, `pointsTradeLandscape.ts`, `league/pointsPositional.ts`, `today/pointsRosValue.ts`, `today/pointsDailyValue.ts`, and their tests.
- **Modify (sources):** `useEspnPointsTeamData.ts`, `useYahooLeaguePool.ts`.
- **Modify (views):** `PointsMyTeamView.vue`, `PointsMatchupView.vue`, `PointsWireView.vue`, `PointsTradesView.vue`.
- **Touch (value math):** `pointsValue.ts` (generalize `PlayerPoints`→`PlayerValue`, drop raw-`fg` from `weeklyRate`).
