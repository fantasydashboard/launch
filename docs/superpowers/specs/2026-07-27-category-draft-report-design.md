# Category-League Draft Report (Phase 2) — Design

**Goal:** Extend the existing points-league Draft Report to **Yahoo category leagues** by ranking each drafted player on category value (summed season z-scores) instead of season points. ESPN category is explicitly deferred (see Scope).

**Status:** Approved design, Yahoo-first. Local-only per the standing no-deploy rule.

---

## Background

The points Draft Report (`useDraftReport.ts` → `loadEspnPointsDraft.ts` / `loadYahooPointsDraft.ts` / `loadSleeperPointsDraft.ts` → `buildDraftReport.ts`) grades a draft by comparing, per pick:

- **`positionRankDrafted`** — the order each position was taken in the draft (1st C taken = C1, etc.).
- **`currentPositionRank`** — players within a position sorted by **season points** desc.

These two ranks feed the shared, **scoring-type-agnostic** grader `calculatePickScore(...)` in `services/draftGrading.ts`, which produces the tier movement, score, and verdict. `buildDraftReport` then does highlight selection over the graded picks. The UI consumes `GradedDraft` and is scoring-agnostic.

**Key realization:** the *only* input that must change for category leagues is `currentPositionRank`. Draft-order rank, the grader, the injury guard's structure, `buildDraftReport`, and the UI are all reused unchanged.

## Scope

**In scope (this spec):**
- `categorySeasonValue.ts` — the pure value helper.
- `loadYahooCategoryDraft.ts` — Yahoo category loader.
- Routing in `useDraftReport.ts` + its caller to branch on category vs points.
- Unit tests for `categorySeasonValue`.

**Deferred (NOT this spec):**
- **ESPN category loader.** ESPN player-level `stats[statId]` is in an id space that is misaligned for SB and W (see memory `espn-player-stat-id-space` / commit 4ffcdf5 — SB reads HR). Summed across ~14 categories the distortion is diluted, but it still builds on a known-cracked foundation. ESPN category is gated behind the id-space remap. When that lands, an `loadEspnCategoryDraft.ts` mirrors the Yahoo one.
- **Sleeper category** — rare for baseball; add later if needed.
- **Roto** — H2H-category only for now; roto grading is a separate model.

## Architecture

### 1. `src/draft/report/categorySeasonValue.ts` (new, pure)

The whole new brain. No I/O, fully unit-testable.

```ts
export interface CatValuePlayer {
  playerId: string | number
  position: string
  stats: Record<string, number>   // season per-category stats, keyed by league statId
}
export interface CatValueCat {
  statId: string
  lowerIsBetter: boolean           // ERA/WHIP/OBA → true
}

/**
 * Summed per-category z-score of each player within the given pool (the drafted
 * players). A missing/undefined stat contributes 0 (mean) for that category, never NaN.
 * lowerIsBetter cats are negated so "better" is always more-positive. A category whose
 * pool has zero variance (all equal) contributes 0 for everyone (can't differentiate).
 */
export function categorySeasonValue(
  players: CatValuePlayer[],
  cats: CatValueCat[],
): Map<string | number, number>
```

Per category: compute mean and population std across the pool; each player's z = `(v - mean) / std` (0 if std === 0), negated when `lowerIsBetter`. Sum z across cats → the player's value. Non-finite guards throughout (mirrors the win-prob NaN lessons — coerce missing/NaN stat to the pool mean, i.e. contribute 0).

### 2. `src/draft/report/loadYahooCategoryDraft.ts` (new)

Mirrors `loadYahooPointsDraft.ts`, differing only where it needs category value instead of points:

1. Fetch draft picks (same as points loader).
2. **Reuse the exact same `yahooService.getPlayerStats(seasonLeagueKey, playerKeys)` call the points loader already makes** (`loadYahooPointsDraft.ts:41`). That call already returns each player's per-category `stats` — the points loader simply reads `total_points` off it and ignores `stats`. The category loader reads `stats` instead. No new fetch, no new failure mode.
3. Read the league's categories (statId + `lowerIsBetter`) from settings / the existing category signal.
4. `catValue = categorySeasonValue(players, cats)`.
5. `currentPositionRank` = rank within position by `catValue` desc.
6. **Injury guard:** the **Yahoo points loader has no injury guard** (no games-played source is wired up — see `loadYahooPointsDraft.ts:171-174`, `incompleteCount: 0`). The Yahoo category loader matches that: no guard, all non-predraft picks graded. The median-based guard described earlier applies only to the future **ESPN** category loader (which inherits ESPN's playing-time source); it is out of scope for Yahoo-first.
7. `positionRankDrafted`, `calculatePickScore(...)`, `GradedPick` assembly, team grading — all identical to the points loader.

### 3. Routing — `src/composables/useDraftReport.ts`

`load()` currently branches on `args.platform` only. Add an `isCategory: boolean` to `args`; when `platform === 'yahoo' && isCategory`, call `loadYahooCategoryDraft` instead of `loadYahooPointsDraft`. ESPN/Sleeper category fall through to their points loaders for now (or an explicit "category report not yet available for this platform" state — see Error Handling). The caller (HistoryView) already computes an `isCategoryLeague` signal (`useIsCategoryLeague` / store) and passes it in.

## Data flow

```
draft picks + player season per-cat stats + league cats
  → categorySeasonValue()           (summed z within drafted pool)
  → currentPositionRank (by value)  + positionRankDrafted (draft order)
  → calculatePickScore()            (UNCHANGED shared grader)
  → GradedPick[] + team grades      → buildDraftReport() → same UI
```

## Error handling

- Same fetch as the points loader (`getPlayerStats`), so no new failure surface. A player whose `stats` came back empty contributes 0 across categories (pool mean) — graded like a non-producer, never NaN. If NO player has stats (whole fetch failed), all values are 0, every within-position rank ties; the loader still returns picks so `useDraftReport` renders (degenerate but honest) — matching how the points loader behaves when `getPlayerStats` returns nothing.
- `categorySeasonValue` never throws and never returns NaN: missing stat → contributes 0, zero-variance category → contributes 0 for all.
- ESPN/Sleeper category (deferred): route shows the existing empty/`no-data` state rather than a wrong points-graded report mislabeled as category.

## Testing

- **Unit (`categorySeasonValue.test.ts`):** z correctness on a known pool; `lowerIsBetter` inversion (a low-ERA pitcher ranks high); ties; a zero-variance category contributes 0; a missing stat contributes 0 (no NaN); single-player pool (std 0 → value 0).
- **Loader:** no unit tests (matches the points loaders — they're integration-tested); verified via real-league smoke on the user's Yahoo category league.

## Non-goals / YAGNI

- No new UI — the category report renders through the existing `GradedDraft` UI.
- No changes to the shared grader, `buildDraftReport`, or the points loaders.
- No ECW / matchup-sim value model (rejected in favor of retrospective season z-scores).
