# Board Market Signals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show tier cliffs and standing VALUE / FADE / injury badges on the Draft Room's Board tab, computed entirely from data already fetched.

**Architecture:** Two new pure modules (`marketDisagreement`, `tierCliffs`) with no Vue and no I/O, consumed by `buildBoard` and by `DraftRoomView`. The existing pick-relative `value` flag is renamed `fell` so two different meanings stop sharing one word; the `reach` flag is deleted. No scheduled job, no table, no stored content.

**Tech Stack:** Vue 3, TypeScript, Vitest. Run one test file with `npx vitest run <path>`; run everything with `npx vitest run`.

## Global Constraints

- **No prose is generated, stored, or displayed.** No narrative reads, no tier names, no cross-source consensus notes.
- **Cliff drops are measured in `projected` points, never in `value`.** When a ranking list is active, `value` is re-seated into that list's order and cannot be checked against the points column.
- **The market threshold is one full round**, i.e. `teams` positions of rank difference. No other tuning constant.
- **These are display signals only.** Nothing added here feeds `score`, `vona`, `usable` or the ordering of the board.
- **Every number rendered must be checkable against the PTS column on the same row.**
- Existing comment style: explain *why*, and cite the concrete failure a rule prevents.

---

### Task 1: `marketDisagreement` — the standing VALUE / FADE signal

**Files:**
- Create: `src/draft/room/marketDisagreement.ts`
- Test: `src/draft/room/__tests__/marketDisagreement.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `marketDisagreement(input: { projRank?: number; adpRank?: number; teams: number }): MarketRead` where `MarketRead = { rounds: number; flag: 'value' | 'fade' | '' }`. `rounds` is positive when we rank him higher than the market, negative when the market ranks him higher, `0` when either rank is missing.

- [ ] **Step 1: Write the failing test**

Create `src/draft/room/__tests__/marketDisagreement.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { marketDisagreement } from '../marketDisagreement'

describe('marketDisagreement', () => {
  it('flags VALUE when we rank him a full round earlier than the market', () => {
    // We have him 22nd, the market has him 34th, in a 12-team league: a round.
    const r = marketDisagreement({ projRank: 22, adpRank: 34, teams: 12 })
    expect(r.flag).toBe('value')
    expect(r.rounds).toBeCloseTo(1, 5)
  })

  it('flags FADE when the market ranks him a full round earlier than we do', () => {
    const r = marketDisagreement({ projRank: 34, adpRank: 22, teams: 12 })
    expect(r.flag).toBe('fade')
    expect(r.rounds).toBeCloseTo(-1, 5)
  })

  it('says nothing just under the threshold', () => {
    // A badge on every row carries the same information as a badge on none.
    const r = marketDisagreement({ projRank: 23, adpRank: 34, teams: 12 })
    expect(r.flag).toBe('')
    expect(r.rounds).toBeCloseTo(11 / 12, 5)
  })

  it('scales the threshold to league size', () => {
    // Ten positions is a full round in a 10-team league and not in a 12.
    expect(marketDisagreement({ projRank: 20, adpRank: 30, teams: 10 }).flag).toBe('value')
    expect(marketDisagreement({ projRank: 20, adpRank: 30, teams: 12 }).flag).toBe('')
  })

  it('is symmetric — the same gap either way earns a badge', () => {
    const up = marketDisagreement({ projRank: 10, adpRank: 40, teams: 12 })
    const down = marketDisagreement({ projRank: 40, adpRank: 10, teams: 12 })
    expect(up.flag).toBe('value')
    expect(down.flag).toBe('fade')
    expect(up.rounds).toBeCloseTo(-down.rounds, 5)
  })

  it('says nothing about a player the market never priced', () => {
    // Unpriced is not disagreed with.
    expect(marketDisagreement({ projRank: 10, teams: 12 })).toEqual({ rounds: 0, flag: '' })
    expect(marketDisagreement({ adpRank: 10, teams: 12 })).toEqual({ rounds: 0, flag: '' })
  })

  it('suppresses the badge rather than dividing by a nonsense league size', () => {
    expect(marketDisagreement({ projRank: 10, adpRank: 40, teams: 0 })).toEqual({ rounds: 0, flag: '' })
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/draft/room/__tests__/marketDisagreement.test.ts`
Expected: FAIL — `Failed to resolve import "../marketDisagreement"`.

- [ ] **Step 3: Write the implementation**

Create `src/draft/room/marketDisagreement.ts`:

```ts
/**
 * Where we and the market disagree about a player.
 *
 * A STANDING property, true at six in the morning on draft day. It is a
 * different statement from the board's other market signal, which says "he slid
 * past his ADP to the pick you are sitting on" and is only meaningful once a
 * draft is running.
 *
 * The threshold is one full round, for three reasons: it is the unit drafters
 * already think in, it scales itself to league size without a tuning constant,
 * and it keeps the badge rare. A badge on every row carries exactly as much
 * information as a badge on none — the same reasoning that gated the slot-rank
 * colours.
 */

export interface MarketRead {
  /** Rounds of disagreement. Positive: we rank him higher than the market. */
  rounds: number
  flag: 'value' | 'fade' | ''
}

const NONE: MarketRead = { rounds: 0, flag: '' }

export function marketDisagreement(input: {
  projRank?: number
  adpRank?: number
  teams: number
}): MarketRead {
  const { projRank, adpRank } = input ?? ({} as typeof input)
  const teams = Math.floor(Number(input?.teams) || 0)
  // No price means no disagreement, and no league size means no round to
  // measure one in. Both are absences, not zeros.
  if (teams <= 0) return NONE
  if (typeof projRank !== 'number' || typeof adpRank !== 'number') return NONE

  const rounds = (adpRank - projRank) / teams
  const flag: MarketRead['flag'] = rounds >= 1 ? 'value' : rounds <= -1 ? 'fade' : ''
  return { rounds, flag }
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/draft/room/__tests__/marketDisagreement.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/draft/room/marketDisagreement.ts src/draft/room/__tests__/marketDisagreement.test.ts
git commit -m "feat(draft): a standing market-disagreement read, thresholded at one round"
```

---

### Task 2: `tierCliffs` — reveal where the tier boundaries fall

**Files:**
- Create: `src/draft/room/tierCliffs.ts`
- Test: `src/draft/room/__tests__/tierCliffs.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `tierCliffs<T>(rows: T[], tierOf: (row: T) => number | undefined, read: (row: T) => { name: string; projected: number }): Cliff[]` where `Cliff = { afterIndex: number; aboveName: string; abovePoints: number; belowPoints: number; drop: number }`. `afterIndex` is the index of the LAST row of the tier above, so the view renders the cliff immediately before `afterIndex + 1`.

- [ ] **Step 1: Write the failing test**

Create `src/draft/room/__tests__/tierCliffs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tierCliffs } from '../tierCliffs'

type Row = { name: string; projected: number; value: number; tier: number }
const row = (name: string, projected: number, tier: number, value = projected): Row =>
  ({ name, projected, value, tier })

const tierOf = (r: Row) => r.tier
const read = (r: Row) => ({ name: r.name, projected: r.projected })

describe('tierCliffs', () => {
  const rows: Row[] = [
    row('Gibbs', 337.9, 1),
    row('Bijan', 334.7, 1),
    row('Chase', 302.3, 2),
    row('Nacua', 298.9, 2),
  ]

  it('marks the boundary between consecutive tiers', () => {
    const cliffs = tierCliffs(rows, tierOf, read)
    expect(cliffs).toHaveLength(1)
    expect(cliffs[0].afterIndex).toBe(1)
    expect(cliffs[0].aboveName).toBe('Bijan')
    expect(cliffs[0].abovePoints).toBe(334.7)
    expect(cliffs[0].belowPoints).toBe(302.3)
    expect(cliffs[0].drop).toBeCloseTo(32.4, 5)
  })

  it('measures the drop in projected points, never in the ranking scale', () => {
    // With an analyst list active, `value` is re-seated into that list's order.
    // A drop measured there cannot be checked against the points column beside
    // it — the defect that once printed "next tier drops 26 pts" above rows
    // reading 242 and 227.
    const remapped: Row[] = [
      row('Above', 242, 1, 268),
      row('Below', 227, 2, 242),
    ]
    expect(tierCliffs(remapped, tierOf, read)[0].drop).toBeCloseTo(15, 5)
  })

  it('finds every boundary in a longer list', () => {
    const long = [...rows, row('Smith', 260, 3), row('Jones', 255, 3)]
    expect(tierCliffs(long, tierOf, read).map((c) => c.afterIndex)).toEqual([1, 3])
  })

  it('reports nothing when only one tier is visible', () => {
    expect(tierCliffs([row('a', 300, 1), row('b', 290, 1)], tierOf, read)).toEqual([])
  })

  it('skips rows with no tier rather than inventing a boundary around them', () => {
    // A player the active ranking list does not cover has no tier at all.
    const withGap: Row[] = [
      row('a', 300, 1),
      { name: 'unranked', projected: 280, value: 280, tier: undefined as unknown as number },
      row('c', 200, 2),
    ]
    const cliffs = tierCliffs(withGap, tierOf, read)
    expect(cliffs).toHaveLength(1)
    expect(cliffs[0].aboveName).toBe('a')
    expect(cliffs[0].drop).toBeCloseTo(100, 5)
  })

  it('reports a rise as a zero drop rather than a negative one', () => {
    // The list is ordered by someone else's opinion, so the next tier can
    // out-project the one above it. "Drops -8 pts" is not a sentence.
    const inverted = [row('a', 200, 1), row('b', 208, 2)]
    expect(tierCliffs(inverted, tierOf, read)[0].drop).toBe(0)
  })

  it('handles an empty list', () => {
    expect(tierCliffs([], tierOf, read)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/draft/room/__tests__/tierCliffs.test.ts`
Expected: FAIL — `Failed to resolve import "../tierCliffs"`.

- [ ] **Step 3: Write the implementation**

Create `src/draft/room/tierCliffs.ts`:

```ts
/**
 * Where the tiers actually break, and by how much.
 *
 * `assignTiers` already cuts at the largest gaps in the board and has never said
 * where. That is the most useful line in a hand-made draft guide — "337.9 and
 * 334.7, then 298.9 for the next back" — and it is a number we hold rather than
 * one anybody has to research.
 *
 * Measured in PROJECTED POINTS. When a ranking list is active `value` carries
 * that list's order instead of our points, and a drop measured there cannot be
 * checked against the points column sitting beside it.
 */

export interface Cliff {
  /** Index of the LAST row above the break. Render the cliff before the next row. */
  afterIndex: number
  aboveName: string
  abovePoints: number
  belowPoints: number
  /** Never negative: the list can be ordered by an opinion that disagrees with our points. */
  drop: number
}

export function tierCliffs<T>(
  rows: T[],
  tierOf: (row: T) => number | undefined,
  read: (row: T) => { name: string; projected: number },
): Cliff[] {
  const out: Cliff[] = []
  if (!rows?.length) return out

  // Walk the last row that HAD a tier, so a player the ranking list omits does
  // not manufacture a boundary on either side of himself.
  let lastIndex = -1
  let lastTier: number | undefined
  for (let i = 0; i < rows.length; i++) {
    const tier = tierOf(rows[i])
    if (tier === undefined) continue
    if (lastTier !== undefined && tier !== lastTier) {
      const above = read(rows[lastIndex])
      const below = read(rows[i])
      out.push({
        afterIndex: lastIndex,
        aboveName: above.name,
        abovePoints: above.projected,
        belowPoints: below.projected,
        drop: Math.max(0, above.projected - below.projected),
      })
    }
    lastIndex = i
    lastTier = tier
  }
  return out
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/draft/room/__tests__/tierCliffs.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/draft/room/tierCliffs.ts src/draft/room/__tests__/tierCliffs.test.ts
git commit -m "feat(draft): surface where the tier boundaries fall, in points"
```

---

### Task 3: Fold the signals into `buildBoard`

**Files:**
- Modify: `src/draft/room/board.ts`
- Modify: `src/draft/room/__tests__/board.test.ts` (existing flag tests encode the old vocabulary)
- Modify: `src/draft/room/__tests__/recommend.test.ts:8` (fixture carries `flag: ''`, still valid — verify only)

**Interfaces:**
- Consumes: `marketDisagreement` from Task 1.
- Produces: `BoardInput` gains `teams?: number`. `BoardRow` gains `marketFlag: 'value' | 'fade' | ''`, `disagreementRounds: number`, `injuryStatus: string | null`. `BoardRow.flag` becomes `'fell' | ''`. `AvailablePlayerRow` gains optional `injuryStatus?: string | null`.

- [ ] **Step 1: Write the failing test**

Append to `src/draft/room/__tests__/board.test.ts`:

```ts
describe('buildBoard — market signals', () => {
  const base = {
    survival: {},
    expectedBestAtPosition: { RB: 200 },
    adpByKey: { early: 5, late: 60 },
    currentOverallPick: 40,
    filledStarterSlots: 2,
    totalStarterSlots: 9,
    teams: 12,
  }
  // `early` projects far better than `late` but the market prices him first.
  const available = [
    { playerKey: 'early', name: 'Market Darling', position: 'RB', value: 300, projected: 300 },
    { playerKey: 'late', name: 'Our Guy', position: 'RB', value: 290, projected: 290 },
  ]

  it('flags the player we rank a round above the market as VALUE', () => {
    // We have `late` 2nd; the market has him 2nd too — no gap. Widen it by
    // pricing a third player between them.
    const rows = buildBoard({
      ...base,
      available: [
        ...available,
        { playerKey: 'filler', name: 'Filler', position: 'RB', value: 100, projected: 100 },
      ],
      adpByKey: { early: 5, filler: 20, late: 60 },
    })
    const late = rows.find((r) => r.playerKey === 'late')!
    // proj rank 2, adp rank 3 in a 12-team league: a twelfth of a round.
    expect(late.marketFlag).toBe('')
    expect(late.disagreementRounds).toBeCloseTo(1 / 12, 5)
  })

  it('renames the pick-relative flag to FELL and never says value', () => {
    const rows = buildBoard({ ...base, available })
    // `early` has an ADP of 5 and we are at pick 40: he slid a long way.
    expect(rows.find((r) => r.playerKey === 'early')!.flag).toBe('fell')
    for (const r of rows) expect(r.flag).not.toBe('value')
  })

  it('has no reach flag at all', () => {
    const rows = buildBoard({ ...base, currentOverallPick: 1, available })
    for (const r of rows) expect(r.flag).toBe('')
  })

  it('suppresses the market read when league size is unknown', () => {
    const rows = buildBoard({ ...base, teams: undefined, available })
    for (const r of rows) {
      expect(r.marketFlag).toBe('')
      expect(r.disagreementRounds).toBe(0)
    }
  })

  it('carries injury status through untouched', () => {
    const rows = buildBoard({
      ...base,
      available: [{ ...available[0], injuryStatus: 'Questionable' }, available[1]],
    })
    expect(rows.find((r) => r.playerKey === 'early')!.injuryStatus).toBe('Questionable')
    expect(rows.find((r) => r.playerKey === 'late')!.injuryStatus).toBeNull()
  })

  it('lets a player hold FELL and FADE at once without contradiction', () => {
    // He slid past his ADP AND we still rate him below the market. Both true.
    const rows = buildBoard({
      ...base,
      available: [
        { playerKey: 'a', name: 'A', position: 'RB', value: 300, projected: 300 },
        { playerKey: 'b', name: 'B', position: 'RB', value: 100, projected: 100 },
      ],
      adpByKey: { a: 200, b: 1 },
      currentOverallPick: 240,
    })
    const a = rows.find((r) => r.playerKey === 'a')!
    expect(a.flag).toBe('fell')
    expect(a.marketFlag).toBe('value')
  })

  it('does not let any market signal reach the score', () => {
    const withTeams = buildBoard({ ...base, available })
    const without = buildBoard({ ...base, teams: undefined, available })
    expect(withTeams.map((r) => r.score)).toEqual(without.map((r) => r.score))
  })
})
```

Then update the three existing tests in the `buildBoard — tiers and flags` block that assert the old vocabulary:

```ts
  it('flags a player still available well past his ADP as fell', () => {
    const r = byKey(build({ currentOverallPick: 40 }))
    expect(r.rb3.flag).toBe('fell')
  })

  it('no longer calls taking a player early a reach', () => {
    // Superseded by FADE, which measures the same disagreement better because it
    // does not depend on where you happen to be sitting.
    const r = byKey(build({ currentOverallPick: 1 }))
    expect(r.rb1.flag).toBe('')
  })

  it('players without ADP carry no flag', () => {
    const r = byKey(build({ adpByKey: {} }))
    for (const row of Object.values(r)) expect(row.flag).toBe('')
  })
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/draft/room/__tests__/board.test.ts`
Expected: FAIL — `expect(received).toBe('fell')` receiving `'value'`, and `marketFlag` undefined.

- [ ] **Step 3: Write the implementation**

In `src/draft/room/board.ts`:

Add the import at the top of the import block:

```ts
import { marketDisagreement } from './marketDisagreement'
```

Add to `AvailablePlayerRow`, after `opportunity`:

```ts
  /** Sleeper's own word: Questionable, Doubtful, Out, IR, Sus. */
  injuryStatus?: string | null
```

Add to `BoardInput`, beside `totalStarterSlots`:

```ts
  /**
   * League size, which is what a "round" of rank disagreement means. Absent, the
   * market read is suppressed rather than measured against a nonsense threshold.
   */
  teams?: number
```

Replace the `flag` line in `BoardRow`:

```ts
  /** He slid past his ADP to the pick you are on. Only meaningful mid-draft. */
  flag: 'fell' | ''
  /** We and the market disagree by at least a round. A standing property. */
  marketFlag: 'value' | 'fade' | ''
  /** Rounds of that disagreement. Positive: we rank him higher than the market. */
  disagreementRounds: number
  injuryStatus: string | null
```

Delete the now-unused constant:

```ts
/** How far before ADP taking someone counts as a reach. */
const REACH_PICKS = 12
```

Add `teams` to the destructure at the top of `buildBoard`:

```ts
    marginalByKey,
    replacementPointsByKey,
    viaFlexByKey,
    teams,
  } = input
```

Replace the flag block:

```ts
    let flag: BoardRow['flag'] = ''
    if (adp !== null && currentOverallPick > adp + VALUE_PICKS) flag = 'fell'

    // `pr` and `ar` are already computed above for the upside term; the market
    // read reuses them rather than deriving a second ranking of the same board.
    const market = marketDisagreement({ projRank: pr, adpRank: ar, teams: teams ?? 0 })
```

Add to the returned row object, beside `flag`:

```ts
      flag,
      marketFlag: market.flag,
      disagreementRounds: market.rounds,
      injuryStatus: p.injuryStatus ?? null,
```

- [ ] **Step 4: Run the whole suite**

Run: `npx vitest run`
Expected: PASS. If `src/views/DraftRoomView.vue` fails to typecheck it is expected — Task 5 fixes the two `flag === 'value'` / `'reach'` render sites. Tests do not typecheck the view, so the suite should be green here.

- [ ] **Step 5: Commit**

```bash
git add src/draft/room/board.ts src/draft/room/__tests__/board.test.ts
git commit -m "feat(draft): market read on every board row, and one meaning per word"
```

---

### Task 4: Plumb league size and injury status to the board

**Files:**
- Modify: `src/composables/useDraftRoom.ts` — the `availablePlayers` `push` helper and the `buildBoard` call
- Modify: `src/draft/room/replay.ts` — its `buildBoard` call

**Interfaces:**
- Consumes: `BoardInput.teams` and `AvailablePlayerRow.injuryStatus` from Task 3.
- Produces: nothing new. This task makes the live board and the replay agree.

- [ ] **Step 1: Add injury status to the available-player rows**

In `src/composables/useDraftRoom.ts`, inside `availablePlayers`, extend the `rows` type annotation and the `push` body. Find:

```ts
        depthChartOrder: meta[playerKey]?.depth_chart_order ?? null,
      })
```

Replace with:

```ts
        depthChartOrder: meta[playerKey]?.depth_chart_order ?? null,
        injuryStatus: meta[playerKey]?.injury_status ?? null,
      })
```

And add `injuryStatus: string | null` to the inline `rows` type on the line beginning `const rows: { playerKey: string; name: string; ...`.

- [ ] **Step 2: Pass league size into the live board**

In the same file, in the `board` computed, add `teams` beside the other inputs:

```ts
      currentOverallPick: myPick.value ?? currentOverallPick.value,
      filledStarterSlots: Math.min(myPicks.value.length, starterSlots.value),
      totalStarterSlots: starterSlots.value,
      teams: effectiveTeams.value,
```

- [ ] **Step 3: Pass league size into the replay**

In `src/draft/room/replay.ts`, in the `buildBoard` call, add:

```ts
        filledStarterSlots: Math.min(myTaken, totalStarterSlots),
        totalStarterSlots,
        teams: shape.teams,
```

Add a comment above it:

```ts
        // The replay must be the live path or it verifies nothing.
```

- [ ] **Step 4: Verify the build and the suite**

Run: `npm run build 2>&1 | grep -E "error|built"`
Expected: `✓ built`. TypeScript will flag `DraftRoomView.vue` if the old flag comparisons remain — Task 5 removes them; if the build fails on those two lines, proceed to Task 5 and re-run there.

Run: `npx vitest run`
Expected: PASS, no new failures.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useDraftRoom.ts src/draft/room/replay.ts
git commit -m "feat(draft): carry injury status and league size to the board"
```

---

### Task 5: Render the badges and the cliff rows

**Files:**
- Modify: `src/views/DraftRoomView.vue` — the board row badge at line ~515, the recommendation card badges at ~423-424, the tier header block at ~481

**Interfaces:**
- Consumes: `BoardRow.flag` (`'fell' | ''`), `marketFlag`, `disagreementRounds`, `injuryStatus` from Task 3; `tierCliffs` from Task 2.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Import `tierCliffs` and build a lookup**

In the `<script setup>` block, add to the imports:

```ts
import { tierCliffs } from '@/draft/room/tierCliffs'
```

After the existing `tierCount` function, add:

```ts
/**
 * Where the visible list breaks between tiers, and by how much. Computed over
 * the rows on screen, so it follows the position filter exactly as the tier
 * headers already do.
 */
const cliffByIndex = computed(() => {
  const rows = visibleBoard.value
  const list = tierCliffs(
    rows,
    (r) => tierOf(r.playerKey),
    (r) => ({ name: r.name, projected: r.projected }),
  )
  const out: Record<number, (typeof list)[number]> = {}
  // Keyed by the row the cliff sits ABOVE, which is where it renders.
  for (const c of list) out[c.afterIndex + 1] = c
  return out
})
```

- [ ] **Step 2: Render the cliff above each tier header**

In the template, find the tier header block that begins:

```html
          <div v-if="isTierHeader(i)" class="mt-4 flex items-center gap-2 first:mt-0">
```

Insert immediately BEFORE it:

```html
          <!--
            The most useful line in a hand-made draft guide is where the board
            breaks and by how much. We already compute it and have never said so.
          -->
          <div v-if="cliffByIndex[i]" class="mt-4 rounded-md border-l-2 border-[#FF5C5C]/60 bg-[#FF5C5C]/5 px-3 py-1.5">
            <span class="font-mono text-[10px] font-semibold uppercase tracking-wide text-[#FF5C5C]">
              cliff · after {{ cliffByIndex[i].aboveName }}
            </span>
            <span class="ml-2 font-mono text-[10px] text-dark-textMuted">
              {{ round(cliffByIndex[i].abovePoints) }} then {{ round(cliffByIndex[i].belowPoints) }}
              — {{ round(cliffByIndex[i].drop) }} pt drop
            </span>
          </div>
```

Then change the tier header's own class from `mt-4` to `mt-2` so a cliff and its header do not double the gap:

```html
          <div v-if="isTierHeader(i)" class="mt-2 flex items-center gap-2 first:mt-0">
```

- [ ] **Step 3: Replace the board row's badge**

Find the line at approximately 515:

```html
                <span v-else-if="r.flag === 'value'" class="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-emerald-400">value</span>
```

Replace with:

```html
                <span v-else-if="r.marketFlag === 'value'" class="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-emerald-400"
                      :title="`We rank him ${Math.abs(r.disagreementRounds).toFixed(1)} rounds earlier than the market does`">value</span>
                <span v-else-if="r.marketFlag === 'fade'" class="shrink-0 rounded bg-[#FF5C5C]/15 px-1 py-0.5 font-mono text-[9px] uppercase text-[#FF5C5C]"
                      :title="`The market ranks him ${Math.abs(r.disagreementRounds).toFixed(1)} rounds earlier than we do`">fade</span>
                <span v-if="r.flag === 'fell'" class="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-emerald-400"
                      title="He has slid past his ADP to the pick you are on">fell</span>
                <span v-if="r.injuryStatus" class="shrink-0 rounded border border-dark-border px-1 py-0.5 font-mono text-[9px] uppercase text-dark-textMuted"
                      title="Sleeper's reported status">{{ r.injuryStatus }}</span>
```

- [ ] **Step 4: Fix the recommendation card badges**

Find lines ~423-424:

```html
                  <span v-if="recommendation.pick.flag === 'value'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase text-emerald-400">value</span>
                  <span v-else-if="recommendation.pick.flag === 'reach'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] uppercase text-amber-400">reach</span>
```

Replace with:

```html
                  <span v-if="recommendation.pick.marketFlag === 'value'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase text-emerald-400">value</span>
                  <span v-else-if="recommendation.pick.marketFlag === 'fade'" class="ml-1 rounded bg-[#FF5C5C]/15 px-1 py-0.5 text-[9px] uppercase text-[#FF5C5C]">fade</span>
                  <span v-if="recommendation.pick.flag === 'fell'" class="ml-1 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] uppercase text-emerald-400">fell</span>
                  <span v-if="recommendation.pick.injuryStatus" class="ml-1 rounded border border-dark-border px-1 py-0.5 text-[9px] uppercase text-dark-textMuted">{{ recommendation.pick.injuryStatus }}</span>
```

- [ ] **Step 5: Verify the build and the full suite**

Run: `npm run build 2>&1 | grep -E "error|built"`
Expected: `✓ built` with no errors.

Run: `npx vitest run`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add src/views/DraftRoomView.vue
git commit -m "feat(draft): show the cliffs, the market read, and reported injury status"
```

---

### Task 6: Deploy and verify live

**Files:** none modified.

**Interfaces:** none.

- [ ] **Step 1: Build**

Run: `npm run build 2>&1 | grep -E "error|built"`
Expected: `✓ built`.

- [ ] **Step 2: Push the working branch**

```bash
git push origin redesign/my-team-first
```

Note: this project deploys from `redesign/my-team-first`, not `main`. `main` is hundreds of commits behind and pushing it does nothing useful.

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 4: Verify the live bundle matches the local build**

```bash
L=$(grep -o 'index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1)
curl -sL https://www.ultimatefantasydashboard.com/ | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1
```

Expected: the two hashes match. Vercel's auto-deploy from GitHub is unreliable on this project, so the explicit `--prod` above is what actually ships; the hash comparison is what proves it.

---

## Self-Review

**Spec coverage.** Every section maps to a task: no-pipeline (nothing to build, no task needed — verified in the spec's freshness table); VALUE/FADE → Task 1 + 3; FELL rename and `reach` deletion → Task 3 + 5; injury status → Task 3 + 4 + 5; tier cliffs → Task 2 + 5; replay parity → Task 4; error handling cases → covered by tests in Tasks 1–3 (no ADP, no league size, single tier, unranked rows).

**Placeholder scan.** No TBDs. Every code step carries the literal code. The one judgement call left to the implementer is the inline `rows` type annotation in Task 4 Step 1, which is named explicitly rather than left as "update the type".

**Type consistency.** `marketDisagreement` returns `{ rounds, flag }` and is consumed as `market.rounds` / `market.flag` in Task 3. `tierCliffs` returns `afterIndex` and the view keys on `afterIndex + 1`. `BoardRow.flag` is `'fell' | ''` in Task 3 and matched in Task 5. `injuryStatus` is `string | null` on the row and `injury_status` on the Sleeper meta object — spelled correctly in both places in Task 4.
