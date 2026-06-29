# The League Page — Design Spec

**Date:** 2026-06-28
**Status:** Approved (brainstorm), pending implementation plan
**Branch:** redesign/my-team-first (local-only; no push/deploy until user tests with real users)

## Goal

Build the **League** page — UFD's league-context "command center" that answers one question: **"How do I stack up against everyone?"** It is the *Compare / engine-room* layer (per the my-team-first spec): data-first evidence, **not** editorial narrative. A separate page that sits alongside the already-built **Power Rankings** tab (the two reference each other but don't duplicate).

This replaces the role of the current `/leagues/:leagueId/home` view (`CategoryDemoHomeView.vue`), which is the *old* fixture-driven editorial model (hero face-off, news ticker, story prose) — that is The League Beat's territory and explicitly out of scope for UFD.

## Architecture

- A **`LeagueView`** rendered behind a **`LeagueWrapper`** that branches on scoring type (`points` / `category` / `roto`), mirroring `PowerRankingsWrapper.vue`.
- Reuses the existing engine assembly (the `buildEngine` pipeline already assembled in `useCategoryStrength.ts` / `TradesView.vue`) so the all-team **landscape** comes for free, plus the records/standings sources Power Rankings already uses (`leagueStore.yahooTeams`, ESPN team records via `getTeamsWithRosters`, the points team-data composables).
- Visual + interaction language matches the redesigned team pages and Power Rankings (terminal/mono, dark, tight typography, `rounded-xl border border-dark-border bg-dark-card` sections). Lives in the existing `MyLeagueLayout.vue` shell + tab nav.

**Tech stack:** Vue 3 / TypeScript / Pinia. No new backend. Reuses `buildEngine` (`src/trades/engine.ts`), `useLeagueLandscape` (`src/composables/useLeagueLandscape.ts`), `buildPowerRankings` (`src/league/powerRankings.ts`), `seasonStakes` (`src/myteam/seasonStakes.ts`), `usePowerTrajectory` (for `weeksLeft` + `playoffSpots`).

## Page structure (v1)

### Section 1 — Standings (the anchor)
A clean, real standings table — the factual league state, polished to UFD's language:
- Columns: **rank · team** (logo + name, **YOU** highlighted) · **record** (W-L-T) · a **scoring-aware context column** — points-for for points leagues, category W-L-T for category leagues.
- **Stakes badge** per team — `clinched` / `eliminated` / `bubble` — from `seasonStakes({ rank, leagueSize, weeksLeft, playoffSpots })`, reusing the Power Rankings implementation. Shown where `playoffSpots > 0` (ESPN; Yahoo degrades to no badge, as bracket size isn't reliably exposed).
- A light **Power Rankings connector**: one compact column showing each team's **talent rank** plus its luck arrow (▲ due to rise / ▼ due to fall) from `buildPowerRankings(...)`. This ties League ↔ Power Rankings without re-litigating the luck story here.
- The user's row is highlighted (the primary-tint treatment used on the Power Rankings board).

### Section 2 — The Landscape (the engine room; the distinctive part)
Branches by scoring dialect:

**Category leagues — the heatmap.**
- A grid: **teams as rows, categories as columns**. Each cell = that team's **rank in that category** (1 = best), color-scaled strong→weak (brand-tinted, not a raw red/green stoplight).
- Source: the engine's **actual-season** category landscape — `buildEngine().landscape`, which is win-based when season per-category data is present (ESPN `perCategoryWins`, Yahoo `stat_winners`) and falls back to projected aggregates otherwise. This shows *where each team actually ranks per category this season* and deliberately complements Power Rankings' *projected* talent view. (Power Rankings strength = projected ECW; League heatmap = actual season category standing.)
- The user's row is **pinned/highlighted**. Read your row to see where you're strong/weak vs the field; read a column to see who owns each category.
- Below it, a compact **positional-strength strip**: each team's best eligible body at C/1B/2B/3B/SS/OF/SP/RP, ranked across the league (from `useLeagueLandscape().positionRows`).

**Points leagues — positional + projected comparison.**
- No categories, so the comparison is: **positional strength** (each team's best projected-points starter at each lineup slot, ranked across the league) **+ projected points per team** (each team's optimal-lineup projected points, reusing the `buildPointsTeam(...).standings` the Power Rankings points path already computes).
- Same "where does everyone stack up" intent, in the points dialect.

## Branching & graceful degradation
- **Category (H2H):** standings + category heatmap + positional strip.
- **Points:** standings + positional strength + projected-points comparison.
- **Roto:** falls back to the existing/legacy view for now (deferred, same decision as Power Rankings — roto's model differs and the user has no roto league to validate against).
- **Platform:** ESPN / Yahoo / Sleeper via the existing composables. Sleeper or any league missing category data degrades to **standings-only** (no landscape).

## Visual language
Terminal/mono, dark, decision-first density. `font-mono` for data/labels (13/11/10/9px), `font-display` for headers. Heatmap cells: small, mono rank numbers, color by rank on a brand-tinted scale. The user's row/cells highlighted with the primary tint (`color-mix(...)`, since the theme `primary` var has no alpha slot — see existing Power Rankings treatment). Accent palette consistent with the team pages: cyan `#5ec8e6` (you), amber `#e69a4a`, primary lime, muted grays.

## Out of scope (lives elsewhere)
- **H2H matrix** → History ("receipts" / brag layer).
- **Matchup slate / this-week matchups** → the Matchups tab.
- **Editorial prose / hero story / news ticker** → The League Beat (separate product).
- **Roto** support → deferred.

## Open implementation notes (to confirm during wiring, not blockers)
1. **Nav slot / route.** The current `Home` tab is the old editorial demo. Default plan: add a new **`League`** tab/route (`/leagues/:leagueId/league`) so the existing demo Home is undisturbed; confirm with user whether League should instead *replace* Home as the landing.
2. **Heatmap width.** A 20-category ESPN league makes a wide grid — handle with horizontal scroll and/or compact fixed-width cells, your-row pinned. Provide a sensible default cell size and let it scroll on narrow viewports.
3. **Data assembly reuse.** The landscape needs the assembled engine. Either extend `useCategoryStrength` to also expose the landscape, or factor a small shared composable (e.g. `useLeagueEngine`) that both the category Power Rankings path and the League page consume — avoid duplicating the ESPN/Yahoo engine-input assembly. Decide in the plan; prefer extraction over duplication.

## Success criteria
- League renders for points and H2H-category leagues on both ESPN and Yahoo, in the terminal aesthetic.
- The category heatmap correctly shows each team's per-category season rank, your row highlighted, readable for up to 20 categories / 12 teams.
- Standings shows correct records, your row, and stakes badges (ESPN).
- Roto and data-missing cases degrade gracefully without errors.
- type-check baseline stays at 62 (no errors in touched files); build clean; tests pass.
