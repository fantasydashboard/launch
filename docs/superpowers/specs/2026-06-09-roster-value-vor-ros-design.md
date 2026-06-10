# Roster Value: Role-Aware VOR + ROS Blend — Design

**Date:** 2026-06-09
**Branch:** `redesign/my-team-first` (local only; do not push/deploy)
**Status:** Approved in concept, ready for spec review

## Goal

Replace My Team's roster value model. Today the roster sort, drop candidates, and weak link run on `overallValue` = *mean percentile across only the categories a player contributes to*. That rewards narrow specialists and undersells balanced studs (Corbin Carroll lands mid-pack). Replace it with a **role-aware value-above-replacement** score that rewards breadth and compares roles fairly, computed on **projected full-season** stats (FanGraphs where a player matches, season-to-date extrapolated otherwise). Cross-platform (Yahoo + ESPN).

## Why the current model is wrong

`overallValue` averages a player's per-category percentiles over only the categories they participate in. A specialist elite in 2 categories gets a high mean; a player good across 8 gets a middling mean. Averaging hides breadth. The fix is to **sum** contributions, not average them, and to measure each contribution as distance above a replacement baseline (z-score), so totals are comparable across players and roles.

## Architecture

The analytics stay pure and testable. Two new pure modules plus a thin data layer, wired into the existing My Team surfaces. The change has a clean seam — an `effectiveStats` input — so the value model can ship first on season-to-date stats, and the FanGraphs blend layers on without touching the value math.

```
effectiveStats (per player, per statId)         ← seam: YTD first, FG-blend later
        │
        ▼
computeRosterValue(pool+position, myKeys, catSpecs)   ← role-aware VOR (pure, TDD)
        │  valueScore (sum of clamped z-scores), per-cat z, tiers
        ▼
roster sort · drop candidates · weak link · contribution chips
```

### Component 1: category classification — `src/myteam/categorySide.ts` (pure)
`classifyCategory(displayName, lowerIsBetter)` → `{ side: 'hit' | 'pit'; isRatio: boolean }`.
- `side` from a known pitching-category name set (ERA, WHIP, W, L, SV, HLD, SVHD, K/BB, IP, GS, BF, OBA, QS, BS, FIP, plus "K" only when the category is pitching-side, etc.), reusing the same display-name classification `projectionService` and the Projections view already use. Everything else is `hit`.
- `isRatio` for rate categories (ERA, WHIP, AVG, BA, OBP, SLG, OPS, OBA, FIP, K/9, BB/9, FPCT…). Ratio categories are volume-weighted in the value model.

### Component 2: role-aware value model — `src/myteam/value.ts` (pure, replaces `overallValue`)
`computeRosterValue(pool, myPlayerKeys, catSpecs)` where:
- `pool: { playerKey, position, stats }[]` — **`position` is new** (threaded from both platforms).
- `catSpecs: { statId, lowerIsBetter, side, isRatio, volumeStatId? }[]` — `volumeStatId` names the volume stat for a ratio cat (IP for pitching ratios, PA/AB for batting ratios) so ratios can be volume-weighted.

For each category:
1. Determine **participants**: players whose role matches the category `side` (hitters in hit cats, pitchers in pit cats), inferred from `position` (`SP`/`RP`/`P` ⇒ pitcher; else hitter; two-way players participate in both).
2. Compute the participant pool's mean and std for that category (direction-aware via `lowerIsBetter`). For **ratio** categories, weight each player by their volume (`stats[volumeStatId]`) so a 1-inning 0.00 ERA doesn't dominate — mirrors `buildBaselines` in the Projections view (volume-weighted mean/std).
3. Each participant's category contribution = **clamped z-score** `clamp((value − mean) / std, −3, 3)`, sign-flipped for `lowerIsBetter` so lower-is-better cats yield positive z when below the mean.

Per player:
- `valueScore` = **sum of clamped z-scores across the categories they participate in**. Centered at zero per category, so a replacement-level player sums ≈ 0 and SP/RP/hitters compare fairly; breadth accumulates.
- Per-category `tier` (plus/neutral/minus) and `percentile` retained for the existing chips (now computed on effective stats), so the chip UI is unchanged.
- `topStatId` = highest-z participated category.

Output extends the existing `PlayerContribution` so downstream code keeps working: add `valueScore: number`; keep `contribs`, `plusCount`, `minusCount`, `topStatId`. `overallValue` is removed as the sort/drop driver and replaced by `valueScore` everywhere it was used.

### Component 3: effective stats — `src/myteam/effectiveStats.ts` (pure transform)
`toEffectiveStats(rawStats, fgProjection | null, catSpecs, seasonFractionComplete)` → `Record<statId, number>` of **projected full-season** values, so every player is on one scale:
- **Counting cat**: matched + FG covers it ⇒ FG full-season total; else YTD total × `1 / seasonFractionComplete` (extrapolate to full season).
- **Ratio cat**: matched ⇒ FG projected rate; else YTD rate (already scale-free). Its volume stat is likewise projected full-season (FG volume, or YTD volume extrapolated).

`seasonFractionComplete` is a per-sport scalar (reuse the Projections view's games-played/total constants; baseball ≈ 97/162). The exact value only shifts all counting stats by a global constant, so it does not affect z-score ranking; it exists to keep matched (FG full-season) and unmatched (extrapolated) players on the same scale.

**Slice ordering:** the value model ships first with `effectiveStats = rawStats` (pure season-to-date, `seasonFractionComplete = 1`, no FG). The FanGraphs blend is the final layer: pass real `fgProjection` per player and the season fraction. This isolates the correctness-sensitive value math from the data-matching complexity.

### Component 4: data layer — extend `useMyRoster` / the ESPN composable
- Add `position` to the normalized pool players (Yahoo `getAllRosteredPlayers` and ESPN rosters both already carry position).
- Load FanGraphs projections once via the existing `loadProjectionData()` + `buildPlayerMatchers()` / `matchPlayer()` in `src/services/projectionService.ts`, match each pool player by `full_name` + `mlb_team`, and attach the matched `FGProjection | null`. Unmatched ⇒ null ⇒ YTD fallback. This runs for **both** platforms (the matcher is name-based and platform-agnostic); Yahoo simply has whatever match rate it has.

### Component 5: wiring — `MyTeamView.vue`, `RosterPanel.vue`, `dropCandidates.ts`
- `MyTeamView` builds `catSpecs` (statId + lowerIsBetter + side + isRatio + volumeStatId) once, computes `effectiveStats` per pool player, and calls `computeRosterValue`.
- `computeDropCandidates` switches from `overallValue` thresholds to `valueScore`: rank by `valueScore` asc; drop candidates are the lowest, never a player above a sensible cutoff; weak link = lowest `valueScore`. Thresholds re-derived for the z-sum scale (a replacement player ≈ 0; clearly-negative ⇒ droppable) and TDD'd.
- `RosterPanel` sorts by `valueScore` desc; chips unchanged (already capped).

## Cross-platform

The value model and effective-stats transform are platform-neutral. The FG blend applies wherever a player matches FanGraphs (ESPN and Yahoo); unmatched players fall back to extrapolated YTD with no downside. This preserves UFD's cross-platform parity.

## Edge cases / error handling

- **No FG match** ⇒ YTD-extrapolated values (the default path). No crash, no gap.
- **FG can't project a category** (exotic cats) ⇒ that category falls back to YTD for that player.
- **Ratio with tiny volume** ⇒ down-weighted by volume in the z-score; never dominates.
- **Single participant or zero std** in a category ⇒ z-score 0 (avoid divide-by-zero); category contributes nothing rather than NaN.
- **Two-way players** (e.g. Ohtani) participate in both sides.
- **FanGraphs table empty / query fails** ⇒ all `fgProjection = null` ⇒ behaves exactly like the season-to-date value model. The feature degrades to slice-one behavior, never breaks.

## Testing

- `categorySide.ts`, `value.ts`, `effectiveStats.ts`: unit tests (TDD). Cover: breadth beats specialization (a +1z-in-6 player outranks a +2.5z-in-1 player), role fairness (a strong RP isn't buried under hitters), volume-weighted ratios (tiny-sample scrub doesn't top ERA), direction (lowerIsBetter flips sign), FG-matched vs YTD-extrapolated on one scale, no-match and empty-table fallbacks.
- `dropCandidates`: re-TDD on `valueScore` (studs never flagged; only genuinely-negative players; weak link = lowest).
- Existing suite stays green; the 66 current tests must not regress.
- Visual check on the real ESPN 20-cat league and a Yahoo league: balanced studs rank at the top, specialists no longer outrank them, drops are sane, ERA/WHIP read correctly.

## Out of scope

- Per-player schedule / games-remaining (no data; we use a sport-level season fraction).
- Injury/IL, buy-low/sell-high, above/below-expectation tags (separate "roster intelligence" item; note: `projectionService.computeLuck` already exists to power those later).
- Players page, Matchup page.
- Non-baseball sports verification (the model is sport-generic, but baseball is the only one verified this slice).

## Files (anticipated)

- Create: `src/myteam/categorySide.ts`, `src/myteam/value.ts`, `src/myteam/effectiveStats.ts` (+ `__tests__/`)
- Modify: `src/myteam/types.ts` (add `valueScore`), `src/myteam/dropCandidates.ts` (use `valueScore`), `src/composables/useMyRoster.ts` + `src/composables/useEspnCategoryTeamData.ts` (add `position`, attach FG match), `src/views/MyTeamView.vue` (build catSpecs + effectiveStats, call `computeRosterValue`), `src/components/myteam/RosterPanel.vue` (sort by `valueScore`).

## Constraints

- Local only; branch `redesign/my-team-first`. No push, no deploy.
- No banned patterns; no em dashes.
- Honest copy: where projections are used the value is forward-looking; where not, it is season-to-date extrapolated. Do not claim more than the data supports.
