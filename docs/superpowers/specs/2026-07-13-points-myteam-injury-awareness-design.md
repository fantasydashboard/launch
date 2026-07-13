# Points My Team — Injury Awareness (Phase 2)

**Date:** 2026-07-13
**Branch:** `redesign/my-team-first` (LOCAL only — no push/prod until the user tests with real users)
**Status:** Design — approved shape, pending spec review
**Predecessor:** Phase 1 (`2026-07-13-points-myteam-season-outlook-design.md`, built). This is Phase 2 of the points-league My Team reconciliation.

## Problem

Points-league My Team lists IL/DTD players (e.g. deGrom DTD, Fried/Glasnow IL) with **no visible flag** and still counts them at **full projection**. That inflates every downstream number Phase 1 just made honest: roster tiers, the "Roster talent" rank, the team strength that feeds `simulatePlayoffOdds`, and therefore the projected seed and playoff odds.

The injury data largely exists but is discarded at the model boundary:
- **Yahoo** (`useYahooLeaguePool`): the pool carries a full status string (`IL10`/`IL60`/`NA`/`DTD`/`GTD`) and a boolean `onIL` (via `isYahooIL`, which is IL-only and excludes DTD).
- **ESPN** (`useEspnPointsTeamData` → `mapRostersToPool`): the source player carries `injuryStatus` (`OUT`/`DAY_TO_DAY`/`TEN_DAY_DL`/`SIXTY_DAY_DL`/…) and the mapper sets `onIL` from the reserve `lineupSlot` — but does **not** put the health string on the pool player.
- `PointsPoolPlayer` only has a binary `onIL?`, and `buildPointsTeam` squashes even that to `status: 'IL'` — so **DTD is invisible and IL severity is lost**, and nothing discounts the projection.

## Scope

Make points My Team injury-aware: carry real status → flag it on the roster → discount the projection so it flows coherently into talent, strength, and odds.

**In scope:**
1. A pure injury normalizer (status vocab → tier → discount).
2. Plumb the raw status onto `PointsPoolPlayer` from both platforms.
3. Apply the discount at one point in `buildPointsTeam` so all downstream values update.
4. IL/DTD badges + an injured-count note in `PointsMyTeamView`.

**Out of scope (deliberate):** return-date modeling, IL-severity-scaled discounts (considered and rejected — relies on return-window assumptions the data doesn't give us), and any change to Today/Matchup lineup logic. Phase 3 (Today revival) is separate.

## Approach

**Discount policy (approved):** a flat two-tier haircut applied to rest-of-season projected points — `healthy ×1.0`, `DTD ×0.90`, `IL ×0.50`. One tunable constant per tier, no per-stint return-date guessing. The per-game rate is left as the healthy "when he plays" number; only the ROS **total** is haircut, because the discount models reduced availability over the rest of the season, not a worse rate.

### New — `src/myteam/injuryStatus.ts` (pure, TDD)

```ts
export type InjuryTier = 'healthy' | 'dtd' | 'il'

/** Normalize a platform injury status string (+ onIL flag) to a tier. */
export function injuryTier(rawStatus: string | undefined | null, onIL?: boolean): InjuryTier

/** ROS points multiplier for a tier. Tunable. */
export function injuryDiscount(tier: InjuryTier): number  // 1.0 | 0.90 | 0.50
```

Rules (case-insensitive, cover both platforms):
- **`il`**: `onIL === true`; OR status matches IL/reserve vocab — `IL` prefix, `NA`, `DL`, `OUT`, `SUSP`, `*_DL` (ESPN `TEN_DAY_DL`/`SIXTY_DAY_DL`), `60`/`10-DAY` forms. (Reuses the intent of `isYahooIL`/`isEspnIL` but as one predicate over the raw string.)
- **`dtd`**: not IL, but status matches `DTD`, `DAY_TO_DAY`, `GTD`, `QUESTIONABLE`, `Q`, `DD`.
- **`healthy`**: empty, `ACTIVE`, `NORMAL`, unknown.

`injuryDiscount`: `healthy → 1.0`, `dtd → 0.90`, `il → 0.50`. Constants named `DTD_DISCOUNT`/`IL_DISCOUNT` for easy tuning.

### Carry the status through — `PointsPoolPlayer` + both composables + the ESPN mapper

- Add `status?: string` (raw platform injury string) to `PointsPoolPlayer` (in `src/myteam/pointsTeam.ts`) and to the ESPN mapper's output type in `src/myteam/espn/mapRosters.ts` (`PoolPlayer`), keeping the existing `onIL?`.
- **Yahoo** (`useYahooLeaguePool`): the pool row already has `status`; pass it onto the pool player.
- **ESPN** (`mapRostersToPool` in `mapRosters.ts`): set `status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : ''` on the pooled player (the sibling `mapRosterToPlayers` already uses exactly this expression, so it's a proven read). Keep `onIL: isEspnIL(p.lineupSlot)`.

### Discount at one point — `buildPointsTeam`

Where `buildPointsTeam` computes a player's ROS `points`, multiply by `injuryDiscount(injuryTier(player.status, player.onIL))`. This is the single insertion that propagates to:
- `rosterRows[].points` (roster display + tiers),
- `slotRanks` (the slot spine),
- `standings[].startingPoints` (team strength) — which `useSeasonOutlook` feeds into `simulatePlayoffOdds`, so **projected seed + playoff odds** update,
- `myLineupRank` (the "Roster talent" line).

Store the resolved tier on the row (`PointsRosterRow.injury?: InjuryTier`) so the view can badge without re-deriving. Leave `perGame` computed from healthy rate (only `points` is discounted).

Cross-surface note: `buildPointsTeam` is also consumed by `LeagueView` (points strength) and Power Rankings. Those strengths become injury-aware too — an intended, consistent improvement, not a regression. Call this out; no separate change needed there.

### Surface it — `src/views/PointsMyTeamView.vue`

- On each roster row, when `row.injury` is `il` or `dtd`, render a badge next to the name/position: **IL** (red — `bg-[#FF5C5C]/15 text-[#FF5C5C]`) or **DTD** (amber — `bg-amber-500/15 text-amber-400`), styled like the existing specialist chips.
- Add an injured-count line under the roster header when any are hurt: e.g. `2 injured — projections discounted (IL ×0.5, DTD ×0.9)`.
- The projected-points number already reflects the haircut (no separate view math).
- Extend `?ptsaudit` to print each audited player's `injury` tier + applied discount.

## Data flow

```
platform status ─► PointsPoolPlayer.status/onIL ─► buildPointsTeam
   (Yahoo r.status / ESPN injuryStatus)              │
                                                      ├─ injuryTier → injuryDiscount ×points
                                                      ├─ rosterRows (+injury tier)  ─► view badges
                                                      └─ standings.startingPoints ─► useSeasonOutlook
                                                                                     └─ simulatePlayoffOdds → seed/odds
```

## Error handling / edge cases

- **Unknown / empty status, healthy:** tier `healthy`, discount 1.0 — no-op, no badge.
- **`onIL` true but status empty** (ESPN reserve-slot with no health string): still tier `il` (onIL wins).
- **Status present but player not on this team's active roster:** irrelevant — discount is per-player wherever they sit; a benched IL player is discounted the same, which is correct for talent/strength.
- **DTD that clears:** next data refresh returns `healthy`; nothing sticky.
- **Missing `status` field on older cached pools:** `status` optional → `undefined` → treated healthy; the Yahoo cache already bumps its version on status changes, and a stale ESPN pool simply under-flags until refresh (safe degradation, never a crash).

## Testing

- `src/myteam/__tests__/injuryStatus.test.ts` — Yahoo vocab (`IL10`/`IL60`/`NA`/`DTD`/`GTD`) and ESPN vocab (`OUT`/`DAY_TO_DAY`/`SIXTY_DAY_DL`/`ACTIVE`/``) → correct tiers; `onIL` true forces `il`; `injuryDiscount` returns 1.0/0.90/0.50.
- `src/myteam/__tests__/pointsTeam.injury.test.ts` (or extend an existing pointsTeam test) — a roster with one IL, one DTD, one healthy player at equal base projection: IL row `points` ≈ base×0.5, DTD ≈ base×0.9, healthy unchanged; each row carries the right `injury` tier; the injured team's `standings.startingPoints` is lower than the same roster treated healthy.
- Manual: `?ptsaudit=1` shows each player's tier + discount; badges render; the Season Outlook seed/odds shift when a star is IL.

## Follow-on

Phase 3 (Today revival — wire points projections into `dailyCandidates`) remains the last piece of the reconciliation, its own spec.
