# Today Adds-Remaining Optimizer (v1) — Design

**Date:** 2026-07-21
**Branch:** redesign/my-team-first (local only — no push/prod until real-user testing)
**Status:** approved design, ready for implementation plan
**Builds on:** the Today complete-move engine (`2026-07-20-today-complete-moves-design.md`) + points data path (`2026-07-21-today-points-data-path-design.md`)

## Goal

Make the Today board aware of your **remaining weekly adds** (or **FAAB budget**), so it tells you which of today's moves are worth spending a scarce add on — turning "here's a move" into "spend one of your 2 adds here / save it." This is the first of the three deferred constraints (adds → IP floor/ceiling → games caps); the other two are separate future specs.

## Why this first

It's the most universal constraint (every league has an add limit, FAAB budget, or is unlimited), the data is already in responses UFD fetches (just unparsed), it's the simplest to model (a used-count vs a limit), and it's the sharpest cheat-code gate — it answers "should I spend a limited add on this?" for every recommendation.

## Key design decisions (user-approved)

1. **Adds-remaining only** (IP floor/ceiling and games caps deferred to their own specs).
2. **Behavior = add-budget optimizer.** With N adds left, the top N add-costing moves are `worth an add`; everything below is `save it`; a banner shows remaining. Reuses the existing value ranking. Unlimited leagues no-op the whole feature.
3. **FAAB handled, lightly.** A FAAB league shows `$X of $Y FAAB left` and labels positive add-moves `worth a bid` — **no** suggested dollar amount (bid-sizing deferred until a FAAB-league user can validate it; the current user's leagues aren't FAAB).
4. **Weekly limit is primary** (matches native), falling back to a season limit only when that's all a league exposes.
5. **Data-probe first.** The precise fields (esp. Yahoo weekly `roster_adds`, ESPN season-vs-matchup limit) are uncertain, so the implementation plan's first task logs the real responses on the user's ESPN + Yahoo leagues and confirms the fields *before* the parser is written. Any league with no usable limit ⇒ treated as **unlimited** (feature no-ops for it).
6. **Light v1:** counts today's add cost only — no multi-day budgeting across the week's remaining days.

## The add budget (data contract)

A single discriminated type the optimizer consumes, produced per-platform:

```ts
type AddBudget =
  | { kind: 'count'; limit: number; used: number; remaining: number } // remaining = max(0, limit - used)
  | { kind: 'faab'; budget: number; remaining: number }               // remaining = budget - spent (Yahoo: faab_balance)
  | { kind: 'unlimited' }
```

**Extraction (to be pinned down by the data-probe; expected sources):**
- **ESPN:** acquisition mode from the already-parsed `acquisitionSettings` (`isUsingAcquisitionBudget` ⇒ FAAB; else count). Count limit from `acquisitionSettings.acquisitionLimit` (`-1`/absent ⇒ unlimited); used from the team's `transactionCounter.acquisitions`. FAAB budget from `acquisitionBudget`, spent from the team's budget-spent field.
- **Yahoo:** mode from settings (`uses_faab`). Count limit from settings `max_weekly_adds` (else season `max_adds`); used from the team's weekly `roster_adds.value` (**needs adding to the Yahoo team fetch**). FAAB remaining from the team's `faab_balance` directly.
- **Sleeper:** not wired to Today; out of scope.

**Conservative fallback:** any missing/ambiguous field ⇒ `{ kind: 'unlimited' }`. The feature never shows a number it isn't sure of, and never blocks the board.

## The optimizer (pure)

New pure `annotateAddBudget(plays, budget) → plays`, run after `attachDrops` on the flat `scoredPlays` list (so the top-N ranking is global across the whole board — streamers, upgrades, open-slot FA fills all compete). It sets one optional field on each play:

```ts
budgetTag?: 'worth-add' | 'save-add' | 'worth-bid'
```

- **Add-costing move** = a `stream` or `add` (free-agent) play. A complete `add X · drop Y` is **one** add (the drop is free). Bench `startSit` plays cost zero → never tagged.
- **`kind: 'count'`:** rank add-moves by `score` desc; the top `remaining` get `worth-add`, the rest `save-add`. At `remaining === 0`, all add-moves get `save-add`. (If `remaining ≥ add-move count`, all are `worth-add` — no scarcity pressure.)
- **`kind: 'faab'`:** with `remaining > 0`, every add-move gets `worth-bid` (no count gating — FAAB isn't count-limited); with `remaining <= 0` (budget spent), add-moves get `save-add` (framed as "no budget left" in the view). No dollar amount either way in v1.
- **`kind: 'unlimited'`:** no tags set (board behaves exactly as today).

## Wiring + display

- **New composable `useAddBudget()`** returns `{ budget: ComputedRef<AddBudget> }` for the active league, sourcing the settings/team data the probe identifies (reusing already-loaded data where possible, adding a minimal fetch only if required — e.g. Yahoo `roster_adds`).
- **`useToday`** consumes `useAddBudget().budget`, runs `annotateAddBudget` in the `scoredPlays` pipeline (after `attachDrops`), and exposes `budget` to the view.
- **`TodayView`** — a **banner** atop the board:
  - count: `2 of 5 adds left this week`
  - faab: `$34 of $100 FAAB left`
  - unlimited: hidden.
- **Per-move** (only when tagged): `worth-add` → `✓ worth an add`; `worth-bid` → `worth a bid`; `save-add` → wording keyed off `budget.kind` — count leagues show `· save your add` (and, at 0 remaining, a "no adds left — only free lineup swaps today" note), FAAB leagues show `· no FAAB budget left`. Start-sits are untouched.

## Data flow

```
league settings + my-team data ──► useAddBudget ──► AddBudget (count | faab | unlimited)
                                                          │
scoredPlays (scored → ranked → attachDrops) ──► annotateAddBudget(plays, budget) ──► budgetTag per play
                                                          ▼
                                                 buildTodayBoard ──► TodayView (banner + tags)
```

## Error handling / degradation

- Missing/unparseable limit or budget ⇒ `unlimited` ⇒ no banner, no tags, board unchanged.
- The optimizer is pure and never throws; an empty budget just yields no tags.
- Category and points boards both flow through the same annotation (add cost is league-type-agnostic).

## Testing

- **Pure `annotateAddBudget`:** count top-N (some worth, some save), `remaining === 0` (all save), `remaining ≥ count` (all worth), faab (all `worth-bid`), unlimited (no tags), start-sits never tagged.
- **Pure parsers `parseEspnAddBudget` / `parseYahooAddBudget`:** against fixtures captured by the data-probe — count, FAAB, unlimited (`-1`/absent), and missing-field → unlimited.
- **Data-probe (Task 1 of the plan):** log real ESPN + Yahoo `settings`/team responses on the user's leagues; confirm the exact field paths; capture fixtures for the parser tests.
- Full `npm test` + `npm run build` clean; then user smoke on a count-limited league (their leagues) — FAAB path is code-verified only.

## Self-review notes

- **Reuse:** the value ranking, the whole move/drop engine, and the acquisition-mode parsing (`parseEspn/YahooAcquisition`) already exist; new code is the `AddBudget` extraction, the pure `annotateAddBudget`, a small composable, and the banner/tags.
- **Isolation:** `annotateAddBudget` and the parsers are pure and independently tested; `useAddBudget` owns the fetch/parse; the view only reads.
- **Risk owned:** the data-availability uncertainty is front-loaded into a probe task, and the conservative `unlimited` fallback means a wrong/absent field degrades to "no framing," never to wrong numbers.
- **YAGNI:** no IP/games caps, no FAAB bid-sizing, no multi-day budgeting.
- **The thing to watch in smoke:** the count banner reading correctly on the user's real leagues (right limit, right weekly used), and unlimited leagues showing nothing.
