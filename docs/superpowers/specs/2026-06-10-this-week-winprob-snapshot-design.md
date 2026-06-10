# This-Week Win-Probability Snapshot — Design

**Date:** 2026-06-10
**Branch:** `redesign/my-team-first` (local only; do not push/deploy)
**Status:** Approved in concept, ready for spec review

## Goal

Add a compact "this week" band to the top of My Team that turns it from a season-shape view into a *this-week decision surface*: who you're playing, your probability of winning the matchup, your projected category record, and — the actionable part — which categories are **safe wins / coin-flips / likely losses** this week. Cross-platform (Yahoo + ESPN category leagues). Reuses the mature Monte Carlo engine that already lives in the Matchups view.

## Why

The page currently answers "what is my team's season shape." It does not answer the question a manager opens the app for mid-week: "am I winning this week, and which categories should I push?" The coin-flip categories are the decision content — they tell the manager where a waiver add or a start/sit actually swings the matchup.

## Key facts (verified)

- The engine exists as pure functions inside `src/views/CategoryMatchupsView.vue`:
  - `calcOverallWinProb(team1Stats, team2Stats, categoryIds, days)` → `{ team1, team2, avgT1Cats, avgT2Cats }` (10k Monte Carlo; win % 0-100 + expected category wins).
  - `calcCatWinProb(v1, v2, statId, days)` → `{ team1, team2 }` (per-category win %; 1k mini-sims).
  - Helpers `randomNormal(mean, std)`, `clampWinProb(prob, isCompleted)`.
  - `STAT_VOLATILITY` tables keyed by Yahoo and ESPN stat ids (per-stat daily std dev, scaled by √days).
  - Inverse-stat sets `INVERSE_STATS` / `ESPN_INVERSE_STATS` (file-level).
- Inputs are platform-agnostic: `Record<statId, number>` week-to-date totals for both teams + days remaining. Only the volatility/inverse tables and the data fetch differ by platform.
- This-week matchup data:
  - Yahoo: `yahooService.getCategoryMatchups(leagueKey, week)` → `{ teams: [{ team_key, name, logo_url, is_my_team, stats: Record<statId, number> }, ...], stat_winners }[]`. Current week: `leagueStore.currentLeague?.current_week`.
  - ESPN: `espnService.getMatchups(sport, leagueId, season, week)` → entries with `homeTeamId/awayTeamId`, `homeScoreByStat/awayScoreByStat` (`Record<statId, { score }>`, week-to-date). Current week: `leagueStore.currentLeague?.status?.currentMatchupPeriod`. Extended-week detection: `getMatchupDates(weekNum)`.
- No rest-of-week player projections exist; the engine projects from week-to-date totals + volatility only (no two-start-pitcher awareness). The snapshot copy must reflect this.

## Architecture

### Component 1: pure engine module — `src/services/categoryWinProbability.ts`
Extract (copy) the engine so it is callable outside the Matchups view:
```typescript
export interface OverallWinProb { team1: number; team2: number; avgT1Cats: number; avgT2Cats: number }
export const STAT_VOLATILITY: { yahoo: Record<string, number>; espn: Record<string, number> }
export function randomNormal(mean: number, std: number): number
export function clampWinProb(prob: number, isCompleted: boolean): number
export function calcCatWinProb(v1: number, v2: number, statId: string, days: number, platform: 'yahoo' | 'espn'): { team1: number; team2: number }
export function calcOverallWinProb(t1: Record<string, number>, t2: Record<string, number>, catIds: string[], days: number, platform: 'yahoo' | 'espn'): OverallWinProb
```
Copied verbatim from `CategoryMatchupsView.vue` (lines ~1152-1276), with the volatility/inverse tables lifted to module constants and a `platform` arg replacing the inline `isEspn` branch. `CategoryMatchupsView.vue` is **left untouched** this slice (a later DRY pass can refactor it to import this module); note the temporary duplication.

### Component 2: bucketing — part of the engine module (pure)
```typescript
export type CatStatus = 'safe' | 'tossup' | 'loss'
export function bucketCategory(myWinPct: number): CatStatus // >=70 safe, <=30 loss, else tossup
```

### Component 3: `useThisWeekMatchup` composable — `src/composables/useThisWeekMatchup.ts`
Mirrors the other composables (`loading`, `loaded`, `load()`, stale-league guard via `activeLeagueId`). On `load()`:
1. Determine platform + current week from league metadata.
2. Fetch the week's matchups (Yahoo `getCategoryMatchups`, ESPN `getMatchups`); find the one containing my team (match on the team key/id My Team already resolves).
3. Normalize both teams' week-to-date per-category totals to `Record<statId, number>` (Yahoo `team.stats`; ESPN `home/awayScoreByStat[statId].score`), plus the opponent display name.
4. Compute **days remaining** in the matchup period (reuse the Matchups view's date logic / `getMatchupDates`; standard Mon-Sun week fallback). Clamp to ≥0.
5. Call `calcOverallWinProb` for the headline; `calcCatWinProb` per category, then `bucketCategory`, attaching the category label + direction from the league categories.
6. Expose `snapshot: ThisWeekSnapshot | null`:
```typescript
interface ThisWeekSnapshot {
  opponentName: string
  myWinPct: number          // 0-100, rounded
  projWins: number          // rounded avgT1Cats
  projLosses: number
  projTies: number
  daysRemaining: number
  completed: boolean        // days remaining === 0
  categories: { statId: string; label: string; status: CatStatus; myWinPct: number }[]
}
```
`snapshot` is `null` when there is no current matchup (offseason, bye, no opponent, week not started with no data).

### Component 4: `MatchupSnapshot.vue` — the band
Compact strip rendered between `SituationStrip` and the weak/edge grid. Athletic-terminal styling (dark panel, mono numerals, lime/amber/red). Shows: "THIS WEEK · vs {opponent}", the win %, "projected {W}-{L}", and three grouped category chip rows — safe (lime), coin-flips (amber), likely losses (red). The whole band deep-links to the Matchup page (`router-link`). Coin-flips are visually emphasized (they are the decision). For a completed week, show the final-ish state without the live framing.

### Component 5: wire into `MyTeamView.vue`
- Instantiate `useThisWeekMatchup`; trigger its `load()` alongside the existing loaders (same category-league gate), and on active-league change.
- Render `<MatchupSnapshot :snapshot="thisWeekSnapshot" />` only when `snapshot` is non-null, positioned directly under the verdict header.
- No new platform branching beyond what the composable encapsulates.

## Thresholds (approved)
- Per-category bucket: my win % **≥ 70 → safe**, **≤ 30 → likely loss**, otherwise **coin-flip**.

## Error handling / edge cases
- **No current matchup** (offseason, bye, opponent not found, no week metadata) → `snapshot = null` → band not rendered.
- **Week not started / zero week-to-date stats** → still render; with full days remaining the engine returns near-50% across the board (high uncertainty), which is correct.
- **Completed week** (days remaining 0) → engine locks to the current category leader (100/0 per cat); band shows the final standing with `completed: true` framing.
- **Stale league switch** → guard discards a resolved fetch if `activeLeagueId` changed.
- **Missing volatility for a stat id** → fall back to a sensible default std dev (so exotic cats still simulate rather than divide-by-zero); documented default in the module.
- **Engine fetch throws** → log + `snapshot = null`; the rest of My Team renders normally.

## Testing
- `categoryWinProbability.ts`: unit-test the deterministic behavior — `bucketCategory` thresholds; `calcOverallWinProb`/`calcCatWinProb` at **days = 0** (deterministic: leader wins 100, trailer 0, tie ~50); a large lead with few days → ≥ ~90% for the leader; symmetric stats → ~50% (assert within a tolerance band, e.g. 40-60, to absorb Monte Carlo variance). `clampWinProb` bounds. `randomNormal` mean/std within tolerance over many samples.
- Existing suite stays green (62 tests).
- Composable + component verified visually on the real ESPN and Yahoo leagues mid-week: opponent correct, win % plausible, coin-flips are the genuinely-close categories, deep-link works, no band in the offseason.

## Out of scope
- Rest-of-week player projections / two-start-pitcher awareness (the engine is volatility-based; a future enhancement could feed projected remaining stats).
- Refactoring `CategoryMatchupsView.vue` to import the extracted module (deferred DRY pass; duplication noted).
- The full per-category matchup table (that is the Matchup page; the snapshot deep-links to it).
- Roto leagues, non-baseball sports (model is generic but baseball is the only one verified this slice).

## Files (anticipated)
- Create: `src/services/categoryWinProbability.ts` (+ `src/services/__tests__/categoryWinProbability.test.ts`)
- Create: `src/composables/useThisWeekMatchup.ts`
- Create: `src/components/myteam/MatchupSnapshot.vue`
- Modify: `src/views/MyTeamView.vue` (instantiate composable, render band)

## Constraints
- Local only; branch `redesign/my-team-first`. No push, no deploy.
- No banned patterns; no em dashes.
- Honest copy: snapshot is based on week-to-date totals + days remaining, not pitching schedules.
