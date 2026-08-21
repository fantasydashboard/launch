# Board Market Signals — Design

**Date:** 2026-08-21
**Status:** Approved for planning

## Goal

Bring the structure of a hand-researched draft guide — tier cliffs, and standing
VALUE / FADE / injury tags — onto the Draft Room's Board tab, computed entirely
from data we already fetch.

## What this is not

The source document that prompted this carries a narrative "read" for each
player: contract news, coaching changes, quotes from beat reporters. That is
reported fact and human judgement. No amount of computation produces it, and
auto-publishing machine-written claims about real people's injuries and contracts
was explicitly rejected. **No prose is generated, stored, or displayed.** Tier
names ("THE ANCHORS") and cross-source consensus notes ("Draft Sharks and
FantasyPros both draw a four-man tier") are prose and are out of scope.

## There is no pipeline

The original request was for a daily job that pulls research and pushes it to
every user. Restricted to computed signals, that requirement dissolves:

| Signal | Source | Freshness |
|---|---|---|
| Injury status | Sleeper `/players/nfl` → `injury_status` | In-memory cache only; refetched every session |
| ADP | `fetchSeasonAdp` → Sleeper season projections | Live call per draft load |
| Projected points | `fetchSeasonProjectionStats` | Live call per load |

Nothing is scheduled, stored, or published. Every user computes identical
signals from the same feeds whenever they open the app. No cron, no table, no
per-user cost, no stale content. The scheduled job, the content table and the
review queue were all costs of the prose option.

## Signals

### 1. Market disagreement — VALUE / FADE

A **standing** property of a player, true whether or not you are on the clock.

```
disagreement = adpRank − projRank        // positive: we rank him higher than the market
VALUE  when disagreement ≥ teams         // we have him a full round earlier
FADE   when disagreement ≤ −teams        // the market has him a full round earlier
```

`projRank` and `adpRank` are already computed inside `buildBoard` for the upside
term; this reuses them rather than deriving a second ranking.

**Why one round as the threshold.** It is the unit drafters already think in, it
scales itself to league size without a tuning constant, and it keeps badges rare.
A badge on every row carries the same information as a badge on none — the same
reasoning that gated the slot-rank colours.

The magnitude is displayed alongside the badge in rounds to one decimal
(`1.4 rounds early`), so the number behind the badge is always visible.

### 2. FELL — the existing pick-relative flag, renamed

`buildBoard` already flags a player as `value` when `currentOverallPick > adp +
VALUE_PICKS`. That means *he slid past his ADP to where you are sitting* — a
different statement from market disagreement, and only meaningful mid-draft.

Both signals are kept. The pick-relative one is renamed **FELL** so that two
different meanings never share the word "value" on the same row. The existing
`reach` flag is dropped: it is the mirror of FADE, measured worse.

### 3. Injury status

Sleeper supplies `injury_status` as one of `Questionable`, `Doubtful`, `Out`,
`IR`, `Sus`. The badge shows the actual word rather than a flat "HURT", because
those states differ materially and the distinction costs nothing.

We cannot reproduce "out of the 20 August joint practice with groin soreness, a
third straight week". The badge says `Questionable` and stops.

### 4. Tier cliffs

`assignTiers` cuts tiers at the N largest gaps but never reveals where. A cliff
row is rendered between consecutive tiers in the visible list, carrying the
points either side and the drop between them:

```
CLIFF · after Bijan Robinson
337.9 and 334.7, then 298.9 — a 35.8 point drop
```

**Measured in `projected` points, never in `value`.** When a ranking list is
active, `value` is re-seated into that list's order; a drop measured there cannot
be checked against the points column beside it. This is the same defect that once
printed "next tier drops 26 pts" above rows reading 242 and 227.

Cliffs are computed over the currently visible rows, so they follow the position
filter exactly as tier headers already do.

## Architecture

### New pure modules

**`src/draft/room/marketDisagreement.ts`**
- `marketDisagreement({ projRank, adpRank, teams }): { rounds: number; flag: 'value' | 'fade' | '' }`
- No Vue, no I/O. Testable in isolation, reusable by the Wire later.

**`src/draft/room/tierCliffs.ts`**
- `tierCliffs(rows, tierOf): Cliff[]` where
  `Cliff = { afterIndex: number; abovePoints: number; belowPoints: number; drop: number; aboveName: string }`
- Takes the already-ordered visible rows and a tier lookup, so it works
  identically for our tiers and for a ranking list's own tier column.

### Modified

**`src/draft/room/board.ts`**
- `BoardInput` gains `teams: number`.
- `BoardRow` gains `disagreementRounds: number` and `marketFlag: 'value' | 'fade' | ''`.
- `BoardRow.flag` narrows from `'value' | 'reach' | ''` to `'fell' | ''`.
- `injuryStatus?: string | null` carried through from `AvailablePlayerRow`.

**`src/composables/useDraftRoom.ts`**
- `availablePlayers` reads `injury_status` from the Sleeper player map, alongside
  the `depth_chart_order` it already reads.
- Passes `teams: effectiveTeams.value` into `buildBoard`.

**`src/draft/room/replay.ts`**
- Passes `teams` into its `buildBoard` call. The replay must stay identical to
  the live path or it verifies nothing.

**`src/views/DraftRoomView.vue`**
- Renders the three badges on Board rows and cliff rows between tier headers.

### Badge styling

Badges reuse the semantic colours already established on this screen: emerald
for VALUE and FELL, red for FADE, and the neutral border tint for injury status,
which is a fact rather than a judgement. Position colours are untouched — they
live in `positionColors.ts` and deliberately occupy different hues.

## Error handling

- **No ADP for a player**: no market badge. He is unpriced, not disagreed with.
- **No projection**: he is already filtered off the board upstream (`pointsRos > 0`).
- **Missing `injury_status`**: no badge. Absence is not health, but claiming
  health we do not have is worse than saying nothing.
- **Fewer than two tiers visible**: no cliff rows.
- **`teams` absent or zero**: market badges are suppressed rather than computed
  against a nonsense threshold.

## Testing

Unit tests, following the existing `src/draft/room/__tests__/` pattern:

- `marketDisagreement`: badge at exactly one round, none just below it, symmetry
  between VALUE and FADE, threshold scaling with league size, no badge without ADP.
- `tierCliffs`: drop computed from `projected` and not `value`, one cliff per tier
  boundary, none when a single tier is visible, follows a filtered list.
- `board`: `flag` is `fell` and never `value`; a player can hold FELL and FADE at
  once without contradiction; `teams` absent suppresses market badges.

Every number rendered must be checkable against the PTS column on the same row.

## Out of scope

- Narrative reads, tier names, cross-source consensus
- Any scheduled job, content table, or admin review queue
- Changes to how the board is ordered or scored — these are display signals only,
  and none of them feeds `score`
