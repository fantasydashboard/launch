# Football My Team onto VOR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the football My Team roster on VOR — order, tier, and display each player by Value Over Replacement (fixing the QB-bias where every QB reads CORE) — and replace the leaked baseball copy (HITTERS / SB·SV·HLD·QS chips / "hitters·pitchers") with football-native labels. Baseball My Team stays byte-for-byte unchanged.

**Architecture:** Add an optional `vorByKey` to `buildPointsTeam`: when supplied (football), the roster rows are ordered + tiered + display by a per-player `rankVor` (injury-discounted VOR); the optimal-lineup, standings, and slot-rank math stay on the existing points-based `valueByKey` (VOR is relative and must not drive lineup magnitude; within-position ranking is identical anyway). The view wires the shared `useFootballVor` engine (empty free agents, `weeklyHorizon: 0`) exactly like Trades.

**Tech Stack:** Vue 3 / TypeScript / Vitest. Builds on `useFootballVor` (`src/composables/useFootballVor.ts`) and `buildFootballVor`/`PlayerVor`.

**Scope:** The My Team consumer from spec §6 (`docs/superpowers/specs/2026-07-30-football-vor-cheat-code-design.md`) — the third and final VOR consumer after Wire and Trades. In scope: roster-row value/order/tier + copy. Out of scope (deliberately unchanged): the "Your lineup vs the league" slot-rank bars, standings, and Season Outlook record/rank — these read absolute projected points, which is correct and not baseball-copy-leaking.

---

## File Structure

**Modify:**
- `src/myteam/pointsTeam.ts` — optional `vorByKey` param; `PointsRosterRow.rankVor?`; order + tier roster rows by `rankVor` when present.
- `src/views/PointsMyTeamView.vue` — instantiate `useFootballVor`, pass `vorByKey`, display `rankVor` for football, football-native group label + footer copy.
- `src/myteam/__tests__/pointsTeam.test.ts` — append VOR ordering/tiering cases (existing baseball cases = non-regression guard).

**Design decisions (locked):**
- `vorByKey: Record<string, { vorRos: number }>` (PlayerVor is structurally assignable).
- Roster rows for football: order desc by `rankVor`, tier CORE/SOLID/FRINGE by `rankVor` percentile, display `rankVor` labeled "VOR". Baseball: no `vorByKey` → identical to today (order/tier/display by discounted points).
- Optimal lineup / standings / slotRanks / pitching: unchanged (still use `valueByKey.total`).
- Football is one group ("Roster"), no specialist chips, football-native footer. (For football every row is `side === 'hit'`, so the existing Hitters/Pitchers split collapses to one group — relabel it.)

---

## Task 1: `buildPointsTeam` — order/tier/display roster rows by VOR

Add optional `vorByKey`; when supplied, roster rows carry a `rankVor` and are ordered + tiered by it. Everything else (lineup, standings, slots) unchanged.

**Files:**
- Modify: `src/myteam/pointsTeam.ts`
- Test: `src/myteam/__tests__/pointsTeam.test.ts` (append)

- [ ] **Step 1: Write the failing test — append to `src/myteam/__tests__/pointsTeam.test.ts`**

READ the file first to reuse its imports (`buildPointsTeam`, `buildBaseballValue`/`buildFootballValue`, `PointsPoolPlayer`) and match fixture style. Append this NEW `describe` block at the end:

```typescript
describe('buildPointsTeam — football VOR roster ranking', () => {
  // 1 team (me), slots QB1/RB2/FLEX1. Raw points make the QB look best (points bias);
  // VOR flips it — a high-VOR RB should tier above a replacement-level QB.
  const slots = { QB: 1, RB: 2, FLEX: 1 }
  const pool: PointsPoolPlayer[] = [
    { playerKey: 'qb', name: 'Pocket QB', position: 'QB', teamKey: 'me', eligiblePositions: ['QB'] },
    { playerKey: 'rb1', name: 'Stud RB', position: 'RB', teamKey: 'me', eligiblePositions: ['RB'] },
    { playerKey: 'rb2', name: 'Flex RB', position: 'RB', teamKey: 'me', eligiblePositions: ['RB'] },
  ]
  // Football value (per-week points basis): QB scores the most raw points.
  const valueByKey = {
    qb: { total: 300, games: 1, perStat: {}, weeklyCap: 999 },
    rb1: { total: 220, games: 1, perStat: {}, weeklyCap: 999 },
    rb2: { total: 120, games: 1, perStat: {}, weeklyCap: 999 },
  }
  // VOR: the stud RB is far above replacement; the QB is barely above.
  const vorByKey = { qb: { vorRos: 10 }, rb1: { vorRos: 95 }, rb2: { vorRos: 5 } }

  it('orders roster rows by VOR (not raw points) and exposes rankVor', () => {
    const model = buildPointsTeam(pool, valueByKey, 'me', slots, { vorByKey })
    // Rows ordered by rankVor desc: rb1 (95) > qb (10) > rb2 (5).
    expect(model.rosterRows.map((r) => r.player.playerKey)).toEqual(['rb1', 'qb', 'rb2'])
    expect(model.rosterRows.find((r) => r.player.playerKey === 'rb1')!.rankVor).toBe(95)
    // Top VOR is CORE, bottom is FRINGE.
    expect(model.rosterRows[0].tier).toBe('CORE')
    expect(model.rosterRows[model.rosterRows.length - 1].tier).toBe('FRINGE')
  })

  it('without vorByKey, roster rows are unchanged (ordered by points, rankVor undefined)', () => {
    const model = buildPointsTeam(pool, valueByKey, 'me', slots)
    expect(model.rosterRows.map((r) => r.player.playerKey)).toEqual(['qb', 'rb1', 'rb2']) // points order
    expect(model.rosterRows[0].rankVor).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/myteam/__tests__/pointsTeam.test.ts`
Expected: the two new tests FAIL (5th arg `{ vorByKey }` not accepted / `rankVor` undefined / order wrong); existing tests still pass.

- [ ] **Step 3: Implement — edit `src/myteam/pointsTeam.ts`**

(a) Add `rankVor?` to the `PointsRosterRow` interface. Find:

```typescript
export interface PointsRosterRow {
  player: PointsPoolPlayer
  side: PointsSide
  points: number // projected rest-of-season fantasy points
  perGame: number
  games: number
  tier: Tier
  rankVsAll: number // 0-100 percentile vs all rostered players on the same side
  perStat: Record<string, number>
  chips: string[] // specialist edges (SB/SV/HLD/QS) where this player is a standout
  injury: InjuryTier // 'healthy' | 'dtd' | 'il' — drives the badge + the points discount
}
```

Change to (append `rankVor?`):

```typescript
export interface PointsRosterRow {
  player: PointsPoolPlayer
  side: PointsSide
  points: number // projected rest-of-season fantasy points
  perGame: number
  games: number
  tier: Tier
  rankVsAll: number // 0-100 percentile vs all rostered players on the same side
  perStat: Record<string, number>
  chips: string[] // specialist edges (SB/SV/HLD/QS) where this player is a standout
  injury: InjuryTier // 'healthy' | 'dtd' | 'il' — drives the badge + the points discount
  rankVor?: number // football: injury-discounted VOR; orders + tiers the row. undefined for baseball.
}
```

(b) Add the `vorByKey` option. Find the `opts` param in the signature:

```typescript
  opts: { basis?: 'total' | 'perWeek'; weeksLeft?: number } = {},
): PointsTeamModel {
  const basis = opts.basis ?? 'total'
  const weeksLeft = opts.weeksLeft ?? 1
```

Change to:

```typescript
  opts: { basis?: 'total' | 'perWeek'; weeksLeft?: number; vorByKey?: Record<string, { vorRos: number }> } = {},
): PointsTeamModel {
  const basis = opts.basis ?? 'total'
  const weeksLeft = opts.weeksLeft ?? 1
  const vorByKey = opts.vorByKey
```

(c) Attach `rankVor` to each raw roster row. Find the `rawRows` builder:

```typescript
  const rawRows = pool
    .filter((p) => myTeamKey != null && p.teamKey === myTeamKey)
    .map((p) => {
      const r = ptsByKey.get(p.playerKey)!
      const disc = discountOf(p.playerKey)
      return {
        player: p,
        side: sideByKey.get(p.playerKey)!,
        points: r.total * disc, // discounted — drives tiers + display
        perGame: r.games > 0 ? r.total / r.games : 0, // healthy "when he plays" rate
        games: r.games,
        perStat: r.perStat,
        injury: injuryByKey.get(p.playerKey) ?? 'healthy',
      }
    })
```

Change to (compute discounted `rankVor`):

```typescript
  const rawRows = pool
    .filter((p) => myTeamKey != null && p.teamKey === myTeamKey)
    .map((p) => {
      const r = ptsByKey.get(p.playerKey)!
      const disc = discountOf(p.playerKey)
      const vor = vorByKey?.[p.playerKey]?.vorRos
      return {
        player: p,
        side: sideByKey.get(p.playerKey)!,
        points: r.total * disc, // discounted — drives tiers + display
        perGame: r.games > 0 ? r.total / r.games : 0, // healthy "when he plays" rate
        games: r.games,
        perStat: r.perStat,
        injury: injuryByKey.get(p.playerKey) ?? 'healthy',
        rankVor: vor != null ? vor * disc : undefined, // football: injury-discounted VOR
      }
    })
```

(d) Order + tier by `rankVor` when present (else points). Find the rosterRows building loop:

```typescript
  const rosterRows: PointsRosterRow[] = []
  for (const side of ['hit', 'pit'] as PointsSide[]) {
    const sideRows = rawRows.filter((r) => r.side === side).sort((a, b) => b.points - a.points)
    const n = sideRows.length
    sideRows.forEach((r, i) => {
      const pct = n < 2 ? 50 : Math.round(((n - 1 - i) / (n - 1)) * 100)
      const tier: Tier = pct >= 66 ? 'CORE' : pct >= 33 ? 'SOLID' : 'FRINGE'
      rosterRows.push({
        player: r.player,
        side: r.side,
        points: r.points,
        perGame: r.perGame,
        games: r.games,
        tier,
        rankVsAll: pct,
        perStat: r.perStat,
        chips: chipsFor(r.side, r.perStat),
        injury: r.injury,
      })
    })
  }
  rosterRows.sort((a, b) => b.points - a.points)
```

Change to (sort key = `rankVor ?? points`, both in the per-side percentile and the final sort):

```typescript
  // Football ranks by VOR (rankVor); baseball by discounted points. One sort key drives
  // per-side ordering, tier percentile, and the final combined sort.
  const orderVal = (r: { rankVor?: number; points: number }): number => r.rankVor ?? r.points
  const rosterRows: PointsRosterRow[] = []
  for (const side of ['hit', 'pit'] as PointsSide[]) {
    const sideRows = rawRows.filter((r) => r.side === side).sort((a, b) => orderVal(b) - orderVal(a))
    const n = sideRows.length
    sideRows.forEach((r, i) => {
      const pct = n < 2 ? 50 : Math.round(((n - 1 - i) / (n - 1)) * 100)
      const tier: Tier = pct >= 66 ? 'CORE' : pct >= 33 ? 'SOLID' : 'FRINGE'
      rosterRows.push({
        player: r.player,
        side: r.side,
        points: r.points,
        perGame: r.perGame,
        games: r.games,
        tier,
        rankVsAll: pct,
        perStat: r.perStat,
        chips: chipsFor(r.side, r.perStat),
        injury: r.injury,
        rankVor: r.rankVor,
      })
    })
  }
  rosterRows.sort((a, b) => orderVal(b) - orderVal(a))
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/myteam/__tests__/pointsTeam.test.ts`
Expected: ALL pass (existing baseball cases + the two new).

If an EXISTING test fails, STOP and report BLOCKED — the baseball path must be unchanged (no `vorByKey` → `orderVal` returns `points`, identical to before).

Broader non-regression:
Run: `npx vitest run src/myteam/ src/trades/`
Expected: all pass (~284+ tests).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/pointsTeam.ts src/myteam/__tests__/pointsTeam.test.ts
git commit -m "feat: order + tier My Team roster by VOR when supplied (football)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Wire VOR into My Team view + fix baseball-copy leak (`PointsMyTeamView.vue`)

Instantiate `useFootballVor`, pass `vorByKey` to `buildPointsTeam`, display `rankVor` for football, and replace the leaked baseball copy.

**Files:**
- Modify: `src/views/PointsMyTeamView.vue`

- [ ] **Step 1: Read the view** `src/views/PointsMyTeamView.vue` fully. Note: `source = useActivePointsSource()`, `pool`/`rosterSlots`/`myTeamKey`, `season = computed(() => '')`, `isFootball` (line 17), `{ valueByKey } = usePointsValue({...})` (line 38), the `model` computed calling `buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)` (line ~83), the `roster` groups computed (~line 170, labels 'Hitters'/'Pitchers'), the roster-row value display (lines 347-353), and the footer copy (lines 358-365).

- [ ] **Step 2: Script — instantiate `useFootballVor` and pass `vorByKey` to `buildPointsTeam`**

Add imports near the other `@/composables` / type imports at the top:

```typescript
import { useFootballVor } from '@/composables/useFootballVor'
import type { AvailablePlayer } from '@/players/types'
```

After the `usePointsValue({...})` line, add:

```typescript
// Football VOR (shared engine) — orders/tiers/values the roster. Rostered-only calibration
// (empty free agents), ROS only (no weekly fetches). Undefined for baseball.
const noFreeAgents = computed<AvailablePlayer[]>(() => [])
const { vorByKey: fbVor } = useFootballVor({
  pool,
  freeAgents: noFreeAgents,
  slots: rosterSlots,
  season,
  enabled: isFootball,
  weeklyHorizon: 0,
})
```

Change the `model` computed's `buildPointsTeam(...)` call:

```typescript
  return buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)
```

to:

```typescript
  return buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, {
    vorByKey: isFootball.value ? fbVor.value : undefined,
  })
```

- [ ] **Step 3: Script — football-native roster group label**

Find the `roster` groups computed (~line 170):

```typescript
const roster = computed(() => [
  { label: 'Hitters', rows: hitters.value },
  { label: 'Pitchers', rows: pitchers.value },
])
```

Change to (football is one group; baseball keeps Hitters/Pitchers):

```typescript
const roster = computed(() =>
  isFootball.value
    ? [{ label: 'Roster', rows: model.value?.rosterRows ?? [] }]
    : [
        { label: 'Hitters', rows: hitters.value },
        { label: 'Pitchers', rows: pitchers.value },
      ],
)
```

- [ ] **Step 4: Template — display `rankVor` for football + football-native header/footer**

(a) Group header sub-label (line ~302). Find:

```vue
            <span class="font-mono text-[10px] normal-case tracking-normal text-dark-textMuted/70">· projected fantasy points</span>
```

Change to:

```vue
            <span class="font-mono text-[10px] normal-case tracking-normal text-dark-textMuted/70">· {{ isFootball ? 'value over replacement' : 'projected fantasy points' }}</span>
```

(b) Roster-row value (lines ~347-353). Find:

```vue
              <span v-if="!hasProj(row.player.playerKey)"
                class="ml-auto shrink-0 font-mono text-[11px] italic text-dark-textMuted/50">no projection</span>
              <span v-else class="ml-auto flex shrink-0 items-baseline gap-1.5">
                <span class="font-mono text-sm font-semibold text-dark-text">{{ round(isFootball ? row.perGame : row.points) }}</span>
                <span v-if="!isFootball" class="font-mono text-[10px] text-dark-textMuted">{{ row.perGame.toFixed(1) }}/g</span>
                <span v-else class="font-mono text-[10px] text-dark-textMuted">/wk</span>
              </span>
```

Change to (football shows VOR with sign; baseball unchanged):

```vue
              <span v-if="!hasProj(row.player.playerKey)"
                class="ml-auto shrink-0 font-mono text-[11px] italic text-dark-textMuted/50">no projection</span>
              <span v-else-if="isFootball" class="ml-auto flex shrink-0 items-baseline gap-1.5">
                <span class="font-mono text-sm font-semibold" :class="(row.rankVor ?? 0) >= 0 ? 'text-dark-text' : 'text-dark-textMuted'">{{ (row.rankVor ?? 0) >= 0 ? '+' : '' }}{{ round(row.rankVor ?? 0) }}</span>
                <span class="font-mono text-[10px] text-dark-textMuted">VOR</span>
              </span>
              <span v-else class="ml-auto flex shrink-0 items-baseline gap-1.5">
                <span class="font-mono text-sm font-semibold text-dark-text">{{ round(row.points) }}</span>
                <span class="font-mono text-[10px] text-dark-textMuted">{{ row.perGame.toFixed(1) }}/g</span>
              </span>
```

(c) Footer copy (lines ~358-365). Find:

```vue
        <p class="px-4 py-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          <span v-if="injuredCount" class="text-dark-text">
            {{ injuredCount }} injured — projections discounted (IL ×0.5, DTD ×0.9).
          </span>
          <span class="text-primary">chips</span> = a specialist edge (SB / SV / HLD / QS) ·
          right number = projected rest-of-season fantasy points (/g per game) ·
          tiers rank within hitters / pitchers
        </p>
```

Change to (football-native; baseball text preserved):

```vue
        <p class="px-4 py-3 font-mono text-[10px] leading-relaxed text-dark-textMuted">
          <span v-if="injuredCount" class="text-dark-text">
            {{ injuredCount }} injured — projections discounted (IL ×0.5, DTD ×0.9).
          </span>
          <template v-if="isFootball">
            right number = value over replacement (rest-of-season) · tiers rank your roster by VOR
          </template>
          <template v-else>
            <span class="text-primary">chips</span> = a specialist edge (SB / SV / HLD / QS) ·
            right number = projected rest-of-season fantasy points (/g per game) ·
            tiers rank within hitters / pitchers
          </template>
        </p>
```

- [ ] **Step 5: Build + type-check**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds.

Run: `npx vue-tsc --noEmit 2>&1 | grep PointsMyTeamView || echo "no PointsMyTeamView type errors"`
Expected: "no PointsMyTeamView type errors". (Repo has ~62 pre-existing errors in OTHER files — ignore. Use `vue-tsc --noEmit` — there is NO `tsconfig.app.json`.)

- [ ] **Step 6: Manual smoke (local only — do NOT deploy)**

`npm run dev`, Sleeper football league, My Team tab. Verify: roster rows show a `+N VOR` value; the roster is ordered by VOR (a high-VOR RB can sit above a replacement-level QB — no more all-QBs-on-top); the header reads "· value over replacement"; the footer no longer mentions HITTERS / chips / SB·SV·HLD·QS / hitters·pitchers; a single "Roster" group (no empty "PITCHERS"). Confirm a baseball league's My Team is unchanged (Hitters/Pitchers, points·/g, chips footer).

- [ ] **Step 7: Commit**

```bash
git add src/views/PointsMyTeamView.vue
git commit -m "feat: My Team on VOR + football-native copy (drop baseball leak)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (§6 My Team):** "the football value shown per player switches from raw projected points to vorRos" → Task 2 displays `rankVor`. "Lineup/roster ordering ... use VOR" → Task 1 orders + tiers rosterRows by `rankVor`. Baseball untouched → gated on optional `vorByKey`. The slot-rank/standings/outlook staying on points is a deliberate scope decision (documented above; ranks are identical under VOR and that section isn't leaking baseball copy). ✓

**2. Placeholder scan:** No TBD/TODO — every step shows complete before/after code. ✓

**3. Type consistency:** `vorByKey: Record<string, { vorRos: number }>` matches the Trades/Wire usage; `PlayerVor` is structurally assignable. `PointsRosterRow.rankVor?` (Task 1) is read in Task 2's template. `useFootballVor` inputs (`pool/freeAgents/slots/season/enabled/weeklyHorizon`) match its signature. ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-31-football-myteam-onto-vor.md`. This completes the VOR consumer trio (Wire ✅ · Trades ✅ · My Team).
