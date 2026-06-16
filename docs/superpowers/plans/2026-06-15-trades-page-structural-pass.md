# Trades Page Structural Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Trades page (Analyze to the bottom), make Best Moves the visual centerpiece, refresh the subtitle, and turn the "To fix" leverage holes into one-click filters of the moves — generalizing the existing partner-focus interaction to focus by partner OR category.

**Architecture:** Almost entirely `src/views/TradesView.vue` (script state + template). One supporting one-line change adds `statId` to `CatTag` in `useTradeTargets.ts` so a hole chip can match the standings ladder. No engine/standings/test changes.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind. No new deps.

**This is a presentation/interaction pass — there are no unit tests for it** (consistent with all prior Trades UI work). Each task's gate is: `npm run type-check` shows no NEW errors in the touched files, `npm run build` succeeds, and an eyeball of the template (a green build does NOT catch a dangling Vue ref). The full reload check is at the end.

**Constraints (CLAUDE.md + standing rules):**
- Stay **local** on branch `redesign/my-team-first`. NEVER push/deploy/PR.
- Commit with `git -c gc.auto=0` and trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **`npm run build` does NOT type-check.** The real check is **`npm run type-check`** (`vue-tsc --noEmit` against `tsconfig.json` — there is NO `tsconfig.app.json`). Pre-existing, unrelated type errors live in `src/services/yahoo-daily-stats-methods.ts` (not imported) and one line each in `DraftPage.vue`/`HistoryPage.vue`/`MatchupsPage.vue` — ignore those; just confirm your touched files (`TradesView.vue`, `useTradeTargets.ts`) are absent from the error list.
- NO auto-import; import every symbol explicitly. `nextTick`, `computed`, `ref` are already imported in `TradesView.vue`.
- zsh exclamation issues → write throwaway scripts to `/tmp/`.

---

## File Structure

- **Modify `src/composables/useTradeTargets.ts`** — add `statId: string` to `CatTag` + the `tag()` factory (Task 1).
- **Modify `src/views/TradesView.vue`** — generalize focus state, clickable holes, reorder, hierarchy, few-deals collapse, subtitle (Tasks 2–5).

---

## Task 1: Add `statId` to `CatTag`

**Files:** Modify `src/composables/useTradeTargets.ts` (interface ~line 17; `tag()` ~line 238)

- [ ] **Step 1: Add `statId` to the `CatTag` interface.** Find:

```ts
export interface CatTag {
  label: string
  rank: number
  hole?: boolean // a bottom-tier hole ("Fixes") vs a contested race ("Improves")
}
```

Change to:

```ts
export interface CatTag {
  statId: string
  label: string
  rank: number
  hole?: boolean // a bottom-tier hole ("Fixes") vs a contested race ("Improves")
}
```

- [ ] **Step 2: Populate it in the `tag()` factory.** Find:

```ts
    const tag = (statId: string): CatTag => ({ label: inputs.labelOf(statId), rank: myStanding.get(statId)?.rank ?? 0, hole: (myStanding.get(statId)?.rank ?? 0) >= weakCut })
```

Change to:

```ts
    const tag = (statId: string): CatTag => ({ statId, label: inputs.labelOf(statId), rank: myStanding.get(statId)?.rank ?? 0, hole: (myStanding.get(statId)?.rank ?? 0) >= weakCut })
```

- [ ] **Step 3: Verify type-check + build.**

Run: `npm run type-check 2>&1 | grep "useTradeTargets" || echo "useTradeTargets clean"` → Expected: `useTradeTargets clean`
Run: `npm run build 2>&1 | tail -1` → Expected: `✓ built in …`

- [ ] **Step 4: Commit.**

```bash
git -c gc.auto=0 add src/composables/useTradeTargets.ts
git -c gc.auto=0 commit -m "$(printf 'feat: add statId to CatTag so leverage holes can match the standings ladder\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: Generalize focus from partner-only to partner-or-category

This replaces the `focusedPartner` string with a discriminated `focus`, and rewires its three consumers (partner rows, card fades, banner+empty-hint) in the same task so the file compiles.

**Files:** Modify `src/views/TradesView.vue` (script ~lines 200–213; template: partner rows, hero/ranked cards, focus banner + empty hint)

- [ ] **Step 1: Replace the focus state block.** Find the current block (lines ~200–213):

```ts
// Click a Best-Trade-Partner row to focus that team: every opportunity card except theirs fades, and
// we scroll up to the list (the partners sit below it). Matching is by team name — cards and partner
// rows both render the same teamName() string. Click the same row again, or "clear", to reset.
const focusedPartner = ref<string | null>(null)
const oppsTop = ref<HTMLElement | null>(null)
const focusPartner = (team: string) => {
  focusedPartner.value = focusedPartner.value === team ? null : team
  if (focusedPartner.value) nextTick(() => oppsTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
const clearFocus = () => { focusedPartner.value = null }
const isFocused = (o: { partner: string }): boolean => !focusedPartner.value || o.partner === focusedPartner.value
const focusedCount = computed(() =>
  focusedPartner.value ? [...hero.value, ...ranked.value].filter((o) => o.partner === focusedPartner.value).length : 0,
)
```

Replace with:

```ts
// Focus the moves by ONE of: a partner (click a Best-Trade-Partner row) or a category hole (click a
// "To fix" chip in Your Leverage). Everything that doesn't match fades, and we scroll the list into
// view. A partner matches by team name; a 'cat' matches any move whose rank ladder improves that
// category. Click the same thing again, or "clear", to reset. Mutually exclusive — one focus at a time.
type Focus = { kind: 'partner'; key: string } | { kind: 'cat'; key: string } | null
const focus = ref<Focus>(null)
const oppsTop = ref<HTMLElement | null>(null)
const setFocus = (f: Exclude<Focus, null>) => {
  const same = focus.value && focus.value.kind === f.kind && focus.value.key === f.key
  focus.value = same ? null : f
  if (focus.value) nextTick(() => oppsTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
const clearFocus = () => { focus.value = null }
const matchesFocus = (o: TradeOpportunity): boolean => {
  const f = focus.value
  if (!f) return true
  if (f.kind === 'partner') return o.partner === f.key
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

Note: this references the `TradeOpportunity` type. Confirm it's imported at the top of `TradesView.vue` (it is used by `OpportunityCard`; if the type isn't already imported, add `import type { TradeOpportunity } from '@/trades/opportunities'`). `labelOf` is already defined in the file.

- [ ] **Step 2: Rewire the card fades (hero + ranked).** There are two `<OpportunityCard>` loops. Find each:

```html
        <OpportunityCard v-for="o in hero" :key="o.id" :opp="o" :labelOf="labelOf"
          :class="['transition-opacity', isFocused(o) ? '' : 'opacity-30']" />
```

```html
        <OpportunityCard v-for="o in ranked" :key="o.id" :opp="o" :labelOf="labelOf"
          :class="['transition-opacity', isFocused(o) ? '' : 'opacity-30']" />
```

Change `isFocused(o)` → `matchesFocus(o)` in BOTH (leave the rest identical).

- [ ] **Step 3: Rewire the focus banner + empty hint.** Find:

```html
      <p v-if="focusedPartner" class="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/[0.06] px-3 py-2 font-mono text-[11px] text-dark-textSecondary">
        Showing moves with <b class="text-primary">{{ focusedPartner }}</b>
        <button type="button" class="ml-auto text-dark-textMuted hover:text-primary" @click="clearFocus">clear ✕</button>
      </p>
      <p v-if="focusedPartner && !focusedCount" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
        No {{ pressLeverage ? 'steals' : 'mutual moves' }} with <b class="text-dark-textSecondary">{{ focusedPartner }}</b> right now<template v-if="!pressLeverage"> — try <b class="text-dark-textSecondary">Steals</b></template>.
      </p>
```

Replace with:

```html
      <p v-if="focus" class="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/[0.06] px-3 py-2 font-mono text-[11px] text-dark-textSecondary">
        Showing <b class="text-primary">{{ focusLabel }}</b>
        <button type="button" class="ml-auto text-dark-textMuted hover:text-primary" @click="clearFocus">clear ✕</button>
      </p>
      <p v-if="focus && !focusedCount" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
        No {{ focusLabel }} right now<template v-if="!pressLeverage"> — try <b class="text-dark-textSecondary">Steals</b></template>.
      </p>
```

- [ ] **Step 4: Rewire the partner rows.** Find the partner `<button v-for>`:

```html
          <button v-for="p in view.partners" :key="p.team" type="button"
            class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            :class="focusedPartner === p.team ? 'bg-primary/10' : 'hover:bg-dark-border/30'"
            @click="focusPartner(p.team)">
```

Replace those three attribute lines with:

```html
          <button v-for="p in view.partners" :key="p.team" type="button"
            class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            :class="focus?.kind === 'partner' && focus.key === p.team ? 'bg-primary/10' : 'hover:bg-dark-border/30'"
            @click="setFocus({ kind: 'partner', key: p.team })">
```

And the trailing active-dot span in that same button:

```html
            <span class="shrink-0 font-mono text-[10px]" :class="focusedPartner === p.team ? 'text-primary' : 'text-transparent'">●</span>
```

→

```html
            <span class="shrink-0 font-mono text-[10px]" :class="focus?.kind === 'partner' && focus.key === p.team ? 'text-primary' : 'text-transparent'">●</span>
```

- [ ] **Step 5: Verify no `focusedPartner`/`isFocused`/`focusPartner` references remain.**

Run: `grep -n "focusedPartner\|isFocused\|focusPartner" src/views/TradesView.vue || echo "none left"` → Expected: `none left`

- [ ] **Step 6: Type-check + build + eyeball.**

Run: `npm run type-check 2>&1 | grep "TradesView" || echo "TradesView clean"` → Expected: `TradesView clean`
Run: `npm run build 2>&1 | tail -1` → Expected: `✓ built in …`
Then read the partner-rows + banner + both card loops in the template and confirm no `focusedPartner` survivors and the `focus?.kind === 'partner'` guards are present.

- [ ] **Step 7: Commit.**

```bash
git -c gc.auto=0 add src/views/TradesView.vue
git -c gc.auto=0 commit -m "$(printf 'refactor: generalize trade focus to partner-or-category (one focus at a time)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: Make the "To fix" leverage holes clickable

**Files:** Modify `src/views/TradesView.vue` (the "To fix" chip loop ~line 319)

- [ ] **Step 1: Turn the `To fix` chips into focus buttons.** Find:

```html
            <span v-for="c in view.toFix" :key="c.label" class="rounded bg-[#F2B33A]/10 px-1.5 py-0.5 text-[#F2B33A]">{{ c.label }} · {{ ordinal(c.rank) }}</span>
```

Replace with:

```html
            <button v-for="c in view.toFix" :key="c.label" type="button"
              class="rounded px-1.5 py-0.5 text-[#F2B33A] transition-colors hover:bg-[#F2B33A]/20"
              :class="focus?.kind === 'cat' && focus.key === c.statId ? 'bg-[#F2B33A]/30 ring-1 ring-[#F2B33A]' : 'bg-[#F2B33A]/10'"
              @click="setFocus({ kind: 'cat', key: c.statId })">{{ c.label }} · {{ ordinal(c.rank) }}</button>
```

(The "Trade from" surplus chips stay as plain `<span>` — surplus does not filter the moves.)

- [ ] **Step 2: Type-check + build.**

Run: `npm run type-check 2>&1 | grep "TradesView" || echo "TradesView clean"` → Expected: `TradesView clean`
Run: `npm run build 2>&1 | tail -1` → Expected: `✓ built in …`

- [ ] **Step 3: Commit.**

```bash
git -c gc.auto=0 add src/views/TradesView.vue
git -c gc.auto=0 commit -m "$(printf 'feat: click a leverage hole to focus the moves that fix it\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: Reorder (Analyze to bottom), refresh subtitle, emphasize Best Moves

**Files:** Modify `src/views/TradesView.vue` (subtitle near top; the `<!-- CUSTOM TRADE ANALYZER -->` section; the Best Moves section header)

- [ ] **Step 1: Refresh the subtitle.** Find the stale subtitle (search the unique string):

Run: `grep -n "rest-of-season value" src/views/TradesView.vue`

It renders the page subtitle text `The league, and who to trade for — by rest-of-season value`. Replace that exact visible string with:

```
Who to trade for — ranked by how many categories each move wins you per week.
```

(Change only the text content; leave the surrounding element/classes intact.)

- [ ] **Step 2: Move the Analyze section to the bottom.** The Analyze section is the block that starts with the comment `<!-- CUSTOM TRADE ANALYZER -->` (`<section class="overflow-hidden rounded-xl border border-dark-border bg-dark-card/40">`, ~line 328) and runs through its matching closing `</section>` (the one immediately before the `<!-- focus-on-partner` anchor / `<!-- UNIFIED OPPORTUNITIES` comment).

Cut that entire section (comment + `<section>…</section>`) from its current spot (right after the `Your leverage` section) and paste it as the LAST section inside the `<template v-if="view && !unsupported && !loadFailed && !isLoading">`, immediately AFTER the `<!-- BEST PARTNERS -->` section's closing `</section>` and before the template's closing `</template>`.

Verify the move with:

Run: `grep -n "CUSTOM TRADE ANALYZER\|BEST PARTNERS\|Your leverage\|UNIFIED OPPORTUNITIES" src/views/TradesView.vue`
Expected order of line numbers: `Your leverage` < `UNIFIED OPPORTUNITIES` < `BEST PARTNERS` < `CUSTOM TRADE ANALYZER`.

- [ ] **Step 3: Emphasize the Best Moves section.** Find the Best Moves header:

```html
      <!-- UNIFIED OPPORTUNITIES: one ranked list of trade moves -->
      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Best moves right now</span>
        </div>
```

Replace with (a left primary accent rule + brighter heading so the eye lands here; the section is the page's centerpiece):

```html
      <!-- UNIFIED OPPORTUNITIES: one ranked list of trade moves -->
      <section class="space-y-2 border-l-2 border-primary/60 pl-3">
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] uppercase tracking-widest text-primary">★ Best moves right now</span>
        </div>
```

(This is the only hierarchy change — a contained accent, not a card redesign. The `border-l-2 … pl-3` is allowed here as an intentional section accent, distinct from the banned per-card side-stripe.)

- [ ] **Step 4: Type-check + build + eyeball.**

Run: `npm run type-check 2>&1 | grep "TradesView" || echo "TradesView clean"` → Expected: `TradesView clean`
Run: `npm run build 2>&1 | tail -1` → Expected: `✓ built in …`
Eyeball: the Analyze section is now last; Best Moves has the primary accent + ★; subtitle reads the new line. Confirm the Analyze section's `<section>`/`</section>` balanced after the move (no stray closing tag) by checking the build passed and the template renders.

- [ ] **Step 5: Commit.**

```bash
git -c gc.auto=0 add src/views/TradesView.vue
git -c gc.auto=0 commit -m "$(printf 'feat: reorder Trades (Analyze to bottom), emphasize Best Moves, refresh subtitle\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: Collapse hero/all into one list when deals are few

**Files:** Modify `src/views/TradesView.vue` (script: add `fewDeals`; template: the two opportunity sections)

- [ ] **Step 1: Add the `fewDeals` computed.** After the `focusedCount`/`focusLabel` block from Task 2, add:

```ts
// For a thin roster (few total moves) the hero/all split is silly — all moves land in the hero and
// "All opportunities" renders empty. Below this many total moves, show ONE combined list instead.
const FEW_DEALS = 5
const allMoves = computed(() => [...hero.value, ...ranked.value])
const fewDeals = computed(() => allMoves.value.length <= FEW_DEALS)
```

- [ ] **Step 2: Gate the two-section layout and add the single-section layout.** The current markup is two sibling sections: the Best Moves section (Task 4 gave it the accent) and the All Opportunities section (`<section class="space-y-3">` containing the Mutual/Steals toggle, the Steals subhead, the empty hint, and `<OpportunityCard v-for="o in ranked">`).

Wrap BOTH existing sections so they only render when NOT `fewDeals` — add `v-if="!fewDeals"` to the Best Moves `<section>` and to the All Opportunities `<section>`. Then add a NEW single-section block (rendered only when `fewDeals`) immediately before the Best Moves section, containing the combined list with the toggle. Insert:

```html
      <!-- few deals: one combined list (toggle lives here in this layout) -->
      <section v-if="fewDeals" class="space-y-2 border-l-2 border-primary/60 pl-3">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="font-mono text-[10px] uppercase tracking-widest text-primary">★ Best moves right now</span>
          <div class="ml-auto inline-flex items-center gap-0.5 rounded-md border border-dark-border p-0.5 font-mono text-[10px]"
            title="Mutual = deals they'd plausibly accept. Steals = lopsided your way, a tougher sell.">
            <button type="button" class="rounded px-2 py-0.5 transition-colors"
              :class="!pressLeverage ? 'bg-dark-border text-dark-text' : 'text-dark-textMuted hover:text-dark-textSecondary'"
              @click="pressLeverage = false">Mutual</button>
            <button type="button" class="rounded px-2 py-0.5 transition-colors"
              :class="pressLeverage ? 'bg-[#F2B33A]/20 text-[#F2B33A]' : 'text-dark-textMuted hover:text-dark-textSecondary'"
              @click="pressLeverage = true">Steals</button>
          </div>
        </div>
        <p v-if="pressLeverage" class="font-mono text-[10px] text-dark-textMuted/80">
          Lopsided offers — great for you, but they're unlikely to accept without leverage.
        </p>
        <p v-if="!allMoves.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">
          <template v-if="pressLeverage">No steals right now — every deal that helps you is also fair to them.</template>
          <template v-else>No moves improve your standings right now — try <b class="text-dark-textSecondary">Steals</b> for one-sided plays.</template>
        </p>
        <OpportunityCard v-for="o in allMoves" :key="o.id" :opp="o" :labelOf="labelOf"
          :class="['transition-opacity', matchesFocus(o) ? '' : 'opacity-30']" />
      </section>
```

The focus banner + empty hint (the `v-if="focus"` paragraphs near the `oppsTop` anchor) stay where they are — they apply to whichever layout renders. The `oppsTop` anchor stays above both layouts.

- [ ] **Step 3: Verify the gating.**

Run: `grep -n "v-if=\"fewDeals\"\|v-if=\"!fewDeals\"" src/views/TradesView.vue`
Expected: one `v-if="fewDeals"` (the new combined section) and two `v-if="!fewDeals"` (Best Moves + All Opportunities).

- [ ] **Step 4: Type-check + build + eyeball.**

Run: `npm run type-check 2>&1 | grep "TradesView" || echo "TradesView clean"` → Expected: `TradesView clean`
Run: `npm run build 2>&1 | tail -1` → Expected: `✓ built in …`
Eyeball: only one of the two layouts can render (they're gated on `fewDeals` vs `!fewDeals`); the combined section carries the toggle.

- [ ] **Step 5: Commit.**

```bash
git -c gc.auto=0 add src/views/TradesView.vue
git -c gc.auto=0 commit -m "$(printf 'feat: collapse hero/all into one list when a roster has few moves\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification (after all tasks)

- [ ] `npm run type-check 2>&1 | grep -E "TradesView|useTradeTargets" || echo "touched files clean"` → only pre-existing unrelated errors remain; touched files clean.
- [ ] `npm run build` → succeeds.
- [ ] `npx vitest run` → existing 227 tests still green (none of this touches tested code, but confirm).
- [ ] **Manual reload, both an ESPN and a Yahoo category league:**
  - Section order: Your Leverage → Best Moves (★, accented) → All Opportunities → Best Partners → Analyze (bottom, collapsed). Subtitle reads the new line.
  - Click a **To fix** hole (e.g. HR) → only the moves whose ladder improves HR stay full opacity; banner reads "Showing moves that fix HR · clear"; re-click clears.
  - Click a **partner** row → still focuses that team's moves; partner and hole focus are mutually exclusive (clicking one clears the other).
  - A hole no move fixes → empty hint "No moves that fix HR right now — try Steals."
  - **Yahoo (thin)** team shows ONE combined "Best moves" list with the toggle, no empty "All Opportunities"; **ESPN (deep)** team keeps the two-section hero/all layout.
- [ ] Do NOT push/deploy/PR. Report completion + what to screenshot.

---

## Self-Review

**Spec coverage:**
- §1 reorder (Analyze to bottom) → Task 4 Step 2. ✓
- §2 hierarchy (Best Moves dominant) → Task 4 Step 3. ✓
- §3 subtitle → Task 4 Step 1. ✓
- §4 bridge: generalized focus (partner|cat), clickable holes, banner/empty-hint, partner rewire → Task 2 + Task 3. ✓
- §4 data: `CatTag.statId` → Task 1. ✓
- §5 hero/all collapse when few → Task 5. ✓
- Edge cases (hole-no-move, focus persists across toggle, re-click clears, surplus static, statId-not-label matching) → covered by `matchesFocus`/`setFocus`/`focusLabel` (Task 2) + static surplus span (Task 3) + final reload checks. ✓
- Out-of-scope items (analyze migration, partners language, Phase 2, headline text bridge) → not in any task. ✓

**Placeholder scan:** No TBD/TODO; every step shows exact old→new code or an exact command. `FEW_DEALS = 5` concrete. The reorder is a block move with exact start/end anchors + a grep ordering check.

**Type consistency:** `focus`/`Focus`/`setFocus`/`matchesFocus`/`focusedCount`/`focusLabel`/`clearFocus`/`oppsTop` defined in Task 2 and used identically in Tasks 3 & 5. `CatTag.statId` (Task 1) consumed as `c.statId` in Task 3. `matchesFocus(o)` replaces `isFocused(o)` everywhere (Task 2 Step 2 + Task 5 Step 2). `allMoves`/`fewDeals` defined in Task 5 Step 1, used in Step 2. No dangling references.
