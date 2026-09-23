# Rankings Learns Who You Are — Implementation Plan (Parts B + C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/rankings` shows a signed-in user their league's board — their scoring, their roster starred — and sells availability, add cost and schedule to the Season Pass.

**Architecture:** No new data path. `useFootballWire` already returns a board carrying `owned`, `free` and `ownerName`, scored for the league since Part A. A selector composable hands Rankings that board when a football league is active and the public one otherwise. The view gains the three paid columns and an upsell that shows rather than tells.

**Tech Stack:** Vue 3 (`<script setup>`, no auto-import), TypeScript, Pinia, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-league-scoring-and-rankings-design.md`

## Global Constraints

- **Test baseline: 1984 passing / 215 files.** Never fewer.
- **`npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` baseline 1451.** Must not rise.
- **No Vue auto-import.** Every identifier needs an explicit import. `vue-tsc` catches a dangling template *identifier* but **silently ignores an unresolved component tag** — verify component imports by reading.
- **`bg-primary/NN` renders as invalid CSS here** (no alpha slot on the var). Use solid `bg-primary` or `bg-dark-card`.
- **`src/data/landingBoard.json` drifts during build/test.** Revert before committing.
- **`/players` cannot be loaded by any agent** (a pre-existing gate has blocked five attempts). Budget one try, then verify another way and say plainly what you could not see.
- `npm run build` must succeed.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: The access rule

What each of the three audiences sees, as a pure function, so the paywall cannot drift between the page and the upsell copy.

**Files:**
- Create: `src/football/rankingsAccess.ts`
- Test: `src/football/__tests__/rankingsAccess.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface RankingsAccess {
    scopedToLeague: boolean   // league scoring + roster starred
    showsAvailability: boolean // FREE / ROSTERED, owner, schedule strength
  }
  export function rankingsAccess(input: { hasLeague: boolean; hasPass: boolean }): RankingsAccess
  ```

- [ ] **Step 1: Write the failing test**

Create `src/football/__tests__/rankingsAccess.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rankingsAccess } from '../rankingsAccess'

/*
 * The line, as a function, because it is stated in three places — the board, the upsell strip
 * and the marketing copy — and three prose copies of a paywall drift.
 *
 * Rankings are a commodity; the decision is not. So personalisation is free (it is what earns
 * the signup, which is the harder ask than the payment) and what you can DO about the board is
 * what the pass sells.
 */
describe('rankingsAccess', () => {
  it('gives a stranger the public board and nothing else', () => {
    expect(rankingsAccess({ hasLeague: false, hasPass: false }))
      .toEqual({ scopedToLeague: false, showsAvailability: false })
  })

  /* The whole bet: your own board, correctly scored, for free. */
  it('scopes to the league for a free account that has one', () => {
    expect(rankingsAccess({ hasLeague: true, hasPass: false }))
      .toEqual({ scopedToLeague: true, showsAvailability: false })
  })

  it('adds availability for a pass holder', () => {
    expect(rankingsAccess({ hasLeague: true, hasPass: true }))
      .toEqual({ scopedToLeague: true, showsAvailability: true })
  })

  /*
   * A pass with no league connected. Availability is a fact ABOUT a league — who holds him,
   * whether you can claim him — so there is nothing to show, and claiming otherwise on a
   * public board would be inventing an answer. The pass is not wasted; it is just not
   * answerable here until a league exists.
   */
  it('cannot show availability without a league, pass or not', () => {
    expect(rankingsAccess({ hasLeague: false, hasPass: true }))
      .toEqual({ scopedToLeague: false, showsAvailability: false })
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/football/__tests__/rankingsAccess.test.ts`
Expected: FAIL — cannot resolve `../rankingsAccess`.

- [ ] **Step 3: Write it**

Create `src/football/rankingsAccess.ts`:

```ts
/**
 * Who sees what on the rankings board.
 *
 * Extracted as a rule rather than written inline because the same line is stated three times —
 * in what the board renders, in the upsell strip that names what is missing, and in the copy
 * above it. Three prose copies of a paywall drift, and the direction they drift is always
 * toward promising something the page does not do.
 *
 * The line itself: rankings are a commodity and decisions are not. Personalisation is free
 * because the signup is the harder ask than the payment — a stranger who cannot see their own
 * team never becomes an account, and an account can be sold to later. So free buys the right
 * numbers; the pass buys the move.
 */
export interface RankingsAccess {
  /** The league's scoring, and your roster marked. Free, once a league exists. */
  scopedToLeague: boolean
  /** FREE / ROSTERED, who holds him, and schedule strength. The pass. */
  showsAvailability: boolean
}

export function rankingsAccess(input: { hasLeague: boolean; hasPass: boolean }): RankingsAccess {
  /* Availability is a fact ABOUT a league — who holds him, whether you can claim him. Without
     one there is no answer to show, and a pass cannot buy an answer that does not exist. */
  const scopedToLeague = input.hasLeague
  return { scopedToLeague, showsAvailability: scopedToLeague && input.hasPass }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/football/__tests__/rankingsAccess.test.ts` → 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/football/rankingsAccess.ts src/football/__tests__/rankingsAccess.test.ts
git commit -m "$(cat <<'EOF'
rankings: the access line, as a rule rather than three prose copies

Stated in the board, the upsell strip and the copy above it. Three
copies of a paywall drift, and always toward promising what the page
does not do.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Rankings reads the league's board

**Files:**
- Modify: `src/composables/usePublicRankings.ts` (add a sibling selector; do NOT change the public path's behaviour)
- Modify: `src/views/RankingsView.vue`

**Interfaces:**
- Consumes: `rankingsAccess` (Task 1); `useFootballWire` (existing, already returns `wire.board` with `owned`/`free`/`ownerName`); `useActivePointsSource` (existing, supplies pool/freeAgents/slots/myTeamKey/leagueSize/teamNames — see `PointsWireView.vue:40,63-67,176-177,240` for the exact call shape); `useFootballScoring`; `useFeatureAccess` for `hasFullAccess`/`accessKnown`.
- Produces: `useRankings()` in a NEW file `src/composables/useRankings.ts`, returning the same four fields as `usePublicRankings` plus `access: ComputedRef<RankingsAccess>` and `scoringSource: ComputedRef<FootballScoringSource>`.

- [ ] **Step 1: Read before writing**

Read `src/views/PointsWireView.vue` lines 40, 60-70, 170-185 and 235-250 to see exactly how `useActivePointsSource` and `useFootballWire` are wired together, and `src/composables/useFootballWire.ts` for its input shape. **Report the exact call signature in your report before you write anything** — the plan must not be the only source for it.

- [ ] **Step 2: Write the selector**

Create `src/composables/useRankings.ts`. It must:

- Call `usePublicRankings()` unconditionally (it is the fallback and it is cheap — no weekly fetches).
- Call `useActivePointsSource()` + `useFootballScoring()` + `useFootballWire()` the way `PointsWireView` does, gated on `leagueStore.activeSport === 'football'`.
- Return the **league board when one is available**, the public board otherwise:
  ```ts
  const board = computed(() => leagueBoard.value ?? publicRankings.board.value)
  ```
  where `leagueBoard` is `fbWire.value?.board ?? null`.
- Compute `access` from `rankingsAccess({ hasLeague, hasPass })` where `hasPass` is `hasFullAccess` from `useFeatureAccess`.

**The load-bearing comment to put at the top of the file:**

```ts
/**
 * Which board Rankings shows.
 *
 * There is no second data path here, deliberately. `useFootballWire` already assembles the
 * board this page wants — every player, tiered, with `owned`, `free` and `ownerName` on each
 * row, scored for the league — because the Wire was built on it before the board moved out.
 * Rankings reads that same object rather than rebuilding it, which is the only way two pages
 * showing one ranked list can be guaranteed to agree: they are not two lists that match, they
 * are one list rendered twice.
 *
 * The public board stays for readers with no league. It is a genuinely different question —
 * standard scoring, nobody's roster — not a degraded version of the same one.
 */
```

- [ ] **Step 3: Render it**

In `src/views/RankingsView.vue`, switch to `useRankings()` and add, per row:

- **When `access.scopedToLeague`** — a `★` before the name for `row.owned`, in `text-primary`, matching the Wire's existing treatment (`PointsWireView.vue` uses `{{ row.owned ? '★ ' : '' }}`).
- **When `access.showsAvailability`** — the FREE / ROSTERED pill, copied from the Wire's markup so the two read identically:
  ```html
  <span v-if="!row.owned" class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
        :class="row.free ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-dark-bg text-dark-textMuted/60'"
  >{{ row.free ? 'free' : 'rostered' }}</span>
  ```
- **When `scopedToLeague` but NOT `showsAvailability`** — the same pill shape, greyed and unreadable, so the reader sees what is missing rather than being told:
  ```html
  <span v-else-if="access.scopedToLeague" aria-hidden="true"
        class="shrink-0 select-none rounded bg-dark-bg px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-transparent"
        style="text-shadow: 0 0 6px rgba(255,255,255,0.35)">rostered</span>
  ```

Update the header line (the one added as a stopgap) so it reflects the actual state:
- no league → "Everyone sees the same board: full PPR, standard twelve-team…" (as now)
- league, no pass → name the scoring via `scoringLabel(scoringSource)` and say availability is on the pass
- league + pass → name the scoring, nothing else

- [ ] **Step 4: Verify**

`npm test` (≥1988/216), `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` (**1451**), `npm run build`.

**Import audit by reading** both files — list every identifier and its import.

`/rankings` DOES load in a browser (unlike `/players`). Check all three states if you can: signed out, signed in with a league, and — if you cannot reach a paid account — say so. Report what you actually saw.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useRankings.ts src/views/RankingsView.vue
git commit -m "$(cat <<'EOF'
rankings: show the reader their own league

Reads the board useFootballWire already assembles rather than building a
second one. Two pages showing one ranked list can only be guaranteed to
agree if they are one list rendered twice.

Availability is greyed rather than hidden for a reader without the pass:
seeing what is missing is a stronger argument than being told.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## What this plan does NOT do

- **Add cost and strength of schedule.** The spec lists both as paid. Add cost needs `lineupMarginal` per row, and schedule strength needs `buildDifficulty` (currently orphaned) rewired. Both are real work and neither is needed to make the page know who you are.
- **Sports other than football.**
- **Restore the deleted Wire columns** (PPG, bye, dynasty comparison) — still the user's open decision.
