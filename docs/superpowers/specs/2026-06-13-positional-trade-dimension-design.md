# Positional Trade Dimension — Design Spec

**Date:** 2026-06-13
**Branch:** `redesign/my-team-first` (local only — no push/deploy until real-user testing)
**Status:** Design approved (conversational); awaiting spec review before plan.

## Problem

The trade engine reasons entirely in **category** terms (z-scores, hump-shaped need, surplus).
A large share of real trades are driven by **positional scarcity** instead: a manager with a 3B
injury overpays for *any* startable 3B almost regardless of categories, and a manager sitting on
3B depth has leverage the tool cannot surface. This is the single most-cited weakness of trade
tools generally — they compare raw value, not roster fit, so you can "win" a trade on paper and
still wreck your lineup (e.g. trade away your only startable SS).

The three existing trade *intents* are dimension-agnostic and transfer cleanly to position:

| Intent | Category (today) | Position (this spec) |
|---|---|---|
| Win-win | my surplus cat ↔ their surplus cat, both fill a hole | I'm deep at 3B/thin at SS, you're the mirror — both fix a slot |
| Make them reach | they overpay from a category they chase | their 3B injury → overpay for any startable 3B; I have depth |
| Consolidate | 2 depth bats → 1 stud in a needed category | 2 bodies at a deep slot → 1 stud at a thin slot (frees a roster spot) |

## Goal

Surface **win-win / make-them-reach / consolidate** computed on a **positional** need/surplus
dimension, alongside the existing category dimension, so the user can see *all* options. Use the
**precise** slot model (real league `roster_positions` / lineup slot counts), not guessed defaults.

## Key design decisions (settled)

1. **Precise slot requirements.** Parse real per-position starting-slot counts from league settings
   (Yahoo `roster_positions` — already surfaced at `yahoo.ts:1650`; ESPN `rosterSettings`
   lineup slot counts — surfaced at `espn.ts:3230`). Baseball defaults are a fallback only.
2. **Surface = a second axis, not six tabs.** Keep the existing intent tabs (Win-win / Make them
   reach / Consolidate / Buy-low) and add a **`By: Categories | Position`** toggle. 2-D control,
   all combinations, no tab explosion. Matches the user's mental model ("the same things, by
   position").
3. **Positional deals stay category-aware (guardrail).** A positional deal must not lose a category
   the team is genuinely contesting. Run the existing category `evalDeal` as a rejection gate.
   (Symmetric guardrail on the *category* modes — "don't ship your only SS" — is a follow-up that
   the same positional model enables; see Out of Scope.)
4. **Positional value is counterparty-relative.** Headline = "Fills their/your 3B hole"; the unified
   cross-role value meter is the **fairness rail** ("is the price even?"), not the lead number.
5. **Sequencing protects the stabilized category engine.** Build the positional landscape + a
   *parallel* positional generator first; do **not** refactor `useTradeTargets` to be
   dimension-pluggable in this pass. Unification is a later, optional step.

## The model

### Positional landscape (mirrors the category landscape)

New primitive `buildPositionalLandscape`, parallel to `buildLandscape`. Output mirrors
`Landscape`:

```ts
interface PosStanding {
  slots: number          // required starting slots at this position (from settings)
  startableCount: number // this team's startable, eligible bodies at this position
  depthRank: number      // cross-team rank of startableCount at this position (1 = deepest)
  surplus: number        // 0..1 — giveable extra bodies beyond what fills the slots (trade currency)
  need: number           // 0..1 — unmet/injured slots (acute hole). Sharpened by my own injuries.
}
type PositionalLandscape = Map<string /*teamId*/, Map<string /*position*/, PosStanding>>
```

### Startable-depth via greedy slot assignment (handles multi-eligibility)

Naive "count eligible bodies" double-counts flex players (Tatis = 2B,OF can fill only one slot).
Use a **greedy, scarcity-aware assignment** (standard lineup-optimizer heuristic):

1. Slot requirements from settings → `{ '3B': 1, 'OF': 3, 'SS': 1, 'SP': n, ... }` (skip bench/IL).
2. Candidate starters = players whose cross-role value ≥ `STARTABLE_BAR` (rosterable-starter
   quality, above waiver level; tunable). Below-bar bodies are depth filler, not "startable".
3. Sort candidates by cross-role value desc; assign each to an open eligible slot, **scarcest
   eligible slot first**, so flex players fill the tightest opening.
4. After assignment, per position P:
   - **Unfilled required slot at P** → `need` (hole). An **injured** assigned starter (`status` on
     my roster) leaves the slot effectively unmanned → also `need`.
   - **Startable, eligible bodies that did not land a starting slot** → `surplus` at P (the giveable
     extras).
   - `surplus`/`need` normalized 0..1 (exact mapping a plan-level constant; ~1 extra ⇒ ~0.5,
     2+ ⇒ ~1.0; an unfilled/injured slot ⇒ high need).

### Injury asymmetry (known limitation)

My roster carries `status` (IL/DTD); the league-wide pool does **not** carry injury for opponents.
So: my holes are pinpointed by injury; opponent thinness is **inferred from depth** (low
`startableCount` / `depthRank`), not their actual injuries. Documented, accepted for v1. (Pulling
league-wide injury into the pool is a possible later upgrade.)

### Positional deal generation

A parallel `usePositionalTargets` (mirrors `useTradeTargets`) producing the three intents on
positional need/surplus:

- **Win-win (tiered — handles the thin-output problem):** my surplus position ↔ their surplus
  position where each fills the other's `need`, values within the even-band. Because every deal is
  *also* scored on the secondary dimension (the same scoring the guardrail needs — computed once,
  reused), win-win results are bucketed:
  - **Tier 1 "Fits both":** win-win on the primary lens that *also helps* the secondary dimension
    (a positional swap that also nets a category, or vice versa). Strongest, rarest — shown first.
  - **Tier 2 "Fits one":** win-win on the primary lens, *neutral* on the secondary. The fallback so
    the user always sees a clean option when Tier 1 is empty/sparse.
  - The tier label is shown to the user ("Fits both" / "Fits one") — it explains *why* a deal is
    good (a twofer vs a clean single), not just padding.
  - **Decision (settled):** a deal that fits the primary lens but *hurts* the secondary is
    **rejected** (the guardrail), never shown as a fallback — the feature exists to stop
    "win on paper, lose your lineup," so a warned-but-harmful tier would reintroduce it. Tier 2
    (neutral) supplies the fallback. (A last-resort warned "Tier 3" was considered and declined.)
- **Make them reach:** their `need` at P (thin/inferred-injured) + my `surplus` at P → a believable
  positional overpay (reuse `REACH_MIN_OVERPAY`/`VALUE_BAND`). Highest-value of the three.
- **Consolidate:** package two of my surplus-position bodies for one stud at a `need` position;
  credit the **freed roster spot** (valuable in this daily-transaction league).

Every emitted deal passes the **category guardrail**: reject if `evalDeal` shows it loses a
category the team is contesting (need ≥ `DEMAND_THRESHOLD` and the deal worsens it). The secondary-
dimension score this produces is also what buckets win-win into Tier 1 (helps) vs Tier 2 (neutral),
so guardrail + tiering are one computation. The same secondary-effect score tags reach/consolidate
deals too ("also helps your SB"), though only win-win is formally tiered.

Each deal reuses the existing GET/GIVE card + value meter. Headline is positional
("Fills their 3B hole"); category side-effects shown secondarily ("also nets you SB").

## Data flow

```
league settings ──parseRosterSlots(platform)──▶ slotRequirements: Record<position, count>
pool (all teams: eligiblePositions + cross-role value) ─┐
slotRequirements ───────────────────────────────────────┼─▶ buildPositionalLandscape ─▶ PositionalLandscape
my roster status (injuries) ─────────────────────────────┘
PositionalLandscape + pool + value/strength ─▶ usePositionalTargets ─▶ { winWin, reach, consolidate }
TradesView: dimension toggle ('categories' | 'position') selects which generator's view renders
```

## File structure

- `src/trades/positionalLandscape.ts` (new) — `buildPositionalLandscape`, `PosStanding`,
  `PositionalLandscape`, and the greedy slot-assignment helper.
- `src/trades/rosterSlots.ts` (new) — `parseRosterSlots(platform, settings)` →
  `Record<position, count>`, with baseball defaults fallback. Platform-specific parsing
  (Yahoo `roster_positions`, ESPN lineup slot counts) isolated here.
- `src/composables/usePositionalTargets.ts` (new) — the positional generator (win-win / reach /
  consolidate), category-guardrailed. Reuses `evalDeal`, value/strength, partner plumbing.
- `src/views/TradesView.vue` (modify) — `dimension` toggle state; render positional view when
  selected; wire settings → slots → positional landscape.
- `src/services/yahoo.ts` / `src/services/espn.ts` (modify, minimal) — ensure slot data reaches
  the view (Yahoo already returns `roster_positions`; confirm ESPN slot counts are exposed).
- Tests: `src/trades/__tests__/positionalLandscape.test.ts`,
  `src/trades/__tests__/rosterSlots.test.ts`,
  `src/composables/__tests__/usePositionalTargets.test.ts`.

## Testing strategy

- **Slot assignment:** a flex player (2B,OF) fills exactly one slot — no double-count; deepest
  team at a position ranks `depthRank` 1.
- **Surplus/need:** unfilled required slot → `need`; extra startable body → `surplus`; an injured
  assigned starter → `need` even when a sub exists.
- **Settings parser:** Yahoo `roster_positions` array and ESPN lineup slot counts both yield the
  same `Record<position, count>`; missing settings → baseball defaults.
- **Generation:** fixtures produce a positional win-win, a reach (their thin / my deep), and a
  consolidate (2 depth → 1 stud); empty when no positional edge exists.
- **Win-win tiering:** a deal that helps the secondary dimension lands in Tier 1; a secondary-
  neutral deal lands in Tier 2 and appears as a fallback when Tier 1 is empty; a deal that hurts
  the secondary dimension is rejected, not surfaced as a fallback.
- **Category guardrail:** a positionally-sound deal that loses a contested category is rejected.

## Out of scope (follow-ups, noted not built)

- Refactoring `useTradeTargets` into one dimension-pluggable core (unify category + position).
- Adding the **positional guardrail to the existing category modes** (kills the original "gave away
  my only SS" blind spot) — the positional landscape from this spec is the prerequisite; wiring it
  into the category generator is a separate, later change.
- Pulling league-wide opponent injury status into the pool (would replace depth-inference with real
  injury detection for opponents).
- A blended/auto-tagged single list (one view tagging each deal with its strongest reason).

## Risks

- **Slot-data variety.** Odd roster configs (deep benches, many UTIL/IL, two-catcher, MI/CI
  combo slots) must parse sanely; the parser needs platform fixtures and a safe default.
- **`STARTABLE_BAR` tuning.** Too low → everyone looks deep everywhere; too high → false holes.
  Validate against the user's real Yahoo + ESPN rosters before trusting output.
- **Thin win-win output** is mitigated by the Tier 1 / Tier 2 bucketing (Tier 2 = fits-one
  fallback). True emptiness (no clean fallback either) is still communicated in the empty state,
  with a cross-link to the other lens.
