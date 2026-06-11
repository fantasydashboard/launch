# Lineup Leaks — Within-Position Ranking

**Date:** 2026-06-11
**Branch:** `redesign/my-team-first` (LOCAL ONLY — no push / no deploy until user tests with their users)
**Workstream:** 3 of 4 in the My-Team-first redesign. Builds on the value model (`src/myteam/value.ts`), the Your Move engine (`src/myteam/yourMove/`), and the FA/roster data already plumbed.

## Goal

Flag when a manager is **starting a weak player at a roster position** relative to a clearly-better eligible option they could start (bench) or add (waiver), defined against **the categories that team actually needs**. The headline complaint: *"am I regularly throwing out a bottom-tier 1B that's my weakness?"* Output is one decision-first line per leak plus a roster tag.

## Why the obvious version is wrong (research-grounded)

- **Compare 1B-to-1B, not hitter-to-hitter.** Value is only meaningful relative to **position replacement level**; a fine hitter can be genuinely weak *for first base* because the 1B/OF/DH bar is high. Our current `roleValue` (within-role) hides this.
- **Need-weight by the team's categories.** A light-hitting, SB-source SS is **not** weak if you're losing SB. "Weak" must be measured in the currency of *your* losing categories — reuse the flippable-cat / standings-gap weighting from Your Move.
- **Greedy legal single-swap, not full optimization.** Find one beneficial swap where the displaced starter has a legal landing spot. No LP.
- **ROS, not YTD.** Use rest-of-season projections (we already blend FanGraphs ROS) as the value input; YTD explains, ROS decides.

## Feasibility (data scout)

| Ingredient | Yahoo | ESPN | Sleeper |
|---|---|---|---|
| Multi-position eligibility | parse `eligible_positions` (in response, unparsed) | parse `eligibleSlots` (draft parses it; rosters don't) | not in API |
| Started slot | ✓ `selected_position` | ✓ `lineupSlotId`→slot | ✗ (starters = ids, no slot) |
| League slot structure | ✓ `roster_positions` | ✓ `lineupSlotCounts` | n/a |
| ROS projections | ✓ FanGraphs blend | ✓ | ✓ |

**So Lineup Leaks is a Yahoo + ESPN feature**; on Sleeper it renders nothing (no eligibility/slot data).

## Model

### 1. Eligibility (new parse)
Add `eligiblePositions: string[]` to the roster + FA player shapes.
- Yahoo: parse `eligible_positions` in `getPlayers` / `getTopFreeAgents` / `getAllRosteredPlayers`.
- ESPN: extend `parsePlayer` (and `getFreeAgents`) to map `eligibleSlots` → names via `BASEBALL_LINEUP_SLOTS` (the draft path already does this — reuse).
- Sleeper: leave empty → feature self-disables.

### 2. Within-position, need-weighted value
For each **position group** (1B, 2B, …, SP, RP — using eligibility, a player appears in every group they qualify for):
- Build the candidate pool = rostered players at that position + top available FAs at that position.
- Compute each player's **need-weighted positional value**: sum over the league's categories of (per-category value **above this position's replacement level**) × (team need weight for that category). Per-category value reuses the z-score machinery in `value.ts`; replacement level = a small composite (~5 players) at the position's roster-count cutoff. Team need weight reuses Your Move's flippable/standings-gap logic (punted categories → ~0, so we never nag about a punt).
- Multi-eligible players are valued at their **scarcest** eligible slot (prevents over-crediting a flexible bat at a deep position).

Inputs are **ROS-projected** (FanGraphs where matched, else extrapolated), not YTD.

### 3. Leak detection (greedy legal swap)
For each **started** slot occupied by a hitter (then SP/RP in a later phase):
- Find the best **eligible, active** alternative (benched roster player or available FA) whose need-weighted positional value exceeds the starter's by a **materiality threshold**.
- Confirm a **legal swap**: the displaced starter can move to an open slot or one where they're still better than its occupant; the alternative is eligible for the vacated slot.
- Filter out **IL/inactive** alternatives; require the gap to be material (no trivial-upgrade nagging).
- **SP caveat:** Lineup Leaks for SP is about *standing roster weakness* (your SP slot is chronically replacement-tier and a clearly-better SP is available), NOT day-to-day streaming — which Your Move's daily layer already owns. Do not flag an SP that Your Move would stream (e.g. a good two-start week); suppress overlap so the two features never contradict.

### 4. "Regularly" signal (v1 structural)
Without lineup history, infer structurally: the weak player is the team's **standing starter** at that slot (occupies a starting slot, no clearly-better owned option being rotated in) AND a materially-better eligible option exists right now. If the team owns **no** better option at a scarce slot, emit the **roster-gap** variant ("your only catcher is replacement-tier — [available C] is a clear upgrade"). **Fast-follow:** persist daily/weekly lineup snapshots to count "started a weak X while a better option sat" over a trailing window for a true "most days."

## Presentation

- **"Lineup Leaks" callout** (own section, decision-first, like Your Move): one line per leak —
  *"You're starting a bottom-tier 1B. [Bench/FA player] is a stronger 1B for your needs (HR, RBI) — [swap in / add]."* Capped to the few clearest; calm empty state ("Your lineup's well-allocated") when none.
- **Roster tag**: a subtle "weak 1B" tag on the offending starter in `RosterPanel`, tying the insight to the roster the user is already scanning.
- Reuses the terminal aesthetic, labels, legend.

## File structure

**Create:**
- `src/myteam/lineupLeaks/types.ts` — `EligiblePlayer`, `PositionPool`, `LineupLeak`.
- `src/myteam/lineupLeaks/positionReplacement.ts` — per-position replacement level from league slot counts.
- `src/myteam/lineupLeaks/positionalValue.ts` — need-weighted within-position value (reuses value.ts z-scores + Your Move need weights).
- `src/myteam/lineupLeaks/detectLeaks.ts` — greedy legal-swap detection (+ roster-gap variant).
- `src/composables/useLineupLeaks.ts` — wire roster + FA + eligibility + categories + need weights.
- `src/components/myteam/LineupLeaks.vue` — the callout.
- Tests alongside each pure module.

**Modify:**
- `src/services/yahoo.ts`, `src/services/espn.ts` — parse eligibility.
- `src/composables/useMyRoster.ts`, `src/players/types.ts`, `src/players/fromYahoo.ts`, `src/myteam/espn/mapFreeAgents.ts` — carry `eligiblePositions`.
- `src/components/myteam/RosterPanel.vue` — the "weak [pos]" tag.
- `src/views/MyTeamView.vue` — mount `LineupLeaks`, build the league slot structure.

## Phasing

- **P1 — Eligibility + within-position value.** Parse eligibility (Yahoo + ESPN), build position pools, replacement level, need-weighted positional value. No UI yet; unit-tested.
- **P2 — Hitter leaks + surface.** Greedy legal-swap detection for hitters, the Lineup Leaks callout + roster tag.
- **P3 — Pitchers (SP/RP).** Extend to pitching slots with the SP standing-weakness caveat + Your Move de-overlap.
- **Fast-follow:** lineup-snapshot history for a true "regularly."

## Edge cases / pitfalls (must handle)

ROS not YTD; exclude IL/inactive alternatives; materiality threshold (no trivial swaps); punt-aware via need-weighting; legal-swap only (displaced starter has a landing spot); multi-eligible valued at scarcest slot; two-way (Ohtani) dual eligibility; SP not double-flagged against Your Move streaming; Sleeper self-disables; never recommend benching a healthy starter for an IL'd "better" player.

## Testing

- replacement level: correct cutoff per league slot counts; composite not a single noisy player.
- positional value: need-weighting zeroes punted cats; a strong-in-your-needs player outranks a higher-overall but wrong-category player; multi-eligible valued at scarcest slot.
- detectLeaks: flags a clear weak-1B-with-better-bench-1B; suppresses trivial gaps, IL alternatives, illegal swaps; roster-gap variant when no owned upgrade; never flags an SP that Your Move would stream.
- component: renders leaks + calm empty state; degrades to nothing on Sleeper / missing eligibility.

## Out of scope

Full LP lineup optimization (greedy is enough); lineup-snapshot history (fast-follow); Sleeper; trade analysis. Workstream 4 (roster intelligence: injury/buy-low) is separate.

## Constraint

All work stays local on `redesign/my-team-first`. No `git push`, no `vercel --prod`, until the user has tested with their users.
