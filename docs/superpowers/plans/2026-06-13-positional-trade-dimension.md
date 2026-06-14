# Positional Trade Dimension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a positional trade dimension (win-win/reach/consolidate by roster position) alongside the existing category engine, surfaced by a `Categories | Position` toggle, computed from real league roster-slot requirements.

**Architecture:** A positional landscape (`buildPositionalLandscape`) mirrors the category landscape (`buildLandscape`): per team × position it computes startable depth via a greedy, scarcity-aware slot assignment, then surplus/need. A parallel generator (`usePositionalTargets`) runs the three intents on that landscape, with win-win tiered (fits-both / fits-one) and every deal category-guardrailed via the existing `evalDeal`. The Trades view gains a dimension toggle that swaps which generator's view renders.

**Tech Stack:** Vue 3 `<script setup>` / TypeScript / Pinia / Vitest. NO auto-import — every symbol must be explicitly imported.

**Spec:** `docs/superpowers/specs/2026-06-13-positional-trade-dimension-design.md`

**Constraint:** All work stays LOCAL on `redesign/my-team-first`. No `git push`, no deploy.

---

## File Structure

- `src/trades/rosterSlots.ts` (new) — `parseRosterSlots(platform, settings)` → `Record<position, count>`; baseball defaults fallback. Platform parsing (Yahoo `roster_positions`, ESPN lineup slot counts) isolated here.
- `src/trades/positionalLandscape.ts` (new) — `assignSlots` (greedy), `buildPositionalLandscape`, `PosStanding`, `PositionalLandscape`.
- `src/composables/usePositionalTargets.ts` (new) — the positional generator (reach, win-win tiered, consolidate), category-guardrailed. Returns a `PositionalView`.
- `src/views/TradesView.vue` (modify) — `dimension` toggle, settings→slots wiring, render positional view.
- `src/composables/useEspnCategoryTeamData.ts` (modify) — surface `rosterSlots` from `rosterSettings`.
- `src/composables/useMyRoster.ts` (modify) — surface Yahoo `roster_positions` for slots.
- Tests: `src/trades/__tests__/rosterSlots.test.ts`, `src/trades/__tests__/positionalLandscape.test.ts`, `src/composables/__tests__/usePositionalTargets.test.ts`.

**Reused (unchanged):** `evalDeal` (`src/trades/deals.ts`), `rankPartners` (`src/trades/partners.ts`), `computeRosterValue`/`crossPercentile` (`src/myteam/value.ts`), `mlbTeamLogo`, `ValueBadge.vue`, `Avatar.vue`.

**Position normalization note:** rosters carry positions like `'1B,3B'` or `'SP,RP'`. Throughout, "eligible positions" = `eligiblePositions: string[]` already on `PoolPlayer`/`RosterPlayer`. We assign against the *required starting slots* only (skip `BN`, `IL`, `NA`). Flex slots (`UTIL`, `P`, `IF`, `MI`, `CI`, `OF`) accept any eligible sub-position per the maps in Task 1.

---

### Task 1: Roster-slot parser (`rosterSlots.ts`)

Parse league settings into required starting-slot counts per position, with a baseball default when settings are missing/unparseable.

**Files:**
- Create: `src/trades/rosterSlots.ts`
- Test: `src/trades/__tests__/rosterSlots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/trades/__tests__/rosterSlots.test.ts
import { describe, it, expect } from 'vitest'
import { parseRosterSlots, FLEX_ELIGIBILITY, DEFAULT_SLOTS } from '../rosterSlots'

describe('parseRosterSlots', () => {
  it('parses Yahoo roster_positions, dropping bench/IL', () => {
    const settings = {
      roster_positions: [
        { roster_position: { position: 'C', count: 1 } },
        { roster_position: { position: '3B', count: 1 } },
        { roster_position: { position: 'OF', count: 3 } },
        { roster_position: { position: 'UTIL', count: 2 } },
        { roster_position: { position: 'SP', count: 2 } },
        { roster_position: { position: 'BN', count: 5 } },
        { roster_position: { position: 'IL', count: 3 } },
      ],
    }
    const slots = parseRosterSlots('yahoo', settings)
    expect(slots).toEqual({ C: 1, '3B': 1, OF: 3, UTIL: 2, SP: 2 })
  })

  it('parses ESPN lineupSlotCounts via slot id map, dropping bench/IL', () => {
    // ESPN slot ids: 0=C,1=1B,2=2B,3=3B,4=SS,5=OF,12=UTIL,13=P,16=BE(bench),17=IL
    const settings = { rosterSettings: { lineupSlotCounts: { '3': 1, '5': 3, '12': 2, '16': 5, '17': 3 } } }
    const slots = parseRosterSlots('espn', settings)
    expect(slots).toEqual({ '3B': 1, OF: 3, UTIL: 2 })
  })

  it('falls back to DEFAULT_SLOTS when settings are missing', () => {
    expect(parseRosterSlots('yahoo', null)).toEqual(DEFAULT_SLOTS)
    expect(parseRosterSlots('espn', {})).toEqual(DEFAULT_SLOTS)
  })

  it('exposes flex eligibility so UTIL accepts any hitter sub-position', () => {
    expect(FLEX_ELIGIBILITY.UTIL).toContain('3B')
    expect(FLEX_ELIGIBILITY.P).toEqual(expect.arrayContaining(['SP', 'RP']))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/trades/__tests__/rosterSlots.test.ts`
Expected: FAIL — `Cannot find module '../rosterSlots'`.

- [ ] **Step 3: Implement `rosterSlots.ts`**

```ts
// src/trades/rosterSlots.ts

/** Slots that don't require a started player — excluded from need/surplus math. */
const NON_STARTING = new Set(['BN', 'BE', 'IL', 'NA', 'IR', 'DL'])

/** ESPN lineup slot id -> position label. Bench(16)/IL(17) intentionally absent. */
const ESPN_SLOT_TO_POS: Record<string, string> = {
  '0': 'C', '1': '1B', '2': '2B', '3': '3B', '4': 'SS', '5': 'OF',
  '6': '2B/SS', '7': '1B/3B', '8': 'LF', '9': 'CF', '10': 'RF', '11': 'DH',
  '12': 'UTIL', '13': 'P', '14': 'SP', '15': 'RP',
}

/** A flex slot -> the concrete eligible sub-positions that may fill it. */
export const FLEX_ELIGIBILITY: Record<string, string[]> = {
  UTIL: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'],
  DH: ['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'],
  IF: ['1B', '2B', '3B', 'SS'],
  MI: ['2B', 'SS'],
  CI: ['1B', '3B'],
  OF: ['OF', 'LF', 'CF', 'RF'],
  P: ['SP', 'RP', 'P'],
  '2B/SS': ['2B', 'SS'],
  '1B/3B': ['1B', '3B'],
}

/** Standard 12-team mixed-league baseball roster when settings are unavailable. */
export const DEFAULT_SLOTS: Record<string, number> = {
  C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 2, SP: 5, RP: 3,
}

export function parseRosterSlots(
  platform: 'yahoo' | 'espn' | string,
  settings: any,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (platform === 'yahoo' && Array.isArray(settings?.roster_positions)) {
    for (const rp of settings.roster_positions) {
      const node = rp?.roster_position ?? rp
      const pos = String(node?.position ?? '').trim()
      const count = Number(node?.count ?? 0)
      if (!pos || NON_STARTING.has(pos) || count <= 0) continue
      out[pos] = (out[pos] ?? 0) + count
    }
  } else if (platform === 'espn' && settings?.rosterSettings?.lineupSlotCounts) {
    for (const [slotId, count] of Object.entries(settings.rosterSettings.lineupSlotCounts)) {
      const pos = ESPN_SLOT_TO_POS[slotId]
      const n = Number(count)
      if (!pos || NON_STARTING.has(pos) || n <= 0) continue
      out[pos] = (out[pos] ?? 0) + n
    }
  }
  return Object.keys(out).length ? out : { ...DEFAULT_SLOTS }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/trades/__tests__/rosterSlots.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/trades/rosterSlots.ts src/trades/__tests__/rosterSlots.test.ts
git -c gc.auto=0 commit -m "feat(trades): parse league roster-slot requirements (yahoo+espn, defaults)"
```

---

### Task 2: Greedy slot assignment + positional landscape (`positionalLandscape.ts`)

Assign startable players to required slots (scarcest slot first so flex players don't double-count), then derive per-team per-position `surplus`/`need`/`depthRank`.

**Files:**
- Create: `src/trades/positionalLandscape.ts`
- Test: `src/trades/__tests__/positionalLandscape.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/trades/__tests__/positionalLandscape.test.ts
import { describe, it, expect } from 'vitest'
import { assignSlots, buildPositionalLandscape, type DepthPlayer } from '../positionalLandscape'

const slots = { '3B': 1, SS: 1, OF: 2, UTIL: 1 }

// value high enough to be "startable" (>= STARTABLE_BAR=45 default).
const P = (key: string, elig: string[], value: number, status = ''): DepthPlayer =>
  ({ playerKey: key, teamKey: 't1', eligiblePositions: elig, value, status })

describe('assignSlots', () => {
  it('a flex player fills exactly one slot — no double count', () => {
    // Tatis 2B,OF; one OF slot + one UTIL slot. He fills one, not both.
    const players = [P('tatis', ['2B', 'OF'], 90)]
    const a = assignSlots(players, { OF: 1, UTIL: 1 }, 45)
    expect(a.filledSlots).toBe(1)
    expect(a.benchStartable).toHaveLength(0) // he's a starter, not surplus
    expect(a.unfilled).toContainEqual(expect.objectContaining({ position: expect.any(String) }))
  })

  it('extra startable body at a position becomes surplus (bench-bound)', () => {
    const players = [P('a', ['3B'], 80), P('b', ['3B'], 70)] // two 3B, one slot
    const a = assignSlots(players, { '3B': 1 }, 45)
    expect(a.filledSlots).toBe(1)
    expect(a.benchStartable.map((p) => p.playerKey)).toContain('b')
  })

  it('below-bar players are not startable and never fill a slot', () => {
    const players = [P('weak', ['SS'], 20)] // below STARTABLE_BAR
    const a = assignSlots(players, { SS: 1 }, 45)
    expect(a.filledSlots).toBe(0)
    expect(a.unfilled).toContainEqual(expect.objectContaining({ position: 'SS' }))
  })
})

describe('buildPositionalLandscape', () => {
  const mk = (teamKey: string, players: Array<[string, string[], number, string?]>): DepthPlayer[] =>
    players.map(([k, e, v, s]) => ({ playerKey: k, teamKey, eligiblePositions: e, value: v, status: s ?? '' }))

  it('marks a hole when a team cannot fill a required slot', () => {
    // t1 has no 3B; t2 has one. t1 should read need>0 at 3B, t2 should not.
    const pool = [
      ...mk('t1', [['ss1', ['SS'], 80]]),
      ...mk('t2', [['ss2', ['SS'], 80], ['tb2', ['3B'], 75]]),
    ]
    const ls = buildPositionalLandscape(pool, { SS: 1, '3B': 1 }, 45)
    expect(ls.get('t1')!.get('3B')!.need).toBeGreaterThan(0)
    expect(ls.get('t2')!.get('3B')!.need).toBe(0)
  })

  it('marks surplus + best depthRank for the deepest team at a position', () => {
    const pool = [
      ...mk('t1', [['a', ['3B'], 80], ['b', ['3B'], 70]]), // deep at 3B
      ...mk('t2', [['c', ['3B'], 75]]),                    // exactly one
    ]
    const ls = buildPositionalLandscape(pool, { '3B': 1 }, 45)
    expect(ls.get('t1')!.get('3B')!.surplus).toBeGreaterThan(0)
    expect(ls.get('t1')!.get('3B')!.depthRank).toBe(1)
    expect(ls.get('t2')!.get('3B')!.surplus).toBe(0)
  })

  it('an injured starter leaves the slot a hole even with a body present', () => {
    const pool = mk('t1', [['hurt', ['3B'], 80, 'IL']])
    const ls = buildPositionalLandscape(pool, { '3B': 1 }, 45)
    expect(ls.get('t1')!.get('3B')!.need).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/trades/__tests__/positionalLandscape.test.ts`
Expected: FAIL — `Cannot find module '../positionalLandscape'`.

- [ ] **Step 3: Implement `positionalLandscape.ts`**

```ts
// src/trades/positionalLandscape.ts
import { FLEX_ELIGIBILITY } from './rosterSlots'

/** A pool player reduced to what positional depth needs. value = cross-role 0..100. */
export interface DepthPlayer {
  playerKey: string
  teamKey: string
  eligiblePositions: string[]
  value: number
  status?: string // injury/IL ('' / 'ACTIVE' = available). Only my roster carries this.
}

export interface PosStanding {
  slots: number
  startableCount: number
  depthRank: number // cross-team rank of startableCount (1 = deepest). 0 if slot not required.
  surplus: number // 0..1 — giveable extra bodies beyond the slots
  need: number // 0..1 — unmet/injured slots
}
export type PositionalLandscape = Map<string, Map<string, PosStanding>>

/** A player below this cross-role value isn't a startable body — depth filler, not surplus. */
export const STARTABLE_BAR = 45
/** surplus saturates at this many giveable extras; need saturates at this many unmet slots. */
const SAT = 2

const isInjured = (s?: string): boolean => {
  const u = (s ?? '').toUpperCase()
  return u !== '' && u !== 'ACTIVE' && u !== 'HEALTHY'
}

/** Which concrete sub-positions a slot accepts (flex slots expand; concrete slots are themselves). */
function slotAccepts(slot: string): string[] {
  return FLEX_ELIGIBILITY[slot] ?? [slot]
}
function eligibleForSlot(player: DepthPlayer, slot: string): boolean {
  const accepted = slotAccepts(slot)
  return player.eligiblePositions.some((p) => accepted.includes(p) || p === slot)
}

export interface SlotAssignment {
  filledSlots: number
  unfilled: { position: string }[] // a required slot left empty (or vacated by injury)
  benchStartable: DepthPlayer[] // startable bodies that didn't land a starting slot
}

/**
 * Greedy, scarcity-aware assignment. Expand slot counts into individual openings, order them by
 * how few eligible startable bodies each has (scarcest first), and fill each from the
 * highest-value eligible, still-unassigned, healthy startable player. Injured players never fill a
 * slot (so their would-be slot reads as a hole). Leftover startable bodies are surplus.
 */
export function assignSlots(
  players: DepthPlayer[],
  slots: Record<string, number>,
  bar: number = STARTABLE_BAR,
): SlotAssignment {
  const startable = players.filter((p) => p.value >= bar)
  const healthy = startable.filter((p) => !isInjured(p.status))

  // Expand to individual openings.
  const openings: string[] = []
  for (const [pos, count] of Object.entries(slots)) for (let i = 0; i < count; i++) openings.push(pos)

  // Scarcity of an opening = how many healthy bodies are eligible for it (fewer = fill first).
  const eligCount = (pos: string) => healthy.filter((p) => eligibleForSlot(p, pos)).length
  openings.sort((a, b) => eligCount(a) - eligCount(b))

  const used = new Set<string>()
  const unfilled: { position: string }[] = []
  let filledSlots = 0
  for (const pos of openings) {
    const pick = healthy
      .filter((p) => !used.has(p.playerKey) && eligibleForSlot(p, pos))
      .sort((a, b) => b.value - a.value)[0]
    if (pick) { used.add(pick.playerKey); filledSlots++ }
    else unfilled.push({ position: pos })
  }
  const benchStartable = startable.filter((p) => !used.has(p.playerKey) && !isInjured(p.status))
  return { filledSlots, unfilled, benchStartable }
}

/**
 * Per team × required position: startable depth, surplus (giveable extras), need (unmet/injured
 * slots), and cross-team depthRank. Built per team via assignSlots, then ranked across teams.
 */
export function buildPositionalLandscape(
  pool: DepthPlayer[],
  slots: Record<string, number>,
  bar: number = STARTABLE_BAR,
): PositionalLandscape {
  const byTeam = new Map<string, DepthPlayer[]>()
  for (const p of pool) (byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push(p)

  const positions = Object.keys(slots)
  const out: PositionalLandscape = new Map()
  // startableCount per team per position, for depthRank.
  const countByPos = new Map<string, { teamKey: string; count: number }[]>()

  for (const [teamKey, players] of byTeam) {
    const a = assignSlots(players, slots, bar)
    const m = new Map<string, PosStanding>()
    for (const pos of positions) {
      const accepted = slotAccepts(pos)
      const eligibleStartable = players.filter(
        (p) => p.value >= bar && p.eligiblePositions.some((e) => accepted.includes(e) || e === pos),
      )
      const startableCount = eligibleStartable.length
      const unmet = a.unfilled.filter((u) => u.position === pos).length
      // bench-bound startable bodies eligible here = surplus supply at this position.
      const surplusBodies = a.benchStartable.filter(
        (p) => p.eligiblePositions.some((e) => accepted.includes(e) || e === pos),
      ).length
      const surplus = Math.min(1, surplusBodies / SAT)
      const need = Math.min(1, unmet / SAT)
      m.set(pos, { slots: slots[pos], startableCount, depthRank: 0, surplus, need })
      ;(countByPos.get(pos) ?? countByPos.set(pos, []).get(pos)!).push({ teamKey, count: startableCount })
    }
    out.set(teamKey, m)
  }

  // depthRank: 1 = deepest startableCount at the position (ties share the better rank).
  for (const [pos, rows] of countByPos) {
    const sorted = [...rows].sort((a, b) => b.count - a.count)
    let rank = 0, prev = Infinity
    sorted.forEach((r, i) => {
      if (r.count < prev) { rank = i + 1; prev = r.count }
      out.get(r.teamKey)!.get(pos)!.depthRank = rank
    })
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/trades/__tests__/positionalLandscape.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/trades/positionalLandscape.ts src/trades/__tests__/positionalLandscape.test.ts
git -c gc.auto=0 commit -m "feat(trades): positional landscape via greedy slot assignment (surplus/need/depthRank)"
```

---

### Task 3: Positional generator (`usePositionalTargets.ts`)

A composable that consumes the pool + positional landscape + cross-role value/strength and emits the three intents. Reach is the workhorse; win-win is tiered (fits-both / fits-one) via the category guardrail's secondary score; consolidate packages two depth bodies for one stud at a hole.

**Files:**
- Create: `src/composables/usePositionalTargets.ts`
- Test: `src/composables/__tests__/usePositionalTargets.test.ts`

This task is split into 3 sub-tasks (3a interfaces+reach, 3b win-win tiering, 3c consolidate) so each commit is self-contained.

#### Task 3a: interfaces + reach generator

- [ ] **Step 1: Write the failing test**

```ts
// src/composables/__tests__/usePositionalTargets.test.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { usePositionalTargets } from '../usePositionalTargets'
import type { DepthPlayer } from '@/trades/positionalLandscape'
import type { PoolPlayer } from '@/composables/useMyRoster'

// Two teams: ME deep at 3B (two startable), THEM with a 3B hole (none). Categories neutral.
function fixture() {
  const mk = (key: string, teamKey: string, pos: string, value: number): PoolPlayer & { value: number } => ({
    playerKey: key, name: key, position: pos, stats: {}, eligiblePositions: [pos],
    teamKey, headshot: undefined, proTeam: 'OAK', value,
  })
  const pool = [
    mk('myA', 'me', '3B', 80), mk('myB', 'me', '3B', 70), mk('mySS', 'me', 'SS', 75),
    mk('theirSS', 'them', 'SS', 78), mk('theirOF', 'them', 'OF', 72),
  ]
  const valueByKey = new Map(pool.map((p) => [p.playerKey, p.value]))
  const strengthByKey = new Map(pool.map((p) => [p.playerKey, {} as Record<string, number>]))
  return { pool, valueByKey, strengthByKey }
}

const base = (f: ReturnType<typeof fixture>) => ({
  pool: ref(f.pool),
  valueByKey: ref(f.valueByKey),
  strengthByKey: ref(f.strengthByKey),
  slots: ref({ '3B': 1, SS: 1, OF: 1 }),
  myStatuses: ref(new Map<string, string>()),
  catLandscape: ref(new Map()), // empty -> category-neutral, no guardrail rejections
  statIds: ref<string[]>([]),
  myTeamKey: ref('me'),
  teamNameByKey: ref(new Map([['them', 'Them']])),
  teamLogoByKey: ref(new Map<string, string>()),
  labelOf: (s: string) => s,
})

describe('usePositionalTargets — reach', () => {
  it('surfaces my 3B depth into their 3B hole', () => {
    const { view } = usePositionalTargets(base(fixture()))
    const reach = view.value!.reach
    expect(reach.length).toBeGreaterThan(0)
    const deal = reach[0]
    expect(deal.position).toBe('3B')
    expect(['myA', 'myB']).toContain(deal.give.playerKey)
    expect(deal.fromTeam).toBe('Them')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composables/__tests__/usePositionalTargets.test.ts`
Expected: FAIL — `Cannot find module '../usePositionalTargets'`.

- [ ] **Step 3: Implement interfaces + reach in `usePositionalTargets.ts`**

```ts
// src/composables/usePositionalTargets.ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { PoolPlayer } from '@/composables/useMyRoster'
import { buildPositionalLandscape, type DepthPlayer, type PositionalLandscape } from '@/trades/positionalLandscape'
import type { Landscape } from '@/trades/landscape'
import { evalDeal } from '@/trades/deals'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

export interface PosSide {
  playerKey: string
  name: string
  pos: string
  value: number
  headshot?: string
  proLogo?: string
}
export type PosTier = 'both' | 'one' // win-win only: fits-both vs fits-one(fallback)
export interface PositionalTarget {
  position: string // the slot this deal addresses
  get: PosSide
  give: PosSide
  fromTeam: string
  fromTeamLogo?: string
  tier?: PosTier // set on win-win
  secondaryHelps: string[] // categories the deal also helps you (the twofer tag)
}
export interface PositionalConsolidate {
  position: string
  get: PosSide
  give: PosSide[]
  fromTeam: string
  fromTeamLogo?: string
  secondaryHelps: string[]
}
export interface PositionalView {
  myDeep: string[] // positions you can trade from (surplus)
  myThin: string[] // positions you need (need)
  reach: PositionalTarget[]
  winWin: PositionalTarget[]
  consolidate: PositionalConsolidate[]
}

// A deal is "even enough" to be believable as 1-for-1 when values are within this band.
const VALUE_BAND = 24
// A reach must hand them a meaningfully more valuable body than they give back.
const REACH_MIN_OVERPAY = 6
// surplus/need must clear this to count as real depth / a real hole.
const EDGE = 0.5

export function usePositionalTargets(inputs: {
  pool: Ref<PoolPlayer[]>
  valueByKey: Ref<Map<string, number>>
  strengthByKey: Ref<Map<string, Record<string, number>>>
  slots: Ref<Record<string, number>>
  myStatuses: Ref<Map<string, string>> // playerKey -> injury status, my roster only
  catLandscape: Ref<Landscape> // for the category guardrail + secondary tagging
  statIds: Ref<string[]>
  myTeamKey: Ref<string | null>
  teamNameByKey: Ref<Map<string, string>>
  teamLogoByKey?: Ref<Map<string, string>>
  labelOf: (statId: string) => string
}): { view: ComputedRef<PositionalView | null> } {
  const view = computed<PositionalView | null>(() => {
    const pool = inputs.pool.value
    const slots = inputs.slots.value
    const myKey = inputs.myTeamKey.value
    if (!pool.length || !Object.keys(slots).length || !myKey) return null

    const valueByKey = inputs.valueByKey.value
    const teamName = (k: string) => inputs.teamNameByKey.value.get(k) ?? 'Team'
    const teamLogo = (k: string) => inputs.teamLogoByKey?.value.get(k)

    // Build depth players (inject my injury status so my holes are precise).
    const depth: DepthPlayer[] = pool.map((p) => ({
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: p.eligiblePositions ?? p.position.split(/[,/|]/).map((s) => s.trim()).filter(Boolean),
      value: valueByKey.get(p.playerKey) ?? 0,
      status: p.teamKey === myKey ? inputs.myStatuses.value.get(p.playerKey) ?? '' : '',
    }))
    const ls: PositionalLandscape = buildPositionalLandscape(depth, slots, undefined)
    const byKey = new Map(pool.map((p) => [p.playerKey, p]))
    const sideOf = (key: string): PosSide => {
      const p = byKey.get(key)!
      return { playerKey: key, name: p.name, pos: p.position, value: Math.round(valueByKey.get(key) ?? 0),
        headshot: p.headshot, proLogo: p.proTeam ? mlbTeamLogo(p.proTeam) : undefined }
    }

    const mine = ls.get(myKey)
    const positions = Object.keys(slots)
    const myDeep = positions.filter((pos) => (mine?.get(pos)?.surplus ?? 0) >= EDGE)
    const myThin = positions.filter((pos) => (mine?.get(pos)?.need ?? 0) >= EDGE)

    // My giveable bodies per position (bench-bound startable I'm eligible-deep in), worst first
    // (give the least valuable extra). A player is giveable at pos if I'm deep there.
    const eligibleAt = (key: string, pos: string) => {
      const e = byKey.get(key)!.eligiblePositions ?? []
      return e.includes(pos)
    }
    const myGiveablesAt = (pos: string): string[] =>
      depth.filter((p) => p.teamKey === myKey && p.value > 0 && eligibleAt(p.playerKey, pos))
        .sort((a, b) => a.value - b.value).map((p) => p.playerKey)

    // The category guardrail: a deal that loses a contested category is rejected.
    // Returns { ok, secondaryHelps } using existing evalDeal on category need vectors.
    const guardrail = (getKey: string, giveKey: string): { ok: boolean; secondaryHelps: string[] } => {
      const stat = inputs.statIds.value
      if (!stat.length) return { ok: true, secondaryHelps: [] }
      const cl = inputs.catLandscape.value.get(myKey)
      const myNeed: Record<string, number> = {}
      for (const c of stat) myNeed[c] = cl?.get(c)?.need ?? 0
      const sb = inputs.strengthByKey.value
      const getStr = sb.get(getKey) ?? {}
      const giveStr = sb.get(giveKey) ?? {}
      // category effect on YOU only (their side handled by positional logic).
      const ev = evalDeal(getStr, giveStr, myNeed, myNeed, stat)
      const secondaryHelps = stat
        .filter((c) => (myNeed[c] ?? 0) > 0 && (getStr[c] ?? 0) - (giveStr[c] ?? 0) > 0.01)
        .sort((a, b) => ((getStr[b] ?? 0) - (giveStr[b] ?? 0)) - ((getStr[a] ?? 0) - (giveStr[a] ?? 0)))
        .slice(0, 3).map((c) => inputs.labelOf(c))
      return { ok: ev.yourGain >= 0, secondaryHelps } // reject only a net category LOSS
    }

    // REACH: their hole at pos + my surplus at pos. Give them a more valuable body (overpay) for a
    // lesser one of theirs at a position they're flush in (or any low-value return). One-sided.
    const reach: PositionalTarget[] = []
    for (const [teamKey, m] of ls) {
      if (teamKey === myKey) continue
      for (const pos of positions) {
        if ((m.get(pos)?.need ?? 0) < EDGE) continue // they aren't thin here
        if ((mine?.get(pos)?.surplus ?? 0) < EDGE) continue // I'm not deep here
        const giveKey = myGiveablesAt(pos)[0]
        if (!giveKey) continue
        // their return: their least valuable startable body NOT at their hole position.
        const theirReturn = depth
          .filter((p) => p.teamKey === teamKey && !eligibleAt(p.playerKey, pos) && p.value > 0)
          .sort((a, b) => a.value - b.value)[0]
        if (!theirReturn) continue
        const giveVal = valueByKey.get(giveKey) ?? 0
        const getVal = valueByKey.get(theirReturn.playerKey) ?? 0
        if (giveVal - getVal < REACH_MIN_OVERPAY || giveVal - getVal > VALUE_BAND) continue
        const g = guardrail(theirReturn.playerKey, giveKey)
        if (!g.ok) continue
        reach.push({ position: pos, get: sideOf(theirReturn.playerKey), give: sideOf(giveKey),
          fromTeam: teamName(teamKey), fromTeamLogo: teamLogo(teamKey), secondaryHelps: g.secondaryHelps })
      }
    }

    return { myDeep, myThin, reach, winWin: [], consolidate: [] }
  })
  return { view }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/composables/__tests__/usePositionalTargets.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/composables/usePositionalTargets.ts src/composables/__tests__/usePositionalTargets.test.ts
git -c gc.auto=0 commit -m "feat(trades): positional reach generator (my depth -> their hole, category-guardrailed)"
```

#### Task 3b: win-win tiered (fits-both / fits-one)

- [ ] **Step 1: Add the failing test (append to the same test file)**

```ts
describe('usePositionalTargets — win-win tiering', () => {
  // ME deep 3B / thin SS; THEM deep SS / thin 3B -> mutual positional fit (win-win).
  function mirror() {
    const mk = (key: string, teamKey: string, pos: string, value: number) => ({
      playerKey: key, name: key, position: pos, stats: {}, eligiblePositions: [pos],
      teamKey, headshot: undefined, proTeam: 'OAK', value,
    })
    const pool = [
      mk('my3Ba', 'me', '3B', 80), mk('my3Bb', 'me', '3B', 70), // deep 3B
      // no SS for me -> SS hole
      mk('th3B', 'them', '3B', 60),                              // they have no spare 3B... give them mine
      mk('thSSa', 'them', 'SS', 78), mk('thSSb', 'them', 'SS', 68), // deep SS
    ]
    return pool
  }
  it('classifies a mutual positional swap as win-win and tags a tier', () => {
    const f = fixture()
    const inp = base(f)
    inp.pool = ref(mirror() as any)
    inp.valueByKey = ref(new Map(mirror().map((p) => [p.playerKey, (p as any).value])))
    inp.strengthByKey = ref(new Map(mirror().map((p) => [p.playerKey, {}])))
    inp.slots = ref({ '3B': 1, SS: 1 })
    const { view } = usePositionalTargets(inp)
    const ww = view.value!.winWin
    expect(ww.length).toBeGreaterThan(0)
    expect(['both', 'one']).toContain(ww[0].tier)
    expect(ww[0].position === 'SS' || ww[0].position === '3B').toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composables/__tests__/usePositionalTargets.test.ts`
Expected: FAIL — `winWin` is `[]`, `ww[0]` is undefined.

- [ ] **Step 3: Implement win-win. Replace the `return` line in `usePositionalTargets.ts` (the `winWin: []` one) with a win-win block then the return**

```ts
    // WIN-WIN: a position I need (my hole) where THEY have surplus, AND a position they need where I
    // have surplus — each fills the other's hole, values even. Tier by the secondary (category)
    // effect: 'both' if the swap also helps a category you need, else 'one'.
    const winWin: PositionalTarget[] = []
    for (const [teamKey, m] of ls) {
      if (teamKey === myKey) continue
      for (const myHole of myThin) {
        if ((m.get(myHole)?.surplus ?? 0) < EDGE) continue // they aren't deep at my hole
        for (const theirHole of positions) {
          if ((m.get(theirHole)?.need ?? 0) < EDGE) continue // not their hole
          if ((mine?.get(theirHole)?.surplus ?? 0) < EDGE) continue // I'm not deep there
          // I get their best body at my hole; I give my worst extra at their hole.
          const getKey = depth.filter((p) => p.teamKey === teamKey && eligibleAt(p.playerKey, myHole) && p.value > 0)
            .sort((a, b) => b.value - a.value)[0]?.playerKey
          const giveKey = myGiveablesAt(theirHole)[0]
          if (!getKey || !giveKey) continue
          const getVal = valueByKey.get(getKey) ?? 0
          const giveVal = valueByKey.get(giveKey) ?? 0
          if (Math.abs(getVal - giveVal) > VALUE_BAND) continue // must be even
          const g = guardrail(getKey, giveKey)
          if (!g.ok) continue
          winWin.push({ position: myHole, get: sideOf(getKey), give: sideOf(giveKey),
            fromTeam: teamName(teamKey), fromTeamLogo: teamLogo(teamKey),
            tier: g.secondaryHelps.length ? 'both' : 'one', secondaryHelps: g.secondaryHelps })
        }
      }
    }
    // Tier 1 (both) before Tier 2 (one); within a tier, closest value first.
    winWin.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'both' ? -1 : 1))

    return { myDeep, myThin, reach, winWin, consolidate: [] }
```

(Delete the old `return { myDeep, myThin, reach, winWin: [], consolidate: [] }`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/composables/__tests__/usePositionalTargets.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/composables/usePositionalTargets.ts src/composables/__tests__/usePositionalTargets.test.ts
git -c gc.auto=0 commit -m "feat(trades): tiered positional win-win (fits-both/fits-one)"
```

#### Task 3c: consolidate (2 depth -> 1 stud)

- [ ] **Step 1: Add the failing test (append)**

```ts
describe('usePositionalTargets — consolidate', () => {
  it('packages two of my depth bodies for one stud at my hole', () => {
    const mk = (key: string, teamKey: string, pos: string, value: number) => ({
      playerKey: key, name: key, position: pos, stats: {}, eligiblePositions: [pos],
      teamKey, headshot: undefined, proTeam: 'OAK', value,
    })
    const pool = [
      mk('d1', 'me', 'OF', 55), mk('d2', 'me', 'OF', 52), mk('d3', 'me', 'OF', 50), // deep OF
      // no SS -> SS hole
      mk('stud', 'them', 'SS', 88), mk('thOFa', 'them', 'OF', 60), mk('thOFb', 'them', 'OF', 58),
    ]
    const inp = base(fixture())
    inp.pool = ref(pool as any)
    inp.valueByKey = ref(new Map(pool.map((p) => [p.playerKey, p.value])))
    inp.strengthByKey = ref(new Map(pool.map((p) => [p.playerKey, {}])))
    inp.slots = ref({ OF: 2, SS: 1 })
    const { view } = usePositionalTargets(inp)
    const c = view.value!.consolidate
    expect(c.length).toBeGreaterThan(0)
    expect(c[0].position).toBe('SS')
    expect(c[0].give.length).toBe(2)
    expect(c[0].get.playerKey).toBe('stud')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/composables/__tests__/usePositionalTargets.test.ts`
Expected: FAIL — `consolidate` is `[]`.

- [ ] **Step 3: Implement consolidate. Insert before the final `return`, and update the return**

```ts
    // CONSOLIDATE: package two of my surplus-position bodies for one stud at a position I need.
    // Frees a roster spot (valuable in a daily league). Values: the two I give should roughly add
    // up to the stud (within VALUE_BAND) and the stud must clear them individually.
    const consolidate: PositionalConsolidate[] = []
    for (const [teamKey, m] of ls) {
      if (teamKey === myKey) continue
      for (const myHole of myThin) {
        const stud = depth.filter((p) => p.teamKey === teamKey && eligibleAt(p.playerKey, myHole) && p.value > 0)
          .sort((a, b) => b.value - a.value)[0]
        if (!stud) continue
        // two giveables from any position I'm deep in (worst two extras).
        const givePool = myDeep.flatMap((pos) => myGiveablesAt(pos)).filter((k, i, arr) => arr.indexOf(k) === i)
        const giveTwo = [...new Set(givePool)].map((k) => ({ k, v: valueByKey.get(k) ?? 0 }))
          .sort((a, b) => a.v - b.v).slice(0, 2)
        if (giveTwo.length < 2) continue
        const studVal = valueByKey.get(stud.playerKey) ?? 0
        const giveSum = giveTwo.reduce((s, x) => s + x.v, 0)
        if (giveSum < studVal - VALUE_BAND || studVal < Math.max(...giveTwo.map((x) => x.v))) continue
        const g = guardrail(stud.playerKey, giveTwo[0].k)
        if (!g.ok) continue
        consolidate.push({ position: myHole, get: sideOf(stud.playerKey),
          give: giveTwo.map((x) => sideOf(x.k)), fromTeam: teamName(teamKey),
          fromTeamLogo: teamLogo(teamKey), secondaryHelps: g.secondaryHelps })
      }
    }

    return { myDeep, myThin, reach, winWin, consolidate }
```

(Delete the old `return { myDeep, myThin, reach, winWin, consolidate: [] }`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/composables/__tests__/usePositionalTargets.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/composables/usePositionalTargets.ts src/composables/__tests__/usePositionalTargets.test.ts
git -c gc.auto=0 commit -m "feat(trades): positional consolidate (2 depth -> 1 stud at your hole)"
```

---

### Task 4: Surface roster slots from the data composables

Expose parsed slot requirements so the view can pass them to the generator. Yahoo settings carry `roster_positions` (already returned by `yahoo.ts:1650`); ESPN carries `rosterSettings` (`espn.ts:3230`).

**Files:**
- Modify: `src/composables/useMyRoster.ts` (add `rosterSlots` ref)
- Modify: `src/composables/useEspnCategoryTeamData.ts` (add `rosterSlots` ref)

- [ ] **Step 1: Add `rosterSlots` to `useMyRoster.ts`**

In `useMyRoster.ts`, import the parser and expose a ref. Near the other refs (after `const pool = ref<PoolPlayer[]>([])`):

```ts
import { parseRosterSlots } from '@/trades/rosterSlots'
// ...
const rosterSlots = ref<Record<string, number>>({})
```

Where league settings are fetched (the same place `getLeagueSettings`/scoring settings load — search the file for `settings`), set:

```ts
rosterSlots.value = parseRosterSlots('yahoo', settings)
```

Add `rosterSlots` to the returned object: `return { players, pool, fgByKey, statcastByKey, rosterSlots, loading, loaded, load }`.

- [ ] **Step 2: Add `rosterSlots` to `useEspnCategoryTeamData.ts`**

```ts
import { parseRosterSlots } from '@/trades/rosterSlots'
// ...
const rosterSlots = ref<Record<string, number>>({})
```

Where the ESPN settings/team payload resolves (search for `rosterSettings`), set:

```ts
rosterSlots.value = parseRosterSlots('espn', { rosterSettings: settings.rosterSettings })
```

Add `rosterSlots` to the composable's return.

- [ ] **Step 3: Type-check**

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "useMyRoster|useEspnCategoryTeamData|rosterSlots"`
Expected: no output (the new refs type-check; pre-existing unrelated errors elsewhere are ignored).

- [ ] **Step 4: Build to confirm nothing broke**

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …`.

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/composables/useMyRoster.ts src/composables/useEspnCategoryTeamData.ts
git -c gc.auto=0 commit -m "feat(trades): surface parsed roster-slot requirements from yahoo+espn composables"
```

---

### Task 5: Wire the dimension toggle into TradesView

Add a `Categories | Position` toggle. When `position`, render the positional view (reach/win-win/consolidate) with positional headlines; when `categories`, the existing behavior is unchanged.

**Files:**
- Modify: `src/views/TradesView.vue`

- [ ] **Step 1: Instantiate the positional generator**

After the existing `const { view } = useTradeTargets({...})` (line ~156), add the slots source and the positional generator. `rosterSlots` comes from the composables in Task 4:

```ts
import { usePositionalTargets } from '@/composables/usePositionalTargets'
// ... in setup, after `view`:
const rosterSlots = computed(() => (isEspn.value ? espn.rosterSlots.value : yRosterSlots.value))
// (add yRosterSlots to the useMyRoster destructure: `rosterSlots: yRosterSlots`)

// my roster injury statuses (playerKey -> status), my team only.
const myStatuses = computed(() => {
  const m = new Map<string, string>()
  for (const p of pool.value) {
    if (p.teamKey === myTeamKey.value) m.set(p.playerKey, (p as { status?: string }).status ?? '')
  }
  return m
})
// reuse the category landscape the engine already builds (for the guardrail + secondary tags).
const catLandscape = computed(() => engine.value?.landscape ?? new Map())
const valueByKey = computed(() => engine.value?.valueByKey ?? new Map())
const strengthByKey = computed(() => engine.value?.strengthByKey ?? new Map())
const statIdsRef = computed(() => catSpecs.value.map((c) => c.statId))

const { view: posView } = usePositionalTargets({
  pool, valueByKey, strengthByKey, slots: rosterSlots, myStatuses,
  catLandscape, statIds: statIdsRef, myTeamKey, teamNameByKey, teamLogoByKey, labelOf,
})
```

Note: `engine` (from `buildEngine`) is currently gated on `analyzerOpen`. Change its computed to also build when `dimension === 'position'` so `catLandscape`/`valueByKey`/`strengthByKey` are populated (see Step 3).

- [ ] **Step 2: Add the dimension toggle state**

```ts
type Dimension = 'categories' | 'position'
const dimension = ref<Dimension>('categories')
```

- [ ] **Step 3: Un-gate the engine for position mode**

Find the `engine` computed (line ~164, `analyzerOpen.value ? buildEngine(...) : null`) and change the gate:

```ts
const engine = computed(() =>
  (analyzerOpen.value || dimension.value === 'position')
    ? buildEngine({ pool: pool.value, fgByKey: fgByKey.value, statcastByKey: statcastByKey.value, cats: catSpecs.value, teamCatWins: teamCatWins.value, seasonFraction: SEASON_FRACTION, labelOf })
    : null,
)
```

- [ ] **Step 4: Add the toggle UI + positional lists in the template**

Above the existing mode tabs (the `<div>` rendering `MODES`), add:

```html
<div class="mb-3 flex items-center gap-2">
  <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">By</span>
  <button
    v-for="d in (['categories','position'] as const)" :key="d"
    class="rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wide"
    :class="dimension === d ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-textSecondary'"
    @click="dimension = d"
  >{{ d === 'categories' ? 'Categories' : 'Position' }}</button>
</div>
```

Then wrap the existing category sections in `<template v-if="dimension === 'categories'">` and add a positional block:

```html
<template v-else>
  <p v-if="posView && (posView.myDeep.length || posView.myThin.length)" class="mb-2 font-mono text-[11px] text-dark-textMuted">
    <span v-if="posView.myDeep.length">Deep at <b class="text-primary">{{ posView.myDeep.join(', ') }}</b></span>
    <span v-if="posView.myThin.length"> · Thin at <b class="text-[#F2B33A]">{{ posView.myThin.join(', ') }}</b></span>
  </p>
  <!-- reuse the same mode tabs; positional lists by mode -->
  <section class="space-y-3">
    <template v-for="t in (mode === 'reach' ? posView?.reach : posView?.winWin) ?? []" :key="t.get.playerKey + t.give.playerKey">
      <div class="rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">
            {{ mode === 'reach' ? 'Press' : 'Fills' }} <b class="text-[#ffd98a]">{{ t.position }}</b>
            <span v-if="t.tier" class="ml-2 text-dark-textMuted">· {{ t.tier === 'both' ? 'fits both' : 'fits one' }}</span>
          </span>
          <span class="font-mono text-[11px] text-dark-textMuted">from {{ t.fromTeam }}</span>
        </div>
        <div class="flex items-center gap-2 text-sm"><span class="text-primary">GET</span> {{ t.get.name }} <ValueBadge :value="t.get.value" /></div>
        <div class="flex items-center gap-2 text-sm"><span class="text-dark-textMuted">GIVE</span> {{ t.give.name }} <ValueBadge :value="t.give.value" /></div>
        <p v-if="t.secondaryHelps.length" class="mt-1 font-mono text-[10px] text-dark-textMuted">also helps {{ t.secondaryHelps.join(' · ') }}</p>
      </div>
    </template>
    <template v-if="mode === 'consolidate'" v-for="t in posView?.consolidate ?? []" :key="'c'+t.get.playerKey">
      <div class="rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">Fills <b class="text-[#ffd98a]">{{ t.position }}</b> · from {{ t.fromTeam }}</div>
        <div class="flex items-center gap-2 text-sm"><span class="text-primary">GET</span> {{ t.get.name }} <ValueBadge :value="t.get.value" /></div>
        <div v-for="g in t.give" :key="g.playerKey" class="flex items-center gap-2 text-sm"><span class="text-dark-textMuted">GIVE</span> {{ g.name }} <ValueBadge :value="g.value" /></div>
      </div>
    </template>
    <p v-if="mode === 'timing'" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted">Buy-low / sell-high is a category signal — switch to Categories.</p>
  </section>
</template>
```

(`ValueBadge` is already imported in TradesView. If not, add `import ValueBadge from '@/components/trades/ValueBadge.vue'`.)

- [ ] **Step 5: Type-check + build**

Run: `npx vue-tsc --noEmit 2>&1 | grep TradesView`
Expected: no output.
Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …`.

- [ ] **Step 6: Commit**

```bash
git -c gc.auto=0 add src/views/TradesView.vue src/composables/useMyRoster.ts
git -c gc.auto=0 commit -m "feat(trades): Categories | Position dimension toggle with positional deal lists"
```

---

### Task 6: Full verification + final review

- [ ] **Step 1: Run the whole suite**

Run: `npx vitest run 2>&1 | tail -6`
Expected: all tests pass (≈206 = prior 192 + 4 rosterSlots + 6 positionalLandscape + 3 usePositionalTargets + existing 1 fgMappedStats already counted).

- [ ] **Step 2: Build**

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in …`.

- [ ] **Step 3: Manual smoke (user-driven)**

Reload Trades on a real Yahoo and a real ESPN league. Toggle `Position`. Confirm: "Deep at / Thin at" reads sensibly; reach surfaces your real depth into a thin team; win-win shows "fits both/one"; consolidate packages two depth bodies for a stud; no deal gives away your only body at a position. Report anything that misreads (especially `STARTABLE_BAR` feeling too high/low).

- [ ] **Step 4: Commit any tuning** (only if Step 3 surfaces constant changes)

```bash
git -c gc.auto=0 add -A
git -c gc.auto=0 commit -m "fix(trades): tune positional STARTABLE_BAR/bands from real-roster review"
```

---

## Self-Review

**Spec coverage:**
- Precise slots (decision 1) → Task 1. ✓
- Toggle surface (decision 2) → Task 5. ✓
- Category guardrail (decision 3) → `guardrail()` in Task 3a, applied in 3a/3b/3c. ✓
- Counterparty-relative value / value-as-fairness-rail (decision 4) → headline is positional ("Press/Fills <pos>"), `ValueBadge` secondary, in Task 5. ✓
- Parallel generator, no refactor of `useTradeTargets` (decision 5) → new `usePositionalTargets`, Task 3. ✓
- Positional landscape mirror, greedy assignment, multi-eligibility, injury-sharpened holes, depthRank → Task 2. ✓
- Win-win tiering (fits-both/fits-one), reject-harmful → Task 3b + `guardrail` returning `ok` on net-loss only. ✓
- Reach workhorse, consolidate frees a spot → Task 3a / 3c. ✓
- Injury asymmetry (my roster only) → `myStatuses` (my team only) in Task 5; opponents inferred via depth. ✓
- Tests for assignment/surplus/need/injury/parser/generation/tiering → Tasks 1–3. ✓

**Out-of-scope items NOT built (correct):** dimension-pluggable unification of `useTradeTargets`; positional guardrail on the category modes; league-wide opponent injury; blended single list.

**Type consistency:** `DepthPlayer` (Task 2) reused by Task 3; `PositionalLandscape`/`PosStanding` consistent; `PositionalView`/`PositionalTarget`/`PosSide` defined in 3a and consumed unchanged in 5; `parseRosterSlots(platform, settings)` signature consistent across Tasks 1/4. `rosterSlots` ref name consistent across Tasks 4/5.

**Known wiring risk (flagged, not a gap):** Task 4 sets `rosterSlots` "where settings load" — the exact line differs per composable; the implementer must locate the existing settings fetch (anchors given: `yahoo.ts:1650`, `espn.ts:3230`). If ESPN does not surface `rosterSettings` on the composable yet, Task 4 Step 2 includes adding it.
