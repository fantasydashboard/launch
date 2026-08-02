# Football Weekly Start/Sit Tab ("This Week") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a football-first "This Week" tab — a weekly start/sit hub that shows your optimal weekly lineup vs your set Sleeper lineup (start/sit + bye must-sub moves) plus this week's streamers, or an explicit empty state in the offseason.

**Architecture:** A pure `buildWeeklyBoard` over the existing VOR engine's this-week points (`PlayerVor.pointsNextWeek`, byes zeroed) + `assignSlots` for the optimal lineup + the NFL schedule for opponents. A thin `useWeeklyBoard` composable orchestrates it; `WeeklyView.vue` renders the board or the offseason empty state. Football-gated; baseball's "Today" is untouched.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest. Reuses `useFootballVor`, `useActivePointsSource`, `assignSlots` (`@/trades/positionalLandscape`), `parseEligible` (`@/myteam/pointsTeam`), `sleeperService.getNflState`/`getNflSchedule`, `nflTeamLogo`.

**Spec:** `docs/superpowers/specs/2026-08-01-football-weekly-startsit-tab-design.md`

---

## File Structure

**Create:**
- `src/football/footballBye.ts` — ALREADY EXISTS; add `opponentMap` (schedule → per-team opponent + home/away). Schedule helpers live here alongside `playingTeams`.
- `src/football/weeklyBoard.ts` — pure `buildWeeklyBoard` + its types.
- `src/composables/useWeeklyBoard.ts` — orchestration composable.
- `src/views/WeeklyView.vue` — the tab view.
- `src/football/__tests__/weeklyBoard.test.ts`, and append to `src/football/__tests__/footballBye.test.ts`.

**Modify:**
- `src/router/index.ts` — add the `/this-week` route.
- `src/App.vue` — add the football-gated "This Week" tab in the `tabs` computed (line ~1213).

**Conventions:**
- FA key: `fa.playerKey ?? \`fa:${fa.name}\``.
- `assignSlots(players, slots, 0)` (bar 0) is the optimal-lineup solver; `DepthPlayer.value` holds the points, `status: 'IL'` excludes a player.
- Position normalization: `(pos || '').toUpperCase().split(/[,/|]/)[0].trim()`.
- Live week = `getNflState().season_type` is `regular` or `post`.

---

## Task 1: `opponentMap` schedule helper (`footballBye.ts`)

Build a per-team opponent + home/away map from the Sleeper NFL schedule payload. A team absent from the map is on bye.

**Files:**
- Modify: `src/football/footballBye.ts`
- Test: `src/football/__tests__/footballBye.test.ts` (append)

- [ ] **Step 1: Append the failing test to `src/football/__tests__/footballBye.test.ts`**

READ the file first (it imports `playingTeams`, `zeroByeWeek` from `../footballBye`). Add `opponentMap` to the existing `../footballBye` import, and append this `describe` block at the end:

```typescript
describe('opponentMap', () => {
  it('maps each team to its opponent + home/away, uppercased', () => {
    const games = [{ home: 'BUF', away: 'MIA' }, { home_team: 'KC', away_team: 'den' }]
    const m = opponentMap(games as any)
    expect(m.BUF).toEqual({ opp: 'MIA', home: true })
    expect(m.MIA).toEqual({ opp: 'BUF', home: false })
    expect(m.KC).toEqual({ opp: 'DEN', home: true })
    expect(m.DEN).toEqual({ opp: 'KC', home: false })
    expect(m.SF).toBeUndefined() // on bye
  })

  it('tolerates missing fields', () => {
    expect(Object.keys(opponentMap([{ metadata: {} }] as any))).toEqual([])
    expect(Object.keys(opponentMap(null as any))).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/football/__tests__/footballBye.test.ts`
Expected: the new tests FAIL (`opponentMap` not exported); existing tests still pass.

- [ ] **Step 3: Implement — append to `src/football/footballBye.ts`**

```typescript
/** Per-team opponent + home/away for a week's schedule (a team absent = bye). */
export function opponentMap(games: any[]): Record<string, { opp: string; home: boolean }> {
  const out: Record<string, { opp: string; home: boolean }> = {}
  for (const g of games ?? []) {
    const home = String(g?.home ?? g?.home_team ?? g?.metadata?.home_team ?? '').toUpperCase()
    const away = String(g?.away ?? g?.away_team ?? g?.metadata?.away_team ?? '').toUpperCase()
    if (home && away) {
      out[home] = { opp: away, home: true }
      out[away] = { opp: home, home: false }
    }
  }
  return out
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/football/__tests__/footballBye.test.ts`
Expected: ALL pass.

- [ ] **Step 5: Commit**

```bash
git add src/football/footballBye.ts src/football/__tests__/footballBye.test.ts
git commit -m "feat: opponentMap schedule helper for weekly board

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `buildWeeklyBoard` (pure — `weeklyBoard.ts`)

The core: optimal weekly lineup, the start/sit + bye moves vs the manager's set lineup, bench, and streamers.

**Files:**
- Create: `src/football/weeklyBoard.ts`
- Test: `src/football/__tests__/weeklyBoard.test.ts`

- [ ] **Step 1: Write the failing tests — create `src/football/__tests__/weeklyBoard.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { buildWeeklyBoard } from '../weeklyBoard'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { PlayerVor } from '../footballVor'
import type { AvailablePlayer } from '@/players/types'

// Minimal PlayerVor with only the fields the board reads.
function pv(pointsNextWeek: number, extra: Partial<PlayerVor> = {}): PlayerVor {
  return {
    playerKey: 'x', position: '', pointsRos: 0, vorRos: 0,
    pointsNextWeek, vorWeek: extra.vorWeek ?? 0,
    streamWeeks: extra.streamWeeks ?? 0, streamOf: extra.streamOf ?? 0,
    confidence: 'high', opportunity: extra.opportunity ?? '',
  }
}

// slots = 4 starting spots; the roster has 5 my-players, so the optimizer always
// benches one — that's what makes start/sit and bye moves observable.
const slots = { QB: 1, RB: 2, FLEX: 1 }
const pool: PointsPoolPlayer[] = [
  { playerKey: 'qb', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
  { playerKey: 'rb1', name: 'RB One', position: 'RB', teamKey: 'me', proTeam: 'KC' },
  { playerKey: 'rb2', name: 'RB Two', position: 'RB', teamKey: 'me', proTeam: 'SF' },
  { playerKey: 'rb3', name: 'RB Three', position: 'RB', teamKey: 'me', proTeam: 'DAL' },
  { playerKey: 'rb4', name: 'RB Four', position: 'RB', teamKey: 'me', proTeam: 'GB' },
  { playerKey: 'opp', name: 'Their Guy', position: 'RB', teamKey: 'other', proTeam: 'NYG' },
]
// Everyone plays this week.
const opp = {
  BUF: { opp: 'MIA', home: true }, KC: { opp: 'DEN', home: true }, SF: { opp: 'LAR', home: false },
  DAL: { opp: 'PHI', home: true }, GB: { opp: 'CHI', home: true }, NYG: { opp: 'WAS', home: false },
}

describe('buildWeeklyBoard', () => {
  it('clean week: current lineup == optimal → no moves, starters flagged inCurrent', () => {
    // Optimal (4 slots): qb, rb1, rb2 (top RBs), rb3 (FLEX). rb4 (80) benched.
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(80), opp: pv(999),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'], // == optimal
      freeAgents: [], opponentByTeam: opp,
    })
    expect(board.moves).toEqual([])
    expect(board.starters.every((s) => s.inCurrent)).toBe(true)
    const qb = board.starters.find((s) => s.playerKey === 'qb')!
    expect(qb.opponent).toBe('MIA')
    expect(qb.bye).toBe(false)
    expect(board.bench.map((b) => b.playerKey)).toEqual(['rb4']) // the benched one
  })

  it('bench player out-projects a current starter → a swap move with the gain', () => {
    // rb4 (220) is the best RB this week but the manager benches him for rb3 (120).
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(220), opp: pv(999),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'], // starts rb3, benches rb4
      freeAgents: [], opponentByTeam: opp,
    })
    const swap = board.moves.find((m) => m.startKey === 'rb4')
    expect(swap).toBeTruthy()
    expect(swap!.kind).toBe('swap')
    expect(swap!.sitKey).toBe('rb3')
    expect(swap!.gain).toBe(100) // 220 − 120
  })

  it('a current starter on bye → a bye must-sub move', () => {
    // rb1 (KC) is on bye this week (no KC game); the optimizer benches him for rb4.
    const byeOpp = {
      BUF: { opp: 'MIA', home: true }, SF: { opp: 'LAR', home: false },
      DAL: { opp: 'PHI', home: true }, GB: { opp: 'CHI', home: true },
    } // no KC → rb1 on bye
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(0), rb2: pv(150), rb3: pv(120), rb4: pv(100), opp: pv(999),
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: ['qb', 'rb1', 'rb2', 'rb3'], // still starts rb1 (on bye)
      freeAgents: [], opponentByTeam: byeOpp,
    })
    const byeMove = board.moves.find((m) => m.sitKey === 'rb1')
    expect(byeMove).toBeTruthy()
    expect(byeMove!.kind).toBe('bye')
    expect(byeMove!.startKey).toBe('rb4') // healthy replacement
  })

  it('streamers = free agents by weekly VOR, positive only, carrying week points', () => {
    const fas: AvailablePlayer[] = [
      { playerKey: 'fa_a', name: 'Streamer A', position: 'WR', team: 'CHI', percentOwned: 0, status: '', stats: {} },
      { playerKey: 'fa_b', name: 'Streamer B', position: 'WR', team: 'IND', percentOwned: 0, status: '', stats: {} },
      { playerKey: 'fa_c', name: 'Zero Guy', position: 'WR', team: 'NYJ', percentOwned: 0, status: '', stats: {} },
    ]
    const vorByKey: Record<string, PlayerVor> = {
      qb: pv(300), rb1: pv(200), rb2: pv(150), rb3: pv(120), rb4: pv(80), opp: pv(999),
      fa_a: pv(18, { vorWeek: 8, streamWeeks: 3, streamOf: 4 }),
      fa_b: pv(22, { vorWeek: 12 }),
      fa_c: pv(5, { vorWeek: 0 }), // not a positive-VOR stream
    }
    const board = buildWeeklyBoard({
      pool, vorByKey, slots, myTeamKey: 'me',
      currentStarters: [], freeAgents: fas, opponentByTeam: opp,
    })
    expect(board.streamers.map((s) => s.player.name)).toEqual(['Streamer B', 'Streamer A'])
    expect(board.streamers[0].weekPoints).toBe(22)
    expect(board.streamers[0].vorWeek).toBe(12)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/football/__tests__/weeklyBoard.test.ts`
Expected: FAIL — "Cannot find module '../weeklyBoard'".

- [ ] **Step 3: Implement `src/football/weeklyBoard.ts`**

```typescript
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { PlayerVor } from './footballVor'
import type { OpportunityTag } from './footballOpportunity'
import type { AvailablePlayer } from '@/players/types'

export interface WeeklyStarter {
  slot: string
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  weekPoints: number
  opponent: string // '' if bye/unknown
  home: boolean
  bye: boolean
  opportunity: OpportunityTag
  inCurrent: boolean // manager already has him starting
}

export interface WeeklyBenchRow {
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  weekPoints: number
  bye: boolean
  opportunity: OpportunityTag
}

export interface WeeklyMove {
  kind: 'swap' | 'bye'
  slot: string
  startKey: string
  startName: string
  sitKey: string
  sitName: string
  gain: number // weekly points gained by making the swap
}

export interface WeeklyStreamer {
  player: AvailablePlayer
  weekPoints: number
  vorWeek: number
  streamWeeks: number
  streamOf: number
  opportunity: OpportunityTag
}

export interface WeeklyBoard {
  starters: WeeklyStarter[]
  bench: WeeklyBenchRow[]
  moves: WeeklyMove[]
  streamers: WeeklyStreamer[]
}

const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DEF']
const slotIdx = (s: string) => { const i = SLOT_ORDER.indexOf(s.toUpperCase()); return i < 0 ? SLOT_ORDER.length : i }
const faKey = (fa: { playerKey?: string; name: string }): string => fa.playerKey ?? `fa:${fa.name}`

/**
 * The weekly start/sit board: the optimal lineup for THIS week (assignSlots over
 * this-week points, byes zeroed), the start/sit + bye moves vs the manager's set
 * lineup, the bench, and this week's streamers. Pure.
 */
export function buildWeeklyBoard(input: {
  pool: PointsPoolPlayer[]
  vorByKey: Record<string, PlayerVor>
  slots: Record<string, number>
  myTeamKey: string
  currentStarters: string[]
  freeAgents: AvailablePlayer[]
  opponentByTeam: Record<string, { opp: string; home: boolean }>
}): WeeklyBoard {
  const { pool, vorByKey, slots, myTeamKey, currentStarters, freeAgents, opponentByTeam } = input
  const week = (key: string): number => vorByKey[key]?.pointsNextWeek ?? 0
  const meta = new Map(pool.map((p) => [p.playerKey, p]))
  const teamOf = (key: string) => (meta.get(key)?.proTeam ?? '').toUpperCase()
  const byeOf = (key: string) => !opponentByTeam[teamOf(key)]
  const oppOf = (key: string) => opponentByTeam[teamOf(key)]?.opp ?? ''
  const homeOf = (key: string) => opponentByTeam[teamOf(key)]?.home ?? false
  const oppTag = (key: string): OpportunityTag => vorByKey[key]?.opportunity ?? ''

  // Optimal weekly lineup for my roster (value = this-week points; IL excluded).
  const myPlayers = pool.filter((p) => p.teamKey === myTeamKey)
  const myDepth: DepthPlayer[] = myPlayers.map((p) => ({
    playerKey: p.playerKey,
    teamKey: p.teamKey,
    eligiblePositions: parseEligible(p),
    value: week(p.playerKey),
    status: p.onIL ? 'IL' : '',
  }))
  const assigned = assignSlots(myDepth, slots, 0).assignedByPos
  const currentSet = new Set(currentStarters)

  const starters: WeeklyStarter[] = []
  const startedSet = new Set<string>()
  for (const [slot, keys] of Object.entries(assigned)) {
    for (const key of keys) {
      startedSet.add(key)
      const p = meta.get(key)
      starters.push({
        slot,
        playerKey: key,
        name: p?.name ?? '—',
        position: p?.position ?? '',
        team: p?.proTeam,
        headshot: p?.headshot,
        weekPoints: week(key),
        opponent: oppOf(key),
        home: homeOf(key),
        bye: byeOf(key),
        opportunity: oppTag(key),
        inCurrent: currentSet.has(key),
      })
    }
  }
  starters.sort((a, b) => slotIdx(a.slot) - slotIdx(b.slot) || b.weekPoints - a.weekPoints)

  const bench: WeeklyBenchRow[] = myPlayers
    .filter((p) => !startedSet.has(p.playerKey))
    .map((p) => ({
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      team: p.proTeam,
      headshot: p.headshot,
      weekPoints: week(p.playerKey),
      bye: byeOf(p.playerKey),
      opportunity: oppTag(p.playerKey),
    }))
    .sort((a, b) => b.weekPoints - a.weekPoints)

  // Moves = the delta between the manager's set lineup and the optimal one.
  // Start these (optimal, currently benched) vs sit these (current, not optimal),
  // paired best-start ↔ worst-sit so each move's gain is concrete.
  const startThese = starters.filter((s) => !s.inCurrent).sort((a, b) => b.weekPoints - a.weekPoints)
  const sitThese = currentStarters
    .filter((k) => !startedSet.has(k))
    .map((k) => ({ key: k, name: meta.get(k)?.name ?? '—', pts: week(k), bye: byeOf(k) }))
    .sort((a, b) => a.pts - b.pts)
  const moves: WeeklyMove[] = []
  const n = Math.min(startThese.length, sitThese.length)
  for (let i = 0; i < n; i++) {
    const s = startThese[i]
    const d = sitThese[i]
    moves.push({
      kind: d.bye ? 'bye' : 'swap',
      slot: s.slot,
      startKey: s.playerKey,
      startName: s.name,
      sitKey: d.key,
      sitName: d.name,
      gain: Math.round(s.weekPoints - d.pts),
    })
  }

  const streamers: WeeklyStreamer[] = freeAgents
    .map((fa) => ({ fa, v: vorByKey[faKey(fa)] }))
    .filter((x) => x.v && x.v.vorWeek > 0)
    .sort((a, b) => b.v!.vorWeek - a.v!.vorWeek)
    .slice(0, 8)
    .map(({ fa, v }) => ({
      player: fa,
      weekPoints: v!.pointsNextWeek,
      vorWeek: v!.vorWeek,
      streamWeeks: v!.streamWeeks,
      streamOf: v!.streamOf,
      opportunity: v!.opportunity,
    }))

  return { starters, bench, moves, streamers }
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/football/__tests__/weeklyBoard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/football/weeklyBoard.ts src/football/__tests__/weeklyBoard.test.ts
git commit -m "feat: buildWeeklyBoard — optimal weekly lineup + start/sit moves + streamers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `useWeeklyBoard` composable

Orchestrate the VOR engine + schedule + set lineup into the board, with the live-week gate. No unit test (matches the other composables); correctness is the pure function + smoke.

**Files:**
- Create: `src/composables/useWeeklyBoard.ts`

- [ ] **Step 1: Create `src/composables/useWeeklyBoard.ts`**

```typescript
import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballVor } from '@/composables/useFootballVor'
import { sleeperService } from '@/services/sleeper'
import { opponentMap } from '@/football/footballBye'
import { buildWeeklyBoard, type WeeklyBoard } from '@/football/weeklyBoard'
import type { SleeperRoster } from '@/types/sleeper'

/**
 * The football "This Week" board: optimal weekly lineup vs the manager's set
 * lineup + streamers. `live` gates on the NFL state's season_type (regular/post);
 * offseason yields live=false and a null board (the view shows an empty state).
 */
export function useWeeklyBoard(): {
  board: ComputedRef<WeeklyBoard | null>
  live: Ref<boolean>
  currentWeek: Ref<number>
  loading: ComputedRef<boolean>
} {
  const leagueStore = useLeagueStore()
  const isFootball = computed(() => leagueStore.activeSport === 'football')
  const src = useActivePointsSource()
  const season = computed(() => '')

  const { vorByKey, loading: vorLoading } = useFootballVor({
    pool: src.pool,
    freeAgents: src.freeAgents,
    slots: src.rosterSlots,
    season,
    enabled: isFootball,
  })

  const live = ref(false)
  const currentWeek = ref(0)
  const opponentByTeam = ref<Record<string, { opp: string; home: boolean }>>({})
  const scheduleLoading = ref(false)

  async function loadWeek() {
    if (!isFootball.value) { live.value = false; return }
    scheduleLoading.value = true
    try {
      const state = await sleeperService.getNflState()
      const st = String(state.season_type || '')
      live.value = st === 'regular' || st === 'post'
      currentWeek.value = Number(state.week) || 0
      opponentByTeam.value =
        live.value && currentWeek.value
          ? opponentMap(await sleeperService.getNflSchedule(state.season, currentWeek.value))
          : {}
    } catch (e) {
      console.error('[useWeeklyBoard] load failed', e)
      live.value = false
      opponentByTeam.value = {}
    } finally {
      scheduleLoading.value = false
    }
  }

  function init() {
    src.load()
    src.loadFreeAgents(200)
    loadWeek()
  }
  onMounted(init)
  watch(() => leagueStore.activeLeagueId, init)

  const currentStarters = computed<string[]>(() => {
    const mine = (leagueStore.rosters as any as SleeperRoster[])?.find(
      (r) => String(r.roster_id) === src.myTeamKey.value,
    )
    return (mine?.starters ?? []).filter(Boolean)
  })

  const board = computed<WeeklyBoard | null>(() => {
    if (!isFootball.value || !live.value || !src.myTeamKey.value || !Object.keys(vorByKey.value).length) return null
    return buildWeeklyBoard({
      pool: src.pool.value,
      vorByKey: vorByKey.value,
      slots: src.rosterSlots.value,
      myTeamKey: src.myTeamKey.value,
      currentStarters: currentStarters.value,
      freeAgents: src.freeAgents.value,
      opponentByTeam: opponentByTeam.value,
    })
  })

  const loading = computed(() => scheduleLoading.value || vorLoading.value || src.loading.value)

  return { board, live, currentWeek, loading }
}
```

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc --noEmit 2>&1 | grep useWeeklyBoard || echo "no useWeeklyBoard type errors"`
Expected: "no useWeeklyBoard type errors". (Repo has ~62 pre-existing errors in OTHER files — ignore. Use `vue-tsc --noEmit`; there is NO `tsconfig.app.json`.)

- [ ] **Step 3: Commit**

```bash
git add src/composables/useWeeklyBoard.ts
git commit -m "feat: useWeeklyBoard composable — weekly board orchestration + live gate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `WeeklyView.vue` + route + nav tab

Render the board (moves / optimal lineup / bench / streamers) or the offseason empty state, and wire the football-gated tab.

**Files:**
- Create: `src/views/WeeklyView.vue`
- Modify: `src/router/index.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: Create `src/views/WeeklyView.vue`**

```vue
<script setup lang="ts">
import { useLeagueStore } from '@/stores/league'
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { useWeeklyBoard } from '@/composables/useWeeklyBoard'

const leagueStore = useLeagueStore()
const { board, live, currentWeek, loading } = useWeeklyBoard()

const teamLogo = (abbr?: string) => nflTeamLogo(abbr)
const round = (n: number) => Math.round(n)
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">This Week</h1>
      <p class="font-mono text-xs text-dark-textMuted">Set your lineup. Stream the edge.</p>
    </header>

    <div v-if="loading && !board" class="py-16 text-center text-dark-textMuted">Loading this week…</div>

    <!-- Offseason / no live week -->
    <div v-else-if="!live" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">No games this week</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">Weekly start/sit returns when the season kicks off — check My Team for rest-of-season value.</p>
    </div>

    <div v-else-if="!board" class="py-16 text-center text-dark-textMuted">Couldn't assemble this week's board.</div>

    <template v-else>
      <!-- 1. START/SIT MOVES -->
      <section v-if="board.moves.length" class="mb-5 rounded-xl border border-primary/40 bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-primary">★ Start / sit moves</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">your set lineup vs the best lineup for week {{ currentWeek }}</p>
        <template v-for="(m, i) in board.moves" :key="'mv-' + i">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
            <span class="min-w-0 flex-1 text-sm text-dark-text">
              <span class="font-mono text-[10px] uppercase text-primary">start</span> <span class="font-semibold">{{ m.startName }}</span>
              <span class="block text-xs text-dark-textMuted">
                <span class="font-mono text-[10px] uppercase">{{ m.kind === 'bye' ? 'bye — sub' : 'sit' }}</span> {{ m.sitName }}
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="font-mono text-sm font-bold text-primary">+{{ m.gain }}</span>
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">wk pts</span>
            </span>
          </div>
        </template>
      </section>
      <p v-else class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
        ✓ Your lineup is already optimal for week {{ currentWeek }}.
      </p>

      <!-- 2. OPTIMAL LINEUP -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Best lineup <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· week {{ currentWeek }} projections</span>
        </h2>
        <template v-for="s in board.starters" :key="'st-' + s.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ s.slot }}</span>
            <img v-if="s.headshot" :src="s.headshot" :alt="s.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ s.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ s.name }}
                <span v-if="s.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400" title="Healthy backup — the starter ahead of him is injured">step-up</span>
              </span>
              <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                {{ s.position }}
                <template v-if="s.bye"> · <span class="text-[#FF5C5C]">BYE</span></template>
                <template v-else-if="s.opponent"> · {{ s.home ? 'vs' : '@' }} <img :src="teamLogo(s.opponent)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ s.opponent }}</template>
              </span>
            </span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(s.weekPoints) }}</span>
          </div>
        </template>
      </section>

      <!-- 3. BENCH -->
      <section v-if="board.bench.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Bench</h2>
        <template v-for="b in board.bench" :key="'bn-' + b.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-1.5 text-sm last:border-0">
            <span class="min-w-0 flex-1 truncate text-dark-textMuted">
              {{ b.name }} <span class="text-[11px]">{{ b.position }}</span>
              <span v-if="b.bye" class="ml-1 text-[10px] text-[#FF5C5C]">BYE</span>
            </span>
            <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(b.weekPoints) }}</span>
          </div>
        </template>
      </section>

      <!-- 4. STREAMERS -->
      <section v-if="board.streamers.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Streamers</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">best free agents for week {{ currentWeek }}</p>
        <template v-for="r in board.streamers" :key="'sm-' + (r.player.playerKey ?? r.player.name)">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ r.player.name }}
                <span v-if="r.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400">step-up</span>
              </span>
              <span class="text-xs text-dark-textMuted">{{ r.player.position }} · {{ r.player.team }}</span>
            </span>
            <span v-if="r.streamOf > 0" class="shrink-0 rounded bg-dark-border/50 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">startable {{ r.streamWeeks }}/{{ r.streamOf }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(r.weekPoints) }}</span>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Add the route in `src/router/index.ts`**

Find the `/today` route object (around line 131):

```typescript
    {
      path: '/today',
      name: 'today',
      component: () => import('@/views/TodayWrapper.vue')
    },
```

Add this route object immediately after it:

```typescript
    {
      path: '/this-week',
      name: 'this-week',
      component: () => import('@/views/WeeklyView.vue')
    },
```

- [ ] **Step 3: Add the nav tab in `src/App.vue`**

Find the `tabs` computed (around line 1213):

```typescript
const tabs = computed(() => [
  // "Today" is a daily-optimizer built for baseball's game-by-game slate; football is weekly, so hide it there.
  ...(leagueStore.activeSport === 'football' ? [] : [{ name: 'Today', path: '/today' }]),
  { name: 'My Team', path: '/my-team' },
```

Change the football branch to add the "This Week" tab (football gets This Week; other sports get Today):

```typescript
const tabs = computed(() => [
  // "Today" is a daily-optimizer built for baseball's game-by-game slate; football is weekly,
  // so football gets the weekly "This Week" start/sit tab in that slot instead.
  ...(leagueStore.activeSport === 'football'
    ? [{ name: 'This Week', path: '/this-week' }]
    : [{ name: 'Today', path: '/today' }]),
  { name: 'My Team', path: '/my-team' },
```

- [ ] **Step 4: Build + type-check**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds.

Run: `npx vue-tsc --noEmit 2>&1 | grep -E "WeeklyView|useWeeklyBoard" || echo "no WeeklyView/useWeeklyBoard type errors"`
Expected: "no WeeklyView/useWeeklyBoard type errors".

- [ ] **Step 5: Manual smoke (local only — do NOT deploy)**

`npm run dev`, open a Sleeper football league. The nav shows **This Week** as the first tab (not Today). Since it's currently the offseason (`season_type` = `pre`/`off`), the tab shows the **"No games this week"** empty state — that's correct. Confirm a baseball league still shows **Today** and its daily optimizer is unchanged. (Full board rendering can only be verified once a live NFL week exists.)

- [ ] **Step 6: Commit**

```bash
git add src/views/WeeklyView.vue src/router/index.ts src/App.vue
git commit -m "feat: This Week tab — weekly start/sit view + route + football nav

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §1 Placement & nav → Task 4 (route + football-gated tab). ✓
- §2 Live-week gate (`season_type`) → Task 3 (`loadWeek`), Task 4 (empty state). ✓
- §3 `buildWeeklyBoard` (starters/bench/moves/streamers, `inCurrent`, bye must-sub) → Task 2. ✓
- §4 composable + view → Tasks 3, 4. ✓
- §5 boundaries (football-only, reuse assignSlots/VOR, schedule the one addition) → Tasks 1–4; baseball Today untouched (Task 4 keeps the non-football branch). ✓
- Error handling (fetch fail → empty state; no current starters → no moves; unmatched → 0) → Task 3 try/catch, Task 2 `week()` default + `Math.min` zip. ✓
- Testing (clean/swap/bye/streamers) → Task 2 tests; `opponentMap` → Task 1. ✓

**2. Placeholder scan:** No TBD/TODO — every code step is complete. ✓

**3. Type consistency:** `WeeklyBoard`/`WeeklyStarter`/`WeeklyMove`/`WeeklyStreamer`/`WeeklyBenchRow` defined in Task 2, consumed in Tasks 3–4. `opponentMap` (Task 1) → `useWeeklyBoard` (Task 3) → `buildWeeklyBoard.opponentByTeam` (Task 2). `PlayerVor.pointsNextWeek`/`vorWeek`/`opportunity` (already shipped) read by Task 2. `useFootballVor`/`useActivePointsSource` surfaces match their definitions. `faKey` matches the Wire convention. ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-01-football-weekly-startsit-tab.md`. This completes the football redesign's core surfaces (Wire · Trades · My Team · This Week), all on the shared VOR engine.
