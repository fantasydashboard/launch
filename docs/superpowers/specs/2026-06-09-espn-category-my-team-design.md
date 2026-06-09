# ESPN Category Support for My Team — Design

**Date:** 2026-06-09
**Branch:** `redesign/my-team-first` (local only; do not push/deploy)
**Status:** Approved, ready for implementation plan

## Goal

Make the **My Team** page work for **ESPN H2H category** baseball leagues, with the same decision-grade intelligence it already provides for Yahoo category leagues: overall rank verdict, "where you're losing" with inline top adds, "your edge," the full category profile, and the roster panel with per-category contribution chips, drop candidates, and weak link.

Today My Team is gated to Yahoo (`isYahooCategoryLeague` returns false for any non-Yahoo platform), so an ESPN category league lands on an empty state. This slice closes that gap for ESPN.

## Strategic context

Cross-platform parity is the heart of UFD's differentiation ("the AI coach for your specific league," cross-platform incl. ESPN/Yahoo/Sleeper). A category-aware My Team that works identically across platforms is the promise; ESPN is the next platform after Yahoo.

## Key insight: this is data-mapping, not a rewrite

The analytics core is already platform-neutral:
- `src/myteam/` — `computePlayerContributions(pool, myPlayerKeys, cats)`, `computeCategoryGaps(standings, profile, cats)`, `computeDropCandidates(contributions)`.
- `src/recommendations/` — `profileFromStandings(standings, categories, myTeamId)`, `computeCategoryWeaknesses/Strengths(profile, categories)`.
- `src/players/` — `rankAddsForHoles(players, holes, opts)`.

These consume generic shapes (`standings`, `cats`, `pool`, `playerKeys`, `holes`). The work is to produce those shapes from ESPN data and feed them in. No change to the analytics core.

## Architecture: additive provider, Yahoo path untouched

Introduce a **platform switch at the base inputs only** of `MyTeamView`. The Yahoo derivation stays exactly as-is (no risk to the working path). The base inputs become platform-dispatched; everything downstream (`profile`, `weaknesses`, `gaps`, `contributions`, `drops`, `addsByStatId`, roster panel) is identical and unchanged.

Platform-dispatched base inputs:
- `standings` — `{ team: { teamId: string }, perCategoryWins: Record<statId, number> }[]`
- `categories` — `{ statId: string, name: string, label: string }[]`
- `cats` — `{ statId: string, lowerIsBetter: boolean }[]` (direction-bearing)
- `myTeamId` — `string`
- `pool` — `{ playerKey: string, stats: Record<statId, number>, fantasy_team_key: string }[]`
- `myPlayerKeys` — `string[]`
- `rosterPlayers` — normalized roster rows for `RosterPanel`
- `freeAgents` — normalized players for `rankAddsForHoles`

When the active league is Yahoo category → these come from the existing Yahoo refs. When ESPN category → from the new ESPN composable.

## ESPN data flow → normalized shapes

A new composable `useEspnCategoryTeamData()` (mirrors `useMyRoster`/`useAvailablePlayers` structure: `loading`, `loaded`, `load()`, stale-league guard) loads for the active `espn_{sport}_{leagueId}_{season}` league:

1. **`espnService.getCategoryStatsBreakdown(sport, leagueId, season)`** →
   - `standings`: for each `teamKey` in `teamCategoryWins`, `{ team: { teamId: teamKey }, perCategoryWins: teamCategoryWins.get(teamKey) }`. (`teamKey` is already `espn_<id>`.)
   - `categories`: from the breakdown's `categories` array → `{ statId: stat_id, name, label: display_name }`.
   - `cats`: `{ statId: stat_id, lowerIsBetter: !!is_negative }` — **direction is authoritative from `is_negative`** (no label heuristic needed).
2. **`espnService.getMyTeam(sport, leagueId, season)`** → `myTeamId = "espn_" + team.id`. Requires ESPN credentials (SWID). If unavailable → cannot identify my team (see edge cases).
3. **`espnService.getTeamsWithRosters(sport, leagueId, season)`** →
   - `pool`: flatten every team's `roster` → `{ playerKey: String(player.playerId), stats: player.stats, fantasy_team_key: "espn_" + team.id }`.
   - `myPlayerKeys`: player keys where `team.id === myTeamId`'s numeric id.
   - `rosterPlayers`: my team's roster mapped to the panel shape `{ playerKey, full_name, position, mlb_team, headshot, stats }`.
4. **`espnService.getFreeAgents(sport, leagueId, season)`** → `freeAgents`: `{ playerKey, full_name, stats, position }` for `rankAddsForHoles`.

## Pure, testable mapping units (`src/myteam/espn/`)

Each is a pure function, TDD'd against representative ESPN fixtures:
- `mapBreakdownToStandings(breakdown)` → `{ standings, categories, cats }`
- `mapRostersToPool(teams, myTeamNumericId)` → `{ pool, myPlayerKeys }`
- `mapRosterToPlayers(myTeam)` → `rosterPlayers[]`
- `mapFreeAgentsToAddPool(freeAgents)` → players array shaped for `rankAddsForHoles`

The composable orchestrates the service calls and applies these mappers; it holds no mapping logic itself.

## Detection

- **Active platform/league:** parse `leagueStore.activeLeagueId`. ESPN keys match `^espn_(\w+)_(\d+)_(\d+)$` → `[sport, leagueId, season]`.
- **Category vs not:** reuse the same signal the app already uses to route ESPN leagues into the `Category*` views (e.g. `CategoryPowerRankingsView`). The implementation plan will pin down that exact predicate (likely the saved league `scoring_type` and/or league settings) and reuse it rather than inventing a new one.
- **Roto excluded:** ESPN roto leagues are OUT OF SCOPE (the per-category win-count profile math is H2H-specific, same reason Yahoo roto is excluded). A roto ESPN league shows the honest unsupported empty state.

## Error handling / edge cases

- **No ESPN credentials** (cannot resolve "my team" via SWID): graceful empty state — "Connect your ESPN account to see your team's edge." (Do not crash; do not show a half-populated page.)
- **Early season / no completed matchups:** `getCategoryStatsBreakdown` may fall back (roto-style simulated wins) or be sparse. Render whatever standings exist; if `myTeamId` is absent from standings or categories are empty, fall through to the empty/loading state rather than erroring.
- **Stale league switch:** the composable guards against a resolved load applying to a league the user already switched away from (mirror `useMyRoster`'s `activeLeagueId` guard).
- **Missing per-player stats:** players missing a stat are excluded from that category's distribution (existing `computePlayerContributions` behavior) — no change needed.

## Honesty of method

Same caveat as Yahoo: contribution is **season-to-date among rostered players**, not a true ROS projection. Copy stays consistent with the Yahoo surface. No new claims.

## Testing

- **Pure mappers:** unit tests (TDD) with representative ESPN `getCategoryStatsBreakdown` / roster / free-agent fixtures. Cover: direction from `is_negative`, team-key formatting, my-player partition, missing-stat handling.
- **Existing suite:** all 56 tests stay green; Yahoo path is untouched.
- **Composable + view wiring:** verified visually on the real ESPN league ("No League for Ordinary Gentlemen"). Checks: profile rank matches, weakness/edge correct, category profile direction correct (ERA/WHIP lower-is-better), roster contributions sane, no studs wrongly flagged as drops.

## Out of scope (explicit)

- Players page ESPN adds (fast follow, reuses this composable).
- Matchup page (different per-week data path).
- ESPN roto leagues.
- Non-baseball ESPN sports (mappers are sport-generic via the breakdown, but only baseball is verified this slice).
- True ROS projections.

## Files (anticipated)

- Create: `src/composables/useEspnCategoryTeamData.ts`
- Create: `src/myteam/espn/mapStandings.ts`, `mapRosters.ts`, `mapFreeAgents.ts` (+ `__tests__/`)
- Modify: `src/views/MyTeamView.vue` (platform switch at base inputs; reuse existing downstream computeds + empty-state message)

## Constraints

- Local only; branch `redesign/my-team-first`. No push, no `vercel --prod`.
- Brand: Athletic Terminal tokens (already applied to My Team); no new visual work needed beyond what the existing components render.
- No banned patterns; no em dashes.
