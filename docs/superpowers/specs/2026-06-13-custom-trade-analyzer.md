# Custom Trade Analyzer — Design Spec

**Goal:** Let a manager evaluate a SPECIFIC trade they have in mind (or one they were
offered), getting an honest, category-aware, need-weighted verdict — the reactive complement
to the generative Trades tab.

## Why
The Trades tab pushes deals. Real trade life is reactive: someone offers you a deal, or you
have a target. "Is this trade fair?" is the most-used fantasy trade tool. Ours is differentiated
because it can **critique** any deal (the generator only shows deals that pass its gates):
overpay, selling-low, shipping a needed player, "they won't accept" — all in standings terms.

## Architecture (additive — the working generator is untouched)

- **`src/trades/engine.ts`** (pure, tested): `buildEngine(inputs)` derives the shared primitives
  from plain data — `valueByKey` (cross-role pct), `strengthByKey` (per-cat z), `timingByKey`,
  `landscape`, `byTeam`, `statIds`, `sideOf`. Same derivation as `useTradeTargets` (DRY the
  generator onto it later; for now it mirrors, so the analyzer can't diverge in value).
- **`src/trades/analyzeTrade.ts`** (pure, tested): `analyzeTrade(engine, { myKey, partnerKey,
  giveKeys, getKeys })` → a verdict object. Reuses `evalDeal`, `helpsFor`/`costsFor`/`pitchFor`
  logic, `isGiveable`, timing. Handles ANY deal (incl. bad-for-you / won't-accept).
- **`src/composables/useTradeAnalysis.ts`**: wires live refs (pool, fg, statcast, cats, wins,
  myTeamKey) + selection refs (give/get/partner) → buildEngine → analyzeTrade. Guards empty
  selection (no compute until the user picks players).
- **UI panel in `TradesView.vue`**: "Got a deal in mind?" — multi-select *You give* (your
  roster) + partner picker + multi-select *You get* (their roster). Renders the existing card
  (value bars, headshots, timing badges, nets-you / gives-them) + a verdict banner.

## Verdict object
```
{
  klass: 'winWin' | 'leverage' | 'fleece' | 'badForYou',
  headline: string,          // "Solid — both improve" / "You're overpaying ~12" / ...
  yourGain, theirGain, valueGap,   // valueGap = getVal - giveVal (+ = you gain value)
  helps: string[],           // categories you net
  costs: string[],           // categories it COSTS you (new — analyzer-only)
  pitch: string[],           // what it gives them (their need your give fills)
  warnings: string[],        // "Shipping ERA help (you need it)", "Selling Cease low", ...
  accept: 'likely' | 'maybe' | 'unlikely',
  getSides, giveSides,       // TradeSide[] for the card (value, headshot, proLogo, timing)
}
```

## Verdict rules (the two questions that matter)
- **Good for me?** `yourGain` (need-weighted) + `valueGap` + warnings.
  - `yourGain <= 0` → **badForYou** ("Pass — doesn't help your standings").
  - `valueGap < -EVEN_BAND` → overpay warning.
- **Will they accept?** `theirGain` (their need-weighted).
  - `theirGain <= 0` → accept: unlikely ("good for you, but they've no reason — sweeten it").
  - both gains positive, balanced → winWin, accept likely.
  - `yourGain >> theirGain` → leverage, accept: maybe.
- **Warnings (the critique):**
  - giving a player strong in YOUR hole/contested cat → "shipping help in <cat> you need".
  - giving a buy-low (cold, rebound coming) → "selling <player> low".
  - getting a sell-high (hot, cools off) → "buying <player> high".

## Scope (YAGNI)
- v1: **two-team, N-for-M** (1-for-1, 2-for-1, 2-for-2). Rostered players only.
- Defer: 3-team, free-agents-in-trade, draft picks (none in these leagues).

## Out of scope / debt
- `engine.ts` temporarily mirrors `useTradeTargets`'s inline derivation; DRY the generator onto
  it in a follow-up (kept separate now so the validated generator carries zero regression risk).
