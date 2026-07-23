# Today Adds-Remaining Optimizer (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Today board aware of remaining weekly adds (or FAAB budget) and tag each free-agent move `worth an add` / `save it` / `worth a bid`, so it says which moves are worth a scarce add.

**Architecture:** A pure `AddBudget` type + `annotateAddBudget` optimizer (field-independent). Pure per-platform parsers (`parseEspnAddBudget` / `parseYahooAddBudget`) produce the `AddBudget`. A small `useAddBudget` composable sources the settings/team data; `useToday` annotates the flat play list; `TodayView` renders a banner + per-move tags. Unlimited leagues no-op the whole feature.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-today-adds-remaining-design.md`

**⚠️ PROBE-GATED — execution pauses after Task 1.** The exact limit/used field paths (ESPN `acquisitionSettings.acquisitionLimit` + team `transactionCounter`; Yahoo `max_weekly_adds` + team `roster_adds`/`faab_balance`) are unconfirmed. Task 1 is a data probe against the user's live leagues. **After Task 1, the orchestrator reconciles the best-guess field paths in Tasks 3–4 with the probe output (and captures fixtures) before those tasks execute.** Tasks 2 (optimizer) and 6 (view) are field-independent and final as written.

**Scope guardrails (deferred):** IP floor/ceiling, position games caps, FAAB bid-sizing (dollar suggestions), multi-day add budgeting.

---

## Task 1: Data probe — confirm the real add-limit fields (interactive)

**Files (temporary logging, reverted at end of task):**
- Modify: `src/composables/useEspnCategoryTeamData.ts`, `src/composables/useEspnPointsTeamData.ts`
- Modify: `src/services/yahoo.ts` (or wherever the probe can reach the raw team + settings)

Goal: capture the actual response shapes so the parsers (Task 3) and the Yahoo fetch (Task 4) are built against reality. **No production code ships from this task** — the logging is reverted after the fields are recorded.

- [ ] **Step 1: ESPN probe.** In `useEspnCategoryTeamData.ts` and `useEspnPointsTeamData.ts`, right after the league + team are fetched (near `parseEspnAcquisition(league.settings?.acquisitionSettings)` and the `getMyTeam` result), add:

```ts
console.log('[addprobe ESPN] acquisitionSettings', JSON.stringify(league.settings?.acquisitionSettings))
console.log('[addprobe ESPN] myTeam.transactionCounter', JSON.stringify(myTeam?.transactionCounter))
```

- [ ] **Step 2: Yahoo probe.** Log the raw league settings and the my-team resource including `roster_adds` / `faab_balance`. In `src/services/yahoo.ts` `getLeagueSettings`, before returning, add `console.log('[addprobe YAHOO] settings', JSON.stringify(settings))`. Then determine whether the team resource already fetched anywhere carries `roster_adds`/`faab_balance`; if not, add a one-off probe fetch of `/team/{myTeamKey}/roster_adds` (or the team resource with those subresources) and log it: `console.log('[addprobe YAHOO] team roster_adds/faab', JSON.stringify(teamResource))`. (This step is exploratory — read `getTeams`/`getMyTeam` in `yahoo.ts` and pick the site that can reach the my-team key.)

- [ ] **Step 3: User runs it.** Ask the user to reload Today (or My Team) on one ESPN league and one Yahoo league with the console open, and paste every `[addprobe …]` line.

- [ ] **Step 4: Record findings.** The orchestrator records, for each platform: the field path to the **limit** (count) and/or **FAAB budget**, the field path to **used**/**spent**/**balance**, and how **unlimited** is represented (e.g. ESPN `acquisitionLimit === -1` or absent). Capture 2–3 real objects as **fixtures** for the Task 3 parser tests.

- [ ] **Step 5: Revert the probe logging.**

```bash
git checkout src/composables/useEspnCategoryTeamData.ts src/composables/useEspnPointsTeamData.ts src/services/yahoo.ts
```

- [ ] **Step 6: (orchestrator) Reconcile Tasks 3 & 4** below with the recorded field paths before executing them.

---

## Task 2: `addBudget.ts` — `AddBudget` type + `annotateAddBudget` (pure, final)

**Files:**
- Create: `src/today/addBudget.ts`
- Test: `src/today/__tests__/addBudget.test.ts`
- Modify: `src/today/todayBoard.ts` (one field on `ScoredPlay`)

- [ ] **Step 1: Add the `budgetTag` field.** In `src/today/todayBoard.ts`, in `ScoredPlay`, after the `barPct?: number` line, add:

```ts
  budgetTag?: 'worth-add' | 'save-add' | 'worth-bid' // set by annotateAddBudget for FA add-moves
```

- [ ] **Step 2: Write the failing test** — `src/today/__tests__/addBudget.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { annotateAddBudget, type AddBudget } from '../addBudget'
import type { ScoredPlay } from '../todayBoard'

function play(name: string, kind: ScoredPlay['kind'], score: number): ScoredPlay {
  return {
    kind, playerKey: name, name, team: 'LAD', position: 'SP', side: 'pit',
    value: score, score, bucket: 4, detail: '', oneDay: kind === 'stream', helpsCats: [],
  }
}

describe('annotateAddBudget', () => {
  it('count: top `remaining` add-moves are worth-add, rest save-add; start-sits untagged', () => {
    const plays = [
      play('A', 'stream', 30), play('B', 'add', 20), play('C', 'stream', 10), play('bench', 'startSit', 99),
    ]
    const out = annotateAddBudget(plays, { kind: 'count', limit: 5, used: 3, remaining: 2 })
    const tag = Object.fromEntries(out.map((p) => [p.playerKey, p.budgetTag]))
    expect(tag.A).toBe('worth-add')
    expect(tag.B).toBe('worth-add')
    expect(tag.C).toBe('save-add')
    expect(tag.bench).toBeUndefined()
  })

  it('count remaining 0 → all add-moves save-add', () => {
    const out = annotateAddBudget([play('A', 'stream', 30)], { kind: 'count', limit: 5, used: 5, remaining: 0 })
    expect(out[0].budgetTag).toBe('save-add')
  })

  it('faab: remaining>0 → worth-bid; remaining<=0 → save-add', () => {
    expect(annotateAddBudget([play('A', 'add', 5)], { kind: 'faab', budget: 100, remaining: 34 })[0].budgetTag).toBe('worth-bid')
    expect(annotateAddBudget([play('A', 'add', 5)], { kind: 'faab', budget: 100, remaining: 0 })[0].budgetTag).toBe('save-add')
  })

  it('unlimited → no tags', () => {
    expect(annotateAddBudget([play('A', 'stream', 5)], { kind: 'unlimited' })[0].budgetTag).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run — expect FAIL** (`Cannot find module '../addBudget'`).

Run: `npx vitest run src/today/__tests__/addBudget.test.ts`

- [ ] **Step 4: Implement `src/today/addBudget.ts`:**

```ts
import type { ScoredPlay } from './todayBoard'

/** The active league's add constraint. `budget: null` on FAAB = total unknown (Yahoo). */
export type AddBudget =
  | { kind: 'count'; limit: number; used: number; remaining: number }
  | { kind: 'faab'; budget: number | null; remaining: number }
  | { kind: 'unlimited' }

/**
 * Tag each free-agent add-move with whether it's worth spending a scarce add / FAAB bid. Runs on
 * the flat scored-play list so the top-N ranking is global across the board. Pure — returns new
 * objects. Bench start-sits cost no add and are never tagged. Unlimited → no tags (board unchanged).
 */
export function annotateAddBudget(plays: ScoredPlay[], budget: AddBudget): ScoredPlay[] {
  if (budget.kind === 'unlimited') return plays
  const isAddMove = (p: ScoredPlay) => p.kind === 'stream' || p.kind === 'add'

  if (budget.kind === 'faab') {
    const tag: ScoredPlay['budgetTag'] = budget.remaining > 0 ? 'worth-bid' : 'save-add'
    return plays.map((p) => (isAddMove(p) ? { ...p, budgetTag: tag } : p))
  }

  // count: rank add-moves by score desc; the top `remaining` are worth an add.
  const worth = new Set(
    plays.filter(isAddMove).sort((a, b) => b.score - a.score).slice(0, Math.max(0, budget.remaining)).map((p) => p.playerKey),
  )
  return plays.map((p) =>
    isAddMove(p) ? { ...p, budgetTag: worth.has(p.playerKey) ? 'worth-add' : 'save-add' } : p,
  )
}
```

- [ ] **Step 5: Run — expect PASS (4 tests).** `npx vitest run src/today/__tests__/addBudget.test.ts`

- [ ] **Step 6: Type-check touched files.** `npm run type-check 2>&1 | grep -iE "addBudget|todayBoard"` → no output.

- [ ] **Step 7: Commit.**
```bash
git add src/today/addBudget.ts src/today/__tests__/addBudget.test.ts src/today/todayBoard.ts
git commit -m "feat: Today addBudget — AddBudget type + annotateAddBudget optimizer (pure)"
```

---

## Task 3: parsers — `parseEspnAddBudget` / `parseYahooAddBudget` (RECONCILE WITH PROBE)

**Files:**
- Modify: `src/wire/acquisition.ts` (add two parsers next to `parseEspnAcquisition`)
- Test: `src/wire/__tests__/acquisition.test.ts` (create or extend) — using **Task 1 fixtures**

> **Orchestrator:** before dispatching this task, replace the best-guess field paths below with the ones Task 1 confirmed, and paste the captured fixtures into the test.

- [ ] **Step 1: Tests** using real fixtures from Task 1 (shape shown; fill with captured objects) — count, FAAB, and unlimited/missing → `{ kind: 'unlimited' }`.

- [ ] **Step 2: Implement (best-guess field paths — reconcile with probe):**

```ts
import type { AddBudget } from '@/today/addBudget'

/** ESPN: acquisitionSettings (from league.settings) + the team's transactionCounter. */
export function parseEspnAddBudget(acquisitionSettings: any, teamTransactionCounter: any): AddBudget {
  const acq = acquisitionSettings
  if (acq?.isUsingAcquisitionBudget) {
    const budget = typeof acq.acquisitionBudget === 'number' ? acq.acquisitionBudget : null
    const spent = typeof teamTransactionCounter?.acquisitionBudgetSpent === 'number' ? teamTransactionCounter.acquisitionBudgetSpent : 0
    return { kind: 'faab', budget, remaining: (budget ?? 0) - spent }
  }
  const limit = typeof acq?.acquisitionLimit === 'number' ? acq.acquisitionLimit : -1
  if (limit < 0) return { kind: 'unlimited' }
  const used = typeof teamTransactionCounter?.acquisitions === 'number' ? teamTransactionCounter.acquisitions : 0
  return { kind: 'count', limit, used, remaining: Math.max(0, limit - used) }
}

/** Yahoo: league settings + the my-team resource (roster_adds weekly used / faab_balance). */
export function parseYahooAddBudget(settings: any, team: any): AddBudget {
  const usesFaab = settings?.uses_faab === '1' || settings?.uses_faab === 1 || settings?.uses_faab === true
  if (usesFaab) {
    const balance = Number(team?.faab_balance)
    return Number.isFinite(balance) ? { kind: 'faab', budget: null, remaining: balance } : { kind: 'unlimited' }
  }
  const weekly = Number(settings?.max_weekly_adds)
  const season = Number(settings?.max_adds)
  const limit = Number.isFinite(weekly) && weekly > 0 ? weekly : Number.isFinite(season) && season > 0 ? season : -1
  if (limit < 0) return { kind: 'unlimited' }
  const usedRaw = Number(team?.roster_adds?.value)
  const used = Number.isFinite(usedRaw) ? usedRaw : 0
  return { kind: 'count', limit, used, remaining: Math.max(0, limit - used) }
}
```

- [ ] **Step 3: Run tests → pass. Type-check `acquisition` → clean. Commit.**

---

## Task 4: `useAddBudget` composable — source the data (RECONCILE WITH PROBE)

**Files:**
- Create: `src/composables/useAddBudget.ts`
- Possibly modify: `src/composables/useEspnCategoryTeamData.ts` / `useEspnPointsTeamData.ts` (expose raw `acquisitionSettings` + my-team `transactionCounter` if not already), and `src/services/yahoo.ts` (a `getLeagueSettings` + team `roster_adds`/`faab_balance` fetch) — **per Task 1 findings.**

> **Orchestrator:** finalize the data source per the probe. Expected shape below.

- [ ] **Step 1:** `useAddBudget()` returns `{ budget: ComputedRef<AddBudget> }`, keyed off the active league. For ESPN, feed the raw `acquisitionSettings` + my-team `transactionCounter` into `parseEspnAddBudget` (expose them from the ESPN loaders if needed — additive refs, no behavior change). For Yahoo, fetch league settings + the my-team `roster_adds`/`faab_balance` and feed `parseYahooAddBudget`. Any fetch error or missing data → `{ kind: 'unlimited' }` (never throws). Sleeper/non-baseball → `{ kind: 'unlimited' }`.

- [ ] **Step 2:** Type-check + a light smoke via the existing suite. Commit.

---

## Task 5: `useToday` — annotate plays with the add budget

**Files:**
- Modify: `src/composables/useToday.ts`

- [ ] **Step 1:** Import `useAddBudget` + `annotateAddBudget`; instantiate `const { budget: addBudget } = useAddBudget()`.

- [ ] **Step 2:** In the `scoredPlays` pipeline, after `attachDrops(...)`, wrap with `annotateAddBudget(plays, addBudget.value)`:

```ts
    return annotateAddBudget(attachDrops(ranked), addBudget.value)
```

- [ ] **Step 3:** Expose the budget to the view — add `budget: ComputedRef<AddBudget>` to the return type and `return { …, budget: addBudget }`.

- [ ] **Step 4:** Type-check (`useToday|today/` clean), `npx vitest run src/today` pass, `npm run build` clean. Commit.

---

## Task 6: `TodayView` — budget banner + per-move tags (final)

**Files:**
- Modify: `src/views/TodayView.vue`

- [ ] **Step 1: Destructure `budget`.** `const { vm, loading, error, load, isPoints, budget } = useToday()`.

- [ ] **Step 2: Banner helper + tag helper** in `<script setup>`:

```ts
const budgetBanner = computed(() => {
  const b = budget.value
  if (b.kind === 'count') return `${b.remaining} of ${b.limit} adds left this week`
  if (b.kind === 'faab') return b.budget != null ? `$${b.remaining} of $${b.budget} FAAB left` : `$${b.remaining} FAAB left`
  return null // unlimited → no banner
})
function budgetTagText(p: ScoredPlay): string | null {
  if (p.budgetTag === 'worth-add') return '✓ worth an add'
  if (p.budgetTag === 'worth-bid') return 'worth a bid'
  if (p.budgetTag === 'save-add') return budget.value.kind === 'faab' ? 'no FAAB budget left' : 'save your add'
  return null
}
```

- [ ] **Step 3: Render the banner** just below the `<header>` (before the loading/board blocks):

```html
      <p v-if="budgetBanner" class="mb-4 font-mono text-[11px] uppercase tracking-wider text-dark-textMuted">
        {{ budgetBanner }}
      </p>
```

- [ ] **Step 4: Per-move tag** on hero, streaming rows, upgrade rows, and open-slot FA fills — next to (or under) each move's existing drop line, render when tagged:

```html
              <span v-if="budgetTagText(p)" class="ml-2 font-mono text-[10px]"
                :class="p.budgetTag === 'save-add' ? 'text-dark-textMuted' : 'text-primary'">{{ budgetTagText(p) }}</span>
```
(For the hero use `board.hero`; for open-slot fills use `slot.fill`. Leave `sitAlerts` untouched.)

- [ ] **Step 5:** Type-check (`TodayView` clean), `npm run build` → `✓ built`. Commit.

---

## Task 7: Full verification

- [ ] **Step 1:** `npm test` → all pass (adds the 4 `annotateAddBudget` tests + the parser tests).
- [ ] **Step 2:** `npm run type-check 2>&1 | grep -iE "today|useToday|acquisition|addBudget"` → no output; `npm run build` → `✓ built`.
- [ ] **Step 3: Manual smoke (user):**
  - A **count-limited** league (e.g. the Yahoo weekly-adds one): banner reads `N of M adds left this week`; the top N add-moves show `✓ worth an add`, the rest `· save your add`; at 0 left, add-moves read `save your add` / "no adds left."
  - An **unlimited** league: no banner, board exactly as before.
  - Start-sit (bench) moves never show a tag.
  - (FAAB path is code-verified only — the user's leagues aren't FAAB.)
- [ ] **Step 4:** commit any smoke fix.

## Self-Review
- **Spec coverage:** AddBudget contract + optimizer (Task 2), parsers (Task 3), composable source (Task 4), annotation wiring (Task 5), banner + tags incl. FAAB/count/unlimited wording (Task 6); data-probe-first (Task 1); conservative unlimited fallback throughout. All spec sections map to a task.
- **Type consistency:** `budgetTag` field (Task 2) set by `annotateAddBudget` (Task 2) and read by `budgetTagText` (Task 6); `AddBudget` produced by parsers (Task 3) and consumed by optimizer/composable/view; `budget: ComputedRef<AddBudget>` return matches `useAddBudget`.
- **Probe-gating:** Tasks 3–4 explicitly reconcile with Task 1; Tasks 2 & 6 are field-independent and final.
- **YAGNI:** no IP/games caps, no FAAB bid-sizing, no multi-day budgeting.
