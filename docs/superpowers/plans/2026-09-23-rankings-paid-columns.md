# Rankings: the paid columns

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Season Pass holders the four columns the Wire's board had before it moved — schedule strength (ROS / NEXT4), points per game, bye week, and what an add would cost — on `/rankings`.

**Architecture:** Nothing here is new maths. `buildDifficulty` computes ROS/NEXT4/bye and has been orphaned since the board moved; `useFootballWire.upgrades` already solves add cost and the drop target; PPG is an average over `getSeasonLines`, which the Wire already fetches. This plan reconnects three engines that were only unplugged.

**Tech Stack:** Vue 3 (`<script setup>`, no auto-import), TypeScript, Pinia, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-league-scoring-and-rankings-design.md`

## Global Constraints

- **Test baseline: 1988 passing / 216 files.** Never fewer.
- **`npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` baseline 1451.** Must not rise.
- **No Vue auto-import.** Every identifier needs an explicit import; `vue-tsc` catches a dangling template *identifier* but **silently ignores an unresolved component tag**.
- **`bg-primary/NN` is invalid CSS here** (the var has no alpha slot). Hex literals with `/NN` are fine.
- **The palette has meanings already.** Lime `primary` = yours. Teal `#2dd4bf` = free agent. Amber `#e69a4a` = rostered / win-now (113 usages). Do not introduce a colour that contradicts these.
- **`src/data/landingBoard.json` drifts during build/test.** Revert before committing.
- `npm run build` must succeed. **Commit your work.**
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: Rename the paid flag to what it now gates

`rankingsAccess` returns `showsAvailability`. After this plan that flag also gates schedule strength, PPG, bye and add cost. A flag named for one of the five things it controls is the drift `rankingsAccess` was extracted to prevent.

**Files:**
- Modify: `src/football/rankingsAccess.ts`, `src/football/__tests__/rankingsAccess.test.ts`
- Modify: `src/composables/useRankings.ts`, `src/views/RankingsView.vue` (call sites)

- [ ] **Step 1: Rename**

`showsAvailability` → `showsPaidColumns`, everywhere. Update the interface doc comment:

```ts
  /**
   * The columns that answer "what should I do about it" rather than "who is good": who holds
   * him and whether you can claim him, what an add costs, how hard his remaining schedule is,
   * and what he has actually scored. The Season Pass.
   */
  showsPaidColumns: boolean
```

Update the test names and assertions to match. The four cases and their expected values do not change — only the field name.

- [ ] **Step 2: Verify**

`npx vitest run src/football/__tests__/rankingsAccess.test.ts` → 4 passing.
`grep -rn "showsAvailability" src/` → **no results.** A leftover means a call site still reads a field that no longer exists; `vue-tsc` will catch it in `.ts` but NOT reliably in a `.vue` template, so grep is the check that matters.
`npm test` → 1988/216. `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → 1451.

- [ ] **Step 3: Commit**

```bash
git add -A src/
git commit -m "$(cat <<'EOF'
rankings: name the paid flag for what it gates

It is about to gate schedule strength, points per game, the bye and add
cost as well as availability. A flag named for one of the five things it
controls is exactly the drift this rule was extracted to prevent.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Supply the four columns

**Files:**
- Modify: `src/composables/useRankings.ts`
- Test: `src/composables/__tests__/useRankings.test.ts` (create)

**Interfaces:**
- Consumes: `buildDifficulty`, `buildAllowed`, `type DifficultyRow` from `@/football/scheduleDifficulty`; `getSeasonSchedule`, `REGULAR_SEASON_WEEKS` from `@/services/nflSchedule`; `getSeasonLines` from `@/services/playerUsage`; `useFootballWire`'s existing `wire.upgrades`.
- Produces, added to `useRankings`'s return:
  ```ts
  difficulty: ComputedRef<Record<string, DifficultyRow>>  // NFL team abbr -> row, for the ACTIVE position
  ppgByKey: ComputedRef<Record<string, number>>
  addCost: ComputedRef<Record<string, { marginal: number; dropName: string }>>
  setPosition: (pos: string) => void   // the view tells the composable which column is on screen
  ```

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useRankings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ppgFromLines, addCostFromUpgrades } from '../useRankings'

describe('ppgFromLines', () => {
  it('averages a player over the games he actually played', () => {
    const out = ppgFromLines([
      { playerKey: 'a', points: 20 }, { playerKey: 'a', points: 10 },
      { playerKey: 'b', points: 9 },
    ] as any)
    expect(out.a).toBe(15)
    expect(out.b).toBe(9)
  })

  /* Games played, not weeks elapsed. A player who missed two weeks is not a worse player for
     it, and dividing by the calendar would say he is. */
  it('does not dilute a player by weeks he did not play', () => {
    const out = ppgFromLines([{ playerKey: 'a', points: 30 }] as any)
    expect(out.a).toBe(30)
  })

  it('says nothing about a player with no lines', () => {
    expect(ppgFromLines([] as any)).toEqual({})
  })
})

describe('addCostFromUpgrades', () => {
  const up = (key: string, marginal: number, dropName: string) => ({
    add: { player: { playerKey: key, name: key } }, marginal, dropName, dropKey: 'd',
  })

  it('keys each add by the player it is for', () => {
    const out = addCostFromUpgrades([up('a', 4.2, 'Bench Guy')] as any)
    expect(out.a).toEqual({ marginal: 4.2, dropName: 'Bench Guy' })
  })

  /* The same player can appear in more than one solved swap. The best one is the honest answer
     — it is what the add is worth if you make the right drop, and a smaller number would
     undersell a move the engine already found. */
  it('keeps the best swap when a player appears more than once', () => {
    const out = addCostFromUpgrades([up('a', 2, 'Worse'), up('a', 7, 'Better')] as any)
    expect(out.a).toEqual({ marginal: 7, dropName: 'Better' })
  })

  it('is empty when nothing clears the bar', () => {
    expect(addCostFromUpgrades([] as any)).toEqual({})
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

`npx vitest run src/composables/__tests__/useRankings.test.ts` → FAIL, no such exports.

- [ ] **Step 3: Implement**

In `src/composables/useRankings.ts`, export the two pure helpers and wire the rest:

```ts
/**
 * Points per game, over the games a player actually played.
 *
 * Games, not weeks. A player who missed two weeks is not a worse player for it, and dividing
 * by the calendar would say he is — which is precisely backwards for the reader deciding
 * whether to trust a small sample.
 */
export function ppgFromLines(lines: { playerKey: string; points: number }[]): Record<string, number> {
  const acc = new Map<string, { total: number; games: number }>()
  for (const l of lines) {
    const e = acc.get(l.playerKey) ?? { total: 0, games: 0 }
    e.total += l.points
    e.games += 1
    acc.set(l.playerKey, e)
  }
  const out: Record<string, number> = {}
  for (const [k, e] of acc) if (e.games) out[k] = e.total / e.games
  return out
}

/**
 * What each add is worth, from the swaps the lineup solver already found.
 *
 * `marginal` is the gain to your OPTIMAL lineup, not to a bench slot — which is why an add can
 * be worth nothing despite being the better player: if he does not start, he does not score
 * for you. The drop is the body the solver actually displaced, so the pair is one answer
 * rather than two suggestions.
 */
export function addCostFromUpgrades(
  upgrades: { add: { player: { playerKey?: string; name: string } }; marginal: number; dropName: string }[],
): Record<string, { marginal: number; dropName: string }> {
  const out: Record<string, { marginal: number; dropName: string }> = {}
  for (const u of upgrades) {
    const k = u.add.player.playerKey ?? `fa:${u.add.player.name}`
    if (!out[k] || u.marginal > out[k].marginal) out[k] = { marginal: u.marginal, dropName: u.dropName }
  }
  return out
}
```

Then inside the composable add:

- `const activePosition = ref('ALL')` and `setPosition = (p: string) => { activePosition.value = p }`.
- `seasonLines` and `seasonSchedule` refs, loaded when `hasLeague` is true, mirroring what `PointsWireView` did before the board moved (`getSeasonLines(year, currentWeek)` and `getSeasonSchedule(year)`). Both must fail soft to empty.
- ```ts
  const ppgByKey = computed(() => ppgFromLines(seasonLines.value))
  const addCost = computed(() => addCostFromUpgrades(fbWire.value?.upgrades ?? []))
  /* Schedule strength is a PER-POSITION fact — the same run of defences is easy for a back and
     hard for a receiver — so there is no answer on the overall board, and an empty map is the
     honest one there rather than a blended number nobody asked for. */
  const difficulty = computed<Record<string, DifficultyRow>>(() => {
    const pos = activePosition.value === 'ALL' ? '' : activePosition.value
    if (!pos || !Object.keys(seasonSchedule.value).length || !seasonLines.value.length) return {}
    return buildDifficulty({
      schedule: seasonSchedule.value,
      allowed: buildAllowed(seasonLines.value.map((l) => ({
        team: l.team, opponent: l.opponent, position: l.position, points: l.points,
      }))),
      position: pos,
      fromWeek: leagueStore.currentWeek ?? 1,
      throughWeek: REGULAR_SEASON_WEEKS,
    })
  })
  ```

**Read `PointsWireView.vue` at commit `b56fdf9` for the original wiring** (`git show b56fdf9:src/views/PointsWireView.vue`) rather than reconstructing it — that is the version that worked.

- [ ] **Step 4: Verify**

`npx vitest run src/composables/__tests__/useRankings.test.ts` → 6 passing.
`npm test` → 1994/217. `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → 1451.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useRankings.ts src/composables/__tests__/useRankings.test.ts
git commit -m "$(cat <<'EOF'
rankings: supply schedule strength, PPG and add cost

None of it is new maths. buildDifficulty has been orphaned since the
board left the Wire, the lineup solver already returns the swaps add
cost is read from, and PPG is an average over lines we already fetch.
This reconnects three engines that were only unplugged.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Render them

**Files:**
- Modify: `src/views/RankingsView.vue`

- [ ] **Step 1: Column headers**

Above the rows, when `access.showsPaidColumns`, a header strip naming the numbers — four unlabelled figures per row is worse than none. Copy the Wire's approach at `b56fdf9` (`git show b56fdf9:src/views/PointsWireView.vue`, the block beginning "Column headers, because four numbers arrived on every row with nothing naming them"). ROS and NEXT4 only appear when a single position is selected.

- [ ] **Step 2: Row columns**

For each row, when `access.showsPaidColumns`, after the availability badge and before the VOR number:

- **ROS / NEXT4** — only when `active !== 'ALL'` and `difficulty[row.team]` exists. Reuse the Wire's `sosTone` scale if it survives in that file; otherwise copy it from `b56fdf9`. Hidden below `lg`.
- **ADD** — `addCost[row.playerKey]`, shown as `+N` with the drop name in the title attribute. Only for rows that are `free`, since an add cost for a player you cannot add is a number about nothing. Hidden below `sm`.
- **PPG** — `ppgByKey[row.playerKey]?.toFixed(1)`. Hidden below `sm`.
- **BYE** — `difficulty[row.team]?.bye`, or `row.bye` where the board already carries it. Hidden below `lg`.

Every one of these must render an empty spacer of the same width when the value is absent, or rows will not line up — the Wire did this with `<span v-else class="hidden w-10 shrink-0 sm:block" />` and the same is required here.

- [ ] **Step 3: Tell the composable which position is showing**

`watch(active, (p) => setPosition(p), { immediate: true })` — `difficulty` is per-position and cannot be computed without it.

- [ ] **Step 4: Verify**

`npm test` (1994/217), `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` (1451), `npm run build`.

**Import audit by reading the file.**

`/rankings` loads in a browser for agents. Check it and report what you see — particularly whether the columns line up when values are missing, which is the most likely visual failure.

- [ ] **Step 5: Commit**

```bash
git add src/views/RankingsView.vue
git commit -m "$(cat <<'EOF'
rankings: the paid columns, back on the board

Schedule strength, points per game, the bye and what an add costs —
the four the Wire's board carried before it moved here and lost them.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## What this plan does NOT do

- **Restore these to the Wire.** They live here now; the Wire is the transaction page and keeps its four blocks.
- **Free-tier PPG or bye.** Both are public facts and a case exists for giving them away, but the decision taken was paid-only.
- **Sports other than football.**
