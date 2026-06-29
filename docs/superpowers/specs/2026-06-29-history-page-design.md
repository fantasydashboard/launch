# History Page (Redesign) — Design Spec

**Date:** 2026-06-29
**Branch:** `redesign/my-team-first` (local only — see deploy-only-after-local-testing)
**Status:** Approved in brainstorming; ready for plan.

## Goal

Replace the old, sprawling History (`PointsHistoryView.vue` ~9.4k lines + `CategoryHistoryView.vue` ~6.6k lines, old card aesthetic) with a fresh History view in the redesign's terminal/decision aesthetic that leads with the **league lore people actually care about** and **scales gracefully with how much history is available**.

History is explicitly NOT a "cheat code" decision page. Its job is **bragging rights, rivalries, and reliving the season** — engagement and recurring visits. It should be tight and scannable, not a kitchen sink.

## Core principle: scale with available depth

The amount of visible history is platform- and membership-gated:
- **Sleeper** → usually the full league chain (`previous_league_id`).
- **Yahoo** → back to when you joined (`renew` chain). Rich for long-tenured members.
- **ESPN** → back to when you joined; a newcomer to a 10-year league sees only this year. Our `getHistoricalSeasons` already walks years backward and silently skips inaccessible ones, so we naturally get exactly the seasons the user can see.

The page adapts:
- **Multi-season available** → full lore (champions, all-time standings, rivalries, legendary moments).
- **One season only** → collapses to "This season's records + rivalries."
- **ESPN note** (when platform === espn): a small inline line — *"ESPN only shares seasons you've been a member of, so your history starts at {firstYear}. It'll grow each season."*

## Phase 1 — Read-side History (LOCAL, this build)

### Sections (in order)

1. **Champions** — the title roll, one row per season: year, champion (playoff winner where derivable; final-standings rank 1 as fallback), runner-up, regular-season leader if different. TeamAvatar + name.
2. **All-time standings** (the GOAT race) — one row per team across all visible seasons: cumulative W-L(-T), win%, titles, playoff appearances, seasons played. Sorted by win% (or titles, tiebreak win%). YOU highlighted.
3. **Rivalries** — your head-to-head record vs every other team across visible seasons; highlight the league's fiercest/closest rivalry (most games, closest split). Each: TeamAvatar, opponent, your all-time record vs them, edge indicator.
4. **Legendary moments** — a compact set of records: biggest single-week score, worst beatdown (largest margin), longest win streak, longest losing streak, best season (record), worst season. Each names the team + season/week.

Graceful collapse: with one season, Champions shows the current leader/"in progress," All-time = this season's standings, Rivalries = this-season H2H, Moments = this-season records.

### Architecture

- **New `src/views/HistoryView.vue`** — redesign style (mono, green primary, `TeamAvatar`, compact sections), handles both points and category leagues (branch where needed, like `LeagueView.vue`). Mirrors the existing redesign view structure.
- **`HistoryWrapper.vue`** — repoint to the new `HistoryView` (keep the scoring detection; the old Points/Category views stay in the repo, unwired, for later share-card/legacy port).
- **New composable `src/composables/useLeagueHistory.ts`** — orchestrates the multi-season fetch per platform (reuse existing service methods: ESPN `getHistoricalTeams`/`getHistoricalMatchups`/`getHistoricalSeasons`; Yahoo `renew` chain + `getMatchups`; Sleeper `getHistoricalData`). Returns a normalized, platform-neutral shape:
  ```ts
  interface HistorySeason {
    season: number
    teams: { teamKey: string; teamName: string; teamLogo?: string; wins: number; losses: number; ties: number;
             pointsFor: number; rank: number; playoffSeed?: number; madePlayoffs: boolean; champion: boolean }[]
    weeks?: { week: number; results: Record<string, 'W'|'L'|'T'>; points?: Record<string, number> }[]
  }
  interface HistoryData { seasons: HistorySeason[]; firstYear: number; platform: string; teamIdentity: Map<string,string> }
  ```
  Cross-season **team identity** (teams rekey each season): match by owner id where available, else normalized team name. Reuse the matching logic from the old `loadHistoricalData` as reference. Defensive: any season that fails to load is skipped, not fatal.
- **Pure, tested builders in `src/history/`:**
  - `buildChampions(seasons): ChampionRow[]`
  - `buildAllTimeStandings(seasons, identity): AllTimeRow[]`
  - `buildRivalries(seasons, identity, myTeamKey): RivalryRow[]`
  - `buildLegendaryMoments(seasons): Moment[]`
  Each pure + deterministic + unit-tested (vitest), same pattern as `src/league/` builders.

### Reuse
- `TeamAvatar` for all team avatars (initials fallback).
- The redesign section/card styling from `LeagueView.vue` (mono headers, `bg-dark-card`, `primaryTint`, color-mix tints — primary var has no alpha slot).
- `usePowerTrajectory` already fetches current-season weekly results (can seed the current season's weeks).

### Gates
- type-check stays at 62 baseline (none in touched files), build clean, all tests pass + new builder tests.
- Local only — no push, no deploy.

## Phase 2 — Durable snapshots + backfill (DEFERRED; needs explicit Supabase go-ahead)

Not in this build — flagged because creating the table is a live-Supabase migration (`ergxtydfgffqgkddclvr`), which is beyond "local only."

- **Table `league_season_snapshots`** — one row per (platform, league_id, season): final standings JSON, champion, key records, captured_at. RLS so league members can read; writes from the app on seeing a completed season.
- **Write path** — when History loads a completed season, upsert its snapshot. Read path merges API seasons ∪ snapshot seasons (snapshots persist seasons even if platform access later changes; faster loads).
- **Commissioner backfill UI** — manual entry of pre-membership champions into the same table. This is the ONLY mechanism that surfaces history older than your membership — the real fix for the ESPN-newcomer limitation (the Phase 1 note only explains it).

## Out of scope (defer / maybe never)
- Legacy Score gamification + customizable-weights editor (old feature; port only if users want it).
- Social share-card image generation (engagement hook; port in a later pass).
- Full H2H matrix and tabbed awards (can be added as sections later via the screenshot-iteration loop).
