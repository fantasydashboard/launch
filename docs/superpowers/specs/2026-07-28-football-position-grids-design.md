# Football Position Grids (Football Foundation, Phase 2b) — Design

**Goal:** Make the position-based grids — League landscape heatmap, positional depth (surplus/need), and the Trades position/fit grid — use **football** position rows (QB/RB/WR/TE) and flex-eligibility, instead of baseball positions + pitcher-role logic. Builds on phase 2a (`parseRosterSlots` already returns football roster shapes).

**Status:** Approved design. Local-only per the standing no-deploy rule.

---

## Scope

**In scope (this spec):**
- Extend `FLEX_ELIGIBILITY` (`rosterSlots.ts`) with football flex slots.
- Extend `SURPLUS_FLEX` (`positionalLandscape.ts`) with football flex slots.
- Add `positionRowsFor(sport)` and thread `sport` into `useLeagueLandscape` and `pointsTradeLandscape` so they use football rows for football leagues.
- Unit tests for `coversSlot` + football flex, `positionRowsFor`, and baseball no-regression.

**Out of scope (Phase 3):**
- Wiring the football **projection/value** into these grids — the cell *values* still come from the baseball value model until Phase 3. 2b fixes only the **position axis**.
- Any changes to the surplus/need depth engine internals (`positionalLandscape.ts` assignment) — it already derives positions from the parsed roster slots + the flex tables, so extending the tables is enough.

## Background

Shared, already-generic eligibility primitives live in `src/trades/positionalLandscape.ts`:
- `slotAccepts(slot)` → `FLEX_ELIGIBILITY[slot.toUpperCase()] ?? [slot]` (flex slots expand; concrete slots are themselves).
- `coversSlot(eligiblePositions, slot)` → case-insensitive "can this player fill this slot".
- `SURPLUS_FLEX` — the set of "overflow" slots that never DEFINE surplus at a concrete position (baseball: UTIL/DH/IF/MI/CI/2B/SS/1B/3B/P).

Two consumers hardcode a baseball position-row list:
- `src/composables/useLeagueLandscape.ts:28` — `POSITION_ROWS = ['C','1B','2B','3B','SS','OF','SP','RP']`, and a `covers(p,pos)` that special-cases `SP/RP` via `pitcherRoleFor`; hitters fall through to `coversSlot`.
- `src/myteam/pointsTradeLandscape.ts:15` — `POSITIONS = ['C','1B','2B','3B','SS','OF','SP','RP']`.

Because `coversSlot`/`slotAccepts`/the depth engine all read `FLEX_ELIGIBILITY` + `SURPLUS_FLEX`, adding football entries to those two tables makes the engine handle football flex slots with no other change. Football players never trigger the `SP/RP` pitcher branch (`isPitcherElig` is false for them; rows are QB/RB/WR/TE), so `covers()` flows through the generic `coversSlot` path unchanged.

## Architecture

### 1. Football flex entries (merge into existing tables — keys don't collide)

`FLEX_ELIGIBILITY` (`src/trades/rosterSlots.ts`) — add:
```ts
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
```
`SURPLUS_FLEX` (`src/trades/positionalLandscape.ts`) — add `'FLEX'`, `'SUPER_FLEX'` to the set.

### 2. `positionRowsFor(sport)` helper

New export in `src/trades/positionalLandscape.ts` (colocated with the other shared positional primitives):
```ts
const NFL_POSITION_ROWS = ['QB', 'RB', 'WR', 'TE']
const MLB_POSITION_ROWS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']
/** Concrete positions worth ranking/comparing for a sport (flex/util slots are overflow,
 *  not a position you target; football K/DEF are low-value / no-projection in v1). */
export function positionRowsFor(sport: string): string[] {
  return sport === 'football' ? [...NFL_POSITION_ROWS] : [...MLB_POSITION_ROWS]
}
```

### 3. Thread `sport` into the two consumers

- **`useLeagueLandscape.ts`:** replace the module-level `POSITION_ROWS` const usage with `positionRowsFor(leagueStore.activeSport)` (read the active sport from the league store inside the composable). The `covers(p,pos)` function is unchanged — its `SP/RP` branch is simply never reached for football rows.
- **`pointsTradeLandscape.ts`:** add a `sport: string` parameter (or read it where it's already wired) and replace the `POSITIONS` const with `positionRowsFor(sport)`. Its "positions actually present in the league" intersection then naturally yields the football positions present.

## Data flow

```
sport (leagueStore.activeSport / param)
  → positionRowsFor(sport)                     → ['QB','RB','WR','TE'] for football
  → for each row: coversSlot(player.elig, row) → generic, FLEX_ELIGIBILITY-driven
     (+ FLEX/SUPER_FLEX slots resolve via the new flex entries)
  → per-team best body / surplus / need per position
```

## Error handling

- Unknown `sport` → treated as baseball (safe default), matching phase 2a.
- A player with no eligible positions → covers nothing (existing behavior).
- Football flex slot with an unknown alias → `slotAccepts` returns `[slot]` (self), harmless.

## Testing

Unit tests:
- **`positionalLandscape.test.ts`** (extend if present, else create): `coversSlot(['RB'], 'FLEX')` → true; `coversSlot(['QB'], 'FLEX')` → false; `coversSlot(['QB'], 'SUPER_FLEX')` → true; `coversSlot(['QB'], 'QB')` → true; `coversSlot(['WR'], 'RB')` → false. Baseline unchanged: `coversSlot(['3B'], 'UTIL')` → true, `coversSlot(['SP'], 'P')` → true.
- **`positionRowsFor`**: `'football'` → `['QB','RB','WR','TE']`; `'baseball'`/unknown → the MLB list.
- No regression: the existing `rosterSlots.test.ts` (10 tests) still pass (adding FLEX/SUPER_FLEX keys to `FLEX_ELIGIBILITY` doesn't change baseball parsing).

## Non-goals / YAGNI

- No K/DEF/IDP rows (skill positions only, matching phase-1 projection scope).
- No value/projection wiring (Phase 3).
- No change to `covers()`' pitcher logic (untouched; unreached for football).
