# Draft Report — In-Progress Honesty + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Stop the report from treating a half-finished season as final (which turns injured/slow-starting stars into absurd "busts" — e.g. Aaron Judge −125 on a mid-July Yahoo league), and land three polish fixes: drop the redundant Draft MVP card, and rank Top Keepers by value not just quality.

**Design decisions (user-approved):**
1. **Season default** → open to the newest COMPLETED season (`season < current calendar year`); if the only season is the current one, open it but flagged.
2. **In-progress honesty** → when the shown season is in-progress (`season >= current year`), (a) label it "so far", and (b) HIDE the Top Reaches list (a slow start / injury isn't a draft bust) with a short note; keep Top Steals, keepers, grades, spotlight. Purely a view concern — needs no games-played data.
3. **Drop the Draft MVP card** — it duplicates the first & last rows of the "Every team, graded" ladder.
4. **Top Keepers by value** — sort ELITE/STARTER keepers by tier, then keeper round DESC (later round = cheaper = better value), then points.

**Scope note:** a games-played-based bust guard for COMPLETED seasons (excluding a full-season low-GP/injured player from reaches) is a real future enhancement but needs sport-specific stat plumbing (ESPN baseball stat id 99, Sleeper computed, Yahoo has no reliable GP) — deliberately deferred; the in-progress reframe handles the observed problem.

**Tech Stack:** Vue 3 / TS / Vitest. Touches `src/draft/report/buildDraftReport.ts` (keeper sort) + `src/views/HistoryView.vue` (everything else). Local only.

---

## Task 1: reducer — Top Keepers by value

**Files:**
- Modify: `src/draft/report/buildDraftReport.ts`
- Modify: `src/draft/report/__tests__/buildDraftReport.test.ts`

- [ ] **Step 1: Update the existing top-keepers test** in the `critique fixes` describe. Replace the `top keepers` test with one that also checks value ordering by round:
```ts
  it('top keepers = ELITE/STARTER, ranked by tier then cheaper keeper round (value)', () => {
    const d: GradedDraft = {
      numTeams: 4, myTeamKey: null, teams: [team('t1', 0, 1)],
      picks: [],
      keepers: [
        keeper('t1', 'Cheap Elite', 'ELITE', 300, 18),   // ELITE, kept late (Rd 18) = best value
        keeper('t1', 'Pricey Elite', 'ELITE', 320, 2),    // ELITE, kept early (Rd 2)
        keeper('t1', 'Cheap Starter', 'STARTER', 250, 20),// STARTER
        keeper('t1', 'Dud', 'REPLACEMENT', 40, 15),       // filtered out
      ],
    }
    const r = buildDraftReport(d, 2024)
    // tier first (both ELITE before the STARTER), then round DESC within tier
    expect(r.topKeepers.map((k) => k.playerName)).toEqual(['Cheap Elite', 'Pricey Elite', 'Cheap Starter'])
  })
```
(Delete/replace the previous `top keepers = ELITE/STARTER finishers, best first; drops REPLACEMENT` test — the `keeper()` helper already accepts a `round` arg.)

- [ ] **Step 2: Run** `npx vitest run src/draft/report/__tests__/buildDraftReport.test.ts` — the new keeper test FAILS (current sort is tier then points), others pass.

- [ ] **Step 3: Implement** — in `buildDraftReport.ts`, change the `topKeepers` sort from `... || b.points - a.points` to tier, then round DESC, then points DESC:
```ts
  const topKeepers = (draft.keepers ?? [])
    .filter((k) => k.finishedTier === 'ELITE' || k.finishedTier === 'STARTER')
    .sort((a, b) =>
      (TIER_RANK[a.finishedTier] ?? 9) - (TIER_RANK[b.finishedTier] ?? 9) ||
      b.round - a.round ||
      b.points - a.points,
    )
    .slice(0, 5)
```

- [ ] **Step 4: Run** the test file — all pass. `npm run type-check 2>&1 | grep -iE "buildDraftReport"` → none.

- [ ] **Step 5: Commit**
```bash
git add src/draft/report/buildDraftReport.ts src/draft/report/__tests__/buildDraftReport.test.ts
git commit -m "feat: draft report — rank top keepers by value (tier then cheaper keeper round)"
```
(Ignore the gc.log warning; verify with `git log --oneline -1`.)

---

## Task 2: view — season default, in-progress honesty, drop MVP card

**Files:** Modify `src/views/HistoryView.vue`. READ the Draft Report `<script>` bits (`draftSeasons`, `selectedDraftSeason`, `loadDraftSeason`, `openDraftReport`) and the section template.

- [ ] **Step 1: In-progress detection + completed-season default (script).**
Add near the draft-report script state:
```ts
const currentYear = new Date().getFullYear()
const draftSeasonInProgress = (s: number) => s >= currentYear
const isSelectedInProgress = computed(
  () => selectedDraftSeason.value != null && draftSeasonInProgress(selectedDraftSeason.value),
)
```
Change `openDraftReport()` to default to the newest COMPLETED season when one exists, else the newest (in-progress) season:
```ts
function openDraftReport() {
  showDraftReport.value = true
  if (selectedDraftSeason.value == null && draftSeasons.value.length && !draftReportPointsOnly.value) {
    const completed = draftSeasons.value.filter((s) => !draftSeasonInProgress(s))
    loadDraftSeason(completed.length ? completed[0] : draftSeasons.value[0])
  }
}
```
(`draftSeasons` is already sorted newest-first, so `[0]` of either list is the newest of that group.)

- [ ] **Step 2: Label the in-progress season pill (template).**
In the season-picker `v-for`, append a "so far" marker to the in-progress pill:
```html
            <button v-for="s in draftSeasons" :key="s" type="button"
              class="rounded px-2 py-1 font-mono text-xs"
              :class="s === selectedDraftSeason ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
              @click="loadDraftSeason(s)">{{ s }}<span v-if="draftSeasonInProgress(s)" class="opacity-60"> · so far</span></button>
```

- [ ] **Step 3: Hide Top Reaches for in-progress + note (template).**
Wrap the Top Reaches list's `v-if` so it does NOT render when the season is in progress, and add a small note in its place. In the top steals/reaches grid, change the Top Reaches column's outer `v-if` to also require `!isSelectedInProgress`:
```html
              <div v-if="draft.report.value.topReaches.length && !isSelectedInProgress" class="rounded-xl border border-dark-border bg-dark-card p-4">
```
Then, AFTER the steals/reaches grid, add the mid-season note (only when in progress and a report is loaded):
```html
            <p v-if="isSelectedInProgress && draft.report.value" class="rounded-xl border border-dark-border bg-dark-card p-4 font-mono text-[11px] text-dark-textMuted">
              {{ selectedDraftSeason }} is still in progress — grades are "so far," and reaches are hidden (a slow start or an injury isn't a draft bust).
            </p>
```
(If the top-steals column would be alone in the two-column grid when reaches are hidden, that's fine — it just spans/sits left; do not restructure the grid.)

- [ ] **Step 4: Drop the Draft MVP card (template).**
Remove the entire "Draft MVP · best & worst drafter" card block (the one showing `bestDrafter`/`worstDrafter` with TeamAvatars + big grades). The "Every team, graded" ladder directly below already shows rank 1 and the last row. Leave the ladder and everything else.

- [ ] **Step 5: Verify** — `npm run type-check 2>&1 | grep -i HistoryView` (none); `npm run build` (success).

- [ ] **Step 6: Commit**
```bash
git add src/views/HistoryView.vue
git commit -m "feat: History draft report — default to completed season, hide mid-season reaches (so far), drop MVP card"
```

---

## Task 3: Full verification

- [ ] `npm test` (all pass — Task 1's keeper test replaced, count steady or +/-0).
- [ ] `npm run type-check && npm run build` (baseline 62; build clean).
- [ ] **Manual smoke (user):**
  - ESPN league: opens to the newest COMPLETED season (e.g. 2025), not 2026; its report shows reaches (a completed season's busts are real). Clicking **2026 · so far** hides Top Reaches and shows the mid-season note; Top Steals + keepers + grades still render.
  - Yahoo league (only 2026): opens to **2026 · so far** — Top Reaches gone (no more Judge −125), the mid-season note shows, Top Steals + grades render.
  - Draft MVP card is gone (ladder unchanged).
  - Top Keepers now ordered by value (a cheaper/late-round ELITE keeper outranks an early-round one).
- [ ] commit any smoke fix.

## Self-Review
- Season default + in-progress detection + reaches-hide + MVP-drop are all VIEW-only (`HistoryView.vue`), keyed off `new Date().getFullYear()` and the existing `selectedDraftSeason`/`draftSeasons`. Reducer change is only the keeper sort (Task 1, tested). No loader changes. No games-played plumbing (deferred, documented).
- Type consistency: no type changes needed — `topReaches`/`topKeepers`/`bestDrafter`/`worstDrafter` already exist; the view just conditionally renders and re-sorts.
