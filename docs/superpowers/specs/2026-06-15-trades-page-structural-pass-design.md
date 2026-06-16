# Trades Page — Structural Pass (Design)

**Date:** 2026-06-15
**Branch:** `redesign/my-team-first` (local only — no push/deploy until real-user testing)
**Status:** Approved design, pending spec review → implementation plan

## Goal

Make the Trades page read as one argument — **where you stand → what to do → explore → test your own** — instead of a flat stack of equal-weight boxes. Reorder the sections, let the recommendations visually dominate, and bridge your stated holes to the moves that fix them by making the leverage holes a one-click filter (symmetric with the partner navigator we already ship).

## Why

The page currently stacks five same-weight boxes in the order Leverage → Analyze → Best Moves → All Opportunities → Best Partners. Two things break the narrative: the build-your-own **Analyze** tool sits at #2, *above* the auto-recommendations that are the product's whole point; and nothing signals that the **moves** are the centerpiece while leverage/partners are supporting context. Separately, the Leverage box states your holes in **categories** ("fix HR, R, SV") while the cards lead with **positions** ("FILLS YOUR 3B"), so the page reads as two disconnected halves.

## Scope

One cohesive layout/interaction pass, almost entirely in `src/views/TradesView.vue`, plus one tiny type addition in `useTradeTargets.ts`. No engine/standings changes. The analyze-tool standings migration is a **separate, later** spec.

---

## 1. Section reorder

New top-to-bottom order:

1. **Your Leverage** (context — your surplus + your holes; holes now clickable, see §4)
2. **Best Moves Right Now** (the centerpiece — see §2)
3. **All Opportunities** (+ Mutual/Steals toggle)
4. **Best Trade Partners** (the navigator — click to focus)
5. **Analyze a Specific Trade** (collapsible, bottom — "…or test a deal you have in mind")

Only the **Analyze** section moves (from #2 to the bottom). Everything else keeps its relative order. The `oppsTop` scroll anchor (already present) stays at the top of Best Moves so partner/hole focus still scrolls the moves into view.

## 2. Visual hierarchy — the moves dominate

Best Moves Right Now is the page's payoff and should read as such, not as one of five equal boxes. Apply a light emphasis treatment to that section only:

- A subtle accent on the section (a left-aligned heading with the primary color, and a faint primary-tinted container or top rule) so the eye lands there first.
- Keep the supporting boxes (Leverage, Partners, Analyze) at their current quieter weight.

This is a CSS/markup-only change — no new components. Exact classes are specified in the plan; the intent is "the recommendations are visibly the main event," not a redesign of the card itself.

## 3. Subtitle refresh

Replace the stale subtitle "The league, and who to trade for — by rest-of-season value" with the current promise:

> **Who to trade for — ranked by how many categories each move wins you per week.**

## 4. The bridge — clickable leverage holes (the meat)

Generalize the existing partner-focus interaction so you can focus the moves by **either** a partner **or** one of your category holes. One focus at a time (mutually exclusive).

### Focus state (generalize `focusedPartner`)

Replace the current `focusedPartner: Ref<string | null>` in `TradesView.vue` with a discriminated focus:

```ts
type Focus = { kind: 'partner'; key: string } | { kind: 'cat'; key: string } | null
const focus = ref<Focus>(null)
const setFocus = (f: Exclude<Focus, null>) => {
  // toggle off if re-clicking the same thing; otherwise switch
  const same = focus.value && focus.value.kind === f.kind && focus.value.key === f.key
  focus.value = same ? null : f
  if (focus.value) nextTick(() => oppsTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
const clearFocus = () => { focus.value = null }
const matchesFocus = (o: TradeOpportunity): boolean => {
  const f = focus.value
  if (!f) return true
  if (f.kind === 'partner') return o.partner === f.key
  // 'cat': the move improves your rank in that hole category
  return o.standings.ladder.some((m) => m.statId === f.key && m.beatsMore > 0)
}
const focusedCount = computed(() =>
  focus.value ? [...hero.value, ...ranked.value].filter(matchesFocus).length : 0,
)
const focusLabel = computed(() => {
  const f = focus.value
  if (!f) return ''
  return f.kind === 'partner' ? `moves with ${f.key}` : `moves that fix ${labelOf(f.key)}`
})
```

- Cards fade with `:class="['transition-opacity', matchesFocus(o) ? '' : 'opacity-30']"` (replacing the current `isFocused(o)` call) on both the hero and the ranked lists.
- The banner becomes: `Showing {{ focusLabel }} · clear ✕` (one banner serves both focus kinds).
- The empty hint generalizes: when `focus && !focusedCount`, show `No {{ focusLabel }} right now{{ pressLeverage ? '' : ' — try Steals' }}.`

### Clickable holes in the Leverage box

The "To fix" chips (`view.toFix`) become buttons that call `setFocus({ kind: 'cat', key: c.statId })`. Active chip gets a ring/brighter treatment when `focus.kind === 'cat' && focus.key === c.statId`. The "Trade from" (surplus) chips stay **static** — you filter moves by what you want fixed, not by your surplus.

### Partner rows

The partner rows switch from `focusPartner(p.team)` to `setFocus({ kind: 'partner', key: p.team })`, and their active highlight keys off `focus?.kind === 'partner' && focus.key === p.team`. Behavior is otherwise unchanged.

### Data change — `CatTag.statId`

`view.toFix` items are `CatTag` (`{ label, rank, hole? }`) with **no statId**, but `matchesFocus` needs the statId. Add `statId: string` to the `CatTag` interface in `useTradeTargets.ts` and populate it in the `tag()` factory (the statId is already in scope there: `const tag = (statId: string): CatTag => ({ statId, label: ..., rank: ..., hole: ... })`). This is the single non-`TradesView` change. Both `toFix` and `tradeFrom` are built via `tag()`, so both gain `statId` for free; only `toFix` uses it.

## 5. Collapse hero/all when deals are few

For a thin team (e.g. the Yahoo roster with ~3 total moves), all moves go to "Best Moves" and "All Opportunities" renders empty with a "see above" note — the split is silly at low counts. When `hero.length + ranked.length <= FEW (5)`, render a **single** "Best moves right now" section containing `[...hero, ...ranked]` and hide the separate "All Opportunities" section. Above the threshold, keep today's two-section hero/all layout. So that Steals stays reachable in the collapsed case, the **Mutual/Steals toggle moves onto the single section's header** (it normally lives on the All Opportunities header). Implementation: a `fewDeals` computed gates which of the two layouts renders.

## Components & data flow

```
useTradeTargets.ts   CatTag gains statId (toFix chips can focus by statId)
        │
        ▼
TradesView.vue
  • section order: Leverage → Best Moves → All Opps → Partners → Analyze
  • Best Moves emphasized (hierarchy)
  • focus: { kind: 'partner'|'cat', key } — generalize focusedPartner
        ├─ Leverage "To fix" chips  → setFocus({kind:'cat', key:statId})
        ├─ Partner rows             → setFocus({kind:'partner', key:team})
        ├─ cards fade via matchesFocus(o)
        ├─ banner "Showing {focusLabel} · clear"
        └─ empty hint when focus && !focusedCount
  • fewDeals → one combined moves list instead of hero/all split
  • subtitle refreshed
```

## Error handling & edge cases

- **Hole no move fixes:** click a `To fix` cat that nothing improves → all cards fade, empty hint reads "No moves that fix HR right now — try Steals." (No blank screen.)
- **Focus persists across Mutual/Steals toggle:** switching the toggle recomputes `focusedCount`; if the focused thing has matches in the new mode they show, else the hint appears. Intended.
- **Re-click clears:** clicking the active partner row or active hole chip toggles focus off.
- **`fewDeals` boundary:** exactly at the threshold uses the two-section layout; below it uses one. The combined list preserves deltaYou-descending order (hero is already the top distinct moves; concatenating hero then ranked keeps the best first).
- **Surplus chips are not clickable** — only `toFix` holes filter; `tradeFrom` stays static (no affordance, no hover).
- **A category label collision** can't break focus because matching is by `statId`, not label.

## Testing

This pass is presentation/interaction in a Vue view — covered by build + type-check + manual reload, not unit tests (consistent with the rest of the Trades UI work). Specifically verify on reload, both leagues:
- Section order is Leverage → Best Moves → All Opps → Partners → Analyze; Best Moves visibly dominant.
- Clicking a **To fix** hole fades all but the moves whose ladder improves that category; banner + clear work; re-click clears.
- Clicking a **partner** still works (now via the same focus); partner and hole focus are mutually exclusive.
- Thin (Yahoo) team shows **one** combined moves list, no empty "All Opportunities"; deep (ESPN) team keeps the hero/all split.
- `npm run type-check` shows no NEW errors in `TradesView.vue` / `useTradeTargets.ts` (pre-existing errors in unrelated files are out of scope — see the build/type-check note in memory).
- `npm run build` succeeds; existing 227 tests stay green.

## Out of scope (deferred)

- The analyze-tool standings migration (its own spec).
- Best Trade Partners language migration (separate, optional).
- Phase 2 league page (heat matrix → simulator).
- Any `· fixes HR` text on the card headline — the bridge is the clickable hole, not headline text (keeps headlines clean).

## Constraints

- All work stays **local** on `redesign/my-team-first`. No push, deploy, or PR.
- NO auto-import; every symbol explicitly imported. **`npm run build` does NOT type-check** — the real check is `npm run type-check` (`vue-tsc` against `tsconfig.json`; there is no `tsconfig.app.json`). Verify touched files are absent from the error list.
- A green build will not catch a dangling Vue template ref — eyeball the template after edits.
- zsh exclamation issues → write throwaway scripts to `/tmp/`.
