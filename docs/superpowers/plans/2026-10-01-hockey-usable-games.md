# Hockey Usable Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score every hockey skater by "usable games", meaning his team's games this week weighted
by whether a lineup spot for his position is open that night. Show it on both hockey Wire pages
(a panel plus a strip on every row), on a new Monday social card, and in the daily light-night post.

**Architecture:**
- One pure module, `src/hockey/usableGames.ts`, does all the math. A per-night schedule helper
  feeds it, and a small composable wires it into the two Wire views.
- The graphics card does not re-implement the math. A `vite-node` export script calls the same
  TS module and emits JSON, and Python only renders it.

**Tech Stack:** Vue 3, TypeScript, Vitest, Python 3 (ufd-graphics), headless Chrome.

**Spec:** `docs/superpowers/specs/2026-10-01-hockey-usable-games-design.md`

## Global Constraints

- The term is **"usable games"** everywhere. Never use "true games" or anything else from the
  competitor chart.
- The score is night usability only. **There is no opponent factor.** It was measured and
  rejected (-0.35 pts per manager-week).
- **Night fill rule:**
  - Players whose team plays that night fill their position slots, highest rate first.
  - Overflow goes to UTIL, then to the bench.
  - A player is open if any eligible position, or UTIL, has room.
- **Points** = rate × usable, where rate is the per-game projection.
- Category leagues show `usable` next to their existing value and do not use `points`.
- Goalies are out of scope. Skater positions only: C, LW, RW, D. UTIL accepts any skater.
- **Default slots** when a league's slots are unknown: C 2, LW 2, RW 2, D 4, UTIL 1.
- **Schedule failure, or no games in the week:** hide the panel and the strips. Never fabricate
  open nights.
- **Wire access:** follow the Wire's existing gating. No new paywall.
- **Monday card:** layout A (week strip). Show the best 6 and worst 4 teams by FORWARD usable
  games. Our style: dark background, hockey `#4FC3F7` dots, lime pill.
- **Footer note on the card:** "Defense stays usable on busy nights: X% vs Y%", from that
  week's numbers.
- **Git and deploy:**
  - Commit per task on the working branch.
  - Never push or deploy without the user's OK.
  - Never stage `src/data/landingBoard.json`, which the build rewrites.
- There is no Vue auto-import. Every import must resolve at runtime.

## Execution order

**1 → 2 → 7 → 8 → 3 → 4 → 5 → 6.** The spec ships the Monday card before the Wire. Task 7
depends only on Tasks 1 and 2, and Task 8 depends on nothing. Tasks 3 to 6 build the Wire.

## Review Focus

1. **Team-abbreviation mismatch** between roster players (ESPN, e.g. "LA", "NJ") and schedule
   teams (NHL, e.g. "LAK", "NJD"). If they don't match, every dot goes blank. Expect them to
   match via `nhlAbbrVariants`. Pinned in Task 2's variant test.
2. **Multi-position skaters** ("C,LW") and position strings with slashes. They should be
   eligible at each listed position. Pinned in Task 1.
3. **A week that starts mid-season on a Wednesday** (the user opens the Wire on Wednesday).
   Nights already played should count as not usable; only today through Sunday count. Pinned in
   Task 3's `remainingNights` test.
4. **A roster with fewer skaters than slots.** Everything is open on every night, and usable
   equals games. Pinned in Task 1.
5. **A player on IR or injured on the user's roster.** He must not occupy a slot when computing
   openness. Pinned in Task 1, where injured players are excluded from the fill.

---

### Task 1: The score module

**Files:**
- Create: `src/hockey/usableGames.ts`
- Test: `src/hockey/__tests__/usableGames.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SkaterPos = 'C' | 'LW' | 'RW' | 'D'
  export interface Night { date: string; teams: Set<string> }
  export interface UsableRosterPlayer { key: string; team: string; positions: SkaterPos[]; rate: number; out?: boolean }
  export interface SkaterSlots { C: number; LW: number; RW: number; D: number; UTIL: number }
  export const DEFAULT_SKATER_SLOTS: SkaterSlots
  export type OpenMap = Record<string, Record<SkaterPos, number>>   // date -> pos -> 0..1
  export function skaterPositions(raw: string | string[] | undefined): SkaterPos[]
  export function openNights(roster: UsableRosterPlayer[], slots: SkaterSlots, nights: Night[]): OpenMap
  export function openShare(rosters: UsableRosterPlayer[][], slots: SkaterSlots, nights: Night[]): OpenMap
  export function usableFor(player: { team: string; positions: SkaterPos[]; rate: number }, nights: Night[], open: OpenMap): { games: number; usable: number; points: number; byNight: { date: string; plays: boolean; open: number }[] }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { openNights, openShare, usableFor, skaterPositions, DEFAULT_SKATER_SLOTS, type UsableRosterPlayer, type Night } from '../usableGames'

const night = (date: string, ...teams: string[]): Night => ({ date, teams: new Set(teams) })
const p = (key: string, team: string, pos: string, rate = 2, out = false): UsableRosterPlayer =>
  ({ key, team, positions: skaterPositions(pos), rate, out })

// A full 13-skater roster: 3C 3LW 3RW 4D, every team different.
const roster = [
  p('c1','A','C',3), p('c2','B','C',2.5), p('c3','C','C',2),
  p('l1','D','LW',3), p('l2','E','LW',2.5), p('l3','F','LW',2),
  p('r1','G','RW',3), p('r2','H','RW',2.5), p('r3','I','RW',2),
  p('d1','J','D',2), p('d2','K','D',1.8), p('d3','L','D',1.6), p('d4','M','D',1.4),
]
const everyone = 'ABCDEFGHIJKLM'.split('')

describe('skaterPositions', () => {
  it('reads multi-position strings and drops non-skaters', () => {
    expect(skaterPositions('C,LW')).toEqual(['C', 'LW'])
    expect(skaterPositions('RW/C')).toEqual(['RW', 'C'])
    expect(skaterPositions('G')).toEqual([])
    expect(skaterPositions(['D'])).toEqual(['D'])
  })
})

describe('openNights', () => {
  it('a light night with one of my players is open everywhere', () => {
    const open = openNights(roster, DEFAULT_SKATER_SLOTS, [night('2026-10-06', 'A', 'X')])
    expect(open['2026-10-06']).toEqual({ C: 1, LW: 1, RW: 1, D: 1 })
  })
  it('a night when my whole roster plays has no open forward spot, but D stays open via nothing left', () => {
    const open = openNights(roster, DEFAULT_SKATER_SLOTS, [night('n', ...everyone)])
    // 3 C fill 2 C + UTIL; LW/RW overflow to bench; 4 D fill 4 D. Nothing open.
    expect(open['n']).toEqual({ C: 0, LW: 0, RW: 0, D: 0 })
  })
  it('D stays open when the forwards are full and a D is idle', () => {
    const open = openNights(roster, DEFAULT_SKATER_SLOTS, [night('n', ...'ABCDEFGHIJK'.split(''))]) // L, M idle
    expect(open['n'].C).toBe(0)
    expect(open['n'].D).toBe(1)
  })
  it('a multi-position player is open if any of his positions has room', () => {
    const full = openNights(roster, DEFAULT_SKATER_SLOTS, [night('n', 'A','B','C','D','E','F','J','K','L','M')]) // RW all idle
    const u = usableFor({ team: 'Z', positions: skaterPositions('C,RW'), rate: 2 }, [night('n','Z')], full)
    expect(u.usable).toBe(1)
  })
  it('an injured player does not take a slot', () => {
    const hurt = roster.map((x) => (x.key === 'd1' ? { ...x, out: true } : x))
    const open = openNights(hurt, DEFAULT_SKATER_SLOTS, [night('n', ...everyone)])
    expect(open['n'].D).toBe(1)
  })
  it('a short roster is open every night', () => {
    const open = openNights([p('c1','A','C')], DEFAULT_SKATER_SLOTS, [night('n','A')])
    expect(open['n']).toEqual({ C: 1, LW: 1, RW: 1, D: 1 })
  })
})

describe('openShare and usableFor', () => {
  it('averages managers', () => {
    const busy = roster
    const idle = roster.map((x) => ({ ...x, team: 'NONE' }))
    const share = openShare([busy, idle], DEFAULT_SKATER_SLOTS, [night('n', ...everyone)])
    expect(share['n'].C).toBeCloseTo(0.5)
  })
  it('points = rate x usable, and nights he does not play are 0', () => {
    const open = { a: { C: 1, LW: 1, RW: 1, D: 1 }, b: { C: 0.25, LW: 0.25, RW: 0.25, D: 1 } }
    const u = usableFor({ team: 'T', positions: ['C'], rate: 2 }, [night('a','T'), night('b','T'), night('c','X')], open as any)
    expect(u.games).toBe(2)
    expect(u.usable).toBeCloseTo(1.25)
    expect(u.points).toBeCloseTo(2.5)
    expect(u.byNight.map((n) => n.plays)).toEqual([true, true, false])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/hockey/__tests__/usableGames.test.ts`
Expected: FAIL, "Failed to resolve import ../usableGames".

- [ ] **Step 3: Implement**

```ts
// src/hockey/usableGames.ts
/**
 * USABLE GAMES: a game counts only as much as the chance you have a lineup spot for him that night.
 *
 * Measured on 2025-26 (1,312 games, a simulated 12-team league, one weekly streamer per manager):
 * picking by usable games banked +1.9 pts per manager-week at league level and +2.9 when
 * personalised, against raw game counts. Light nights are about 99% open and 11+ game nights
 * about 28%. On busy nights D slots stay open about 59% of the time to forwards' about 17%.
 * An opponent-defence factor was tested and made picks worse, so it is deliberately absent.
 */
export type SkaterPos = 'C' | 'LW' | 'RW' | 'D'
export interface Night { date: string; teams: Set<string> }
export interface UsableRosterPlayer { key: string; team: string; positions: SkaterPos[]; rate: number; out?: boolean }
export interface SkaterSlots { C: number; LW: number; RW: number; D: number; UTIL: number }
export type OpenMap = Record<string, Record<SkaterPos, number>>

export const DEFAULT_SKATER_SLOTS: SkaterSlots = { C: 2, LW: 2, RW: 2, D: 4, UTIL: 1 }
const POSITIONS: SkaterPos[] = ['C', 'LW', 'RW', 'D']

export function skaterPositions(raw: string | string[] | undefined): SkaterPos[] {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(/[,/|]/)
  const out: SkaterPos[] = []
  for (const r of parts) {
    const p = r.trim().toUpperCase()
    if ((POSITIONS as string[]).includes(p) && !out.includes(p as SkaterPos)) out.push(p as SkaterPos)
  }
  return out
}

/** One night: which positions still have a spot after this roster's players with a game are seated. */
function openOn(roster: UsableRosterPlayer[], slots: SkaterSlots, teams: Set<string>): Record<SkaterPos, number> {
  const free: Record<SkaterPos | 'UTIL', number> = { ...slots }
  const playing = roster
    .filter((p) => !p.out && p.positions.length && teams.has(p.team))
    .sort((a, b) => b.rate - a.rate)
  for (const p of playing) {
    const pos = p.positions.find((x) => free[x] > 0)
    if (pos) free[pos]--
    else if (free.UTIL > 0) free.UTIL--
  }
  const out = {} as Record<SkaterPos, number>
  for (const pos of POSITIONS) out[pos] = free[pos] > 0 || free.UTIL > 0 ? 1 : 0
  return out
}

export function openNights(roster: UsableRosterPlayer[], slots: SkaterSlots, nights: Night[]): OpenMap {
  const out: OpenMap = {}
  for (const n of nights) out[n.date] = openOn(roster, slots, n.teams)
  return out
}

export function openShare(rosters: UsableRosterPlayer[][], slots: SkaterSlots, nights: Night[]): OpenMap {
  const out: OpenMap = {}
  for (const n of nights) {
    const sum: Record<SkaterPos, number> = { C: 0, LW: 0, RW: 0, D: 0 }
    for (const r of rosters) {
      const o = openOn(r, slots, n.teams)
      for (const pos of POSITIONS) sum[pos] += o[pos]
    }
    const k = Math.max(1, rosters.length)
    out[n.date] = { C: sum.C / k, LW: sum.LW / k, RW: sum.RW / k, D: sum.D / k }
  }
  return out
}

export function usableFor(
  player: { team: string; positions: SkaterPos[]; rate: number },
  nights: Night[],
  open: OpenMap,
) {
  let games = 0
  let usable = 0
  const byNight = nights.map((n) => {
    const plays = n.teams.has(player.team)
    const o = plays ? Math.max(0, ...player.positions.map((p) => open[n.date]?.[p] ?? 0)) : 0
    if (plays) { games++; usable += o }
    return { date: n.date, plays, open: o }
  })
  return { games, usable, points: player.rate * usable, byNight }
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/hockey/__tests__/usableGames.test.ts`
Expected: PASS (all tests). If the "whole roster plays" test disagrees, trace the fill by hand.
3 C fill C×2 plus UTIL, LW and RW fill 2 each, and their third players have nowhere to go. 4 D
fill D×4. Nothing remains open, so the expected value is correct and the code is wrong.

- [ ] **Step 5: Commit**

```bash
git add src/hockey/usableGames.ts src/hockey/__tests__/usableGames.test.ts
git commit -m "hockey: usable games, a game counts only as much as the chance you have a spot for him"
```

---

### Task 2: Per-night NHL schedule

**Files:**
- Modify: `src/services/nhlSchedule.ts` (add an export next to `getNhlSchedule`)
- Test: `src/services/__tests__/nhlSchedule.test.ts` (append)

**Interfaces:**
- Consumes: `Night` (Task 1), `nhlAbbrVariants` (already in this file), and the cached payload
  fetch `getNhlSchedule` already uses. Read the file to find the internal payload-fetch function
  and reuse it, so this adds no new request.
- Produces:
  - `export function parseNhlNights(data: unknown, from: string, to: string): Night[]` (pure).
  - `export async function getNhlWeekNights(from: string, to: string): Promise<{ nights: Night[]; failed: boolean }>`
  - Each `Night.teams` holds EVERY spelling variant of each team that plays, so a roster's
    "LA" and the schedule's "LAK" both match.

- [ ] **Step 1: Write the failing tests** (append; reuse any payload fixture already in the
  file if one exists, otherwise use this one):

```ts
import { parseNhlNights } from '../nhlSchedule'

const payload = { gameWeek: [
  { date: '2026-10-06', games: [
    { gameType: 2, homeTeam: { abbrev: 'LAK' }, awayTeam: { abbrev: 'TOR' } },
    { gameType: 1, homeTeam: { abbrev: 'BOS' }, awayTeam: { abbrev: 'NYR' } },   // preseason: ignored
  ] },
  { date: '2026-10-07', games: [] },
  { date: '2026-10-08', games: [{ gameType: 2, homeTeam: { abbrev: 'NJD' }, awayTeam: { abbrev: 'SJS' } }] },
] }

describe('parseNhlNights', () => {
  it('one Night per date in range, regular-season teams only, all spellings keyed', () => {
    const nights = parseNhlNights(payload, '2026-10-06', '2026-10-08')
    expect(nights.map((n) => n.date)).toEqual(['2026-10-06', '2026-10-07', '2026-10-08'])
    expect(nights[0].teams.has('LAK')).toBe(true)
    expect(nights[0].teams.has('LA')).toBe(true)      // ESPN spelling matches too
    expect(nights[0].teams.has('BOS')).toBe(false)    // preseason dropped
    expect(nights[1].teams.size).toBe(0)
    expect(nights[2].teams.has('NJ')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails.** Run:
  `npx vitest run src/services/__tests__/nhlSchedule.test.ts -t parseNhlNights`. Expected: FAIL
  (not exported).

- [ ] **Step 3: Implement** (in `nhlSchedule.ts`; mirror the `gameType` filter `parseNhlSchedule`
  uses, which keeps 2 and 3):

```ts
import type { Night } from '@/hockey/usableGames'

export function parseNhlNights(data: unknown, from: string, to: string): Night[] {
  const weeks = ((data as any)?.gameWeek ?? []) as { date?: string; games?: any[] }[]
  const byDate = new Map<string, Set<string>>()
  for (const day of weeks) {
    const date = String(day?.date ?? '')
    if (!date || date < from || date > to) continue
    const teams = byDate.get(date) ?? new Set<string>()
    for (const g of day.games ?? []) {
      if (g?.gameType !== 2 && g?.gameType !== 3) continue
      for (const side of [g?.homeTeam?.abbrev, g?.awayTeam?.abbrev]) {
        if (side) for (const v of nhlAbbrVariants(String(side))) teams.add(v)
      }
    }
    byDate.set(date, teams)
  }
  return [...byDate.keys()].sort().map((date) => ({ date, teams: byDate.get(date)! }))
}

export async function getNhlWeekNights(from: string, to: string): Promise<{ nights: Night[]; failed: boolean }> {
  try {
    const data = await /* the same cached payload fetch getNhlSchedule uses */ fetchSchedulePayload(from)
    return { nights: parseNhlNights(data, from, to), failed: false }
  } catch {
    return { nights: [], failed: true }
  }
}
```

  Replace `fetchSchedulePayload` with the file's real internal fetch name. If the payload only
  starts at `from` and the range crosses into a second NHL "gameWeek" page, follow what
  `getNhlSchedule` does. Do not invent a second fetch path.

- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run src/services/__tests__/nhlSchedule.test.ts`.
  Expected: PASS, including the old tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/nhlSchedule.ts src/services/__tests__/nhlSchedule.test.ts
git commit -m "nhl schedule: one Night per date, keyed by every spelling of each team"
```

---

### Task 3: The week composable

**Files:**
- Create: `src/composables/useUsableWeek.ts`
- Create: `src/hockey/usableWeek.ts` (pure helpers)
- Test: `src/hockey/__tests__/usableWeek.test.ts`

**Interfaces:**
- Consumes: Task 1 and Task 2.
- Produces:
  - `export function weekBounds(today: Date): { from: string; to: string }`. Returns today and
    the coming Sunday, as YYYY-MM-DD in local time.
  - `export function remainingNights(nights: Night[], today: string): Night[]`. Returns nights
    on or after today.
  - `export function useUsableWeek(roster: Ref<UsableRosterPlayer[]>, slots: Ref<SkaterSlots>): { ready: Ref<boolean>; nights: Ref<Night[]>; open: ComputedRef<OpenMap>; scoreOf: (p: { team: string; positions: SkaterPos[]; rate: number }) => ReturnType<typeof usableFor> | null }`
  - `ready` is false when the schedule failed or the week has no games, and `scoreOf` then
    returns null.

- [ ] **Step 1: Write the failing tests** (for the pure helpers):

```ts
import { describe, it, expect } from 'vitest'
import { weekBounds, remainingNights } from '../usableWeek'

describe('weekBounds', () => {
  it('Wednesday runs to Sunday', () => {
    expect(weekBounds(new Date(2026, 9, 7))).toEqual({ from: '2026-10-07', to: '2026-10-11' })
  })
  it('Sunday is a one-day week', () => {
    expect(weekBounds(new Date(2026, 9, 11))).toEqual({ from: '2026-10-11', to: '2026-10-11' })
  })
})
describe('remainingNights', () => {
  it('drops nights before today', () => {
    const n = (d: string) => ({ date: d, teams: new Set<string>() })
    expect(remainingNights([n('2026-10-05'), n('2026-10-07')], '2026-10-07').map((x) => x.date)).toEqual(['2026-10-07'])
  })
})
```

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run src/hockey/__tests__/usableWeek.test.ts`.
  Expected: FAIL.

- [ ] **Step 3: Implement** `src/hockey/usableWeek.ts`:

```ts
import type { Night } from './usableGames'

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function weekBounds(today: Date): { from: string; to: string } {
  const end = new Date(today)
  end.setDate(today.getDate() + ((7 - today.getDay()) % 7))   // Sunday (getDay 0)
  return { from: ymd(today), to: ymd(end) }
}

export function remainingNights(nights: Night[], today: string): Night[] {
  return nights.filter((n) => n.date >= today)
}
```

and `src/composables/useUsableWeek.ts`:

```ts
import { computed, ref, watch, type Ref } from 'vue'
import { getNhlWeekNights } from '@/services/nhlSchedule'
import { openNights, usableFor, type Night, type SkaterSlots, type UsableRosterPlayer, type SkaterPos } from '@/hockey/usableGames'
import { weekBounds, remainingNights } from '@/hockey/usableWeek'

export function useUsableWeek(roster: Ref<UsableRosterPlayer[]>, slots: Ref<SkaterSlots>) {
  const nights = ref<Night[]>([])
  const ready = ref(false)
  const { from, to } = weekBounds(new Date())
  getNhlWeekNights(from, to).then(({ nights: n, failed }) => {
    nights.value = remainingNights(n, from)
    ready.value = !failed && nights.value.some((x) => x.teams.size > 0)
  })
  const open = computed(() => openNights(roster.value, slots.value, nights.value))
  const scoreOf = (p: { team: string; positions: SkaterPos[]; rate: number }) =>
    ready.value && p.positions.length ? usableFor(p, nights.value, open.value) : null
  return { ready, nights, open, scoreOf }
}
```

- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run src/hockey`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hockey/usableWeek.ts src/hockey/__tests__/usableWeek.test.ts src/composables/useUsableWeek.ts
git commit -m "hockey: the week of usable games from today to Sunday"
```

---

### Task 4: Shared UI pieces (strip and panel)

**Files:**
- Create: `src/components/hockey/UsableStrip.vue`
- Create: `src/components/hockey/UsableWeekPanel.vue`

**Interfaces:**
- Consumes: the `usableFor` result shape from Task 1, and `Night` and `OpenMap` from Task 1.
- Produces:
  - `<UsableStrip :by-night="u.byNight" :usable="u.usable" :games="u.games" />` renders 7 or
    fewer dots plus "2.0 of 3". The dot states are:
    - `plays && open >= 0.5`: solid `#4FC3F7`.
    - `plays && open > 0 && open < 0.5`: half opacity.
    - `plays && open === 0`: a dashed outline. Its title is "He plays, but your lineup is full
      that night".
    - Not playing: an empty dot.
  - `<UsableWeekPanel :nights="nights" :open="open" :picks="picks" />` renders seven night
    cells, each showing "F" when any of C/LW/RW is open and "D" when D is open, then the picks
    list.
  - `picks: { key: string; name: string; position: string; usable: number; value: number;
    valueLabel: string; dropName?: string; gain?: string }[]` (at most 5, built by the caller).
  - The panel title is "Your open spots this week". The empty state, when no night has an open
    spot, reads "Your lineup is full every night this week, so a pickup only helps as a swap."

- [ ] **Step 1: Implement both components.** Use the existing Wire card styling: copy the
  card/border/text utility classes `HockeyWireView.vue` uses, and use the font-mono labels the
  rest of the Wire uses.

```vue
<!-- src/components/hockey/UsableStrip.vue -->
<script setup lang="ts">
defineProps<{ byNight: { date: string; plays: boolean; open: number }[]; usable: number; games: number }>()
</script>
<template>
  <span class="inline-flex items-center gap-1.5" :title="`${usable.toFixed(1)} usable of ${games} games this week`">
    <span v-for="n in byNight" :key="n.date" class="inline-block h-2.5 w-2.5 rounded-full border"
      :class="!n.plays ? 'border-dark-border'
        : n.open >= 0.5 ? 'border-[#4FC3F7] bg-[#4FC3F7]'
        : n.open > 0 ? 'border-[#4FC3F7]/50 bg-[#4FC3F7]/40'
        : 'border-dashed border-dark-textMuted'"
      :title="n.plays && n.open === 0 ? 'He plays, but your lineup is full that night' : undefined" />
    <span class="ml-1 font-mono text-[10px] text-dark-textMuted">{{ usable.toFixed(1) }} of {{ games }}</span>
  </span>
</template>
```

```vue
<!-- src/components/hockey/UsableWeekPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Night, OpenMap } from '@/hockey/usableGames'
const props = defineProps<{
  nights: Night[]
  open: OpenMap
  picks: { key: string; name: string; position: string; usable: number; value: number; valueLabel: string; dropName?: string; gain?: string }[]
}>()
const day = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()
const cells = computed(() => props.nights.map((n) => {
  const o = props.open[n.date] ?? { C: 0, LW: 0, RW: 0, D: 0 }
  const f = o.C > 0 || o.LW > 0 || o.RW > 0
  return { date: n.date, label: day(n.date), f, d: o.D > 0 }
}))
const anyOpen = computed(() => cells.value.some((c) => c.f || c.d))
</script>
<template>
  <section class="mb-4 rounded-xl border border-dark-border bg-dark-card p-4">
    <p class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Your open spots this week</p>
    <div class="mb-3 grid grid-cols-7 gap-1">
      <div v-for="c in cells" :key="c.date" class="rounded-md py-1.5 text-center font-mono text-[10px]"
        :class="c.f || c.d ? 'bg-[#C6FF3A]/10 text-[#C6FF3A]' : 'bg-dark-bg text-dark-textMuted'">
        {{ c.label }}<br>{{ [c.f ? 'F' : '', c.d ? 'D' : ''].filter(Boolean).join('·') || '—' }}
      </div>
    </div>
    <p v-if="!anyOpen" class="text-sm text-dark-textMuted">Your lineup is full every night this week, so a pickup only helps as a swap.</p>
    <template v-else>
      <p class="mb-1 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Best pickups for those nights</p>
      <div v-for="p in picks" :key="p.key" class="flex items-center gap-2 border-b border-dark-border/50 py-1.5 text-sm">
        <span class="font-medium">{{ p.name }}</span>
        <span class="font-mono text-[10px] text-dark-textMuted">{{ p.position }}</span>
        <span v-if="p.dropName" class="font-mono text-[10px] text-dark-textMuted">· drop {{ p.dropName }}<template v-if="p.gain"> → {{ p.gain }}</template></span>
        <span class="ml-auto text-right font-mono text-sm text-[#4FC3F7]">{{ p.valueLabel }}<span class="block text-[10px] text-dark-textMuted">{{ p.usable.toFixed(1) }} usable</span></span>
      </div>
    </template>
  </section>
</template>
```

- [ ] **Step 2: Build.** Run: `npm run build`, then `git checkout src/data/landingBoard.json`.
  Expected: the build succeeds.
- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/hockey/UsableStrip.vue src/components/hockey/UsableWeekPanel.vue
  git commit -m "hockey: the usable-games strip and the open-nights panel"
  ```

---

### Task 5: Category-league Wire (`HockeyWireView` / `useHockeyWire`)

**Files:**
- Modify: `src/composables/useHockeyWire.ts`
- Modify: `src/views/HockeyWireView.vue`
- Test: `src/composables/__tests__/useHockeyWire.test.ts` (append, for the pure ranking helper)

**Interfaces:**
- Consumes:
  - `useUsableWeek` (Task 3).
  - The panel and strip (Task 4).
  - `skaterPositions` and `DEFAULT_SKATER_SLOTS` (Task 1).
  - The existing `useHockeyWire()`, which returns `vm.rows` (`HockeyWireRow`, with
    `player.{key,name,position,team}`) and `team.rosterPlayers` (`playerKey, position, team,
    onIL`).
- Produces:
  - A new pure export in `useHockeyWire.ts`:
    `export function topUsablePicks(rows: { key: string; name: string; position: string; usable: number | null; delta: number; dropName?: string }[], n = 5)`.
  - It keeps rows with `usable > 0` and sorts by `usable` descending, with `delta` (deltaEcw)
    as the tiebreak. It takes the first n.
  - Category leagues have no points, so the panel's `valueLabel` is `+{delta.toFixed(2)} ECW`.

- [ ] **Step 1: Write the failing test** (append):

```ts
import { topUsablePicks } from '../useHockeyWire'
describe('topUsablePicks', () => {
  it('ranks by usable games, ties by category gain, drops players with none', () => {
    const rows = [
      { key: 'a', name: 'A', position: 'C', usable: 1.0, delta: 0.9 },
      { key: 'b', name: 'B', position: 'D', usable: 3.5, delta: 0.2 },
      { key: 'c', name: 'C', position: 'LW', usable: 3.5, delta: 0.4 },
      { key: 'd', name: 'D', position: 'RW', usable: 0, delta: 2.0 },
      { key: 'e', name: 'E', position: 'C', usable: null, delta: 1.0 },
    ]
    expect(topUsablePicks(rows).map((r) => r.key)).toEqual(['c', 'b', 'a'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**, then **implement**:
  1. Add `topUsablePicks` as specified.
  2. In `useHockeyWire()`:
     - Build `myUsableRoster: ComputedRef<UsableRosterPlayer[]>` from `team.rosterPlayers`:
       `key = playerKey`, `team`, `positions = skaterPositions(position)`, `out = onIL`, and
       `rate` = that player's merged per-game value (`projections[key].stats` value ÷ `GP`, or
       1 when unknown). Rate only orders who sits first.
     - Use the league's slots if `useEspnCategoryTeamData` exposes lineup slot counts (map them
       with `startingSlotsFromEspn` from `src/hockey/hockeyPositions.ts`). Otherwise use
       `DEFAULT_SKATER_SLOTS`.
     - Call `useUsableWeek(myUsableRoster, slots)`.
     - Add to each row `usable: ReturnType<scoreOf> | null`, using
       `scoreOf({ team: row.player.team, positions: skaterPositions(row.player.position), rate: 1 })`.
     - Expose `week: { ready, nights, open }` and `picks` (from `topUsablePicks`) on the vm.
- [ ] **Step 3: Update the view:**
  - Above the list, render
    `<UsableWeekPanel v-if="vm.week.ready" :nights="vm.week.nights" :open="vm.week.open" :picks="vm.picks" />`.
  - In each row, after the `position · team` line, render
    `<UsableStrip v-if="row.usable" :by-night="row.usable.byNight" :usable="row.usable.usable" :games="row.usable.games" />`.
  - Add a small sort toggle, "Best overall" (the current order) or "This week (usable)", which
    sorts rows by `usable.usable` descending, then `deltaEcw`.
  - Import both components explicitly.
- [ ] **Step 4: Run** `npx vitest run src/composables/__tests__/useHockeyWire.test.ts src/hockey`, then
  `npm run build` and `git checkout src/data/landingBoard.json`. Expected: PASS, and the build
  succeeds.
- [ ] **Step 5: Commit.**
  ```bash
  git add src/composables/useHockeyWire.ts src/views/HockeyWireView.vue src/composables/__tests__/useHockeyWire.test.ts
  git commit -m "hockey category wire: usable games panel, strips and a this-week sort"
  ```

---

### Task 6: Points-league Wire (`PointsWireView`), including the schedule bug

**Files:**
- Modify: `src/views/PointsWireView.vue`
- Create: `src/hockey/pointsUsablePicks.ts`
- Test: `src/hockey/__tests__/pointsUsablePicks.test.ts`

**Interfaces:**
- Consumes:
  - Tasks 1, 3 and 4.
  - `useActivePointsSource()`: `pool`, `rosterSlots`, `myTeamKey`, `freeAgents`.
  - `usePointsValue(...).valueOf`, which returns a `PlayerValue` with `total` and `games`;
    per-game is `total / games`.
  - `parseEligible` from `src/myteam/pointsTeam.ts`.
- Produces:
  `export function pointsUsablePicks(fas: { key: string; name: string; position: string; perGame: number; usable: number | null }[], n = 5)`.
  It returns rows with `points = perGame × usable`, sorted by points descending, keeping only
  `usable > 0`, and takes the first n.

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest'
import { pointsUsablePicks } from '../pointsUsablePicks'
describe('pointsUsablePicks', () => {
  it('ranks by per-game rate times usable games', () => {
    const r = pointsUsablePicks([
      { key: 'a', name: 'A', position: 'C', perGame: 3, usable: 1 },     // 3
      { key: 'b', name: 'B', position: 'D', perGame: 2, usable: 3.5 },   // 7
      { key: 'c', name: 'C', position: 'LW', perGame: 5, usable: 0 },    // dropped
    ])
    expect(r.map((x) => [x.key, x.points])).toEqual([['b', 7], ['a', 3]])
  })
})
```

- [ ] **Step 2: Run to verify it fails, then implement** `pointsUsablePicks` (filter
  `usable > 0`, map to `points`, sort descending, slice to n).
- [ ] **Step 3: Fix the latent schedule bug.** `loadSchedule()` in `PointsWireView.vue` calls the
  MLB `getWeekSchedule` for every sport. When `isHockey`, call
  `getNhlSchedule(from, to)` from `src/services/nhlSchedule.ts` instead, with the same `from`
  and `to`. Without this, hockey points rows show MLB game counts.
- [ ] **Step 4: Wire in usable games, hockey only** (`v-if="isHockey"`):
  - Build `myUsableRoster` from `pool` filtered to `teamKey === myTeamKey`:
    `positions = skaterPositions(parseEligible(p, 'hockey'))`, `team = p.proTeam`,
    `out = p.onIL`, `rate = valueOf(p).total / games`.
  - Build slots from `rosterSlots`: `{C, LW, RW, D, UTIL}` from matching keys, falling back to
    `DEFAULT_SKATER_SLOTS` per missing key.
  - Call `useUsableWeek`.
  - Render `UsableWeekPanel` with picks from `pointsUsablePicks`. The `valueLabel` is
    `${points.toFixed(1)} pts this week`.
  - Render `UsableStrip` on each free-agent row in the "Best upgrades" list.
  - Add "This week (usable)" to the sort options for hockey.
  - Import everything explicitly.
- [ ] **Step 5: Run** `npx vitest run src/hockey`, then `npm run build` and
  `git checkout src/data/landingBoard.json`. Expected: PASS, and the build succeeds.
- [ ] **Step 6: Commit.**
  ```bash
  git add src/views/PointsWireView.vue src/hockey/pointsUsablePicks.ts src/hockey/__tests__/pointsUsablePicks.test.ts
  git commit -m "hockey points wire: usable games, and hockey stops reading the baseball schedule"
  ```

---

### Task 7: Monday card (`ufd-graphics/hockey-schedule.py`) from a TS export

**Files:**
- Create: `scripts/hockey-usable-week-export.ts` (app repo)
- Create: `~/Projects/ufd-graphics/hockey-schedule.py`

**Interfaces:**
- Consumes:
  - `openShare` and `usableFor` (Task 1) and `parseNhlNights` (Task 2).
  - The board rows from `scripts/hockey-board-export.ts`. Fields: `sid, name, pos, team,
    eligible, projected, games, owned, value`.
- Produces: export JSON on stdout:
  ```json
  {"from":"...","to":"...","nights":[{"date":"...","games":N}],
   "teams":[{"team":"NYR","games":4,"usableF":3.6,"usableD":3.9,"byNight":[{"date":"...","plays":true,"openF":0.95}]}],
   "busy":{"F":0.17,"D":0.59},"light":{"F":0.99,"D":1.0}}
  ```

- [ ] **Step 1: Write the export script.** Steps:
  1. Read `FROM`/`TO` from env, or default to the current Monday–Sunday.
  2. Fetch the schedule payload from `${BASE}/api/nhl-stats?schedule=${FROM}` and apply
     `parseNhlNights`.
  3. Load the board by importing or running the same code `scripts/hockey-board-export.ts`
     uses. Do not duplicate it: factor its board-building into an exported function if needed,
     keeping its CLI behaviour identical.
  4. Draft a reference league: 12 teams, snake draft by `value`, 13 skaters each, filling at
     least C3 LW3 RW3 D4. Use `rate = projected / games`, and `skaterPositions(eligible)`.
  5. Compute `openShare(rosters, DEFAULT_SKATER_SLOTS, nights)`.
  6. For each NHL team, compute `usableF` as `usableFor` for a C/LW/RW-eligible dummy (open =
     max of C, LW and RW), and `usableD` as the same for D.
  7. Compute busy and light averages over nights with ≥ 11 and ≤ 4 games.
  8. Print the JSON.

  Run: `cd ~/Projects/ultimate-fantasy-dashboard && npx vite-node scripts/hockey-usable-week-export.ts | head -c 400`.
  Expected: valid JSON, with 32 teams once the season is underway.
- [ ] **Step 2: Write `hockey-schedule.py`** (layout A):
  - Run the export via `subprocess` (cwd = app), the same way `hockey-streamers.py` runs the
    board export.
  - Rank teams by `usableF`. Take the top 6 and bottom 4.
  - Render with `ufd_card` helpers: `pill('Week N', 'Schedule')`, `chrome_css()`, `foot()`,
    `out_path('hockey', ...)`.
  - The headline is "Who you can actually play this week."
  - Each row has the team abbreviation, then a dot per night: filled `#4FC3F7` at an opacity
    equal to `openF`, an empty ring when there's no game. Then usable F to one decimal, plus
    "of N" in muted text.
  - A divider before the bottom 4.
  - The footer note is "Defense stays usable on busy nights: {busy.D:.0%} vs {busy.F:.0%}."
  - Screenshot at 1200 px wide, 2×, the same way `hockey-streamers.py` does.
  - Print the ranked list to stdout.
- [ ] **Step 3: Run** `python3 ~/Projects/ufd-graphics/hockey-schedule.py`. Open the PNG and check
  it by eye: 10 rows, dots line up under the day headers, and no clipped text.
- [ ] **Step 4: Commit both repos.**
  ```bash
  cd ~/Projects/ultimate-fantasy-dashboard && git add scripts/hockey-usable-week-export.ts scripts/hockey-board-export.ts && git commit -m "hockey: usable-week export for the Monday schedule card"
  cd ~/Projects/ufd-graphics && git add hockey-schedule.py && git commit -m "hockey: Monday schedule card, who you can actually play this week"
  ```

---

### Task 8: Daily light-night post wording

**Files:**
- Modify: `~/Projects/ufd-graphics/hockey-streamers.py` (stdout copy hint only)
- Modify: `~/Projects/ufd-graphics/hockey/streamer-posts.md` (template)

- [ ] **Step 1:** In `streamer-posts.md`'s template, add one line under the context line:
  "On a N-game night nearly every lineup has an open spot, so tonight's games are fully usable."
  Note that the post only runs at 4 games or fewer, so this is always true. Add the same
  sentence to the script's printed summary so it's ready to paste.
- [ ] **Step 2:** Run `python3 hockey-streamers.py` for a known light date (any ≤ 4-game night
  this season), and confirm the line prints with the right N.
- [ ] **Step 3: Commit.**
  ```bash
  cd ~/Projects/ufd-graphics && git add hockey-streamers.py hockey/streamer-posts.md && git commit -m "hockey streamers: say usable, the same word as the Wire and the Monday card"
  ```
