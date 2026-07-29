# Football Position Grids (Football Phase 2b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the League landscape, positional depth, and Trades position grids use football rows (QB/RB/WR/TE) + flex-eligibility for football leagues, with baseball unchanged.

**Architecture:** Extend the two shared flex tables (`FLEX_ELIGIBILITY`, `SURPLUS_FLEX`) with football flex slots (keys don't collide with baseball), add a `positionRowsFor(sport)` helper, and thread `sport` into the two grid consumers so they use football rows. The generic `coversSlot`/depth engine then handles football with no other change.

**Tech Stack:** TypeScript, Vitest, Vue 3, Pinia.

**Spec:** `docs/superpowers/specs/2026-07-28-football-position-grids-design.md`

**Standing constraint:** Local only — commit, never push/deploy. Test with `npx vitest run <path>`; build with `npm run build`.

---

## File Structure

- **Modify** `src/trades/rosterSlots.ts` — add `FLEX`/`SUPER_FLEX` to `FLEX_ELIGIBILITY`.
- **Modify** `src/trades/positionalLandscape.ts` — add `FLEX`/`SUPER_FLEX` to `SURPLUS_FLEX`; add `positionRowsFor(sport)`.
- **Modify** `src/trades/__tests__/positionalLandscape.test.ts` — add football flex + `positionRowsFor` tests.
- **Modify** `src/composables/useLeagueLandscape.ts` — use `positionRowsFor(leagueStore.activeSport)`.
- **Modify** `src/myteam/pointsTradeLandscape.ts` — add `sport` param, use `positionRowsFor(sport)`.
- **Modify** `src/views/PointsTradesView.vue:51` — pass `leagueStore.activeSport`.

---

### Task 1: Football flex tables + `positionRowsFor` (TDD)

**Files:**
- Modify: `src/trades/rosterSlots.ts`
- Modify: `src/trades/positionalLandscape.ts`
- Test: `src/trades/__tests__/positionalLandscape.test.ts`

- [ ] **Step 1: Add the failing tests**

First, ensure the top-of-file import from `'../positionalLandscape'` includes **both** `coversSlot` and `positionRowsFor` (add whichever is missing to the EXISTING import statement — do NOT add a second import line, which would be a duplicate-import error). Then append these two describe blocks to the END of `src/trades/__tests__/positionalLandscape.test.ts` (after the last existing `})`), with NO import line of their own:

```ts
describe('football flex eligibility', () => {
  it('an RB fills a FLEX slot; a QB does not', () => {
    expect(coversSlot(['RB'], 'FLEX')).toBe(true)
    expect(coversSlot(['WR'], 'FLEX')).toBe(true)
    expect(coversSlot(['TE'], 'FLEX')).toBe(true)
    expect(coversSlot(['QB'], 'FLEX')).toBe(false)
  })

  it('a QB fills SUPER_FLEX; concrete positions still match themselves', () => {
    expect(coversSlot(['QB'], 'SUPER_FLEX')).toBe(true)
    expect(coversSlot(['RB'], 'SUPER_FLEX')).toBe(true)
    expect(coversSlot(['QB'], 'QB')).toBe(true)
    expect(coversSlot(['WR'], 'RB')).toBe(false)
  })
})

describe('positionRowsFor', () => {
  it('football → skill positions', () => {
    expect(positionRowsFor('football')).toEqual(['QB', 'RB', 'WR', 'TE'])
  })
  it('baseball / unknown → MLB positions', () => {
    expect(positionRowsFor('baseball')).toEqual(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
    expect(positionRowsFor('hockey')).toEqual(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/trades/__tests__/positionalLandscape.test.ts`
Expected: the new tests FAIL — `coversSlot(['RB'],'FLEX')` returns `false` (no FLEX entry yet), and `positionRowsFor` is undefined. Existing tests still pass.

- [ ] **Step 3: Add football flex to `FLEX_ELIGIBILITY`**

In `src/trades/rosterSlots.ts`, inside the exported `FLEX_ELIGIBILITY` object, add these two entries (e.g. right after the `P: [...]` line):

```ts
  // Football flex slots (keys don't collide with the baseball entries above).
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
```

- [ ] **Step 4: Add football flex to `SURPLUS_FLEX` and add `positionRowsFor`**

In `src/trades/positionalLandscape.ts`:

(a) Add `'FLEX'` and `'SUPER_FLEX'` to the `SURPLUS_FLEX` set:
```ts
export const SURPLUS_FLEX = new Set(['UTIL', 'DH', 'IF', 'MI', 'CI', '2B/SS', '1B/3B', 'P', 'FLEX', 'SUPER_FLEX'])
```

(b) Add the helper (e.g. right after `SURPLUS_FLEX`):
```ts
const MLB_POSITION_ROWS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']
const NFL_POSITION_ROWS = ['QB', 'RB', 'WR', 'TE']

/** Concrete positions worth ranking/comparing for a sport (flex/util are overflow, not a
 *  target position; football K/DEF are low-value / no-projection in v1). */
export function positionRowsFor(sport: string): string[] {
  return sport === 'football' ? [...NFL_POSITION_ROWS] : [...MLB_POSITION_ROWS]
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/trades/__tests__/positionalLandscape.test.ts`
Expected: PASS — all tests (existing + new).

Also run the roster-slots suite to confirm adding FLEX keys didn't disturb baseball parsing:
Run: `npx vitest run src/trades/__tests__/rosterSlots.test.ts`
Expected: PASS — 10/10 (FLEX_ELIGIBILITY isn't used by `parseRosterSlots`, so no change).

- [ ] **Step 6: Commit**

```bash
git add src/trades/rosterSlots.ts src/trades/positionalLandscape.ts src/trades/__tests__/positionalLandscape.test.ts
git commit -m "feat: football flex eligibility + positionRowsFor(sport)"
```
(Ignore the harmless git gc `bad object` warning; verify with `git log --oneline -1`.)

---

### Task 2: Thread `sport` into the two grids

**Files:**
- Modify: `src/composables/useLeagueLandscape.ts`
- Modify: `src/myteam/pointsTradeLandscape.ts`
- Modify: `src/views/PointsTradesView.vue`

No new unit test — Task 1 covers the pure logic; this is integration wiring, verified by build.

- [ ] **Step 1: `useLeagueLandscape.ts` — use football rows**

(a) Change the existing import (line 4) from `import { coversSlot } from '@/trades/positionalLandscape'` to:
```ts
import { coversSlot, positionRowsFor } from '@/trades/positionalLandscape'
```
(b) Add a league-store import near the other imports:
```ts
import { useLeagueStore } from '@/stores/league'
```
(c) Delete the module-level `const POSITION_ROWS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']` (line 28).
(d) Inside `export function useLeagueLandscape(inputs: {...}) {`, add at the top of the function body:
```ts
  const leagueStore = useLeagueStore()
```
(e) Inside the `view` computed, just before the `for (const pos of POSITION_ROWS)` loop, add:
```ts
    const positionRows = positionRowsFor(leagueStore.activeSport)
```
and change the loop header to `for (const pos of positionRows) {`.

- [ ] **Step 2: `pointsTradeLandscape.ts` — sport param + football rows**

(a) Change the import (line 9) from `import { coversSlot } from '@/trades/positionalLandscape'` to:
```ts
import { coversSlot, positionRowsFor } from '@/trades/positionalLandscape'
```
(b) Delete the module-level `const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']` (line 15).
(c) Add a `sport` parameter (defaulted for back-compat) to `buildPointsTradeLandscape` — change its signature to:
```ts
export function buildPointsTradeLandscape(
  pool: PointsPoolPlayer[],
  fgByKey: Record<string, FGProjection | null>,
  weights: Record<string, number>,
  myTeamKey: string,
  teamNames: Record<string, string> = {},
  sport: string = 'baseball',
): PointsTradeLandscape | null {
```
(d) Change `const positions = POSITIONS.filter(...)` (line 64) to:
```ts
  const positions = positionRowsFor(sport).filter((pos) => teamKeys.some((t) => bestAt(t, pos) > 0))
```

- [ ] **Step 3: `PointsTradesView.vue` — pass the sport**

`PointsTradesView.vue` already has `const leagueStore = useLeagueStore()` (line 12). Update the `buildPointsTradeLandscape` call (line 51) to pass sport as the 6th argument:
```ts
  return buildPointsTradeLandscape(pool.value, fgByKey.value, scoring.weights.value, myTeamKey.value, teamNames.value, leagueStore.activeSport)
```

- [ ] **Step 4: Verify build + existing tests**

Run: `npm run build`
Expected: `✓ built in …`, no TypeScript errors (the added optional `sport` param is back-compatible; the existing `pointsTradeLandscape.test.ts` calls with 5 args → baseball default, still valid).

Run: `npx vitest run src/myteam/__tests__/pointsTradeLandscape.test.ts`
Expected: PASS — the existing landscape tests (they pass 5 args → baseball).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useLeagueLandscape.ts src/myteam/pointsTradeLandscape.ts src/views/PointsTradesView.vue
git commit -m "feat: thread sport into league landscape + trade landscape grids"
```

---

## Final verification

- [ ] `npx vitest run src/trades/__tests__/positionalLandscape.test.ts src/trades/__tests__/rosterSlots.test.ts src/myteam/__tests__/pointsTradeLandscape.test.ts` → all PASS.
- [ ] `npm run build` → clean.

## Notes / scope reminders

- **Values are still baseball-sourced.** The grids now show football position ROWS, but cell values come from the baseball value model until Phase 3 wires football projections in. Full smoke on a real football league waits for Phase 3.
- `covers()` in `useLeagueLandscape` is unchanged — its `SP/RP` pitcher branch is simply never reached for football rows.
- `leagueStore.activeSport` is the active sport string (`'baseball'` | `'football'` | …); `positionRowsFor` treats any non-`'football'` value as baseball.
