# Draft Report — Injury / Incomplete-Season Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Stop injured players from being graded as draft busts — even on completed seasons. A player who missed most of the year (Zack Wheeler / Corbin Burnes / Cole Ragans / Pablo Lopez in 2025) currently sinks to WAIVER tier by total points and appears as a −115 "reach" and tanks his manager's grade. Treat such players as **incomplete** and exclude them from grading (like keepers) — from Top Reaches, biggest bust, worst pick/"biggest miss", AND the team grade.

**Design decisions (user-approved):**
- **Exclude injured from grading too** (not just highlights) — grade the *decision*, not injury luck. Mirrors the keeper-exclusion pattern.
- **"Incomplete" = low games AND low production, position-relative** (avoids false-excluding rookie/midseason breakouts who have few games but high points): a non-keeper pick is incomplete when its games-played is known, the position pool is real (`posMaxGames >= 20`), and `games < 0.5 × posMaxGames` **and** `points < 0.5 × posMaxPoints` for that position.
- **Platform data:** ESPN exposes games via a stat id (baseball GP = `99`); Sleeper computes `gamesPlayed`; **Yahoo has no reliable games field → no injury guard on Yahoo** (its completed seasons stay as-is; in-progress already hides reaches). Conservative fallback everywhere: if games is unknown for a player, DO NOT exclude (fail safe = current behavior).
- Show an "N injured/incomplete not graded" note alongside the existing keeper note.

**Tech Stack:** Vue 3 / TS / Vitest. Touches the 3 loaders (compute games + exclude), the reducer/types (`incompleteCount` passthrough), and `HistoryView.vue` (note). Local only.

---

## Task 1: types + reducer — `incompleteCount` passthrough

**Files:**
- Modify: `src/draft/report/types.ts`
- Modify: `src/draft/report/buildDraftReport.ts`
- Modify: `src/draft/report/__tests__/buildDraftReport.test.ts`

- [ ] **Step 1: types** — `GradedDraft`: after `keeperCount?`, add `incompleteCount?: number`. `DraftReport`: after `keeperCount`, add `incompleteCount: number`.

- [ ] **Step 2: test** — add to the `critique fixes` describe:
```ts
  it('passes incompleteCount through (undefined -> 0)', () => {
    expect(buildDraftReport({ ...base, incompleteCount: 4 }, 2024).incompleteCount).toBe(4)
    expect(buildDraftReport(base, 2024).incompleteCount).toBe(0)
  })
```

- [ ] **Step 3:** run the test file — new case fails.

- [ ] **Step 4: implement** — in `buildDraftReport.ts`, add `incompleteCount: draft.incompleteCount ?? 0` to the returned object (next to `keeperCount`).

- [ ] **Step 5:** run the test file — all pass. `npm run type-check 2>&1 | grep -iE "buildDraftReport"` → none.

- [ ] **Step 6: commit**
```bash
git add src/draft/report/types.ts src/draft/report/buildDraftReport.ts src/draft/report/__tests__/buildDraftReport.test.ts
git commit -m "feat: draft report reducer — pass incompleteCount through"
```

---

## Task 2: loaders — compute games + exclude incomplete (injured) picks

**Files:**
- Modify: `src/draft/report/loadEspnPointsDraft.ts`
- Modify: `src/draft/report/loadSleeperPointsDraft.ts`
- Modify: `src/draft/report/loadYahooPointsDraft.ts`

The loaders already build `gradedPicks = draftPicks.filter(p => !keeper)`. Extend the filter to also drop incomplete picks, and count them. **Do this AFTER computing the keeper-excluded set but such that incomplete picks are removed from the SAME grading + rank pools keepers are.**

Shared shape of the incomplete test (implement per platform with its own games/points source):
```
// per NON-KEEPER pick: games (number|undefined), points (number), position (string)
// posMaxGames[pos] = max games among non-keeper picks at pos (that have a known games value)
// posMaxPoints[pos] = max points among non-keeper picks at pos
// incomplete(pick) = games != null && posMaxGames[pos] >= 20
//                    && games < 0.5 * posMaxGames[pos]
//                    && points < 0.5 * posMaxPoints[pos]
```
Then: `gradedPicks = <non-keeper picks>.filter(p => !incomplete(p))`, `incompleteCount = <non-keeper picks>.filter(incomplete).length`. Grade + rank ONLY `gradedPicks` (same as today, just a smaller set). Return `incompleteCount` on the GradedDraft.

- [ ] **Step 1: ESPN** (`loadEspnPointsDraft.ts`)
- Games source: the roster players from `getTeamsWithRosters` carry `stats: Record<string, number>`. Baseball games-played is stat id `'99'` (confirmed via `getStatDisplayNames` baseball map). READ `src/services/espn.ts` `getStatDisplayNames` to confirm/collect the GP stat id(s) for the sport (baseball `99`; if pitchers use a different id, capture both — a player's games = the GP-family value present). Build a `gamesByPlayerId` map in the SAME loop that harvests `actualPoints`. If a player has no GP value → leave games undefined (→ never excluded, conservative).
- Compute `posMaxGames`/`posMaxPoints` over the NON-KEEPER picks (using `pick.position`, `gamesByPlayerId`, and season points). Apply the incomplete filter to derive `gradedPicks` (currently `draftPicks.filter(p => !p.keeper)`) → `draftPicks.filter(p => !p.keeper && !incomplete(p))`. Use `gradedPicks` everywhere the grading + rank maps are built (as today). Set `incompleteCount`.
- Return `incompleteCount` in the object.

- [ ] **Step 2: Sleeper** (`loadSleeperPointsDraft.ts`)
- Games source: `PlayerSeasonStats.gamesPlayed` (already computed by `calculatePlayerSeasonStats`), points `totalPoints`, position `metadata.position`. Build the same incomplete filter over non-keeper picks; extend `gradedPicks` to exclude incomplete; set `incompleteCount`. Return it.

- [ ] **Step 3: Yahoo** (`loadYahooPointsDraft.ts`)
- No games field → `incompleteCount: 0`, no injury filter. Add `incompleteCount: 0` to the returned object.

- [ ] **Step 4: sanity + verify**
- Reason about the excluded count: it should be a handful per league (injured stars), NOT dozens. Add a `console.debug('[draft report] incompleteCount', incompleteCount)` in ESPN + Sleeper so the smoke test can confirm it's plausible (remove later if noisy — leave for now).
- `npm run type-check 2>&1 | grep -iE "loadEspn|loadYahoo|loadSleeper"` → none. `npm run build` → success.

- [ ] **Step 5: commit**
```bash
git add src/draft/report/loadEspnPointsDraft.ts src/draft/report/loadSleeperPointsDraft.ts src/draft/report/loadYahooPointsDraft.ts
git commit -m "feat: draft loaders — exclude injured/incomplete-season players from grading (ESPN/Sleeper)"
```

---

## Task 3: view — injured/incomplete note

**Files:** Modify `src/views/HistoryView.vue`.

- [ ] **Step 1:** Find the keeper-excluded note (`{{ draft.report.value.keeperCount }} keepers excluded from grading`). Extend/augment it to also mention injured when present. Replace it with:
```html
          <p v-if="draft.report.value && (draft.report.value.keeperCount > 0 || draft.report.value.incompleteCount > 0)"
            class="mb-2 font-mono text-[10px] text-dark-textMuted">
            <span v-if="draft.report.value.keeperCount > 0">{{ draft.report.value.keeperCount }} keepers</span><span v-if="draft.report.value.keeperCount > 0 && draft.report.value.incompleteCount > 0"> · </span><span v-if="draft.report.value.incompleteCount > 0">{{ draft.report.value.incompleteCount }} injured/incomplete</span> excluded from grading
          </p>
```

- [ ] **Step 2:** `npm run type-check 2>&1 | grep -i HistoryView` → none. `npm run build` → success.

- [ ] **Step 3: commit**
```bash
git add src/views/HistoryView.vue
git commit -m "feat: History draft report — note injured/incomplete players excluded"
```

---

## Task 4: Full verification

- [ ] `npm test` (all pass).
- [ ] `npm run type-check && npm run build` (baseline 62; clean).
- [ ] **Manual smoke (user, the ESPN 2025 completed league — the one that exposed this):**
  - The Top Reaches should NO LONGER be Wheeler/Burnes/Ragans (injured) — they're excluded. Whatever reaches remain should be players who **played a full season and still underperformed** (real busts), or the list may be shorter.
  - Your spotlight: "biggest miss / worst pick" should no longer be Pablo Lopez (injured); your **grade should rise** off D− since the injury no longer counts.
  - The note reads e.g. "18 keepers · 5 injured/incomplete excluded from grading."
  - Check the browser console for `[draft report] incompleteCount N` — N should be a small, plausible number (single digits), not dozens. If it's excluding a huge chunk, the games threshold or the GP stat id is off — report back.
  - Yahoo in-progress unchanged (reaches still hidden by the "so far" rule; no injury note since incompleteCount 0).
- [ ] commit any smoke fix.

## Self-Review
- Exclusion happens in the loaders (same pool as keepers) → highlights AND team grades both exclude injured, with one filter. Reducer only passes `incompleteCount`. The rookie-steal false-exclusion is prevented by the AND-with-low-points condition. Conservative fallback (unknown games → not excluded). Yahoo unguarded (no games), documented. GP stat-id fragility is bounded by the conservative fallback + the debug count for smoke.
