# Today "Complete Moves" v1 — Design

**Date:** 2026-07-20
**Branch:** redesign/my-team-first (local only — no push/prod until real-user testing)
**Status:** approved design, ready for implementation plan

## Goal

Make the Today board a *cheat sheet* rather than a projection list: every free-agent recommendation becomes a **complete, executable move** — `add X · drop Y` — where the drop is proven safe (costs you nothing today, and is only wire-replaceable talent by this league's standard), and each move carries a **trustworthy, comparable value** (normalized 0–100 + the cats it helps) instead of today's meaningless raw magnitude.

This is **v1 of a phased effort**. It deliberately ships the "complete move" format *before* the constraint engine, to prove the format cheaply on the leagues that already have a working board.

## North star (the promise this serves)

> Open UFD every morning, do what Today says, win your league at the margins.

A complete move you can execute in ~10 seconds, that never recommends a self-harming cut, and whose value you can trust.

## Scope

**In scope**
- **ESPN-category and Yahoo-category leagues only** — the two league types that already load a Today board (roster + free-agent pool).
- Pair every free-agent stream/add with a **safe drop** (or an honest "no clean drop").
- Replace the raw category-delta magnitude with a **normalized 0–100 score + "helps [cats]" chips**.

**Explicit non-goals (deferred to later phases, documented so they aren't silently assumed):**
- **Constraint engine** — adds-remaining, IP floor/ceiling, position games caps. (v2; requires new per-platform data plumbing that does not exist today.)
- **Points-league data path** — points leagues (ESPN & Yahoo) have no roster/FA source wired into `useToday`, so they stay on the clean loading→empty behavior shipped in the loading fix. (Prerequisite for any points-league Today.)
- **Board reorganization** — the four existing sections (Hero / Open slots / Streaming / Upgrade) stay; no single-ranked-list rewrite.
- **Roster-slot feasibility of the drop** — v1 does not verify that dropping body Y actually frees a slot the add X can occupy. (Belongs with the constraint/slots engine.)
- **Matchup / standings tie-in** — ranking moves by *your* weak/contested cats. (v2.)
- **Absolute (season-anchored) normalization** — v1 normalizes within *today's* pool.

## Key design decisions (all user-approved)

1. **v1 = complete moves first, constraints second.** Fast, no new data plumbing, on the two category leagues that already work.
2. **Strictly safe drop.** A drop must cost nothing today AND be only wire-replaceable talent; otherwise we say "no clean drop." Honest over forced.
3. **Normalized 0–100 + cat chips.** Fixes the meaningless-magnitude and "a pitcher always wins the hero" problems.
4. **Minimal view change.** Keep the four sections; add a drop line and swap the number/bar.
5. **Clean-drop bar is league-relative (wire replacement level), not a fixed tier.** Expendability is measured against *this* league's actually-available free agents, so league depth falls out automatically.

## Safe-drop logic (the core new behavior)

### Which rostered bodies are droppable *today*

A rostered player is a **droppable-today candidate** only if dropping it loses **zero of today's production** — i.e. it is not in today's active lineup producing:

- any **IL** body, OR
- any body (bench or active) whose **MLB team is off today**, OR
- a **bench pitcher with no start today** (team may play, but they aren't starting).

**One hard exclusion:** a **bench hitter whose MLB team plays today** — a plausible near-term start, so cutting them isn't truly free. (User-approved conservative choice.)

Note an active *starter* who is merely off today *is* in this set, but the clean-drop value bar below is what actually protects contributors: a real starter sits above wire-replacement level and is filtered out, so only a genuinely replaceable off-today body can ever be chosen.

### Which of those is a *clean* drop (league-relative)

Among the droppable-today candidates, a drop is **clean** when its rest-of-season value is **≤ the best comparable free agent available in this league** (same side hit/pit, position-aware). The reasoning: if the wire holds someone as good or better that you could simply re-add, cutting this body costs nothing real — that is the definition of "streamable-level" talent. Because the comparison is against *this* league's available FAs, it is inherently league-specific:

- **Deep league** → weak wire → few rostered bodies fall below it → fewer clean drops.
- **Shallow league** → strong wire → many bodies are ≤ wire level → more clean drops.

`pickSafeDrop` returns the **lowest ROS-value** clean candidate. If no droppable-today candidate is at/below the wire's replacement level (the roster is all genuine contributors by this league's standard), it returns `null` → the move renders **"no clean drop — you'd be cutting into value."**

### Uniqueness

Each recommended drop is **claimed once per board build** — a two-arm stream day cannot pair both streams with the same droppable body. Reason label surfaced to the user: `off today` / `IL` / `benched`.

### Simplification recorded

v1 selects the drop **position-agnostically** (the lowest-value clean body of any position, matching "another pitcher *or* bench player"), while the *expendability test* itself is per-side/position (a pitcher is compared to the best FA pitcher). Whether the drop actually frees a usable roster slot for the add is a **v2 (slots/constraints)** concern.

## Normalized scoring

- **Within-side ranking is unchanged** — rank bats against bats and arms against arms by the existing base single-game projection × clamped matchup multiplier (park + opposing-SP). That comparison is valid.
- **Cross-type comparability** comes from mapping each move to **0–100 by its percentile within its own side's today pool.** The best bat and the best arm both approach ~100; a mid arm sits mid-scale and a top bat can legitimately outrank it — killing the "a pitcher always wins the hero" bug.
- **The ▓ bar is repurposed** to fill proportional to the 0–100 score (bar and number now agree). The old separate matchup-multiplier bar is removed; the matchup tilt is already baked into the within-side value that feeds the percentile.
- **`helpsCats`** = the categories with positive deltas in the move's `addDelta` (rendered as chips, e.g. `helps K · WHIP`).
- **Hero** = the highest 0–100 across both pools.
- **Normalization is within *today's* pool** for v1 ("best available today"), not a season-absolute anchor (deferred).

## Architecture / modules

**New (pure, unit-tested):**
- `src/today/safeDrop.ts` — `pickSafeDrop(candidates, replacementValueFor, claimed) → SafeDrop | null`. The only genuinely new logic. No Vue, no fetching.
- `src/today/normalizeValue.ts` — `normalizeMoves(plays) → plays with 0–100 score`. Percentile-within-side. Pure.

**Changed:**
- `src/today/todayBoard.ts` — `ScoredPlay` gains: `score: number` (0–100), `helpsCats: string[]`, `drop?: SafeDrop`, `noCleanDrop?: boolean`. `buildTodayBoard` sorts by `score` instead of raw `value`; drops/score are attached upstream (they need roster + FA value data the pure reducer doesn't own), so the reducer stays selection-only.
- `src/composables/useToday.ts` — orchestration additions:
  - reuse `useValueBaseline` + `computeRosterValue` (`@/myteam/value`) to compute rest-of-season value for **both** the rostered pool and the available FA pool (the same value model My Team / Trades / Wire use, so numbers agree);
  - build the droppable-today candidate set (bench arms w/o start, IL, active-off-today; excluding play-today benched hitters) with each body's side + `rosValue` + reason;
  - `replacementValueFor(side, position)` = max FA `rosValue` at that side/position (this league's wire replacement level);
  - attach a safe drop (or `noCleanDrop`) to each free-agent play via `pickSafeDrop`;
  - run `normalizeMoves` to assign the 0–100 `score`; derive `helpsCats` from `addDelta`.
- `src/views/TodayView.vue` — render, per free-agent move, the drop line (`→ add Colin Rea · drop Peter Lambert (off today)` or `· no clean drop`), the 0–100 number, the score-proportional bar, and the `helps …` chips. Open-slot fills and bench start-sits stay drop-free (they cost no body). Hero shows its drop line too. Four sections unchanged.

**Loading gate:** the category-league readiness (`boardInputsReady` from the loading fix) gains `useValueBaseline.ready` — the board must not render "complete moves" until the value model that computes the drops is ready, so a move never briefly appears drop-less. Consistent with the loading fix already shipped.

## Data flow

```
schedule + my roster + FA pool  (loaded, gated by dataReady incl. valueBaseline.ready)
        │
        ├─ value model (computeRosterValue) ──► rosValue for roster AND FAs
        │
        ├─ candidates (dailyCandidates) ──► scoreCandidate ──► value (within-side)
        │                                                       │
        │        droppable-today set + replacementValueFor ─────┤
        │                                                       ▼
        │                                    pickSafeDrop → play.drop / noCleanDrop
        │                                                       │
        │                                    normalizeMoves → play.score (0–100) + helpsCats
        │                                                       ▼
        └──────────────────────────────────────────► buildTodayBoard (sort by score)
                                                                ▼
                                                         TodayView.vue
```

## Error handling / degradation

- **Value baseline not ready** → board stays in the loading state (gated), so no drop-less flash.
- **No droppable-today candidate at all** (full active lineup, everyone plays) → every FA move renders `no clean drop`.
- **FA replacement value unavailable for a side/position** (empty wire at that position) → treat replacement level as `-∞` so *any* droppable body clears the bar there (an empty wire means anything is replaceable — conservative toward showing a drop); if this proves too loose in smoke, tighten to require a real FA. (Recorded as the one behavior to watch in smoke.)
- Never throws — a lookup miss for one move yields no drop for that move, not a broken board (mirrors the existing Today error posture).

## Testing

- `src/today/__tests__/safeDrop.test.ts`:
  - picks the lowest-ROS clean (≤ wire replacement) droppable-today body;
  - skips an IL/off-day body that is *above* wire replacement (→ contributes to `no clean drop`);
  - returns `null` when nothing is expendable;
  - respects `claimed` (no double-drop across two streams).
- `src/today/__tests__/normalizeValue.test.ts`:
  - within-side percentile maps to 0–100 preserving order;
  - a top-percentile bat outranks a mid-percentile arm cross-type (the hero fix);
  - single-element side pool → 100; ties share a percentile.
- `src/today/__tests__/todayBoard.test.ts` (extend): plays carry `score` / `drop` / `noCleanDrop` / `helpsCats`; board sorts by `score`.
- Full: `npm test`, `npm run type-check`, `npm run build` clean.

## Self-review notes

- **Isolation:** the two genuinely new behaviors are pure functions (`safeDrop`, `normalizeValue`) with no Vue/fetch coupling — independently testable. The composable only wires data into them.
- **Reuse over reinvent:** ROS value and the drop-eligibility concept come from the existing `@/myteam/value` + `@/myteam/dropCandidates` used by Wire/My Team, so Today's numbers match the rest of the app.
- **YAGNI:** no constraint plumbing, no points path, no board reorg, no roster-slot math — all explicitly deferred.
- **The one thing to watch in smoke:** the empty-wire replacement-level fallback (could over-offer drops on a thin position); tighten if it misbehaves.
