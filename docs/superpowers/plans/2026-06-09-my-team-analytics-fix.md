# My Team Analytics Correctness Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Fix the broken analytics surfaced on real data: (1) the roster flags ~18 players including studs (Corbin Carroll, Chris Sale) as DROP? because "value = top-third in one category" misses balanced players; (2) most players show "—" (uninformative); (3) "winnable" is applied to ~10/12 categories (signal diluted), including 12th place; (4) gap copy reads "0 from 5th" (nonsense). Local only, branch `redesign/my-team-first`. TDD the logic.

**Root fix:** introduce an **overall value** per player (mean of their per-category percentiles over the categories they actually contribute to) and drive sort + drop off that; make "winnable" selective (the few genuinely-close opportunities); fix copy.

**Verify each task:** `npm run build` ok, `npm test` green (update/add tests), `npm run type-check` no new errors (known pre-existing: yahoo-daily-stats-methods.ts, DraftPage.vue, HistoryPage.vue, MatchupsPage.vue). No deploy.

---

## Task 1: Rework the pure logic (`src/myteam/`) — TDD

### 1A — `contribution.ts`
- Extend `PlayerContribution` (in `types.ts`) with `overallValue: number` (0..1) and `topStatId: string | null`.
- In `computePlayerContributions`: after computing each player's per-category percentile (over the pool, missing/0 excluded as today), set `overallValue` = the MEAN of that player's percentiles **across only the categories where they have a value** (so hitters are judged on hitting cats, pitchers on pitching cats; a player absent from a category is not counted). `topStatId` = the statId of their highest-percentile contributed category (null if none). Keep the existing plus/minus tier rules unchanged.
- Update/extend the test: a balanced player with mid percentiles across many cats has a sensible `overallValue`; a scrub low everywhere has low `overallValue`; `topStatId` is the best category.

### 1B — `dropCandidates.ts` (rework)
- New signature stays `computeDropCandidates(contributions)`. Rules:
  - Sort my players by `overallValue` asc.
  - A player is a **drop candidate** only if `overallValue < 0.35`. NEVER flag a player with `overallValue >= 0.5` (stud protection). **Cap the list at 3** (the lowest-value qualifying players). If none qualify, return an empty candidate list.
  - Severity: `overallValue < 0.2` → `strong`, else `mild`. Reason string: "weak across categories" (strong) / "low overall value" (mild).
  - `weakLink` = the single player with the lowest `overallValue` (null if no players). (Independent of the drop threshold — your worst contributor, even if not droppable.)
- Rewrite the test: a roster of 2 genuine scrubs + several studs → only the scrubs (≤3) flagged, studs never flagged; weakLink = lowest-value player; if all players are >= 0.5 value, zero drop candidates.

### 1C — `categoryGaps.ts` (selective winnable + tied support)
- Restructure so winnable is assigned **selectively across the whole category set**, not per-category independently:
  1. For each category compute `rank`, `gapUp`, `gapDown` as today. Mark `strong` if `rank <= numTeams/3`.
  2. Among NON-strong categories where you're behind (`gapUp !== null`): a category is **eligible-winnable** only if `gapUp <= 1` (tied or one win away) AND (rank is not dead-last `=== numTeams` unless `gapUp === 0`).
  3. Sort eligible-winnable by `gapUp` asc, then `rank` asc; take the **top 3** → `winnable`. The rest of the behind categories: `lost` if `rank > numTeams*2/3` (bottom third), else `safe`.
- Keep `gapUp` in the output (0 means tied) so the component can render "tied with Nth" vs "{gapUp} from Nth".
- Rewrite the test: a tight league where many gaps are 0-1 → at most 3 winnable (the closest), the rest safe/lost; a 12th-place category with `gapUp` 1 → `lost` (NOT winnable); 12th with `gapUp` 0 → winnable; a top-third category → strong.

- [ ] Implement 1A (extend type + value, update test), 1B (rework + test), 1C (rework + test). TDD each. Commit: `fix(myteam): overall-value contribution + selective winnable + stud-safe drops`. Verify `npm test`/type-check.

---

## Task 2: Wire the fixed logic into the viz + copy

### 2A — `RosterPanel.vue`
- Sort players by `overallValue` desc (best first).
- Chips: render `plus` cats as lime chips and `minus` cats as red chips (as today). **If a player has no plus chips, show their `topStatId` as a single MUTED chip** (e.g. dark/neutral chip with the label) so no row is blank "—". Only show "—" if they truly have no contributed category.
- Drop tags: only render `drop?` for the (now ≤3) candidates; weak-link tag for `weakLink`. (Studs will no longer be tagged.)

### 2B — `CategoryProfile.vue`
- Fix the gap copy: when a category's `gapUp === 0` render **"tied with {ordinal(rank-1)}"**; when `gapUp >= 1` render **"{gapUp} from {ordinal(rank-1)}"**; lost → "punt?"; strong/safe → nothing. (Reuse `ordinal`.)
- Keep ordering winnable → lost → safe → strong (now meaningful since winnable is scarce).

### 2C — `ActionFeed.vue` weakness winnable tag
- No code change needed beyond confirming it reads the tightened `tierByStatId` (which now marks far fewer categories winnable). Verify HR (12th, gapUp 1) no longer shows "winnable" and instead shows "punt?" (lost) — reconciling the earlier red-dot/amber-tag contradiction. If MyTeamView builds `tierByStatId` from `gaps`, it updates automatically; just confirm.

### 2D — Gate
- `npm test` green; `npm run type-check` no new errors; `npm run build` ok. No deploy.

- [ ] Implement 2A-2C, verify 2D. Commit: `fix(myteam): roster sort+chips, gap copy, winnable reconciled`.

---

## Notes
- Local only; no push/deploy. Pure-logic changes are TDD'd; viz is visual.
- Honest copy: still season-to-date contribution among rostered players (not a projection).
- No banned patterns, no em dashes.
- Sanity check on the real Swamp Pirates after: Carroll/Sale/Bellinger must NOT be drop candidates; at most ~3 drop tags total; at most 3 "winnable" categories; "tied with Nth" where gapUp is 0.
