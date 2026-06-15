# Standings-Delta Trade Engine — Design

**Date:** 2026-06-15
**Branch:** `redesign/my-team-first` (local only — no push/deploy until real-user testing)
**Status:** Approved design, pending spec review → implementation plan

## Goal

Reframe how trades are scored, ranked, and displayed: from an abstract category z-swing ("fit 4/4") to a concrete **standings movement** ("wins 6.5 → 8.0 categories/week → moves you 8th → 5th"). One standings engine powers both the trade card (zoomed in on a single swap) and a future league page (zoomed out to the whole season).

## Why

Today `fitScore.ts` ranks a deal by a need-weighted z-delta blend (pos/cat/val). That answers "does this player have more HR than the one I give?" — not the question that wins category leagues: **"does this trade actually flip categories and move me up the standings?"** This is the SGP (Standings Gain Points) principle — value a stat by how much it moves you in the standings, not in the abstract. Making that the headline is what separates a genuine edge tool from a stat-diff tool, and nothing in the native ESPN/Yahoo apps does it.

## Core principle

**One primitive: expected categories won per week (ECW).** Everything — the trade score, the partner "will they accept?" read, the drawer evidence, and the future overall-place number — derives from it. The trade card and the league page run the same math at different scopes.

---

## The metric model

### Primitive: expected categories won per week (ECW)

For a league of `N` teams and a team with per-category projected output, define for each scored category `c`:

```
P(win c) = (N - rank_c) / (N - 1)      // rank_c = 1 is best in category c
ECW(team) = Σ_c P(win c)                // continuous, e.g. 6.5 of 10
```

This is the "average-opponent" model — assumption-light, computable today from the per-category team totals `landscape.ts` already ranks on. It is a rigorous restatement of the hump-shaped `need` already in `CatStanding`. (Phase 2 may upgrade `P(win c)` to a variance-aware weekly distribution; the interface does not change.)

### A trade's score (replaces `fit.you` as the ranking key)

```
score_you = ECW(your roster AFTER swap) − ECW(your roster BEFORE)
```

Recompute your per-category projected totals after removing the GIVE players and adding the GET players, re-rank within the league, re-sum ECW. The delta in expected cats/week is the deal's value to you and the new primary sort key.

### The partner "their read" chip (replaces the binary `ACCEPT_BAR` gate)

Run the identical computation pointed at the partner's roster:

```
score_them = ECW(partner AFTER swap) − ECW(partner BEFORE)
```

Classify with two thresholds (`ε`, `δ` expressed in cats/week, tuned during implementation; start `ε = 0.15`, `δ = 0.6`):

- `score_them ≥ −ε`  → **"fair to them"** (acceptable; default surfaced set)
- `−δ ≤ score_them < −ε` → **"a reach"** (they lose a little; persuadable)
- `score_them < −δ` → **"a steal"** (lopsided in your favor; only surfaced under the press-leverage toggle)

The press-leverage toggle becomes: `pressLeverage ? score_them < −ε : score_them ≥ −ε` — same mutually-exclusive behavior as today, new currency.

### Drawer evidence: the per-category rank ladder

For each scored category, show before→after rank and a direction marker; surface categories that moved plus notable held strengths:

```
HR   9th → 6th   ▲▲▲   now beat 3 more teams
SB   7th → 5th   ▲▲    flips 2 weekly matchups
AVG  4th → 4th   —     held
```

These are just the before/after totals that fed the ECW sum.

### Overall place / playoff odds (Phase 2 — league-page powered)

Monte-Carlo the remaining schedule: for each remaining matchup, simulate per-category win/loss from team weekly output, accumulate W–L, rank final standings, repeat `M` times → expected place + playoff odds. A trade preview applies the roster change to the two affected teams and re-runs. This lives in the league-page engine; the trade-card header *borrows* the result. It is **not** built in Phase 1 — the card shows ECW until it exists.

### Ratio-category data requirement (key implementation detail)

Counting categories (HR, R, RBI, SB, K, SV, HLD, W) re-rank under a swap by simple addition/subtraction of a player's projected contribution to the team total. **Ratio categories (ERA, WHIP, AVG, OBP, OBA, FPCT, OPS) cannot be added/subtracted** — they must be recomputed from underlying numerator/denominator aggregates (e.g., ERA from team ER and IP). Therefore the standings engine must aggregate and store per-team **component volumes** (numerator, denominator) per ratio category, not just the ratio value, so a previewed swap can recompute the team ratio and re-rank. This is the main new data-model work versus the current `teamTotals: Record<statId, number>`.

---

## Architecture & components

A new, isolated standings layer that the existing trade engine and the future league page both consume.

### New: `src/trades/standings.ts`

Pure functions, no Vue, fully unit-testable. Responsibilities:

- `TeamCategoryTotals` — per team, per category: for counting cats a sum; for ratio cats a `{ num, den }` pair plus the derived value.
- `buildTeamTotals(rosters, cats, projectedStats)` → `TeamCategoryTotals[]` (counting sums + ratio components).
- `rankCategories(totals, cats)` → per team per category `rank` (1..N).
- `expectedCatsWon(totalsForTeam, leagueTotals, cats)` → `number` (ECW).
- `previewSwap(totals, myTeamId, partnerTeamId, give, get)` → new `TeamCategoryTotals` for the two affected teams (counting add/sub; ratio recompute from components).
- `tradeStandingsDelta(totals, cats, myTeamId, partnerTeamId, give, get)` → `{ you: number; them: number; ladder: CatRankMove[] }` where `CatRankMove = { statId, rankBefore, rankAfter, beatsMoreTeams }`.

### Modified: `src/trades/opportunities.ts`

`TradeOpportunity` gains a `standings` field:

```ts
interface StandingsImpact {
  ecwYouBefore: number
  ecwYouAfter: number
  ecwThemBefore: number
  ecwThemAfter: number
  deltaYou: number        // ecwYouAfter − ecwYouBefore (the score)
  deltaThem: number
  partnerRead: 'fair' | 'reach' | 'steal'
  ladder: CatRankMove[]   // for the drawer
  overall?: {             // Phase 2 only; undefined until the league sim exists
    placeBefore: number; placeAfter: number; playoffOddsBefore: number; playoffOddsAfter: number
  }
}
```

`OppContext` gains the league `TeamCategoryTotals` and team-id mapping needed to compute the swap. `headlineOf` is rewritten to lead with the standings outcome: `"wins ${ecwBefore.toFixed(1)} → ${ecwAfter.toFixed(1)} cats/week"`, upgrading to `"${placeBefore} → ${placeAfter} overall"` when `overall` is present.

### Modified: `src/composables/useTradeOpportunities.ts`

- Sort key changes from `fit.you` to `standings.deltaYou` (descending).
- `ACCEPT_BAR` gate and the press-leverage filter switch to `standings.partnerRead` (see thresholds above).
- Curation caps, diversity, hero selection, and `MAX_LIST` are unchanged.

### Status of the existing `fitScore.ts`

`computeFit` / `FitPair` / `FitMeter.vue` are **superseded** as the ranking and display primitive. We keep `fitScore.ts` temporarily so nothing breaks mid-migration, but the card no longer renders `FitMeter`; the header carries the standings number plus the partner-read chip. Remove `fitScore` wiring once the standings path is verified. The player-value badge (`ValueBadge`, 0–100) stays as a glanceable "how good is this player," independent of the standings delta.

---

## Trade-card display (Phase 1)

Per the approved layered mockup — all three altitudes, one leads, the rest nest:

**Collapsed header** (replaces `headline` + `FitMeter`):
- **Lead:** weekly cat record — `wins 6.5 → 8.0 cats/week` (with a 4-segment standings-impact meter where `FitMeter` was).
- **Subline (quiet):** the existing intent chips + the partner-read chip (`fair to them` / `a reach` / `a steal`).
- Phase 2: an overall-place line (`8th → 5th overall · +12% odds`) is promoted *above* the cat-record line as the new lead.

**GET / GIVE rows:** unchanged (player, position, value badge, timing badges).

**"Why this works" drawer** (replaces the YOU/THEM gain/cost rows):
- The per-category **rank ladder** (before→after, ▲ markers, "beat N more teams" / "flips N weekly matchups").
- The existing **pitch line** + copy button, unchanged.

`OpportunityCard.vue` and `FitMeter.vue` are the files touched; a new small `StandingsMeter.vue` (or a refit of `FitMeter`) renders the impact meter.

---

## League page (Phase 2, sequenced B → A)

The league page grows into the standings simulator but ships value on day one.

**Phase B (now-ish): category heat matrix.** Teams × categories grid colored by per-category tier (you-dominate → you're-last), computed from the same `standings.ts` totals/ranks. This is the visual home of the landscape — it exposes where every team is weak (the trade-target rationale). No simulator, no odds. Lives under the existing `/leagues/:leagueId` route tree (new child route + view; `MyLeagueLayout.vue` hosts it).

**Phase A (later): simulator + live trade preview.** Add projected place, playoff odds, and expected cats/week columns (the Monte-Carlo engine), and let any trade card preview onto the table (every affected team re-ranks with ▲/▼ deltas; partner row confirms "fair to them"). This is the phase that also lights up the trade-card overall-place header line. A "↩ from a trade card" breadcrumb ties the two surfaces together.

`C` (your-row-only) is explicitly **not** a destination — it is a degenerate slice of B and is dropped.

---

## Data flow

```
rosters + ROS-projected stats (existing eff.stats pipeline)
   │
   ▼
standings.ts  ──►  buildTeamTotals (counting sums + ratio components)
   │                     │
   │                     ├─►  rankCategories ──► expectedCatsWon (ECW per team)   ──► league heat matrix (Phase B)
   │                     │
   ▼                     ▼
opportunities.ts  ◄── tradeStandingsDelta (previewSwap → ECW deltas + ladder)
   │
   ▼
useTradeOpportunities.ts  (sort by deltaYou, gate by partnerRead)
   │
   ▼
OpportunityCard.vue  (header: cats/week + partner-read chip; drawer: rank ladder + pitch)

Phase 2: league-page Monte-Carlo sim ──► overall place / playoff odds ──► card header upgrade + live trade preview
```

## Error handling & edge cases

- **Missing per-category output for a player** (unmatched projection, platform gap): treat contribution as 0 for that category; the swap still re-ranks the others. Never let one `NaN` poison a team total (mirror the existing non-finite guard in `value.ts`).
- **Ratio category with zero denominator after a swap** (e.g., trade away all your innings): clamp to a neutral rank rather than dividing by zero.
- **Two-team interaction:** a 1-for-1 changes both your and the partner's totals; re-rank the full league so a category where either team crosses a third team's total updates correctly.
- **League size `N = 1` or degenerate standings:** `P(win c)` guards against divide-by-zero (`N − 1 = 0` → return neutral 0.5).
- **Ties in category totals:** rank ties share the average rank (consistent with the existing percentile tie handling).
- **Categories where you're already 1st or hopelessly last:** ECW naturally values these at ~0 marginal (the dead-value principle) — no special-casing needed.

## Testing

- `standings.test.ts`: `expectedCatsWon` on a known 4-team fixture (hand-computed ECW); `previewSwap` counting add/sub; `previewSwap` ratio recomputation from components (the critical case); `tradeStandingsDelta` returns correct `deltaYou/deltaThem` and a ladder matching hand-computed rank moves; divide-by-zero / non-finite guards.
- `opportunities.test.ts`: extend to assert `standings` is populated and `headlineOf` reads "wins X → Y cats/week".
- `useTradeOpportunities` ranking test: deals sort by `deltaYou`; press-leverage flips on `partnerRead`.
- Regression: existing 216 tests stay green; ESPN side-gating and curation behavior unchanged.

## Phasing summary

1. **Phase 1 — standings engine + trade card.** `standings.ts`, ECW scoring, partner-read chip, rank-ladder drawer, ranking/gate migration. Card header leads with cats/week. (No league page, no overall-place, no Monte-Carlo.)
2. **Phase B — category heat matrix page.** New league-page route/view over the same totals.
3. **Phase A — Monte-Carlo simulator + live trade preview.** Overall place / playoff odds; card header upgrades to overall-place lead; trade preview onto the standings table.

Each phase is independently shippable and testable. Phase 1 is the franchise-maker.

## Out of scope (deferred, not in this design)

- The cardinal-value / positional-scarcity / replacement-level fixes from the prior valuation audit. These improve the `ValueBadge` 0–100 number and are a worthwhile companion, but the standings engine supersedes value as the *ranking* basis, so they are tracked separately and not required here.
- LLM "polish this pitch" on-demand action (previously deferred).
- Multi-team (3-way) trades and waiver-backfill netting on packages.

## Constraints

- All work stays **local** on `redesign/my-team-first`. No push, no `vercel --prod`, no PR until the user tests with real users.
- No auto-import: every symbol explicitly imported. `npm run build` is the gate but will not catch undefined-symbol runtime crashes or dangling Vue template refs — verify both.
- zsh exclamation issues → write throwaway scripts to `/tmp/`.
