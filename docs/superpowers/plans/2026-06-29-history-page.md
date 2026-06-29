# History Page (Redesign) — Implementation Plan

> Spec: `docs/superpowers/specs/2026-06-29-history-page-design.md`. Local only on `redesign/my-team-first`. Gates: type-check 62 baseline (none in touched files), build clean, all tests pass. Commit per task, no push.

**Goal:** Fresh redesign-style History view (champions, all-time GOAT standings, rivalries, legendary moments) that scales with available history depth and notes ESPN's membership limit.

**Approach:** Normalize multi-season data into a platform-neutral `HistorySeason[]` in a new composable (reusing the proven cross-season identity logic: ESPN owner-id key, Yahoo `renew` chain, Sleeper `getHistoricalData`). Pure tested builders reduce that into each section. New `HistoryView.vue` renders them. Build in screenshot-checkpointed slices.

---

## Task 1: Normalized history types + `useLeagueHistory` composable

**Files:** Create `src/history/types.ts`, `src/composables/useLeagueHistory.ts`.

- `HistorySeason { season, teams: HistoryTeam[], weeks?: HistoryWeek[] }`; `HistoryTeam { teamKey (cross-season identity), teamName, teamLogo?, wins, losses, ties, pointsFor, rank, playoffSeed?, madePlayoffs, champion }`; `HistoryWeek { week, results: Record<key,'W'|'L'|'T'>, points?: Record<key,number> }`; `HistoryData { seasons, firstYear, platform, loading, loaded }`.
- Composable orchestrates per platform, defensively (skip failed seasons):
  - **ESPN:** loop `currentSeason … currentSeason-5`; `getTeams` (current) / `getHistoricalTeams` (past); identity key = `primaryOwner ?? team_{id}_{season}`; champion = standings rank 1 / playoff result where available; weeks via `getMatchups`/`getHistoricalMatchups` (current + as available).
  - **Yahoo:** current league + walk `renew` chain; identity by owner/manager guid where present else normalized name; champion from final standings.
  - **Sleeper:** `getHistoricalData` → seasons/rosters/matchups already chained.
- Expose `{ data, load, loading, loaded }`. `firstYear = min(season)`.

**Verify:** type-check clean; composable imported without runtime use yet.

## Task 2: `buildChampions` + `buildAllTimeStandings` (pure, tested)

**Files:** Create `src/history/champions.ts`, `src/history/allTimeStandings.ts`, tests in `src/history/__tests__/`.

- `buildChampions(seasons): ChampionRow[]` — per season desc: `{ season, championKey, championName, championLogo, runnerUpName?, regularLeaderName? }`. Champion = team with `champion:true`, else rank 1.
- `buildAllTimeStandings(seasons): AllTimeRow[]` — group by `teamKey`: cumulative wins/losses/ties, win%, titles, playoffAppearances, seasonsPlayed, latestName/logo. Sort by titles desc, then win% desc. Mark `isMe`.
- Tests: 2-season fixture → champion picked by flag then rank; all-time aggregates + sort + win% correct; single-season degrades.

## Task 3: HistoryView shell + Champions + All-time sections (SCREENSHOT CHECKPOINT)

**Files:** Create `src/views/HistoryView.vue`; modify `src/views/HistoryWrapper.vue` to render it.

- Header "League history" + subtitle. Loading/empty states.
- **ESPN note** when `platform==='espn'`: "ESPN only shares seasons you've been a member of, so your history starts at {firstYear}. It'll grow each season."
- **Champions** section (TeamAvatar + name per season row) and **All-time standings** section (records, win%, titles, playoff apps; YOU highlighted via `primaryTint`).
- Single-season collapse: Champions shows current leader / "in progress"; All-time = this season.
- HistoryWrapper: render new `HistoryView` for both branches (old views stay unwired).

**Verify:** build + type-check; **pause for user screenshot on the rich Yahoo league + a thin ESPN league** before continuing.

## Task 4: `buildRivalries` + Rivalries section

**Files:** Create `src/history/rivalries.ts` + test; add section to `HistoryView.vue`.

- `buildRivalries(seasons, myTeamKey): RivalryRow[]` — from `weeks` matchup results across seasons, accumulate your H2H W-L vs each opponent key; include `games`, `record`, `edge` ('up'|'down'|'even'); also compute `fiercest` (most games, tiebreak closest split) league-wide. Skip when no weekly data.
- Section: your record vs each opponent (sorted by games desc), fiercest-rivalry callout. Graceful when only current-season weeks exist.
- Tests: H2H tally across 2 seasons; edge direction; fiercest selection.

## Task 5: `buildLegendaryMoments` + Moments section

**Files:** Create `src/history/legendaryMoments.ts` + test; add section to `HistoryView.vue`.

- `buildLegendaryMoments(seasons): Moment[]` — biggest single-week score (needs `points`), worst beatdown (largest margin, points leagues), longest win streak, longest losing streak, best season (record), worst season. Each `{ kind, label, teamName, teamLogo?, value, season, week? }`. Omit point-based moments when no `points` data (category leagues) — keep streak/season records.
- Section: compact record cards. 
- Tests: streak detection across weeks; best/worst season; point-based omitted without points.

## Task 6: Final review + polish

- Full-suite run, type-check 62, build clean.
- Graceful-degradation pass (1 season; no weekly data; missing logos via TeamAvatar).
- Update `league-page.md` memory (History built; Phase 2 snapshots/backfill still deferred).

---

## Phase 2 (NOT now — needs explicit Supabase go-ahead)
`league_season_snapshots` table + migration, write-on-completed-season + read-merge, commissioner backfill UI (the real fix for pre-membership history).
