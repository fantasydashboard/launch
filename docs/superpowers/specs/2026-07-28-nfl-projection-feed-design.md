# NFL Projection Feed (Football Foundation, Phase 1) — Design

**Goal:** Give the value-model spine real football data — a per-player **projected rest-of-season fantasy points + raw stat projections** map, keyed to the active league's players — sourced from Sleeper's free NFL projections. This is the football analog of the FanGraphs MLB projection source (`fgByKey` + `computePointsFromFG`).

**Status:** Approved design. v1 = **skill positions QB/RB/WR/TE**. Sleeper NFL projections as the source. Local-only per the standing no-deploy rule.

---

## Scope

**In scope (this spec):**
- `getNflState()` on the Sleeper service (current week for the rest-of-season range).
- `src/services/footballProjections.ts` — fetch + sum Sleeper NFL weekly projections into per-player raw stats.
- `src/composables/useFootballProjections.ts` — build `Record<playerKey, FootballProjection>` for the active league (keying + points).
- Unit tests for the pure summing + name-match normalization.

**Out of scope (later specs):**
- **Threading football positions** through the roster-slot / eligibility layer (`rosterSlots.ts`, `lineupEligibility.ts`, etc.) — the immediate NEXT phase.
- **Refactoring the points value model / views** (`pointsValue`, `pointsScoring`, `pointsTeam`, the Points views) to consume this feed and drive off `getSportConfig`.
- **K / DEF / IDP** projections (skill positions only in v1).
- **Real ESPN/Yahoo scoring mapping** — v1 uses `football.ts` default scoring for ESPN/Yahoo; Sleeper uses its own exact `scoring_settings`.

## Background

The MLB value model consumes `fgByKey: Record<playerKey, FGProjection | null>` (FanGraphs projections from a Supabase table) plus `computePointsFromFG(fg, scoring)` / `mapToEspnStats`. Every value surface (My Team, Matchup, Wire, Trades, Power Rankings) reads that map. Football has **no projection source at all** — this spec supplies one.

Two facts make this clean:
- **Sleeper NFL projections** are free and already fetchable: `sleeperService.getAllWeekProjections(season, week, seasonType)` → `Record<sleeperPlayerId, Record<statId, number>>` for one week, keyed by Sleeper player_id, using stat ids like `pass_yd`, `pass_td`, `rush_yd`, `rush_td`, `rec`, `rec_yd`, `rec_td`.
- Those stat ids **already match `src/config/sports/football.ts`**, and `calculatePoints('football', stats, scoring)` (`config/sports/index.ts:163`) already does the scoring dot-product (`{...pointsConfig.defaults, ...scoring}` over `pointsConfig.statKeys`). So the points math is reused, not rebuilt.

## Architecture

### 1. `sleeperService.getNflState()` (new, small)
Fetch `https://api.sleeper.app/v1/state/nfl` → `{ week: number; season: string; season_type: string }`. Cached briefly. Used to determine the rest-of-season week range. Any failure returns a safe default (`{ week: 1, season: <current year>, season_type: 'regular' }`) so preseason/off-season degrades to a full-season projection.

### 2. `src/services/footballProjections.ts` (new)

```ts
export interface FootballProjection {
  stats: Record<string, number>  // summed raw projected stats (pass_yd, rush_td, rec, …)
  points: number                 // projected fantasy points under the supplied scoring
}

/**
 * Sum Sleeper NFL weekly projections across [startWeek..endWeek] into per-player raw
 * projected stats. Returns Record<sleeperPlayerId, Record<statId, number>>. A missing/
 * failed week contributes nothing (no throw). Only QB/RB/WR/TE are requested (v1).
 */
export async function fetchSeasonProjectionStats(
  season: string,
  startWeek: number,
  endWeek: number,
): Promise<Record<string, Record<string, number>>>
```

- Loops `sleeperService.getAllWeekProjections(season, w)` for `w` in `[startWeek..endWeek]`; for each player, adds each numeric stat into the running per-player sum. Non-numeric / missing → skip (0). Cached by `(season, startWeek, endWeek)`.
- Rest-of-season range: `startWeek = max(1, nflState.week)`, `endWeek = 18`. Preseason (`week <= 1`) → weeks `1..18` (full season).

### 3. `src/composables/useFootballProjections.ts` (new)

Produces the football `fgByKey` analog: `Record<playerKey, FootballProjection>` for the active league.

- **Inputs:** active league's players (roster + pool, from the existing platform feeds), the league's scoring settings, `activeSport === 'football'`, `activePlatform`.
- **Week range:** from `getNflState()` (per unit 1).
- **Raw stats:** `fetchSeasonProjectionStats(season, startWeek, endWeek)` → keyed by Sleeper player_id.
- **Scoring source:** Sleeper league → the league's own `scoring_settings` (exact, same vocab). ESPN/Yahoo → `getSportConfig('football').pointsConfig.defaults` (v1 fallback; real per-platform mapping deferred).
- **Points:** `calculatePoints('football', summedStats, scoring)` per player.
- **Keying / matching:**
  - **Sleeper league:** roster/pool players are already Sleeper `player_id`s → direct lookup into the summed-stats map.
  - **ESPN / Yahoo:** no Sleeper id on the player. Match via a normalized **name + position** key against Sleeper's `/players/nfl` map (id → `{full_name, position, team}`), mirroring the MLB `buildPlayerMatchers` pattern (normalize: lowercase, strip punctuation/suffixes). Ambiguous/no match → no projection for that player.
- **Output:** `Record<playerKey, FootballProjection>` where `playerKey` is the platform's player key used everywhere else. Unmatched players are absent (consumers treat absent as 0, exactly like MLB unmatched).

## Data flow

```
getNflState() → [startWeek..endWeek]
  → fetchSeasonProjectionStats (sum Sleeper weekly proj)   → Record<sleeperId, rawStats>
  → key to league players (Sleeper id  |  ESPN/Yahoo name+pos match)
  → calculatePoints('football', rawStats, leagueScoring)   → points
  → Record<playerKey, { stats, points }>   (the football fgByKey; consumed by the value model in a later phase)
```

## Error handling

- Any single week's fetch failing → that week contributes nothing; the sum proceeds (no throw, partial is fine).
- `getNflState()` failure → full-season default range.
- A player with no matched projection → absent from the map → 0 downstream (same contract as MLB unmatched).
- `fetchSeasonProjectionStats` and the summing never produce NaN (missing stat → skip).

## Testing

- **Unit (`footballProjections.test.ts`):** multi-week summing (two mock weeks sum per stat; a missing/empty week is skipped; a non-numeric value is ignored → no NaN); empty input → `{}`.
- **Unit (name-match normalization):** the ESPN/Yahoo name+position matcher normalizes correctly (case, punctuation, `Jr./Sr./II/III`) and only matches same-position players.
- **Points math:** already covered by `calculatePoints` — not re-tested here.
- **Smoke:** run on a real **Sleeper** football league (2025 season for now) → projected points look sane (top QBs/RBs/WRs rank plausibly). ESPN too via name-match; Yahoo when API access returns.

## Non-goals / YAGNI

- No K/DEF/IDP projections (skill positions only).
- No new points-math (reuse `calculatePoints`).
- No changes to the value model, views, or roster-slot layer (separate phases).
- No ETL / Supabase table for football projections — fetched live from Sleeper (free, public), cached in-memory like other Sleeper calls.
