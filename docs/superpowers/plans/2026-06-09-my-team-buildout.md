# My Team Build-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Take My Team from skeleton (verdict + weak/edge lists) to a complete decision surface: close the loop (each weakness shows the top available add and links to Players for that category), and add the completeness modules (full Category Profile, your Roster). Athletic-terminal style. Local only, branch `redesign/my-team-first`.

**Verification model:** Visual rebuild. Each task: `npm run build` succeeds, `npm test` (must stay green, add tests for any new pure logic), `npm run type-check` (no new errors beyond the 4 known pre-existing: yahoo-daily-stats-methods.ts, DraftPage.vue, HistoryPage.vue, MatchupsPage.vue), dev-server visual check.

**Reuse (all exist):** `useAvailablePlayers()` (FA pool), `rankAddsForHoles(players, holes, opts)` + `isLowerBetter` (`src/players/`), `profileFromStandings`/`computeCategoryWeaknesses`/`computeCategoryStrengths` (`src/recommendations/`), `useFullSeasonCategoryData` + MyTeamView's derivation of `standings`/`categories`/`myTeamId`, `yahooService.getAllRosteredPlayers(leagueKey)` (returns rostered players with `{ player_key, full_name, position, mlb_team, headshot, fantasy_team_key, fantasy_team, stats: Record<statId,number> }`).

**Brand:** dark tokens, `text-primary` lime, font-display (Space Grotesk) headings, font-mono tabular numbers.

**Deferred (note in UI, not built):** live win-probability matchup snapshot (needs extracting the Monte Carlo engine from CategoryMatchupsView — its own future piece).

---

## Task 1: Players accepts a category anchor

**Files:** `src/views/PlayersView.vue`.

- [ ] **Step 1:** Add an `id` to each per-hole section so it can be anchored, e.g. `:id="'cat-' + group.hole.statId"` on the `<section>` for each hole.
- [ ] **Step 2:** Read the route query on mount/update: if `route.query.cat` is present, after the data loads (watch `holeAdds`), scroll the matching `#cat-<statId>` section into view (`scrollIntoView({ behavior: 'smooth', block: 'start' })`) and briefly highlight it (add a transient lime ring class for ~1.5s). Use `useRoute()` from vue-router. Guard for the section not existing.
- [ ] **Step 3:** Verify: `npm run build`; navigating to `/players?cat=HR` (or the real statId) scrolls to the HR adds. `npm test` 32, type-check clean. Commit: `feat(myteam): Players supports ?cat= anchor + highlight`

---

## Task 2: My Team weakness rows show the top add + link to Players

**Files:** `src/views/MyTeamView.vue`, `src/components/myteam/ActionFeed.vue` (or a new small subcomponent).

The "Where you're losing" rows currently link to `/`. Make each weakness actionable: show the #1 available add inline and link the row to `/players?cat=<statId>`.

- [ ] **Step 1:** In `MyTeamView.vue`, also load the FA pool: call `useAvailablePlayers()` and trigger its load alongside the existing season load (gate to Yahoo category leagues like the season load). Compute `holeAdds` via `rankAddsForHoles(players.value, holes, { perHole: 1 })` where `holes` are the same weak categories already derived (map each weakness Recommendation → a `Hole` exactly as PlayersView does: statId, name from categories, rank from profile, `lowerIsBetter: isLowerBetter(cat.label || cat.name || cat.statId)`). Build a `Map<statId, Add>` of the top add per weak category.
- [ ] **Step 2:** Pass the top-add map (and a per-row evidence route) into the weakness ActionFeed so each weakness row renders: the existing "12th in HR" headline + a second line "Add: {topAdd.player.name} ({topAdd.statValue} {label})" when an add exists (muted, with the player name in `text-dark-text`), and the row's link becomes `/players?cat=<statId>` instead of `/`. If no add is available for that category, omit the add line and link to `/players` (no cat). Keep the "Your edge" rows as-is (they can keep linking to `/` or League for now).
  - Implementation note: `ActionFeed` currently takes `recommendations: Recommendation[]` and uses `rec.evidenceRoute`. Either (a) extend each weakness Recommendation's `evidenceRoute` to `/players?cat=<statId>` and pass an optional `addsByStatId` prop to render the inline add line, or (b) make a small `WeaknessRow`/dedicated feed. Prefer (a): add an optional `addsByStatId?: Record<string, { name: string; statValue: number; label: string }>` prop to ActionFeed; when present and a row's statId matches, render the add line. Keep the focus ring + sr-only severity.
- [ ] **Step 3:** Verify: `npm run build`; on My Team, each weakness shows "Add: {player}" and clicking jumps to that category on Players. `npm test`, type-check clean. Commit: `feat(myteam): weakness rows show top add + deep-link to Players`

---

## Task 3: Category Profile (full per-category picture)

**Files:** Create `src/components/myteam/CategoryProfile.vue`; add to `src/views/MyTeamView.vue`.

A compact, full-league view of your rank in EVERY category (not just the top weak/strong few).

- [ ] **Step 1:** `CategoryProfile.vue` props: `categories: { statId: string; name: string; label: string }[]`, `teamCategories: { statId: string; rank: number }[]`, `numTeams: number`. For each category render a row: the category label (font-mono), a horizontal bar whose fill = `(numTeams - rank + 1) / numTeams` (rank 1 = full), and the rank as `{rank}` (font-mono tabular). Color the bar by tier: top third lime (`bg-primary`), middle amber (`#F2B33A`), bottom third red (`#FF5C5C`). Use dark tokens for the track. Order rows worst-rank-first (so problems surface) or by category side (hit then pit) — pick worst-first for decision value. No new data; derive from MyTeamView's `profile.categories` + `categories`.
- [ ] **Step 2:** Add a "Category Profile" section (font-display heading) to MyTeamView below the two-column weak/edge grid, full width, only when `profile` exists.
- [ ] **Step 3:** Verify: `npm run build`; My Team shows a full bar-per-category profile, color-tiered, mono ranks. `npm test`, type-check clean. Commit: `feat(myteam): full category profile bars`

---

## Task 4: Your Roster panel

**Files:** Create `src/composables/useMyRoster.ts`; create `src/components/myteam/RosterPanel.vue`; add to `src/views/MyTeamView.vue`.

- [ ] **Step 1:** `useMyRoster.ts` (mirror `useAvailablePlayers` structure: refs `players`, `loading`, `loaded`, `load()`, stale-league guard via `activeLeagueId`): call `yahooService.getAllRosteredPlayers(leagueKey)` (leagueKey = `leagueStore.activeLeagueId`, same as the other composables) and filter to the logged-in team — match each player's `fantasy_team_key` against the active team key, OR if that's not reliable, the implementer should determine how "my team" maps to `fantasy_team_key`/`fantasy_team` (read how MyTeamView resolves `myTeamId` and how rostered players carry team identity; if the mapping is ambiguous, report NEEDS_CONTEXT rather than guessing). Return only my players.
- [ ] **Step 2:** `RosterPanel.vue` props: `players` (normalized roster) + `categories`. For each player render a compact row: headshot, name (font-sans semibold), position · team (muted), and their 1-2 standout category stats (font-mono, the best categories by value among the league's categories — e.g. show top 2 stats with their labels). Keep rows dense. Group/sort sensibly (e.g. by position or by total contribution).
- [ ] **Step 3:** Add a "Your Roster" section (font-display heading) to MyTeamView, full width, with the panel; load the roster on mount/league-change (gated to Yahoo category). Show a loading line while fetching and a graceful empty state.
- [ ] **Step 4:** Verify: `npm run build`; My Team shows your roster with standout stats. `npm test`, type-check clean. Commit: `feat(myteam): your roster panel`

---

## Task 5: Layout pass + gate

**Files:** `src/views/MyTeamView.vue`.

- [ ] **Step 1:** Order the page top-to-bottom: verdict header → two-column "Where you're losing" (with adds) / "Your edge" → Category Profile → Your Roster. Use consistent spacing (`space-y-8` or section spacing), keep `max-w-6xl`, ensure it reads as a confident full page (no large empty void). A small muted note where the matchup snapshot will go is optional ("Matchup win-probability coming soon" — only if it looks intentional; otherwise omit).
- [ ] **Step 2:** Gate: `npm test` green; `npm run type-check` no new errors; `npm run build` succeeds. DO NOT deploy. `npm run dev` visual pass. Commit any remainder.

---

## Notes
- Local only; no push/deploy. Branch `redesign/my-team-first`.
- Reuse existing composables/services; do NOT depend on `src/editorial/`.
- Keep lime restrained (accent on ranks/edge/adds, tiered bars use amber/red for non-top tiers).
- No banned patterns (hero-metric decorative cards, side-stripe borders, gradient text, em dashes).
