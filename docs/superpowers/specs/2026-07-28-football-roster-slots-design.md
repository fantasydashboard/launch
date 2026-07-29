# Football Roster-Slot Parsing (Football Foundation, Phase 2a) — Design

**Goal:** Teach `parseRosterSlots` — the one function that reads a league's starting-lineup shape — to understand **football** (QB/RB/WR/TE/FLEX/K/DEF) across ESPN, Yahoo, and Sleeper, instead of falling back to a baseball roster shape.

**Status:** Approved design. Local-only per the standing no-deploy rule. This is the shared keystone that the position-grid views (phase 2b) and the football value model consume.

---

## Scope

**In scope (this spec):**
- Make `parseRosterSlots(platform, settings, sport)` sport-aware with a football branch.
- Football ESPN slot-id→position map, football default roster, football flex slot handling.
- Add **Sleeper** roster parsing (currently only Yahoo/ESPN are handled) — works for both sports.
- Baseball outfield-folding runs for baseball only.
- Unit tests: football parse on each platform + baseball no-regression.

**Out of scope (later):**
- **Flex-eligibility matching** (which concrete players fill a FLEX/SUPER_FLEX slot) and the **display grids** (League landscape, positional strength, trade radar) — phase 2b.
- Threading the real `sport` through the existing callers — they keep passing baseball (via the default) until the value-model phase makes them sport-aware. The football branch is exercised by unit tests now.
- K/DEF *projections* (phase-1 scope note) — but K/DEF roster *slots* ARE parsed here (roster shape ≠ projection coverage).

## Background

`src/trades/rosterSlots.ts` exports `parseRosterSlots(platform, settings)` → `Record<position, count>` of a league's STARTING slots (bench/IL excluded). It's consumed by `useYahooLeaguePool`, `useEspnPointsTeamData`, `useEspnCategoryTeamData`, `useMyRoster` — all baseball-context today, all calling `(platform, settings)`. It currently hardcodes baseball: `ESPN_SLOT_TO_POS` (0:C…15:RP), `DEFAULT_SLOTS` (baseball roster), and a granular-outfield → `OF` fold. A football league gets a baseball shape, which poisons all downstream need/surplus math.

## Architecture

One file changes: `src/trades/rosterSlots.ts`. Football constants live beside the baseball ones (same colocation pattern already in the file).

### New football constants

```ts
/** ESPN NFL lineup slot id -> position label. Bench(20)/IR(21) intentionally absent. */
const ESPN_NFL_SLOT_TO_POS: Record<string, string> = {
  '0': 'QB', '2': 'RB', '3': 'RB/WR', '4': 'WR', '5': 'WR/TE', '6': 'TE',
  '7': 'SUPER_FLEX', '16': 'DEF', '17': 'K', '23': 'FLEX',
}

/** Standard 10-team football starting roster when settings are unavailable. */
const DEFAULT_NFL_SLOTS: Record<string, number> = {
  QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1,
}

/** Sleeper slot labels that map to a canonical flex bucket. Other labels (QB/RB/WR/TE/
 * K/DEF) pass through as-is. */
const SLEEPER_NFL_FLEX_ALIASES: Record<string, string> = {
  WRRB_FLEX: 'FLEX', REC_FLEX: 'FLEX', FLEX: 'FLEX', SUPER_FLEX: 'SUPER_FLEX',
}
```

### `parseRosterSlots(platform, settings, sport = 'baseball')`

- **Signature:** add a third param `sport: string = 'baseball'`. Existing callers are unchanged (default preserves current behavior exactly).
- **Slot-id map selection:** football → `ESPN_NFL_SLOT_TO_POS`; else `ESPN_SLOT_TO_POS`.
- **ESPN branch:** unchanged logic, but uses the sport's slot-id map. NFL bench(20)/IR(21) are absent from the football map → excluded, same as baseball's Bench(16)/IL(17).
- **Yahoo branch:** unchanged — Yahoo `roster_positions` already gives position labels (`QB`, `RB`, `W/R/T`, `Q/W/R/T`, `K`, `DEF`, `BN`, `IR`). Football labels flow through; `NON_STARTING` filters bench/IR. Yahoo's flex label `W/R/T` → normalize to `FLEX`, `Q/W/R/T` → `SUPER_FLEX` (add these to a small Yahoo-flex normalize map alongside the football path).
- **Sleeper branch (new):** `settings.roster_positions` is a `string[]` of slot labels (e.g. `['QB','RB','RB','WR','WR','TE','FLEX','K','DEF','BN','BN']`). Count each non-`NON_STARTING` label; map via `SLEEPER_NFL_FLEX_ALIASES` for flex buckets; others pass through.
- **Outfield fold:** the `LF/CF/RF → OF` fold runs **only when `sport !== 'football'`** (football has no such positions; harmless but gate it for clarity).
- **Fallback:** football → `{ ...DEFAULT_NFL_SLOTS }`; else `{ ...DEFAULT_SLOTS }`.
- **`NON_STARTING`:** stays shared; add Sleeper's `TAXI` to it (bench-equivalent) so taxi slots aren't counted as starters.

## Data flow

```
league settings + platform + sport
  → select sport's ESPN slot map / defaults / flex normalization
  → count starting slots (skip NON_STARTING)
  → football: no OF fold; football fallback if empty
  → Record<position, count>   (e.g. { QB:1, RB:2, WR:2, TE:1, FLEX:1, K:1, DEF:1 })
```

## Error handling

- Missing/empty/malformed settings → the sport's default roster (never an empty object, matching current behavior).
- Unknown ESPN slot id / unknown label → skipped (not counted), never throws.
- `sport` unrecognized → treated as non-football (baseball path), safe default.

## Testing

Unit tests in `src/trades/__tests__/rosterSlots.test.ts` (create if absent):
- **ESPN football:** `lineupSlotCounts` `{0:1, 2:2, 4:2, 6:1, 23:1, 16:1, 17:1, 20:6}` + `sport='football'` → `{QB:1, RB:2, WR:2, TE:1, FLEX:1, DEF:1, K:1}` (bench 20 excluded).
- **Sleeper football:** `roster_positions: ['QB','RB','RB','WR','WR','TE','FLEX','K','DEF','BN','BN','IR']` + `sport='football'` → `{QB:1, RB:2, WR:2, TE:1, FLEX:1, K:1, DEF:1}`.
- **Yahoo football:** `roster_positions` with QB/RB/WR/TE/`W/R/T`/K/DEF label nodes → correct counts incl. `FLEX:1`.
- **Baseball no-regression:** an ESPN baseball `lineupSlotCounts` still yields the baseball shape AND still folds LF/CF/RF into OF (default `sport` = baseball, unchanged).
- **Fallback:** `parseRosterSlots('sleeper', null, 'football')` → `DEFAULT_NFL_SLOTS`; `parseRosterSlots('espn', null)` → `DEFAULT_SLOTS`.

## Non-goals / YAGNI

- No changes to the exported `FLEX_ELIGIBILITY` (that's the 2b eligibility layer).
- No changes to callers (they pass baseball by default until the value-model phase).
- No display/grid changes.
