# My Team Intelligence Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Turn My Team's modules from descriptive into decision-grade, grounded in the research: (1) Roster shows each player's per-category contribution (+ / neutral / −) vs the league's rostered pool, plus your weak link and drop candidates; (2) Category Profile becomes a "where to focus" position-and-gap viz (winnable / safe / lost), replacing the broken empty bars; (3) weakness adds show the per-category delta. Local only, branch `redesign/my-team-first`.

**Honesty note on method:** We use **season-to-date stats among the league's rostered players** as the contribution baseline (a grounded, available proxy). We do NOT claim true ROS-projection-vs-replacement; label things accordingly ("season-to-date"). ROS projections can refine this later (the Projections view has ROS logic to extract another time).

**Data we have:** `yahooService.getAllRosteredPlayers(leagueKey)` returns ALL rostered players league-wide with `stats: Record<statId, number>` (the pool for percentiles) and `fantasy_team_key` (to split mine vs the pool). `useMyRoster` already fetches + filters to my team. MyTeamView already builds `standings` (every team's `perCategoryWins` per statId), `profile` (my per-category rank), `categories` (statId/label/name + direction via `isLowerBetter`), `weaknesses`, `addsByStatId`.

**Verification:** Each task: `npm run build` ok, `npm test` green (add tests for new pure logic), `npm run type-check` no new errors (known pre-existing: yahoo-daily-stats-methods.ts, DraftPage.vue, HistoryPage.vue, MatchupsPage.vue), dev visual check. No deploy.

**Brand:** dark tokens, lime `text-primary`, amber `#F2B33A`, red `#FF5C5C`, font-display headings, font-mono tabular numbers. No banned patterns; no em dashes.

---

## Task 1: Pure contribution + gap logic (`src/myteam/`)

**Files:** Create `src/myteam/types.ts`, `src/myteam/contribution.ts`, `src/myteam/categoryGaps.ts`, `src/myteam/dropCandidates.ts`; tests under `src/myteam/__tests__/`.

### 1A — types.ts
```typescript
export type ContribTier = 'plus' | 'neutral' | 'minus'
export interface PlayerCategoryContrib { statId: string; tier: ContribTier; value: number; percentile: number }
export interface PlayerContribution { playerKey: string; contribs: PlayerCategoryContrib[]; plusCount: number; minusCount: number }
export interface CategoryGap {
  statId: string
  rank: number
  numTeams: number
  tier: 'strong' | 'winnable' | 'safe' | 'lost'  // strong=top third; winnable=close behind team above; lost=bottom + far; safe=otherwise
  gapUp: number | null   // category-wins needed to pass the team ranked above (null if 1st)
  gapDown: number | null // category-wins cushion over the team below (null if last)
}
```

### 1B — contribution.ts: `computePlayerContributions(pool, myPlayerKeys, cats)`
- TDD. Input: `pool` = all rostered players (`{ playerKey, stats: Record<statId, number> }[]`), `myPlayerKeys: string[]`, `cats: { statId, lowerIsBetter }[]`.
- For each category, compute the distribution of `stats[statId]` across the pool (players missing the stat / value 0 excluded from the distribution for that cat). For each of MY players, compute their percentile in that category (direction-aware: for `lowerIsBetter`, lower value = higher percentile). Tier rule:
  - `plus` if percentile >= 0.66 (top third).
  - For categories where `lowerIsBetter` is true (ratio cats like ERA/WHIP) OR the category is a rate/ratio: `minus` if percentile <= 0.33 (bottom third) — a bad rate actively hurts.
  - For counting categories (higherIsBetter, non-ratio): bottom third is `neutral`, NOT minus (low counting contribution isn't "hurting" — research caveat). So `minus` only applies to ratio/lower-is-better cats.
  - else `neutral`.
  - A player with no value in a category → `neutral` (didn't play it), excluded from plus/minus counts.
- Return `PlayerContribution[]` for my players (with `plusCount`, `minusCount`).
- Test: a pool where one of my hitters is top-third in HR (→plus), a pitcher bottom-third in ERA (ratio→minus), a hitter bottom-third in SB (counting→neutral, not minus), missing-stat→neutral.

### 1C — categoryGaps.ts: `computeCategoryGaps(standings, profile, cats)`
- TDD. Input: `standings` (`{ team: { teamId }, perCategoryWins?: Record<statId,number> }[]`), `profile` (my `{ teamId, numTeams, categories: { statId, rank }[] }`), `cats`. For each category: my rank; sort all teams by `perCategoryWins[statId]` desc to find the team directly above/below me; `gapUp` = their wins − my wins (>=1, or null if I'm 1st); `gapDown` = my wins − below team's wins (or null if last). Tier: `strong` if rank <= numTeams/3; `lost` if rank > numTeams*2/3 AND gapUp is large (> ~3) ; `winnable` if not strong and gapUp small (<= ~2); else `safe`. (Tune thresholds; keep simple + tested.)
- Test: a team 2nd with small gapUp → strong; a team 9th of 12 with gapUp 1 → winnable; 12th far back → lost.

### 1D — dropCandidates.ts: `computeDropCandidates(contributions, gaps)`
- TDD. A player is a drop candidate if they have `plusCount === 0` AND are not `plus` in any `winnable`/`safe` category you'd want to keep. Simplest tested rule: `plusCount === 0 && minusCount >= 1` → strong drop candidate; `plusCount === 0` → mild. Return playerKeys flagged with a reason string ("no category strengths"). Also expose `weakLink` = the my-player with the lowest (plusCount − minusCount). Keep it simple and tested.

- [ ] Implement 1A (types, no test), then 1B/1C/1D each TDD (write failing test, confirm fail, implement, pass), commit each: `feat(myteam): player category contribution logic`, `feat(myteam): category gap/winnable logic`, `feat(myteam): drop-candidate + weak-link logic`. Verify `npm test`/type-check after.

---

## Task 2: Roster panel intelligence

**Files:** `src/composables/useMyRoster.ts` (expose the full pool too), `src/components/myteam/RosterPanel.vue`, `src/views/MyTeamView.vue`.

- [ ] **Step 1:** `useMyRoster` currently returns only my players. Also expose `pool` (all rostered players, unfiltered) so contribution percentiles can be computed. (Return `{ players (mine), pool (all), loading, loaded, load }`.)
- [ ] **Step 2:** In `MyTeamView.vue`, compute `contributions = computePlayerContributions(pool, myPlayerKeys, cats)` and `gaps`/`dropCandidates` once data is loaded; pass to RosterPanel.
- [ ] **Step 3:** `RosterPanel.vue`: for each player, replace the two raw "standout stats" with **per-category contribution chips**: show their `plus` categories as lime chips (e.g. `HR`), and `minus` categories as red chips (e.g. `ERA`), small `font-mono`. Mark **drop candidates** with a subtle muted "drop?" tag + reason on hover/title, and badge the **weak link** ("weak link"). Sort: keep your strongest contributors up top (by plusCount − minusCount desc), drop candidates near the bottom. Keep rows dense; dark tokens; no side-stripes.
- [ ] **Step 4:** Verify build/test/type-check; visually the roster now reads "who helps which categories, who to drop." Commit: `feat(myteam): roster shows per-category contribution + drop candidates`

---

## Task 3: Category Profile → position + gap viz

**Files:** `src/components/myteam/CategoryProfile.vue`, `src/views/MyTeamView.vue`.

Replace the empty-fill bars with a legible position-on-scale + winnable/safe/lost treatment using `computeCategoryGaps`.

- [ ] **Step 1:** MyTeamView passes `gaps: CategoryGap[]` (from Task 1C) to CategoryProfile.
- [ ] **Step 2:** Rewrite `CategoryProfile.vue`: per category row → label (font-mono) + a **position track**: a full-width track with N tick positions (or a continuous track) and a **marker dot at my rank** (left = best/1st, right = worst/Nth). Color the marker + a small tag by `tier`: strong=lime, winnable=amber, safe=muted, lost=red. Show `rank` (font-mono) and a terse gap note: winnable → "{gapUp} from {rank-1}th" (amber), lost → "punt?" (muted red), strong → nothing. Order rows: winnable first (actionable), then lost, then safe, then strong — so "where to focus" is at the top. Every row is equally legible (no near-empty bars). Add a one-line legend.
- [ ] **Step 3:** Verify build/test/type-check; the profile now clearly shows where you sit and where you can gain. Commit: `feat(myteam): category profile as position + winnable/lost viz`

---

## Task 4: Per-category add delta on weaknesses

**Files:** `src/components/myteam/ActionFeed.vue` (and `MyTeamView.vue` if needed).

- [ ] **Step 1:** The weakness add line currently reads "Add: {name} ({value} {label})". Reframe to a delta: "Add {name} → +{value} {label}" (the lime `+{value}` emphasized `font-mono`). If the category is `winnable` (from gaps), append a subtle "(winnable)" amber tag to that weakness row so the user knows which holes are worth attacking now vs lost causes. Pass the gap tier into the weakness rows.
- [ ] **Step 2:** Verify build/test/type-check. Commit: `feat(myteam): weakness adds show per-category delta + winnable tag`

---

## Task 5: Layout + gate

- [ ] Order: verdict → two-column weak(with adds+winnable)/edge → Category Profile (position/gap) → Roster (contribution/drops). Consistent spacing, `max-w-6xl`.
- [ ] Gate: `npm test` green; `npm run type-check` no new errors; `npm run build` ok. No deploy. Commit any remainder.

---

## Notes
- Local only; no push/deploy. Reuse services/composables; no `src/editorial/` dependency.
- Be honest in copy: contribution is "season-to-date among rostered players," not a projection.
- Keep lime restrained; amber/red carry winnable/lost + minus contributions. No banned patterns, no em dashes.
- Deferred (not this pass): SP streaming planner (Players), trades (Slice 3), true ROS projections, H2H weekly win-prob, games-played/innings-cap surfacing.
