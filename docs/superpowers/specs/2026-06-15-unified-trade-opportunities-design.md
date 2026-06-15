# Unified Trade Opportunities — Design Spec

**Date:** 2026-06-15
**Branch:** `redesign/my-team-first` (local only — no push/deploy until real-user testing, per project constraint)
**Status:** Approved design, pending plan

## Goal

Replace the Trades page's 2×4 navigation matrix ({Categories, Position} × {Win-win, Reach, Consolidate, Buy-low}) with **one ranked, filterable list of trade opportunities**, where each opportunity carries its intent flags, two-sided fit, per-team helps/hurts, and a templated "how to pitch it" sentence framed in the partner's interest.

## Problem

The current IA treats lenses as containers. A single deal (e.g. Ernie Clement for Jung Hoo Lee) is simultaneously a position fit, a category help, and a win-win, but the matrix forces it into one cell. Consequences:

- The same deal is rediscovered across tabs wearing different hats.
- Each cell looks sparse; constant empty states (the user hits these repeatedly).
- The two strongest decision-first elements (top "Your leverage", bottom "Best trade partners") bookend a fragmented, low-signal middle.
- The category modes never fixed earlier critiques: win-win pads non-need categories (#2), surfaces lopsided deals against you (#3), and consolidate sheds categories you're already losing (#4) — because category deals rank by ad-hoc sorts, not need-weighted fit.

**Root reframe:** the *deal* is the atom. Categories vs Position is a re-weighting **lens**, not a partition. Win-win/reach/consolidate/buy-low are **tags** on a deal, not folders.

## Architecture

### Existing pieces (reused)

- `src/trades/engine.ts` → `buildEngine` returns `{ pool, cats, statIds, byTeam, landscape, valueByKey, roleValueByKey, strengthByKey, timingByKey }`.
- `src/composables/useTradeTargets.ts` → category deals: `TradeTarget { fix, get, give, fromTeam, klass, helps[], pitch }`, `ConsolidateTarget { ..., give: TradeSide[] }`, and `TradeView { partners, winWin[], reach[], consolidate[], timing/buyLow }`. Already computes `helps` (your net cats) and a per-deal `pitch`, plus partner raw needs via `helpsFor`.
- `src/composables/usePositionalTargets.ts` → `PositionalView { myDeep, myThin, reach[], winWin[], consolidate[] }`, each deal now carrying `fit: { you, them }`, `secondaryHelps[]`.
- `src/trades/fitScore.ts` → `computeFit(FitDeal, FitWeights)`, presets `FIT_WEIGHTS_POSITION` / `FIT_WEIGHTS_CATEGORY`, `fitBand`, `FitPair`.
- `src/trades/positionalLandscape.ts` → per-team per-position `PosStanding` (surplus/need), now using concrete-redundancy surplus.

### New piece: the opportunity merge layer

**`src/trades/opportunities.ts`** (pure) + **`src/composables/useTradeOpportunities.ts`** (Vue wiring).

`buildOpportunities(inputs)` consumes BOTH engines' outputs and emits a single `TradeOpportunity[]`:

```ts
export type Intent = 'winWin' | 'steal' | 'consolidate' | 'buyLow' | 'sellHigh'

export interface OppSide { playerKey: string; name: string; pos: string; value: number; headshot?: string; proLogo?: string }

export interface SideEffect {
  fillsPos?: string        // position hole this plugs for this team (undefined if none)
  fillsCats: string[]      // category needs this helps for this team (need-weighted, top few)
  hurtsCats: string[]      // categories this costs this team — THRESHOLDED (only material losses)
}

export interface TradeOpportunity {
  id: string               // stable: `${partnerKey}|${getKeys.join(',')}|${giveKeys.join(',')}`
  partnerKey: string
  partner: string
  partnerLogo?: string
  get: OppSide[]           // 1 (or more, future)
  give: OppSide[]          // 1 for 1-for-1, 2 for consolidate
  intents: Intent[]        // union of all flags that apply
  headline: string         // the single primary reason, e.g. "Fills your 3B" / "Press their SS hole"
  you: SideEffect
  them: SideEffect
  fit: FitPair             // two-sided, computed uniformly via fitScore
  pitch: string            // templated, partner-interest framed
}
```

**Merge & dedupe:** category and positional generators both surface deals; key each by `id` and UNION their intent flags, merging `fills`/`helps`. A deal that is both a positional win-win and a category win-win is ONE opportunity tagged `winWin` with both a `fillsPos` and `fillsCats`.

**Uniform fit:** every opportunity's `fit` is computed by `computeFit` from the engine's `strengthByKey` + each team's category `landscape` need + the positional landscape need — regardless of which generator produced it. The **lens** selects the weight preset (`FIT_WEIGHTS_POSITION` vs `FIT_WEIGHTS_CATEGORY`) and re-sorts. This is what finally fixes #2–#4: category deals now rank by need-weighted you-fit.

**hurts (new):** for each side, `hurtsCats` = categories where the need-weighted delta is negative beyond a threshold (you're genuinely shedding a contributor in a category that matters to that team). Mirror of `helps`. Thresholded so it stays honest, not noise.

### Ranking

- **Default sort:** descending `fit.you`, **gated by acceptance** — only opportunities with `fit.them ≥ ACCEPT_BAR` appear in the main list. This puts "great for you AND they'd plausibly do it" on top.
- **`press leverage` filter:** lifts the acceptance gate, surfacing lopsided steals (high you / low them).
- **Lens (position / category):** swaps the fit weight preset and re-sorts; does NOT change the dataset.
- **Intent chips:** filter the list to opportunities carrying that flag.

## Layout

Keep the **Your leverage** (top) and **Best trade partners** (bottom) bookends unchanged. Replace the matrix middle with:

```
YOUR LEVERAGE                              (unchanged)
──────────────────────────────────────────────────────
BEST MOVES RIGHT NOW                       [lens: position ▾]
  2–3 hero cards: top fit.you, acceptance-gated, cross-intent
──────────────────────────────────────────────────────
ALL OPPORTUNITIES
  [win-win] [steal] [consolidate] [buy-low]   [press leverage ☐]
  full ranked list, same card component, collapsed by default
──────────────────────────────────────────────────────
BEST TRADE PARTNERS                        (unchanged)
```

### Card anatomy (decision-first, progressive disclosure)

**Collapsed (default):**
- Header: `headline` (single primary reason) + intent flag chip(s) + two-sided `FitMeter` (You / Them).
- GET row(s) and GIVE row(s): avatar, name, pro logo, pos, `ValueBadge`.
- Partner attribution ("from <team>").

**Expanded (one toggle — "why this works / how to pitch it"):**
- `YOU   fill <pos> · gain <cats> · cost <cats|—>`
- `THEM  fill <pos> · gain <cats> · cost <cats|—>`
- Pitch sentence + **copy** button. (On-demand "polish" is a later, separate action — see phasing.)

Density rule: collapsed card shows ONLY headline + players + meters + flags. Everything else is behind the expand. This is the guardrail against the spreadsheet failure mode.

## Pitch templating

Rule-based, generated from the structured opportunity, framed in the **partner's** self-interest (not the requester's):

1. Identify the partner's biggest pain this deal solves: their thinnest position the give fills (`them.fillsPos`) and/or their worst category the give helps (`them.fillsCats[0]`).
2. Identify your ask: the hole the get fills for you (`you.fillsPos` / `you.fillsCats[0]`).
3. Compose ~1–2 sentences, leading with their pain:
   > "<Partner> is thin at <them.fillsPos> and <rank> in <them.fillsCats[0]> — <give name> plugs it. Offer it for <get name>, who fills your <you.fillsPos>. Lead with their <pain>."
4. Degrade gracefully when a facet is absent (pure category deal → drop the position clause; pure position deal → drop the category clause).

Templated output is instant and honest. The existing `pitch` field on category `TradeTarget` is a starting point but is requester-framed; this replaces it with partner-framed copy built from the unified facts.

**Future (not this spec):** an on-demand "polish this pitch" action per deal that calls an LLM to rewrite the templated sentence with more voice. Deferred because a client-side list cannot fire an LLM per row on render.

## Phasing

1. **Spine** — `opportunities.ts` + `useTradeOpportunities.ts`: merge both generators, compute uniform two-sided fit, compute helps/hurts per side. Invisible, but fixes #2–#4 and powers everything. Unit-tested in isolation.
2. **UI** — `TradesView.vue`: hero + one filterable list, lens control, intent chips, `press leverage` toggle, collapsed/expanded card with two-sided helps/hurts. Reuse `FitMeter`, `ValueBadge`, `Avatar`.
3. **Pitch** — templated partner-framed sentence + copy button. (LLM polish deferred.)

Each phase leaves the page working. Bookends untouched throughout.

## Testing

- `opportunities.test.ts`: merge dedupes overlapping category+positional deals into one with unioned intents; `fillsPos`/`fillsCats`/`hurtsCats` populated correctly; `hurtsCats` respects the threshold; acceptance gate filters by `fit.them`; lens swaps weights and re-sorts.
- Extend `fitScore` coverage for the category-led preset if needed.
- Pitch: `pitch.test.ts` — partner-framed sentence for a position-only, category-only, and combined opportunity; graceful degradation.
- Existing 210 tests stay green; `npm run build` is the gate.

## Risks & mitigations

- **Spreadsheet density** → collapsed card shows only headline + players + meters + flags; rest behind expand; 2–3 hero cap.
- **Dishonest "hurts"** → threshold the need-weighted loss; show "cost —" when none material.
- **Ranking a heterogeneous list** → acceptance-gated you-fit default; steals behind a filter, never the default top.
- **Pitch sounding robotic/manipulative** → honest, fact-derived, partner-interest framing; keep to 1–2 sentences; LLM polish opt-in later.
- **Over-investing in IA over substance** → the value is the pitch landing + two-sided helps/hurts, not the layout; validate with a real league-mate before polishing (consistent with prior user guidance favoring substance over layout systematization).

## Out of scope

- LLM pitch polish (future on-demand action).
- Multi-player (3+) packages beyond 2-for-1 consolidate.
- Cross-page changes outside the Trades view.
- Any push/deploy — work stays local until the user tests with real users.
