# Unified Trade Opportunities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Trades page's 2×4 navigation matrix with one ranked, filterable list of trade opportunities — each carrying intent flags, two-sided fit, per-team helps/hurts, and a partner-framed pitch.

**Architecture:** A pure merge layer (`opportunities.ts`) consumes the existing category (`useTradeTargets`) and positional (`usePositionalTargets`) deal lists, dedupes overlaps by player keys, and recomputes a uniform two-sided fit under a selectable lens. A composable (`useTradeOpportunities`) assembles engine context and exposes a ranked/filtered list + hero. The view renders a hero + one filterable list with collapsed/expanded cards. Pitch text is templated from the merged facts.

**Tech Stack:** Vue 3 `<script setup>` / TypeScript / Pinia / Tailwind / Vitest. NO auto-import — every symbol explicitly imported (neither esbuild nor vue-tsc reliably catches an undefined-symbol runtime crash; `npm run build` is the gate). Commit locally on `redesign/my-team-first`; never push/deploy. Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Use `git -c gc.auto=0` (benign pre-existing gc warning).

---

## File Structure

- **Create** `src/trades/opportunities.ts` — `TradeOpportunity`/`Intent`/`OppSide`/`SideEffect` types; `buildOpportunities(raws, ctx)` (merge + side-effects + fit + dedupe).
- **Create** `src/trades/pitch.ts` — `buildPitch(opp)` templated partner-framed sentence.
- **Create** `src/composables/useTradeOpportunities.ts` — assembles engine context, maps both view lists → `RawDeal[]`, returns ranked/filtered list + hero.
- **Create** tests: `src/trades/__tests__/opportunities.test.ts`, `src/trades/__tests__/pitch.test.ts`.
- **Modify** `src/composables/useTradeTargets.ts` — add `playerKey` to `TradeSide`; add `partnerKey` to `TradeTarget`/`ConsolidateTarget` (and timing variants); populate them.
- **Modify** `src/composables/usePositionalTargets.ts` — add `eligible: string[]` to `PosSide` (so the merge can test slot coverage without re-deriving); add `partnerKey` to `PositionalTarget`/`PositionalConsolidate`.
- **Modify** `src/views/TradesView.vue` — Phase 2 UI: hero + filterable list, lens control, intent chips, `press leverage` toggle, collapsed/expanded card. Phase 3: pitch line + copy.
- **Create** `src/components/trades/OpportunityCard.vue` — the collapsed/expanded card (Phase 2).

---

## PHASE 1 — Spine (merge + uniform fit + helps/hurts)

### Task 1: Thread player keys + partner keys through the generator outputs

**Files:**
- Modify: `src/composables/useTradeTargets.ts`
- Modify: `src/composables/usePositionalTargets.ts`

- [ ] **Step 1: Add `playerKey` to `TradeSide`**

In `src/composables/useTradeTargets.ts`, add `playerKey: string` to the `TradeSide` interface:

```ts
export interface TradeSide {
  playerKey: string
  name: string
  pos: string
  value: number
  headshot?: string
  proLogo?: string
  timing?: 'buy' | 'sell'
  timingConfirmed?: boolean
}
```

- [ ] **Step 2: Populate `playerKey` wherever a `TradeSide` is built**

Find every site that constructs a side object for `get`/`give` (the `sideOf`-style helpers and inline literals). Each already has the player's `playerKey` in scope (deals are built from pool players keyed by `playerKey`). Add `playerKey` to each constructed side. Run `grep -n "name:.*pos:\|get:\s*{\|give:" src/composables/useTradeTargets.ts` to locate them.

- [ ] **Step 3: Add `partnerKey` to the target interfaces**

```ts
export interface TradeTarget { partnerKey: string; /* ...existing... */ }
export interface ConsolidateTarget { partnerKey: string; /* ...existing... */ }
```

Populate `partnerKey` from the partner team id already in scope at each `toTarget`/consolidate construction site (the loops iterate `ps.teamId`/`teamKey`).

- [ ] **Step 4: Add `eligible` + `partnerKey` to positional output**

In `src/composables/usePositionalTargets.ts`, extend `PosSide` and the targets:

```ts
export interface PosSide { playerKey: string; name: string; pos: string; value: number; headshot?: string; proLogo?: string; eligible: string[] }
export interface PositionalTarget { partnerKey: string; /* ...existing... */ }
export interface PositionalConsolidate { partnerKey: string; /* ...existing... */ }
```

In `sideOf`, set `eligible: eligOf(key)`. At each `reachRaw`/`winWinRaw`/`consolidateRaw` push, add `partnerKey: teamKey`.

- [ ] **Step 5: Build + test**

Run: `npm run build` — Expected: green. Run: `npx vitest run src/composables/__tests__/usePositionalTargets.test.ts src/trades/__tests__/analyzeTrade.test.ts` — Expected: PASS (update the positional test fixtures if `eligible`/`partnerKey` are asserted; they currently are not, so no change expected).

- [ ] **Step 6: Commit**

```bash
git add -A && git -c gc.auto=0 commit -m "refactor(trades): expose playerKey/partnerKey/eligible on deal outputs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 2: The opportunity merge layer

**Files:**
- Create: `src/trades/opportunities.ts`
- Test: `src/trades/__tests__/opportunities.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildOpportunities, type RawDeal, type OppContext } from '../opportunities'
import { FIT_WEIGHTS_POSITION } from '../fitScore'

const side = (k: string, pos: string, value: number, eligible = [pos]) =>
  ({ playerKey: k, name: k, pos, value, eligible })

const ctx = (over: Partial<OppContext> = {}): OppContext => ({
  myKey: 'me', statIds: ['R', 'SV'],
  strengthByKey: new Map([['stud', { R: 2 }], ['mine', { SV: 1 }]]),
  valueByKey: new Map([['stud', 80], ['mine', 70]]),
  catLandscape: new Map([
    ['me', new Map([['R', { rank: 9, surplus: 0, need: 0.8 }], ['SV', { rank: 1, surplus: 1, need: 0 }]])],
    ['them', new Map([['R', { rank: 1, surplus: 1, need: 0 }], ['SV', { rank: 9, surplus: 0, need: 0.8 }]])],
  ]) as any,
  posLandscape: new Map([
    ['me', new Map([['3B', { slots: 1, startableCount: 0, depthRank: 0, surplus: 0, surplusBodies: 0, need: 0.5 }]])],
    ['them', new Map()],
  ]) as any,
  myThin: ['3B'], weights: FIT_WEIGHTS_POSITION, hurtThreshold: 0.15,
  labelOf: (s) => s, ...over,
})

describe('buildOpportunities', () => {
  it('dedupes the same deal from two generators into one with unioned intents', () => {
    const raws: RawDeal[] = [
      { partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['winWin'] },
      { partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['consolidate'] },
    ]
    const out = buildOpportunities(raws, ctx())
    expect(out).toHaveLength(1)
    expect(out[0].intents.sort()).toEqual(['consolidate', 'winWin'])
  })

  it('surfaces fillsPos for you when a GET covers your thin slot', () => {
    const raws: RawDeal[] = [{ partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['winWin'] }]
    const out = buildOpportunities(raws, ctx())
    expect(out[0].you.fillsPos).toBe('3B')
    expect(out[0].you.fillsCats).toContain('R') // get has R strength, you need R
  })

  it('thresholds hurts — a small category loss does not register', () => {
    const raws: RawDeal[] = [{ partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['winWin'] }]
    // you give 'mine' (SV strength 1) but you DON'T need SV (need 0) -> dead value, not a hurt.
    const out = buildOpportunities(raws, ctx())
    expect(out[0].you.hurtsCats).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/trades/__tests__/opportunities.test.ts` — Expected: FAIL ("buildOpportunities is not a function").

- [ ] **Step 3: Implement `opportunities.ts`**

```ts
import { computeFit, type FitPair, type FitWeights } from './fitScore'
import { coversSlot, type PositionalLandscape } from './positionalLandscape'
import type { Landscape } from './landscape'

export type Intent = 'winWin' | 'steal' | 'consolidate' | 'buyLow' | 'sellHigh'

export interface OppSide {
  playerKey: string; name: string; pos: string; value: number
  headshot?: string; proLogo?: string; eligible: string[]
}
export interface SideEffect { fillsPos?: string; fillsCats: string[]; hurtsCats: string[] }

export interface TradeOpportunity {
  id: string
  partnerKey: string; partner: string; partnerLogo?: string
  get: OppSide[]; give: OppSide[]
  intents: Intent[]
  headline: string
  you: SideEffect; them: SideEffect
  fit: FitPair
  pitch: string // filled in Phase 3; '' until then
}

export interface RawDeal {
  partnerKey: string; partner: string; partnerLogo?: string
  get: OppSide[]; give: OppSide[]
  intents: Intent[]
}

export interface OppContext {
  myKey: string
  statIds: string[]
  strengthByKey: Map<string, Record<string, number>>
  valueByKey: Map<string, number>
  catLandscape: Landscape
  posLandscape: PositionalLandscape
  myThin: string[]
  weights: FitWeights
  hurtThreshold: number
  labelOf: (statId: string) => string
}

const POS_EDGE = 0.5

const needMap = (ls: Landscape, team: string, statIds: string[]): Record<string, number> => {
  const cl = ls.get(team); const out: Record<string, number> = {}
  for (const c of statIds) out[c] = cl?.get(c)?.need ?? 0
  return out
}
const sumStr = (sides: OppSide[], sb: Map<string, Record<string, number>>, statIds: string[]): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const s of sides) { const st = sb.get(s.playerKey) ?? {}; for (const c of statIds) out[c] = (out[c] ?? 0) + (st[c] ?? 0) }
  return out
}
const sumVal = (sides: OppSide[], vb: Map<string, number>): number => sides.reduce((s, x) => s + (vb.get(x.playerKey) ?? 0), 0)

// Categories a side gains (need-weighted positive delta) and loses (negative beyond threshold).
const catEffect = (
  getStr: Record<string, number>, giveStr: Record<string, number>, need: Record<string, number>,
  statIds: string[], labelOf: (s: string) => string, hurtThr: number,
): { gain: string[]; lose: string[] } => {
  const gain: { c: string; v: number }[] = []; const lose: { c: string; v: number }[] = []
  for (const c of statIds) {
    const delta = ((getStr[c] ?? 0) - (giveStr[c] ?? 0)) * (need[c] ?? 0)
    if (delta > 0.01) gain.push({ c, v: delta })
    else if (delta < -hurtThr) lose.push({ c, v: -delta })
  }
  gain.sort((a, b) => b.v - a.v); lose.sort((a, b) => b.v - a.v)
  return { gain: gain.slice(0, 3).map((x) => labelOf(x.c)), lose: lose.slice(0, 2).map((x) => labelOf(x.c)) }
}

const thinPositionsOf = (pl: PositionalLandscape, team: string): string[] => {
  const m = pl.get(team); if (!m) return []
  return [...m.entries()].filter(([, st]) => st.need >= POS_EDGE).map(([pos]) => pos)
}
// First thin slot any of these players covers (the hole they plug for that side).
const fillsPosFor = (sides: OppSide[], thin: string[]): string | undefined => {
  for (const t of thin) for (const s of sides) if (coversSlot(s.eligible, t)) return t
  return undefined
}
const posNeedAt = (pl: PositionalLandscape, team: string, pos?: string): number =>
  pos ? (pl.get(team)?.get(pos)?.need ?? 0) : 0

const headlineOf = (you: SideEffect, them: SideEffect, intents: Intent[]): string => {
  if (you.fillsPos) return `Fills your ${you.fillsPos}`
  if (intents.includes('steal') && them.fillsPos) return `Press their ${them.fillsPos} hole`
  if (you.fillsCats.length) return `Adds ${you.fillsCats[0]}`
  if (intents.includes('buyLow')) return 'Buy-low window'
  return 'Upgrade'
}

const idOf = (d: RawDeal): string =>
  `${d.partnerKey}|${d.get.map((s) => s.playerKey).sort().join(',')}|${d.give.map((s) => s.playerKey).sort().join(',')}`

export function buildOpportunities(raws: RawDeal[], ctx: OppContext): TradeOpportunity[] {
  const myNeed = needMap(ctx.catLandscape, ctx.myKey, ctx.statIds)
  const byId = new Map<string, TradeOpportunity>()
  for (const d of raws) {
    const id = idOf(d)
    const existing = byId.get(id)
    if (existing) { // merge: union intents, keep the richer side-effects already computed
      for (const it of d.intents) if (!existing.intents.includes(it)) existing.intents.push(it)
      existing.headline = headlineOf(existing.you, existing.them, existing.intents)
      continue
    }
    const theirNeed = needMap(ctx.catLandscape, d.partnerKey, ctx.statIds)
    const theirThin = thinPositionsOf(ctx.posLandscape, d.partnerKey)
    const getStr = sumStr(d.get, ctx.strengthByKey, ctx.statIds)
    const giveStr = sumStr(d.give, ctx.strengthByKey, ctx.statIds)
    const youCat = catEffect(getStr, giveStr, myNeed, ctx.statIds, ctx.labelOf, ctx.hurtThreshold)
    const themCat = catEffect(giveStr, getStr, theirNeed, ctx.statIds, ctx.labelOf, ctx.hurtThreshold)
    const youFillsPos = fillsPosFor(d.get, ctx.myThin)
    const themFillsPos = fillsPosFor(d.give, theirThin)
    const you: SideEffect = { fillsPos: youFillsPos, fillsCats: youCat.gain, hurtsCats: youCat.lose }
    const them: SideEffect = { fillsPos: themFillsPos, fillsCats: themCat.gain, hurtsCats: themCat.lose }
    const fit = computeFit({
      getStr, giveStr, myNeed, theirNeed, statIds: ctx.statIds,
      myPosNeed: posNeedAt(ctx.posLandscape, ctx.myKey, youFillsPos),
      theirPosNeed: posNeedAt(ctx.posLandscape, d.partnerKey, themFillsPos),
      getVal: sumVal(d.get, ctx.valueByKey), giveVal: sumVal(d.give, ctx.valueByKey),
    }, ctx.weights)
    byId.set(id, {
      id, partnerKey: d.partnerKey, partner: d.partner, partnerLogo: d.partnerLogo,
      get: d.get, give: d.give, intents: [...d.intents],
      headline: headlineOf(you, them, d.intents), you, them, fit, pitch: '',
    })
  }
  return [...byId.values()]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/trades/__tests__/opportunities.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git -c gc.auto=0 commit -m "feat(trades): opportunity merge layer with two-sided fit + helps/hurts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 3: `useTradeOpportunities` composable

**Files:**
- Create: `src/composables/useTradeOpportunities.ts`

- [ ] **Step 1: Implement the composable**

It takes the same engine-derived refs `TradesView` already computes (`pool`, `valueByKey`, `strengthByKey`, `catLandscape`, `statIds`, `myTeamKey`, `rosterSlots`, `myStatuses`, `teamName`/`logo` maps, `labelOf`), plus the two existing view objects (`useTradeTargets` `view` and `usePositionalTargets` `posView`). It:

1. Builds `posLandscape` via `buildPositionalLandscape` from `pool` + `rosterSlots` (reuse the depth-player construction from `usePositionalTargets` — extract a tiny shared helper `toDepthPlayers(pool, myKey, statuses)` into `positionalLandscape.ts` if convenient, else inline).
2. Computes `myThin` = positions with `need ≥ 0.5` for `myTeamKey`.
3. Maps each category `TradeTarget` → `RawDeal` (intents: `winWin` if `klass==='winWin'` else `steal`; the `timing` lists add `buyLow`/`sellHigh` based on each side's `timing` flag), each `ConsolidateTarget` → `RawDeal` with `intents:['consolidate']`, each positional `reach`→`steal`, `winWin`→`winWin`, `consolidate`→`consolidate`. Map sides to `OppSide` (positional sides already carry `eligible`; category sides derive `eligible` from `pos.split(/[,/|]/)`).
4. Calls `buildOpportunities(raws, ctx)` with `weights` selected by a `lens` ref (`'position' | 'category'` → `FIT_WEIGHTS_POSITION` / `FIT_WEIGHTS_CATEGORY`).
5. Exposes:
   - `all` — full list.
   - `ranked` — `all` filtered by `intent` chips + acceptance gate (`fit.them ≥ ACCEPT_BAR`, unless `pressLeverage` is on), sorted by `fit.you` desc.
   - `hero` — top `HERO_COUNT` (=3) of the acceptance-gated set (ignoring intent chip filter), cross-intent.
   - control refs: `lens`, `activeIntents: Set<Intent>`, `pressLeverage`.

Constants: `ACCEPT_BAR = 0.45`, `HERO_COUNT = 3`, `hurtThreshold = 0.15`.

- [ ] **Step 2: Build + lightweight smoke test**

Run: `npm run build` — Expected: green. (Composable logic is covered transitively by `opportunities.test.ts`; a Vue-level test is optional. If added, mirror the `usePositionalTargets.test.ts` ref-wrapping pattern.)

- [ ] **Step 3: Commit**

```bash
git add -A && git -c gc.auto=0 commit -m "feat(trades): useTradeOpportunities — ranked/gated list + hero + lens

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## PHASE 2 — UI (hero + one filterable list)

### Task 4: `OpportunityCard.vue`

**Files:**
- Create: `src/components/trades/OpportunityCard.vue`

- [ ] **Step 1: Implement the card**

Props: `opp: TradeOpportunity`. Local `expanded = ref(false)`. Reuse `Avatar`, `ValueBadge`, `FitMeter`.

- Header: `opp.headline` + intent chips (`win-win` / `steal` / `consolidate` / `buy-low` styled like the existing amber/green chips) + `<FitMeter :you="opp.fit.you" :them="opp.fit.them" />`.
- GET rows (`opp.get`) and GIVE rows (`opp.give`): avatar, name, proLogo, pos, `ValueBadge`. Multi-give renders stacked (consolidate) — reuse the existing 2-for-1 markup pattern from `TradesView`.
- A single expand toggle ("why this works"): on expand show two rows —
  `YOU  fill {{ opp.you.fillsPos || '—' }} · gain {{ opp.you.fillsCats.join(' · ') || '—' }} · cost {{ opp.you.hurtsCats.join(' · ') || '—' }}`
  and the same for `THEM` — color gains primary-green, costs amber. (Pitch line slot left empty here; filled in Phase 3.)

Density rule: collapsed state shows ONLY header + player rows. Helps/hurts live behind the expand.

- [ ] **Step 2: Build**

Run: `npm run build` — Expected: green. Verify the import is explicit in any consumer.

- [ ] **Step 3: Commit**

```bash
git add -A && git -c gc.auto=0 commit -m "feat(trades): OpportunityCard with collapsed/expanded helps-hurts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 5: Wire the new list into `TradesView`, retire the matrix

**Files:**
- Modify: `src/views/TradesView.vue`

- [ ] **Step 1: Add the composable + controls**

Import `useTradeOpportunities`, `OpportunityCard`, `type Intent`. Instantiate with the existing engine-derived refs + `view`/`posView`. Add template state for the `lens` select, intent chips (toggle `activeIntents`), and the `pressLeverage` checkbox.

- [ ] **Step 2: Replace the middle (matrix) with hero + list**

Between "Analyze a specific trade" and "Best trade partners", remove the `BY {Categories|Position}` toggle, the `MODES` tabs, the category sections, and the `dimension === 'position'` block. Insert:

```html
<section class="space-y-2">
  <div class="flex items-center justify-between">
    <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Best moves right now</span>
    <label class="font-mono text-[10px] text-dark-textMuted">lens
      <select v-model="lens" class="ml-1 bg-transparent text-primary"><option value="position">position</option><option value="category">category</option></select>
    </label>
  </div>
  <OpportunityCard v-for="o in hero" :key="o.id" :opp="o" />
</section>

<section class="space-y-3">
  <div class="flex flex-wrap items-center gap-2">
    <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">All opportunities</span>
    <button v-for="it in INTENTS" :key="it.key" @click="toggleIntent(it.key)"
      :class="activeIntents.has(it.key) ? 'text-primary' : 'text-dark-textMuted'"
      class="font-mono text-[11px]">{{ it.label }}</button>
    <label class="ml-auto font-mono text-[10px] text-dark-textMuted"><input type="checkbox" v-model="pressLeverage" /> press leverage</label>
  </div>
  <p v-if="!ranked.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
    No opportunities match — clear a filter or toggle <b>press leverage</b>.
  </p>
  <OpportunityCard v-for="o in ranked" :key="o.id" :opp="o" />
</section>
```

Define `INTENTS = [{key:'winWin',label:'win-win'},{key:'steal',label:'steal'},{key:'consolidate',label:'consolidate'},{key:'buyLow',label:'buy-low'}]` and `toggleIntent`.

- [ ] **Step 3: Delete now-dead code**

Remove `dimension`, `mode`, `MODES`, `posOneForOne`, `modeBlurb`, and the per-mode category computeds that only fed the old matrix. Keep `view.tradeFrom`/`toFix`/`partners` (leverage + partners bookends) and the engine/`posView` inputs the composable needs. Run `npx vue-tsc --noEmit` and remove any now-unused imports it flags in `TradesView.vue`.

- [ ] **Step 4: Build + full test + type-check**

Run: `npm run build` — Expected: green. Run: `npx vitest run` — Expected: all pass. Run: `npx vue-tsc --noEmit 2>&1 | grep TradesView` — Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A && git -c gc.auto=0 commit -m "feat(trades): unified opportunity list replaces the 2x4 matrix

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## PHASE 3 — Pitch

### Task 6: Templated partner-framed pitch

**Files:**
- Create: `src/trades/pitch.ts`
- Test: `src/trades/__tests__/pitch.test.ts`
- Modify: `src/trades/opportunities.ts` (call `buildPitch`)
- Modify: `src/components/trades/OpportunityCard.vue` (render + copy)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildPitch } from '../pitch'
import type { TradeOpportunity } from '../opportunities'

const opp = (over: Partial<TradeOpportunity> = {}): TradeOpportunity => ({
  id: 'x', partnerKey: 'them', partner: 'Chaplao',
  get: [{ playerKey: 'g', name: 'Ernie Clement', pos: '3B', value: 79, eligible: ['3B'] }],
  give: [{ playerKey: 'v', name: 'Jung Hoo Lee', pos: 'OF', value: 65, eligible: ['OF'] }],
  intents: ['winWin'], headline: 'Fills your 3B',
  you: { fillsPos: '3B', fillsCats: ['HR'], hurtsCats: [] },
  them: { fillsPos: 'OF', fillsCats: ['FPCT'], hurtsCats: [] },
  fit: { you: 0.8, them: 0.6 }, pitch: '', ...over,
})

describe('buildPitch', () => {
  it('leads with the partner pain and names the give + ask', () => {
    const p = buildPitch(opp())
    expect(p).toContain('Chaplao')
    expect(p).toContain('OF')              // their hole the give fills
    expect(p).toContain('Jung Hoo Lee')    // the give
    expect(p).toContain('Ernie Clement')   // the ask
  })

  it('degrades gracefully when the partner fills no position (category-only)', () => {
    const p = buildPitch(opp({ them: { fillsPos: undefined, fillsCats: ['SV'], hurtsCats: [] } }))
    expect(p).toContain('SV')
    expect(p).not.toMatch(/thin at\s*(·|,|\.)/) // no dangling "thin at" with no slot
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/trades/__tests__/pitch.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `pitch.ts`**

```ts
import type { TradeOpportunity } from './opportunities'

/** A partner-framed negotiation opener built from the merged facts. Leads with THEIR pain. */
export function buildPitch(o: TradeOpportunity): string {
  const give = o.give.map((s) => s.name).join(' + ')
  const get = o.get.map((s) => s.name).join(' + ')
  const theirPain = o.them.fillsPos
    ? `thin at ${o.them.fillsPos}`
    : o.them.fillsCats.length ? `light on ${o.them.fillsCats[0]}` : 'looking for value'
  const theirGain = o.them.fillsPos && o.them.fillsCats.length ? ` and helps their ${o.them.fillsCats[0]}` : ''
  const yourAsk = o.you.fillsPos
    ? `who fills your ${o.you.fillsPos}`
    : o.you.fillsCats.length ? `who adds ${o.you.fillsCats[0]}` : 'a piece you need'
  return `${o.partner} is ${theirPain} — ${give} plugs it${theirGain}. Offer ${give} for ${get}, ${yourAsk}.`
}
```

- [ ] **Step 4: Call it in `buildOpportunities`**

In `opportunities.ts`, import `buildPitch` and set `pitch: ''` → compute after the opportunity object exists: build the object, then `o.pitch = buildPitch(o)` before `byId.set`. (Avoids a forward-reference; `buildPitch` only reads already-populated fields.)

- [ ] **Step 5: Render + copy in the card**

In `OpportunityCard.vue` expanded section, add `<p class="font-mono text-[11px] text-dark-textSecondary">{{ opp.pitch }}</p>` and a copy button using `navigator.clipboard.writeText(opp.pitch)`.

- [ ] **Step 6: Run tests + build**

Run: `npx vitest run src/trades/__tests__/pitch.test.ts src/trades/__tests__/opportunities.test.ts` — Expected: PASS. Run: `npm run build` — Expected: green.

- [ ] **Step 7: Commit**

```bash
git add -A && git -c gc.auto=0 commit -m "feat(trades): partner-framed templated pitch + copy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] Run `npx vitest run` — all pass (existing 210 + new opportunities/pitch).
- [ ] Run `npm run build` — green.
- [ ] Run `npx vue-tsc --noEmit 2>&1 | grep -E "opportunities|pitch|OpportunityCard|useTradeOpportunities|TradesView"` — no output.
- [ ] Manual (user reload): ESPN + Yahoo show a hero + one list; cards expand to helps/hurts + pitch; lens re-sorts; intent chips filter; `press leverage` surfaces steals.
- [ ] **Do NOT push or deploy.** Report for the user's screenshot pass.

## Notes for the implementer

- NO auto-import: add an explicit `import` for every new symbol in every file that uses it; a green build does not prove imports are present (runtime crash risk). After editing `TradesView.vue`, scan for symbols used in template that aren't imported.
- The old `usePositionalTargets` `fit` field and the old category per-mode lists remain exported but unused by the view after Task 5; leave them (other code/tests reference the composables). Do not delete the composables.
- `ACCEPT_BAR`, `HERO_COUNT`, `hurtThreshold` are tuning dials — surface them as named constants so the user can adjust after the screenshot pass.
```
