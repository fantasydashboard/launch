# Today Board — Points-League Scoring (Phase 3)

**Date:** 2026-07-13
**Branch:** `redesign/my-team-first` (LOCAL only — no push/prod until the user tests with real users)
**Status:** Design — approved shape, pending spec review
**Predecessor:** Phase 1 (Season Outlook) + Phase 2 (Injury awareness) of the points-league My Team reconciliation, both built. This is Phase 3 — the last piece.

## Problem

The **Today** board (the daily start/stream optimizer, first nav tab) is largely inert on **points** leagues. `dailyCandidates` (`src/myteam/yourMove/dailyCandidates.ts`) scores every play's `addDelta` via `projectGames`/`projectStarts(stats, …, cats, …)` — a **category** delta. On points leagues `catSpecs` comes back empty (a pre-existing app-wide gap: ESPN's category loader bails unless `H2H_CATEGORY`; Yahoo derives cats from `stat_winners`, absent on points matchups). So candidates **enumerate** (plays appear on the board) but every `addDelta` is empty → `baseValue` sums to ~0 → the board can't rank anything. Category leagues work fully; points leagues (most of the user's) show a flat, tied board.

## Scope

Give each daily candidate a **projected-daily-points** base value on points leagues, so the board ranks. Enumeration, matchup multiplier, and board layout already work and are untouched.

**In scope:**
1. A pure `pointsDailyValue` — a candidate's projected per-game points from the FG projection + league weights.
2. Wire it into `useToday`'s existing `isPointsLeague` base-value branch (source league `weights`; `matchFG` is already present).
3. Filter unprojectable candidates (points ≤ 0) so the board isn't a wall of unmatched names.
4. Skip injured (OUT/IL) free-agent candidates — coherent with Phase 2.

**Out of scope (deliberate):**
- Reviving `useYourMove` / `useMatchupBattlePlan`'s daily views on points (separate view work; the fix stays in `useToday` rather than changing `dailyCandidates`' signature and disturbing the category path).
- Vegas implied totals / platoon splits (the Today board's own deferred Phase 2).

## Approach

**Value basis (approved):** absolute projected daily points — each play scored by its own projected fantasy points today (per-game points × 1 game/start; a pitcher can start at most once in a single day, so no count is needed), then × the existing clamped 0.7–1.3 park/opponent-SP multiplier in `scoreToday`. `scoreToday`'s 0–6 bucket bar is derived from the multiplier alone (`(mult − 0.7)/0.6 × 6`), independent of base magnitude — so points-sized bases need no calibration; `value = base × multiplier` simply scales.

### New — `src/today/pointsDailyValue.ts` (pure, TDD)

```ts
import { projectPlayerPoints } from '@/myteam/pointsValue'
import type { FGProjection } from '@/services/projectionService'

/**
 * A daily play's points-league base value = the player's projected per-game fantasy points.
 * Reuses the same FG-match → projectPlayerPoints path buildPointsWire uses for free agents.
 * Returns 0 when the player has no real MLB team ('FA'/blank) or no FanGraphs match — those
 * players can't be projected and must sink out of the board (mirrors the Wire's points>0 filter).
 */
export function pointsDailyValue(
  name: string,
  team: string | undefined,
  matchFG: (p: { full_name?: string; mlb_team?: string }) => FGProjection | null,
  weights: Record<string, number>,
): number {
  const hasTeam = !!team && team.toUpperCase() !== 'FA'
  const fg = hasTeam ? matchFG({ full_name: name, mlb_team: team }) : null
  if (!fg) return 0
  const pp = projectPlayerPoints(fg, weights)
  return pp.games > 0 ? pp.total / pp.games : 0
}
```

### Wire into `useToday`

- `matchFG` is already built in `useToday` (`matchFGRef`, ~line 192) — reuse it.
- Add league scoring weights via `useLeagueScoring` (the same composable the points Wire/My Team use): a `weights` ref, loaded alongside the existing sources.
- In the existing `baseValue`/scoring path (~line 244–290), branch on `isPointsLeague`:
  - **points:** `base = pointsDailyValue(candidate.player.name, candidate.player.team, matchFG, weights)`.
  - **category:** unchanged (the current catSpecs-delta sum).
- Filter candidates whose points-league `base` is 0 (unprojectable) before they reach the board, so the points board mirrors the Wire's projectable-only list.
- Skip injured free-agent candidates: `MoveCandidate` itself carries no status, but `useToday` already holds the source `freeAgents` (each an `AvailablePlayer` with `.status`). Build a `status`-by-`playerKey` map from `freeAgents` and, in the points branch, zero/skip any candidate whose status is OUT/IL (reuse the Wire's `isOut` or `injuryTier`), so a hurt player is never surfaced as a top stream. This stays entirely in `useToday` — no change to `dailyCandidates`/`MoveCandidate`. (Bench/roster injuries are already surfaced by `openSlots`.)

### Data flow

```
candidate (name, team, side)
   │  (points league)
   ├─► matchFG(name, team) ─► FGProjection ─► projectPlayerPoints(fg, weights) ─► per-game points
   │                                                                                    │
   └─► base ───────────────────────────────────────────────────────────────────────────┤
                                                                                        ▼
                                                          scoreToday(base, park/opp) ─► todayBoard ranks
```

## Error handling / edge cases

- **No FG match / no team / 'FA':** `pointsDailyValue` returns 0 → candidate filtered out. No crash, no wall of zero-point names.
- **Weights not yet loaded:** `weights` empty → `projectPlayerPoints` yields 0 → board shows its existing loading/empty state rather than a bogus ranking. The board should not render a points ranking until weights are present.
- **Category league:** the `isPointsLeague` branch is not taken — behavior is byte-for-byte unchanged.
- **Non-baseball / off-day / Sleeper:** the existing `useToday` scope guards still short-circuit before scoring.
- **Pitcher vs hitter:** `projectPlayerPoints` already disambiguates side from `fg.player_type`; per-game uses batter G / pitcher GP (appearances), so an SP's per-game ≈ per-start — correct for a single day.

## Testing

- `src/today/__tests__/pointsDailyValue.test.ts` — hitter with an FG projection → `total/games`; an SP → per-start magnitude; `team: 'FA'` → 0; `team` blank → 0; `matchFG` returns null (unmatched) → 0; empty weights → 0.
- Manual smoke (required — the composable branch): open the **Today** board on a points league; confirm plays now carry distinct projected-points values and rank (hero = highest-value play), not a flat tie; the ▓▓▓ matchup bar still reflects park/opp; unprojectable/'FA' names don't clutter the board; an OUT free agent isn't surfaced as a stream. Check both an ESPN and a Yahoo points league. Confirm a category league's board is unchanged.

## Follow-on

With this, the points-league My Team reconciliation is complete (Season Outlook + Injury awareness + Today). Remaining separately-tracked queue item: the Draft Report in History spec (already written, unbuilt). A later, optional consolidation could push `pointsDailyValue` into `dailyCandidates` so `useYourMove`/`useMatchupBattlePlan` daily views also rank on points.
