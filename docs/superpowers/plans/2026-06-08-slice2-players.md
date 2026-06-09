# Slice 2: Players (Top Adds For Your Holes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a My-Team-first "Players" surface for Yahoo baseball category leagues that leads with "top available players for YOUR weakest categories," reusing the existing data services and the Slice 1 profile engine, with a new pure league-contextualized ranking module.

**Architecture:** A new pure-logic module `src/players/` ranks available free agents by how well they fill the logged-in team's category holes (direction-aware percentile within the free-agent pool, weighted by the team's weak categories from the Slice 1 `MyTeamCategoryProfile`). A composable fetches the FA pool via the existing `yahooService.getTopFreeAgents` and reuses Slice 1's `useFullSeasonCategoryData` + `profileFromStandings` to get the team's holes. A new `PlayersView` (+ wrapper + route + nav slot) renders "Top adds for your holes." Local only.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest + @vue/test-utils (already set up in Slice 1). `@/` aliases `src/`.

**Reuse (verified in discovery, do not rebuild):**
- `yahooService.getTopFreeAgents(leagueKey, count=100)` → returns players each shaped `{ player_key, player_id, full_name, position, mlb_team, headshot, percent_owned, percent_change, status, injury_note, stats: Record<statId, number>, total_points }`. Stats are season-to-date totals keyed by Yahoo stat_id, already enriched. (`src/services/yahoo.ts:1438`)
- Slice 1: `profileFromStandings(allStandings, categories, myTeamId)` → `MyTeamCategoryProfile` (per-category `{ statId, rank, wins, losses }`, `numTeams`); `computeCategoryWeaknesses(profile, cats)`; `useFullSeasonCategoryData()` (full-season matchups + `categoryLabels` map + load guard); `MyTeamView.vue`'s proven derivation of `standings`/`categories`/`myTeamId` from the league store.
- `useIsCategoryLeague` (`isYahooCategoryLeague`), the `*Wrapper.vue` pattern, the `tabs` array in `src/App.vue`.

**Non-goals (Slice 2):** No trade analyzer (Slice 3 reuses the existing one). No start/sit. No roster-position-slot math (holes = weak *categories*, not empty roster slots). **No player-compare tool and no full sortable all-players board yet** (the MVP is "top adds for your holes"; compare/board are a follow-on). No editorial prose. No deploy. Do not modify the existing `CategoryProjectionsView.vue` (it stays in Tools).

---

## File Structure

**New (pure logic, fully tested):**
- `src/players/types.ts` — `AvailablePlayer`, `PlayerCategoryValue`, `Add`, `HoleAdds`
- `src/players/direction.ts` — `LOWER_IS_BETTER` set + `isLowerBetter(canonicalId|name)` for MLB ratio cats
- `src/players/poolPercentiles.ts` — `percentileInPool(players, statId, lowerIsBetter)` → Map<player_key, 0..1>
- `src/players/rankAdds.ts` — `rankAddsForHoles(players, holes, opts)` → `HoleAdds[]`
- `src/players/fromYahoo.ts` — `normalizeFreeAgent(raw)` → `AvailablePlayer`

**New (UI):**
- `src/components/players/AddCard.vue` — one available-player row for a hole
- `src/views/PlayersView.vue` — the Players surface (category-baseball)
- `src/views/PlayersWrapper.vue` — league-type gate (reuses `isYahooCategoryLeague`)
- `src/composables/useAvailablePlayers.ts` — fetch + normalize the FA pool for the active league

**New (tests):**
- `src/players/__tests__/direction.test.ts`
- `src/players/__tests__/poolPercentiles.test.ts`
- `src/players/__tests__/rankAdds.test.ts`
- `src/players/__tests__/fromYahoo.test.ts`
- `src/components/players/__tests__/AddCard.test.ts`

**Modified:**
- `src/router/index.ts` (add `/players` route)
- `src/App.vue` (insert "Players" into the `tabs` computed, after "Matchup")

---

## Task 1: Players types

**Files:** Create `src/players/types.ts`. No test (declarations).

- [ ] **Step 1: Create the file**

```typescript
/** A free agent / available player, normalized from the Yahoo service shape. */
export interface AvailablePlayer {
  playerKey: string
  name: string
  position: string
  team: string // MLB team abbr
  headshot?: string
  percentOwned: number
  status?: string // injury/IL status, '' if healthy
  stats: Record<string, number> // keyed by Yahoo stat_id (season totals)
}

/** A team's hole: a weak scoring category to target. */
export interface Hole {
  statId: string
  name: string // human label, e.g. "Saves"
  rank: number // team's league rank in this category (higher = weaker)
  lowerIsBetter: boolean
}

/** A suggested add for a specific hole category. */
export interface Add {
  player: AvailablePlayer
  statId: string
  statValue: number // the player's value in this category
  percentile: number // 0..1 within the FA pool for this category (direction-aware)
}

/** The top adds for one hole category. */
export interface HoleAdds {
  hole: Hole
  adds: Add[]
}
```

- [ ] **Step 2: Type-check and commit**

Run: `npm run type-check`
Expected: no new errors from this file.
```bash
git add src/players/types.ts
git commit -m "feat: player add types for Slice 2"
```

---

## Task 2: Category direction (lower-is-better) helper

**Files:** Create `src/players/direction.ts`; Test `src/players/__tests__/direction.test.ts`.

Avoids any dependency on `src/editorial/`. Covers MLB ratio/negative categories where a lower value wins the category.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { isLowerBetter } from '@/players/direction'

describe('isLowerBetter', () => {
  it('is true for ERA, WHIP, L by canonical id (case-insensitive)', () => {
    expect(isLowerBetter('ERA')).toBe(true)
    expect(isLowerBetter('whip')).toBe(true)
    expect(isLowerBetter('L')).toBe(true)
  })
  it('is false for counting/positive cats', () => {
    expect(isLowerBetter('HR')).toBe(false)
    expect(isLowerBetter('SV')).toBe(false)
    expect(isLowerBetter('AVG')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/players/__tests__/direction.test.ts`
Expected: FAIL ("Cannot find module '@/players/direction'").

- [ ] **Step 3: Implement**

```typescript
/** Canonical category ids (matching Slice 1 CategoryDef ids) where a LOWER value is better. */
export const LOWER_IS_BETTER = new Set(['ERA', 'WHIP', 'L', 'BB', 'CS'])

export function isLowerBetter(canonicalId: string): boolean {
  return LOWER_IS_BETTER.has(canonicalId.toUpperCase())
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/players/__tests__/direction.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/players/direction.ts src/players/__tests__/direction.test.ts
git commit -m "feat: MLB category direction helper (lower-is-better)"
```

---

## Task 3: Pool percentiles

**Files:** Create `src/players/poolPercentiles.ts`; Test `src/players/__tests__/poolPercentiles.test.ts`.

For one stat, rank every player in the pool and return each player's percentile (0..1, where 1 = best), direction-aware. Players missing the stat get percentile 0.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { percentileInPool } from '@/players/poolPercentiles'
import type { AvailablePlayer } from '@/players/types'

function p(key: string, stats: Record<string, number>): AvailablePlayer {
  return { playerKey: key, name: key, position: 'P', team: 'X', percentOwned: 0, stats }
}

describe('percentileInPool', () => {
  it('higher value = higher percentile when higher is better', () => {
    const players = [p('a', { SV: 30 }), p('b', { SV: 10 }), p('c', { SV: 20 })]
    const pct = percentileInPool(players, 'SV', false)
    expect(pct.get('a')).toBeGreaterThan(pct.get('c')!)
    expect(pct.get('c')).toBeGreaterThan(pct.get('b')!)
    expect(pct.get('a')).toBe(1) // best
  })

  it('lower value = higher percentile when lower is better (ERA)', () => {
    const players = [p('a', { ERA: 2.0 }), p('b', { ERA: 5.0 }), p('c', { ERA: 3.5 })]
    const pct = percentileInPool(players, 'ERA', true)
    expect(pct.get('a')).toBe(1) // lowest ERA is best
    expect(pct.get('b')).toBeLessThan(pct.get('c')!)
  })

  it('missing stat → percentile 0', () => {
    const players = [p('a', { SV: 30 }), p('b', {})]
    const pct = percentileInPool(players, 'SV', false)
    expect(pct.get('b')).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/players/__tests__/poolPercentiles.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implement**

```typescript
import type { AvailablePlayer } from './types'

/**
 * Percentile (0..1, 1 = best) of each player for one stat within the given pool.
 * Direction-aware: when lowerIsBetter, smaller raw values map to higher percentile.
 * Players without the stat get 0.
 */
export function percentileInPool(
  players: AvailablePlayer[],
  statId: string,
  lowerIsBetter: boolean,
): Map<string, number> {
  const withStat = players.filter((pl) => typeof pl.stats[statId] === 'number')
  const result = new Map<string, number>()
  for (const pl of players) result.set(pl.playerKey, 0)
  if (withStat.length === 0) return result

  const sorted = [...withStat].sort((a, b) => {
    const av = a.stats[statId]
    const bv = b.stats[statId]
    return lowerIsBetter ? av - bv : bv - av // best first
  })
  const n = sorted.length
  sorted.forEach((pl, idx) => {
    // idx 0 (best) -> 1.0 ; last -> 1/n. Monotonic, ties resolved by sort order.
    result.set(pl.playerKey, (n - idx) / n)
  })
  return result
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/players/__tests__/poolPercentiles.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/players/poolPercentiles.ts src/players/__tests__/poolPercentiles.test.ts
git commit -m "feat: direction-aware pool percentiles for available players"
```

---

## Task 4: Rank adds for holes

**Files:** Create `src/players/rankAdds.ts`; Test `src/players/__tests__/rankAdds.test.ts`.

Given the available pool and the team's holes, for each hole return the top-N available players in that category (by direction-aware percentile within the pool). Excludes players whose percentile is 0 in that category (no value / missing stat).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { rankAddsForHoles } from '@/players/rankAdds'
import type { AvailablePlayer, Hole } from '@/players/types'

function p(key: string, stats: Record<string, number>): AvailablePlayer {
  return { playerKey: key, name: key, position: 'P', team: 'X', percentOwned: 0, stats }
}

const pool: AvailablePlayer[] = [
  p('closer1', { SV: 30, ERA: 2.5 }),
  p('closer2', { SV: 20, ERA: 3.0 }),
  p('starter', { SV: 0, ERA: 2.0 }),
  p('hitter', { HR: 25 }),
]

const holes: Hole[] = [
  { statId: 'SV', name: 'Saves', rank: 11, lowerIsBetter: false },
  { statId: 'ERA', name: 'ERA', rank: 10, lowerIsBetter: true },
]

describe('rankAddsForHoles', () => {
  it('returns one HoleAdds per hole, ordered best-first within each', () => {
    const result = rankAddsForHoles(pool, holes, { perHole: 2 })
    expect(result.map((h) => h.hole.statId)).toEqual(['SV', 'ERA'])
    const sv = result[0]
    expect(sv.adds.map((a) => a.player.playerKey)).toEqual(['closer1', 'closer2'])
    expect(sv.adds[0].statValue).toBe(30)
    expect(sv.adds[0].percentile).toBeGreaterThan(sv.adds[1].percentile)
  })

  it('respects perHole limit and excludes zero-value players', () => {
    const result = rankAddsForHoles(pool, holes, { perHole: 5 })
    const sv = result.find((h) => h.hole.statId === 'SV')!
    // starter has SV:0 -> still has a stat value 0, but percentile is lowest;
    // hitter has no SV -> percentile 0 -> excluded.
    expect(sv.adds.some((a) => a.player.playerKey === 'hitter')).toBe(false)
  })

  it('returns empty adds for a hole no one supplies', () => {
    const result = rankAddsForHoles([p('x', { HR: 10 })], holes, { perHole: 3 })
    expect(result.every((h) => h.adds.length === 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/players/__tests__/rankAdds.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implement**

```typescript
import type { AvailablePlayer, Hole, HoleAdds, Add } from './types'
import { percentileInPool } from './poolPercentiles'

export interface RankAddsOptions {
  perHole?: number // max adds per hole (default 5)
}

export function rankAddsForHoles(
  players: AvailablePlayer[],
  holes: Hole[],
  opts: RankAddsOptions = {},
): HoleAdds[] {
  const perHole = opts.perHole ?? 5
  return holes.map((hole) => {
    const pct = percentileInPool(players, hole.statId, hole.lowerIsBetter)
    const adds: Add[] = players
      .filter((pl) => (pct.get(pl.playerKey) ?? 0) > 0)
      .map((pl) => ({
        player: pl,
        statId: hole.statId,
        statValue: pl.stats[hole.statId],
        percentile: pct.get(pl.playerKey) ?? 0,
      }))
      .sort((a, b) => b.percentile - a.percentile)
      .slice(0, perHole)
    return { hole, adds }
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/players/__tests__/rankAdds.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/players/rankAdds.ts src/players/__tests__/rankAdds.test.ts
git commit -m "feat: rank available players by fit for each team hole"
```

---

## Task 5: Normalize Yahoo free agent

**Files:** Create `src/players/fromYahoo.ts`; Test `src/players/__tests__/fromYahoo.test.ts`.

Maps the verified Yahoo FA object to `AvailablePlayer`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeFreeAgent } from '@/players/fromYahoo'

describe('normalizeFreeAgent', () => {
  it('maps the yahoo FA shape to AvailablePlayer', () => {
    const raw = {
      player_key: '431.p.123',
      player_id: '123',
      full_name: 'Some Closer',
      position: 'RP',
      mlb_team: 'NYY',
      headshot: 'http://img/x.png',
      percent_owned: 45.2,
      percent_change: 2.1,
      status: 'NA',
      injury_note: '',
      stats: { '32': 30, '26': 2.5 },
      total_points: 0,
    }
    const out = normalizeFreeAgent(raw)
    expect(out).toEqual({
      playerKey: '431.p.123',
      name: 'Some Closer',
      position: 'RP',
      team: 'NYY',
      headshot: 'http://img/x.png',
      percentOwned: 45.2,
      status: 'NA',
      stats: { '32': 30, '26': 2.5 },
    })
  })

  it('defaults missing optional fields safely', () => {
    const out = normalizeFreeAgent({ player_key: 'k', full_name: 'N', stats: {} })
    expect(out.playerKey).toBe('k')
    expect(out.percentOwned).toBe(0)
    expect(out.position).toBe('')
    expect(out.stats).toEqual({})
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/players/__tests__/fromYahoo.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implement**

```typescript
import type { AvailablePlayer } from './types'

export function normalizeFreeAgent(raw: any): AvailablePlayer {
  return {
    playerKey: String(raw.player_key ?? raw.player_id ?? ''),
    name: String(raw.full_name ?? ''),
    position: String(raw.position ?? ''),
    team: String(raw.mlb_team ?? ''),
    headshot: raw.headshot ? String(raw.headshot) : undefined,
    percentOwned: typeof raw.percent_owned === 'number' ? raw.percent_owned : 0,
    status: raw.status ? String(raw.status) : '',
    stats: raw.stats && typeof raw.stats === 'object' ? raw.stats : {},
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/players/__tests__/fromYahoo.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/players/fromYahoo.ts src/players/__tests__/fromYahoo.test.ts
git commit -m "feat: normalize Yahoo free agent to AvailablePlayer"
```

---

## Task 6: useAvailablePlayers composable

**Files:** Create `src/composables/useAvailablePlayers.ts`. No unit test (thin service wrapper with network); verified via the view in Task 9.

Fetches the FA pool for the active Yahoo league and normalizes it, with a stale-league guard (mirroring `useFullSeasonCategoryData`).

- [ ] **Step 1: Read the reference composable**

Read `src/composables/useFullSeasonCategoryData.ts` to mirror its structure (refs returned, `load()` capturing the active league key, stale guard, `loading` flag, how it obtains the Yahoo `leagueKey` from the store).

- [ ] **Step 2: Implement**

Create `src/composables/useAvailablePlayers.ts`:
```typescript
import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import { normalizeFreeAgent } from '@/players/fromYahoo'
import type { AvailablePlayer } from '@/players/types'

export function useAvailablePlayers() {
  const players = ref<AvailablePlayer[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function load(count = 150) {
    const leagueStore = useLeagueStore()
    const requestedId = leagueStore.activeLeagueId
    // Obtain the Yahoo league key the same way useFullSeasonCategoryData does.
    const leagueKey = leagueStore.currentLeague?.league_key
      ?? (Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0]?.league_key : leagueStore.yahooLeague?.league_key)
      ?? requestedId
    if (!leagueKey) return
    loading.value = true
    try {
      const raw = await yahooService.getTopFreeAgents(String(leagueKey), count)
      if (leagueStore.activeLeagueId !== requestedId) return // stale
      players.value = (raw || []).map(normalizeFreeAgent)
      loaded.value = true
    } catch (e) {
      console.error('[useAvailablePlayers] load failed', e)
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return { players, loading, loaded, load }
}
```

> NOTE: In Step 1, confirm the EXACT expression `useFullSeasonCategoryData` uses to resolve the Yahoo `leagueKey`. If it differs from the `currentLeague?.league_key`/`yahooLeague` chain above, replace the `leagueKey` line here with that same expression so both composables resolve the key identically. Do not invent a new accessor.

- [ ] **Step 3: Type-check and commit**

Run: `npm run type-check`
Expected: no new errors from this file.
```bash
git add src/composables/useAvailablePlayers.ts
git commit -m "feat: useAvailablePlayers composable (FA pool, stale-guarded)"
```

---

## Task 7: AddCard component

**Files:** Create `src/components/players/AddCard.vue`; Test `src/components/players/__tests__/AddCard.test.ts`.

Renders one available player as an add suggestion: name, position/team, the relevant stat value, and percent owned. Compact row (no hero cards, no side stripes).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddCard from '@/components/players/AddCard.vue'
import type { Add } from '@/players/types'

const add: Add = {
  player: { playerKey: 'k', name: 'Some Closer', position: 'RP', team: 'NYY', percentOwned: 42, stats: { '32': 30 } },
  statId: '32',
  statValue: 30,
  percentile: 0.95,
}

describe('AddCard', () => {
  it('renders player name, position/team, and the stat value', () => {
    const wrapper = mount(AddCard, { props: { add, statLabel: 'SV' } })
    expect(wrapper.text()).toContain('Some Closer')
    expect(wrapper.text()).toContain('RP')
    expect(wrapper.text()).toContain('NYY')
    expect(wrapper.text()).toContain('30')
    expect(wrapper.text()).toContain('SV')
  })

  it('shows percent owned', () => {
    const wrapper = mount(AddCard, { props: { add, statLabel: 'SV' } })
    expect(wrapper.text()).toContain('42')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/players/__tests__/AddCard.test.ts`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implement**

Create `src/components/players/AddCard.vue`:
```vue
<script setup lang="ts">
import type { Add } from '@/players/types'

defineProps<{ add: Add; statLabel: string }>()
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3">
    <img
      v-if="add.player.headshot"
      :src="add.player.headshot"
      :alt="add.player.name"
      class="h-8 w-8 rounded-full bg-dark-border object-cover"
    />
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold text-dark-text">{{ add.player.name }}</span>
      <span class="block text-xs text-dark-textMuted">
        {{ add.player.position }} · {{ add.player.team }} · {{ Math.round(add.player.percentOwned) }}% owned
      </span>
    </span>
    <span class="shrink-0 text-right">
      <span class="block text-sm font-bold text-dark-text">{{ add.statValue }}</span>
      <span class="block text-xs text-dark-textMuted">{{ statLabel }}</span>
    </span>
  </div>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/components/players/__tests__/AddCard.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/players/AddCard.vue src/components/players/__tests__/AddCard.test.ts
git commit -m "feat: AddCard renders an available player suggestion"
```

---

## Task 8: PlayersView (category)

**Files:** Create `src/views/PlayersView.vue`.

Wires the FA pool + the team profile into "Top adds for your holes." Reuses Slice 1's data derivation. This is the integration task: read `src/views/MyTeamView.vue` and copy its proven approach for obtaining `standings`, `categories` (with real names), and `myTeamId`, then derive holes from the profile.

- [ ] **Step 1: Implement**

Create `src/views/PlayersView.vue`:
```vue
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import { computeCategoryWeaknesses } from '@/recommendations/categorySignals'
import type { CategoryDef } from '@/recommendations/types'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { rankAddsForHoles } from '@/players/rankAdds'
import { isLowerBetter } from '@/players/direction'
import type { Hole } from '@/players/types'
import AddCard from '@/components/players/AddCard.vue'

const leagueStore = useLeagueStore()
const { players, load: loadPlayers } = useAvailablePlayers()

// Reuse MyTeamView's proven derivation. Copy the SAME three computeds from
// src/views/MyTeamView.vue (standings, categories, myTeamId) verbatim, including
// its useFullSeasonCategoryData usage and onMounted/watch load triggers.
// === BEGIN copied-from-MyTeamView derivation (standings/categories/myTeamId + season load) ===
const standings = computed<StandingsEntryLike[]>(() => /* COPY_FROM_MYTEAMVIEW */ [])
const categories = computed<CategoryDef[]>(() => /* COPY_FROM_MYTEAMVIEW */ [])
const myTeamId = computed<string | null>(() => /* COPY_FROM_MYTEAMVIEW */ null)
// === END copied derivation ===

const profile = computed(() => {
  if (!myTeamId.value || standings.value.length === 0 || categories.value.length === 0) return null
  try {
    return profileFromStandings(standings.value, categories.value, myTeamId.value)
  } catch {
    return null
  }
})

const holes = computed<Hole[]>(() => {
  if (!profile.value) return []
  // Weak categories, worst first, top 4. Reuse the Slice 1 weakness rule for consistency.
  const weak = computeCategoryWeaknesses(profile.value, categories.value)
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 4)
  return weak.map((rec) => {
    const cat = categories.value.find((c) => c.statId === rec.statId)
    const teamCat = profile.value!.categories.find((c) => c.statId === rec.statId)
    return {
      statId: rec.statId,
      name: cat?.name ?? rec.statId,
      rank: teamCat?.rank ?? 0,
      lowerIsBetter: cat ? isLowerBetter(cat.statId) : false,
    }
  })
})

const holeAdds = computed(() =>
  holes.value.length && players.value.length
    ? rankAddsForHoles(players.value, holes.value, { perHole: 4 })
    : [],
)

function labelFor(statId: string): string {
  return categories.value.find((c) => c.statId === statId)?.label ?? statId
}

onMounted(() => loadPlayers())
watch(() => leagueStore.activeLeagueId, () => loadPlayers())
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 space-y-6">
    <h1 class="text-2xl font-bold text-dark-text">Players</h1>
    <p class="text-sm text-dark-textMuted">Top available players for your weakest categories.</p>

    <section v-for="group in holeAdds" :key="group.hole.statId" class="space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-dark-textMuted">
        Adds for {{ group.hole.name }} <span class="text-dark-textMuted/70">(you're {{ group.hole.rank }}th)</span>
      </h2>
      <div class="rounded-xl bg-dark-card border border-dark-border divide-y divide-dark-border/60">
        <p v-if="group.adds.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
          No standout free agents in {{ group.hole.name }} right now.
        </p>
        <AddCard
          v-for="add in group.adds"
          :key="add.player.playerKey"
          :add="add"
          :stat-label="labelFor(group.hole.statId)"
        />
      </div>
    </section>

    <p v-if="holeAdds.length === 0" class="text-sm text-dark-textMuted">
      Connect or select a category league to see suggested adds.
    </p>
  </div>
</template>
```

> NOTE: The three `/* COPY_FROM_MYTEAMVIEW */` computeds and the season-data load (`useFullSeasonCategoryData` usage + its onMounted/watch) must be copied verbatim from `src/views/MyTeamView.vue` so Players and My Team share identical league context. Do not re-derive differently. (A future refactor will hoist this into a shared composable; out of scope for Slice 2.)

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no new errors from PlayersView.vue.

- [ ] **Step 3: Commit**

```bash
git add src/views/PlayersView.vue
git commit -m "feat: PlayersView leads with top adds for your holes"
```

---

## Task 9: Wrapper, route, nav

**Files:** Create `src/views/PlayersWrapper.vue`; Modify `src/router/index.ts`, `src/App.vue`.

- [ ] **Step 1: Create PlayersWrapper**

Create `src/views/PlayersWrapper.vue` (mirror `MyTeamWrapper.vue`, reuse `isYahooCategoryLeague`):
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { isYahooCategoryLeague } from '@/composables/useIsCategoryLeague'
import PlayersView from '@/views/PlayersView.vue'

const leagueStore = useLeagueStore()
const isCategoryLeague = computed(() => {
  if (isYahooCategoryLeague(leagueStore.currentLeague?.scoring_type)) return true
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return isYahooCategoryLeague(saved?.scoring_type)
})
</script>

<template>
  <PlayersView v-if="isCategoryLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    Players is available for category leagues in this preview.
  </div>
</template>
```

> NOTE: Read `src/views/MyTeamWrapper.vue` first and match its exact use of `isYahooCategoryLeague` (argument shape and import path). Replicate, don't reinvent.

- [ ] **Step 2: Register the route**

In `src/router/index.ts`, immediately after the `/matchup` route block (added in Slice 1), add:
```typescript
    {
      path: '/players',
      name: 'players',
      component: () => import('@/views/PlayersWrapper.vue')
    },
```

- [ ] **Step 3: Add the nav entry**

In `src/App.vue`, in the `tabs` computed, insert "Players" right after the "Matchup" entry:
```typescript
  { name: 'Players', path: '/players' },
```
(The order becomes: My Team, Matchup/Roto Race, Players, League, Power Rankings, Draft, History, Free Tools, Ultimate Tools.)

- [ ] **Step 4: Verify in the running app**

Run: `npm run dev`
With the live Yahoo baseball category league selected:
- "Players" appears in the nav after "Matchup" and loads PlayersView.
- It shows "Adds for <your weak category>" sections, each listing real available players with their stat value in that category, best first.
- The weak categories match what My Team's "Where you're losing" shows.
Expected: confirmed. If empty, check that the FA fetch ran (network) and that `holes` is non-empty (the profile loaded).

- [ ] **Step 5: Commit**

```bash
git add src/views/PlayersWrapper.vue src/router/index.ts src/App.vue
git commit -m "feat: add Players route and nav slot (after Matchup)"
```

---

## Task 10: Full suite + gate

- [ ] **Step 1: Run the suite**

Run: `npm test`
Expected: all pass (Slice 1's tests + direction, poolPercentiles, rankAdds, fromYahoo, AddCard).

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no new errors (known pre-existing errors in yahoo-daily-stats-methods.ts/DraftPage.vue/HistoryPage.vue/MatchupsPage.vue ignored).

- [ ] **Step 3: Local build (no deploy)**

Run: `npm run build`
Expected: succeeds. Do NOT push or deploy.

- [ ] **Step 4: Commit if needed**

```bash
git add -A && git commit -m "test: green suite for Slice 2 Players" || echo "nothing to commit"
```

---

## Notes for the executor
- **Local only.** No `git push`, no `vercel --prod`.
- Branch `redesign/my-team-first` (same branch as Slice 1).
- The only non-self-contained wiring is Task 8's three `COPY_FROM_MYTEAMVIEW` computeds (+ the season load) — copy them verbatim from `src/views/MyTeamView.vue`. Everything else is fully specified.
- Do NOT depend on `src/editorial/`. Do NOT modify `CategoryProjectionsView.vue` (it stays in Tools for now).
- Success criterion: on the live league, Players opens with real available players grouped under the user's real weak categories, best-in-category first, matching My Team's weaknesses.
