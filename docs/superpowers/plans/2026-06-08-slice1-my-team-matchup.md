# Slice 1: My Team + My Matchup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip UFD to a My-Team-first shell for baseball category leagues: a deterministic, league-contextualized recommendation engine drives a "My Team" action feed, and the existing category matchup view is promoted to a first-class "My Matchup" surface, all local-only.

**Architecture:** A new pure-logic module `src/recommendations/` computes ranked weakness/strength signals from a team's per-category records (fully unit-tested, no UI or network coupling). A thin adapter maps the app's existing `StandingsEntry[]` shape into the engine's input. New Vue views (`MyTeamView`, wrappers) and two nav entries wire it into the app, reusing the verified `*Wrapper.vue` league-type-detection pattern and the `tabs` array in `App.vue`. The matchup category breakdown table gets local sorting via a small pure sort composable.

**Tech Stack:** Vue 3 (`^3.4.0`), TypeScript (`^5.3.0`), Vite (`^5.4.18`), Pinia. Tests added with Vitest + @vue/test-utils + happy-dom. `@/` aliases `src/` (vite.config.ts + tsconfig.json).

---

## File Structure

**New (pure logic, fully tested):**
- `src/recommendations/types.ts` — shared types (`CategoryDef`, `TeamCategoryRecord`, `MyTeamCategoryProfile`, `Recommendation`)
- `src/recommendations/ordinal.ts` — `ordinal(n)` helper ("11th")
- `src/recommendations/categorySignals.ts` — `computeCategoryWeaknesses`, `computeCategoryStrengths`
- `src/recommendations/buildActionFeed.ts` — `buildActionFeed(profile)`
- `src/recommendations/fromStandings.ts` — `profileFromStandings(allStandings, categories, myTeamId)`
- `src/composables/useSortedRows.ts` — generic pure sort composable for tables

**New (UI):**
- `src/views/MyTeamView.vue` — the category My Team page
- `src/views/MyTeamWrapper.vue` — league-type router (category vs points placeholder)
- `src/views/MatchupWrapper.vue` — promotes single-matchup surface
- `src/components/myteam/ActionFeed.vue` — renders `Recommendation[]`
- `src/components/myteam/SituationStrip.vue` — compact identity strip

**New (tests):**
- `src/recommendations/__tests__/ordinal.test.ts`
- `src/recommendations/__tests__/categorySignals.test.ts`
- `src/recommendations/__tests__/buildActionFeed.test.ts`
- `src/recommendations/__tests__/fromStandings.test.ts`
- `src/composables/__tests__/useSortedRows.test.ts`
- `src/components/myteam/__tests__/ActionFeed.test.ts`

**Modified:**
- `package.json` (add vitest devDeps + `test` scripts)
- `vitest.config.ts` (create)
- `src/router/index.ts` (add `/my-team`, `/matchup` routes)
- `src/App.vue` (reorder/extend `tabs` computed)
- `src/views/CategoryMatchupsView.vue` (sortable category table via `useSortedRows`)

---

## Task 1: Add Vitest test infrastructure

**Files:**
- Modify: `package.json:8-13` (scripts) and `:26-34` (devDependencies)
- Create: `vitest.config.ts`
- Create: `src/recommendations/__tests__/smoke.test.ts` (temporary, deleted in Step 6)

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
npm install -D vitest@^2.1.0 @vue/test-utils@^2.4.6 happy-dom@^15.0.0
```
Expected: packages added to `devDependencies`, no peer-dep errors (Vite 5 + Vue 3.4 are compatible with Vitest 2).

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, change the `scripts` block to:
```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 4: Write a smoke test**

Create `src/recommendations/__tests__/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('vitest infra', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test -- src/recommendations/__tests__/smoke.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 6: Delete the smoke test and commit**

Run:
```bash
rm src/recommendations/__tests__/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest + vue-test-utils test infrastructure"
```

---

## Task 2: Ordinal helper

**Files:**
- Create: `src/recommendations/ordinal.ts`
- Test: `src/recommendations/__tests__/ordinal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/recommendations/__tests__/ordinal.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { ordinal } from '@/recommendations/ordinal'

describe('ordinal', () => {
  it('handles common cases', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
    expect(ordinal(21)).toBe('21st')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/recommendations/__tests__/ordinal.test.ts`
Expected: FAIL ("Cannot find module '@/recommendations/ordinal'").

- [ ] **Step 3: Implement**

Create `src/recommendations/ordinal.ts`:
```typescript
export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/recommendations/__tests__/ordinal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/recommendations/ordinal.ts src/recommendations/__tests__/ordinal.test.ts
git commit -m "feat: add ordinal number helper for recommendations"
```

---

## Task 3: Recommendation types

**Files:**
- Create: `src/recommendations/types.ts`

These types are consumed by every later task. No test (pure declarations).

- [ ] **Step 1: Create the types file**

Create `src/recommendations/types.ts`:
```typescript
export type CatSide = 'hit' | 'pit'

/** A scoring category in the league (e.g. Saves). */
export interface CategoryDef {
  statId: string
  label: string // short, e.g. "SV"
  name: string // long, e.g. "Saves"
  side: CatSide
  higherIsBetter: boolean // false for ERA/WHIP
}

/** One team's record in a single category. */
export interface TeamCategoryRecord {
  statId: string
  wins: number
  losses: number
  ties: number
  rank: number // 1 = best in league for this category
}

/** The logged-in user's per-category profile, league-contextualized. */
export interface MyTeamCategoryProfile {
  teamId: string
  teamName: string
  numTeams: number
  categories: TeamCategoryRecord[]
}

export type RecommendationKind = 'category-weakness' | 'category-strength'
export type Severity = 'high' | 'medium' | 'low'

export interface Recommendation {
  id: string
  kind: RecommendationKind
  severity: Severity
  statId: string
  headline: string // templated label, never prose
  detail: string
  evidenceRoute: string
  leverage: number // ranking weight; higher = surfaced first
}
```

- [ ] **Step 2: Type-check and commit**

Run: `npm run type-check`
Expected: no new errors from this file.
```bash
git add src/recommendations/types.ts
git commit -m "feat: add recommendation engine types"
```

---

## Task 4: Category weakness/strength signals

**Files:**
- Create: `src/recommendations/categorySignals.ts`
- Test: `src/recommendations/__tests__/categorySignals.test.ts`

Rule: a category is a **weakness** when the team's rank falls in the bottom third of the league (`rank > numTeams * 2/3`), and a **strength** when in the top third (`rank <= numTeams / 3`). Leverage for weaknesses scales with how deep the rank is (`rank / numTeams`); severity bands: bottom (last 2 ranks) = high, else medium, top third strengths = low.

- [ ] **Step 1: Write the failing test**

Create `src/recommendations/__tests__/categorySignals.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeCategoryWeaknesses, computeCategoryStrengths } from '@/recommendations/categorySignals'
import type { CategoryDef, MyTeamCategoryProfile } from '@/recommendations/types'

const CATS: CategoryDef[] = [
  { statId: 'SV', label: 'SV', name: 'Saves', side: 'pit', higherIsBetter: true },
  { statId: 'HR', label: 'HR', name: 'Home Runs', side: 'hit', higherIsBetter: true },
  { statId: 'AVG', label: 'AVG', name: 'Average', side: 'hit', higherIsBetter: true },
]

const profile: MyTeamCategoryProfile = {
  teamId: 't1',
  teamName: 'My Team',
  numTeams: 12,
  categories: [
    { statId: 'SV', wins: 11, losses: 100, ties: 0, rank: 11 }, // bottom third
    { statId: 'HR', wins: 60, losses: 40, ties: 0, rank: 6 }, // middle
    { statId: 'AVG', wins: 90, losses: 10, ties: 0, rank: 1 }, // top third
  ],
}

describe('computeCategoryWeaknesses', () => {
  it('flags only bottom-third categories', () => {
    const recs = computeCategoryWeaknesses(profile, CATS)
    expect(recs.map((r) => r.statId)).toEqual(['SV'])
  })

  it('produces a templated headline with ordinal rank and category name', () => {
    const [rec] = computeCategoryWeaknesses(profile, CATS)
    expect(rec.headline).toBe('11th in Saves')
    expect(rec.kind).toBe('category-weakness')
    expect(rec.severity).toBe('high')
    expect(rec.evidenceRoute).toBe('/league')
    expect(rec.leverage).toBeGreaterThan(0.5)
  })
})

describe('computeCategoryStrengths', () => {
  it('flags only top-third categories', () => {
    const recs = computeCategoryStrengths(profile, CATS)
    expect(recs.map((r) => r.statId)).toEqual(['AVG'])
    expect(recs[0].kind).toBe('category-strength')
    expect(recs[0].headline).toBe('1st in Average')
    expect(recs[0].severity).toBe('low')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/recommendations/__tests__/categorySignals.test.ts`
Expected: FAIL ("Cannot find module '@/recommendations/categorySignals'").

- [ ] **Step 3: Implement**

Create `src/recommendations/categorySignals.ts`:
```typescript
import type { CategoryDef, MyTeamCategoryProfile, Recommendation } from './types'
import { ordinal } from './ordinal'

function catName(statId: string, cats: CategoryDef[]): string {
  return cats.find((c) => c.statId === statId)?.name ?? statId
}

export function computeCategoryWeaknesses(
  profile: MyTeamCategoryProfile,
  cats: CategoryDef[],
): Recommendation[] {
  const threshold = (profile.numTeams * 2) / 3
  return profile.categories
    .filter((c) => c.rank > threshold)
    .map((c) => {
      const isBottomTwo = c.rank >= profile.numTeams - 1
      return {
        id: `weakness-${c.statId}`,
        kind: 'category-weakness' as const,
        severity: isBottomTwo ? ('high' as const) : ('medium' as const),
        statId: c.statId,
        headline: `${ordinal(c.rank)} in ${catName(c.statId, cats)}`,
        detail: `You rank ${ordinal(c.rank)} of ${profile.numTeams} in ${catName(c.statId, cats)}.`,
        evidenceRoute: '/league',
        leverage: c.rank / profile.numTeams,
      }
    })
}

export function computeCategoryStrengths(
  profile: MyTeamCategoryProfile,
  cats: CategoryDef[],
): Recommendation[] {
  const threshold = profile.numTeams / 3
  return profile.categories
    .filter((c) => c.rank <= threshold)
    .map((c) => ({
      id: `strength-${c.statId}`,
      kind: 'category-strength' as const,
      severity: 'low' as const,
      statId: c.statId,
      headline: `${ordinal(c.rank)} in ${catName(c.statId, cats)}`,
      detail: `You rank ${ordinal(c.rank)} of ${profile.numTeams} in ${catName(c.statId, cats)}.`,
      evidenceRoute: '/league',
      leverage: 1 - c.rank / profile.numTeams,
    }))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/recommendations/__tests__/categorySignals.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/recommendations/categorySignals.ts src/recommendations/__tests__/categorySignals.test.ts
git commit -m "feat: compute league-contextualized category weakness/strength signals"
```

---

## Task 5: Action feed builder

**Files:**
- Create: `src/recommendations/buildActionFeed.ts`
- Test: `src/recommendations/__tests__/buildActionFeed.test.ts`

Rule: weaknesses rank above strengths; within each, higher leverage first. Cap at `limit` (default 5).

- [ ] **Step 1: Write the failing test**

Create `src/recommendations/__tests__/buildActionFeed.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildActionFeed } from '@/recommendations/buildActionFeed'
import type { CategoryDef, MyTeamCategoryProfile } from '@/recommendations/types'

const CATS: CategoryDef[] = [
  { statId: 'SV', label: 'SV', name: 'Saves', side: 'pit', higherIsBetter: true },
  { statId: 'HR', label: 'HR', name: 'Home Runs', side: 'hit', higherIsBetter: true },
  { statId: 'AVG', label: 'AVG', name: 'Average', side: 'hit', higherIsBetter: true },
  { statId: 'ERA', label: 'ERA', name: 'ERA', side: 'pit', higherIsBetter: false },
]

const profile: MyTeamCategoryProfile = {
  teamId: 't1',
  teamName: 'My Team',
  numTeams: 12,
  categories: [
    { statId: 'SV', wins: 11, losses: 100, ties: 0, rank: 12 }, // worst weakness
    { statId: 'ERA', wins: 30, losses: 70, ties: 0, rank: 9 }, // weaker
    { statId: 'HR', wins: 60, losses: 40, ties: 0, rank: 6 }, // neutral, excluded
    { statId: 'AVG', wins: 90, losses: 10, ties: 0, rank: 1 }, // strength
  ],
}

describe('buildActionFeed', () => {
  it('orders weaknesses before strengths, worst weakness first', () => {
    const feed = buildActionFeed(profile, CATS)
    expect(feed.map((r) => r.statId)).toEqual(['SV', 'ERA', 'AVG'])
    expect(feed[0].kind).toBe('category-weakness')
    expect(feed[feed.length - 1].kind).toBe('category-strength')
  })

  it('respects the limit', () => {
    const feed = buildActionFeed(profile, CATS, 2)
    expect(feed).toHaveLength(2)
    expect(feed.map((r) => r.statId)).toEqual(['SV', 'ERA'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/recommendations/__tests__/buildActionFeed.test.ts`
Expected: FAIL ("Cannot find module '@/recommendations/buildActionFeed'").

- [ ] **Step 3: Implement**

Create `src/recommendations/buildActionFeed.ts`:
```typescript
import type { CategoryDef, MyTeamCategoryProfile, Recommendation } from './types'
import { computeCategoryWeaknesses, computeCategoryStrengths } from './categorySignals'

const KIND_ORDER: Record<Recommendation['kind'], number> = {
  'category-weakness': 0,
  'category-strength': 1,
}

export function buildActionFeed(
  profile: MyTeamCategoryProfile,
  cats: CategoryDef[],
  limit = 5,
): Recommendation[] {
  const all = [...computeCategoryWeaknesses(profile, cats), ...computeCategoryStrengths(profile, cats)]
  all.sort((a, b) => {
    const k = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    if (k !== 0) return k
    return b.leverage - a.leverage
  })
  return all.slice(0, limit)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/recommendations/__tests__/buildActionFeed.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/recommendations/buildActionFeed.ts src/recommendations/__tests__/buildActionFeed.test.ts
git commit -m "feat: rank recommendations into a My Team action feed"
```

---

## Task 6: Adapter from existing StandingsEntry shape

**Files:**
- Create: `src/recommendations/fromStandings.ts`
- Test: `src/recommendations/__tests__/fromStandings.test.ts`

The app's category standings use this verified shape (`src/components/unified/CategoryStandingsTable.vue:167-181`): each entry has `team.teamId`, `team.name`, `perCategoryWins?: Record<string, number>`, `perCategoryLosses?: Record<string, number>`. This adapter computes each category's rank across all teams (rank 1 = most category wins; for `higherIsBetter:false` cats the win-count semantics are already "wins", so ranking by wins desc is correct regardless of direction) and returns the logged-in team's profile.

- [ ] **Step 1: Write the failing test**

Create `src/recommendations/__tests__/fromStandings.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import type { CategoryDef } from '@/recommendations/types'

const CATS: CategoryDef[] = [
  { statId: 'SV', label: 'SV', name: 'Saves', side: 'pit', higherIsBetter: true },
  { statId: 'HR', label: 'HR', name: 'Home Runs', side: 'hit', higherIsBetter: true },
]

const standings: StandingsEntryLike[] = [
  { team: { teamId: 'a', name: 'Alpha' }, perCategoryWins: { SV: 10, HR: 2 } },
  { team: { teamId: 'b', name: 'Bravo' }, perCategoryWins: { SV: 5, HR: 9 } },
  { team: { teamId: 'c', name: 'Charlie' }, perCategoryWins: { SV: 1, HR: 6 } },
]

describe('profileFromStandings', () => {
  it('ranks the chosen team per category (1 = most wins)', () => {
    const profile = profileFromStandings(standings, CATS, 'c')
    expect(profile.teamId).toBe('c')
    expect(profile.teamName).toBe('Charlie')
    expect(profile.numTeams).toBe(3)
    const sv = profile.categories.find((x) => x.statId === 'SV')!
    const hr = profile.categories.find((x) => x.statId === 'HR')!
    expect(sv.rank).toBe(3) // 1 win = last of three
    expect(sv.wins).toBe(1)
    expect(hr.rank).toBe(2) // 6 wins = middle
  })

  it('throws if the team is not in the standings', () => {
    expect(() => profileFromStandings(standings, CATS, 'z')).toThrow()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/recommendations/__tests__/fromStandings.test.ts`
Expected: FAIL ("Cannot find module '@/recommendations/fromStandings'").

- [ ] **Step 3: Implement**

Create `src/recommendations/fromStandings.ts`:
```typescript
import type { CategoryDef, MyTeamCategoryProfile, TeamCategoryRecord } from './types'

/** Subset of the app's StandingsEntry we depend on (CategoryStandingsTable.vue:167-181). */
export interface StandingsEntryLike {
  team: { teamId: string; name: string; avatar?: string }
  perCategoryWins?: Record<string, number>
  perCategoryLosses?: Record<string, number>
}

export function profileFromStandings(
  allStandings: StandingsEntryLike[],
  cats: CategoryDef[],
  myTeamId: string,
): MyTeamCategoryProfile {
  const mine = allStandings.find((s) => s.team.teamId === myTeamId)
  if (!mine) {
    throw new Error(`profileFromStandings: team ${myTeamId} not found in standings`)
  }

  const categories: TeamCategoryRecord[] = cats.map((cat) => {
    // Rank: sort all teams by this category's win count desc; my position = rank.
    const sorted = [...allStandings].sort(
      (a, b) => (b.perCategoryWins?.[cat.statId] ?? 0) - (a.perCategoryWins?.[cat.statId] ?? 0),
    )
    const rank = sorted.findIndex((s) => s.team.teamId === myTeamId) + 1
    return {
      statId: cat.statId,
      wins: mine.perCategoryWins?.[cat.statId] ?? 0,
      losses: mine.perCategoryLosses?.[cat.statId] ?? 0,
      ties: 0,
      rank,
    }
  })

  return {
    teamId: mine.team.teamId,
    teamName: mine.team.name,
    numTeams: allStandings.length,
    categories,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/recommendations/__tests__/fromStandings.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/recommendations/fromStandings.ts src/recommendations/__tests__/fromStandings.test.ts
git commit -m "feat: adapt app StandingsEntry into MyTeamCategoryProfile"
```

---

## Task 7: ActionFeed component

**Files:**
- Create: `src/components/myteam/ActionFeed.vue`
- Test: `src/components/myteam/__tests__/ActionFeed.test.ts`

Renders a `Recommendation[]` as rows. No hero-metric cards: a compact list with a severity dot, the headline, the detail, and a router-link to the evidence route. (Avoids the banned hero-metric template and side-stripe borders.)

- [ ] **Step 1: Write the failing test**

Create `src/components/myteam/__tests__/ActionFeed.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import ActionFeed from '@/components/myteam/ActionFeed.vue'
import type { Recommendation } from '@/recommendations/types'

const recs: Recommendation[] = [
  {
    id: 'weakness-SV',
    kind: 'category-weakness',
    severity: 'high',
    statId: 'SV',
    headline: '12th in Saves',
    detail: 'You rank 12th of 12 in Saves.',
    evidenceRoute: '/league',
    leverage: 1,
  },
]

describe('ActionFeed', () => {
  it('renders one row per recommendation with headline and detail', () => {
    const wrapper = mount(ActionFeed, {
      props: { recommendations: recs },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.findAll('[data-test="rec-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('12th in Saves')
    expect(wrapper.text()).toContain('You rank 12th of 12 in Saves.')
  })

  it('shows an empty state when there are no recommendations', () => {
    const wrapper = mount(ActionFeed, {
      props: { recommendations: [] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.findAll('[data-test="rec-row"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('No moves flagged')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/myteam/__tests__/ActionFeed.test.ts`
Expected: FAIL ("Cannot find module '@/components/myteam/ActionFeed.vue'").

- [ ] **Step 3: Implement**

Create `src/components/myteam/ActionFeed.vue`:
```vue
<script setup lang="ts">
import type { Recommendation } from '@/recommendations/types'

defineProps<{ recommendations: Recommendation[] }>()

const severityDot: Record<Recommendation['severity'], string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-emerald-400',
}
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border divide-y divide-dark-border/60">
    <p v-if="recommendations.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
      No moves flagged this week.
    </p>
    <router-link
      v-for="rec in recommendations"
      :key="rec.id"
      :to="rec.evidenceRoute"
      data-test="rec-row"
      class="flex items-center gap-3 px-4 py-3 hover:bg-dark-border/20 transition-colors"
    >
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="severityDot[rec.severity]" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold text-dark-text">{{ rec.headline }}</span>
        <span class="block text-xs text-dark-textMuted">{{ rec.detail }}</span>
      </span>
      <span class="shrink-0 text-dark-textMuted" aria-hidden="true">&rarr;</span>
    </router-link>
  </div>
</template>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/components/myteam/__tests__/ActionFeed.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/myteam/ActionFeed.vue src/components/myteam/__tests__/ActionFeed.test.ts
git commit -m "feat: ActionFeed component renders ranked recommendations"
```

---

## Task 8: SituationStrip component

**Files:**
- Create: `src/components/myteam/SituationStrip.vue`

Compact identity row (record, rank, this-week win prob, trajectory). Presentational, props-driven; verified visually in Task 11. No unit test (pure presentation, all values via props).

- [ ] **Step 1: Implement**

Create `src/components/myteam/SituationStrip.vue`:
```vue
<script setup lang="ts">
defineProps<{
  teamName: string
  record: string // e.g. "57-64-11"
  rank: number
  numTeams: number
  winProb: number | null // 0-100 for this week, or null if no live matchup
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-dark-card border border-dark-border px-4 py-3">
    <span class="text-base font-bold text-dark-text">{{ teamName }}</span>
    <span class="text-sm text-dark-textMuted">{{ record }}</span>
    <span class="text-sm text-dark-textMuted">Rank {{ rank }} / {{ numTeams }}</span>
    <span v-if="winProb !== null" class="text-sm text-dark-textMuted">
      This week: <span class="font-semibold text-dark-text">{{ Math.round(winProb) }}%</span> win prob
    </span>
  </div>
</template>
```

- [ ] **Step 2: Type-check and commit**

Run: `npm run type-check`
Expected: no new errors.
```bash
git add src/components/myteam/SituationStrip.vue
git commit -m "feat: SituationStrip compact team identity row"
```

---

## Task 9: Locate the live category standings + categories source

**Files:**
- Read only: `src/components/unified/CategoryStandingsTable.vue`, its parent view, `src/composables/useUnifiedLeague.ts`, `src/views/CategoryMatchupsView.vue`

This task produces a recorded fact, not code. The recommendation engine needs, for the active league: (a) a `StandingsEntryLike[]` (teams with `perCategoryWins`/`perCategoryLosses`), (b) the `CategoryDef[]`, and (c) the logged-in team id (the team with `is_my_team === true`).

- [ ] **Step 1: Find the standings provider**

Run:
```bash
grep -rn "perCategoryWins" src --include=*.vue --include=*.ts
grep -rn "CategoryStandingsTable" src --include=*.vue
```
Open the parent that passes `:standings` to `CategoryStandingsTable`. Record in a scratch note: the exact getter/computed/composable that yields the standings array and the category list for the active league, and the file:line.

- [ ] **Step 2: Find "my team" resolution for category leagues**

Run:
```bash
grep -rn "is_my_team" src --include=*.ts --include=*.vue
```
Confirm the team objects for the active category league carry `is_my_team` (verified at `src/stores/league.ts:236` for Yahoo, `:1630` for ESPN). Record the exact array on the store/composable that holds these teams and how to read the current team id from it.

- [ ] **Step 3: Commit the note**

Record findings as a short comment block at the top of a new file `src/views/MyTeamView.notes.md` and:
```bash
git add src/views/MyTeamView.notes.md
git commit -m "docs: record live category standings + my-team data sources for MyTeamView"
```

---

## Task 10: MyTeamView (category)

**Files:**
- Create: `src/views/MyTeamView.vue`

Wires the live data (sources recorded in Task 9) through the Task 6 adapter and Task 5 builder into the Task 7/8 components. Uses `useLeagueStore()` for league context (verified pattern: views read `leagueStore.currentLeague` / `leagueStore.activeLeagueId`, never route params).

- [ ] **Step 1: Implement**

Create `src/views/MyTeamView.vue`. Replace the two clearly-marked source expressions with the getters recorded in Task 9 (the standings array, the category list, and the current team id). Everything else is fixed:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import { buildActionFeed } from '@/recommendations/buildActionFeed'
import type { CategoryDef } from '@/recommendations/types'
import ActionFeed from '@/components/myteam/ActionFeed.vue'
import SituationStrip from '@/components/myteam/SituationStrip.vue'

const leagueStore = useLeagueStore()

// === Wire these three from the sources recorded in MyTeamView.notes.md (Task 9) ===
// Standings array in the verified StandingsEntryLike shape:
const standings = computed<StandingsEntryLike[]>(() => /* TASK9_STANDINGS */ [])
// League scoring categories mapped to CategoryDef:
const categories = computed<CategoryDef[]>(() => /* TASK9_CATEGORIES */ [])
// Logged-in user's teamId (team with is_my_team === true):
const myTeamId = computed<string | null>(() => /* TASK9_MY_TEAM_ID */ null)
// ================================================================================

const profile = computed(() => {
  if (!myTeamId.value || standings.value.length === 0 || categories.value.length === 0) return null
  try {
    return profileFromStandings(standings.value, categories.value, myTeamId.value)
  } catch {
    return null
  }
})

const feed = computed(() => (profile.value ? buildActionFeed(profile.value, categories.value) : []))

const record = computed(() => {
  // Derived from the standings entry if available; fall back to empty.
  const mine = standings.value.find((s) => s.team.teamId === myTeamId.value)
  const w = mine?.perCategoryWins ? Object.values(mine.perCategoryWins).reduce((a, b) => a + b, 0) : 0
  const l = mine?.perCategoryLosses ? Object.values(mine.perCategoryLosses).reduce((a, b) => a + b, 0) : 0
  return `${w}-${l}`
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 space-y-6">
    <h1 class="text-2xl font-bold text-dark-text">My Team</h1>

    <SituationStrip
      v-if="profile"
      :team-name="profile.teamName"
      :record="record"
      :rank="0"
      :num-teams="profile.numTeams"
      :win-prob="null"
    />

    <section class="space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-dark-textMuted">Your edge this week</h2>
      <ActionFeed :recommendations="feed" />
    </section>

    <p v-if="!profile" class="text-sm text-dark-textMuted">
      Connect or select a category league to see your team's edge.
    </p>
  </div>
</template>
```

> NOTE: The three `/* TASK9_* */` expressions are the only wiring points. The engineer replaces each with the exact getter recorded in Task 9 (e.g. a `useUnifiedLeague()` return value or a `leagueStore` getter). The `SituationStrip` `:rank` is set to `0` here and refined once the standings entry's rank field is identified in Task 9; if the recorded standings entry exposes an overall `rank`, pass it instead.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no new errors (placeholder expressions are typed to `[]` / `null`).

- [ ] **Step 3: Commit**

```bash
git add src/views/MyTeamView.vue
git commit -m "feat: MyTeamView wires recommendation engine to live category standings"
```

---

## Task 11: Routes, wrappers, and navigation

**Files:**
- Create: `src/views/MyTeamWrapper.vue`, `src/views/MatchupWrapper.vue`
- Modify: `src/router/index.ts` (after the existing `/matchups` route block near `:91-93`)
- Modify: `src/App.vue` (`tabs` computed at `:1192-1201`)

Reuses the verified wrapper league-type detection from `MatchupsWrapper.vue`.

- [ ] **Step 1: Create MyTeamWrapper**

Create `src/views/MyTeamWrapper.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import MyTeamView from '@/views/MyTeamView.vue'

const leagueStore = useLeagueStore()

const isCategoryLeague = computed(() => {
  const st = (leagueStore.currentLeague?.scoring_type || '').toLowerCase()
  if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category') return true
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  const savedSt = (saved?.scoring_type || '').toLowerCase()
  return savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category'
})
</script>

<template>
  <MyTeamView v-if="isCategoryLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    My Team is available for category leagues in this preview.
  </div>
</template>
```

- [ ] **Step 2: Create MatchupWrapper**

Create `src/views/MatchupWrapper.vue` (promotes the existing category matchup view as the single-matchup surface):
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import CategoryMatchupsView from '@/views/CategoryMatchupsView.vue'

const leagueStore = useLeagueStore()

const isCategoryLeague = computed(() => {
  const st = (leagueStore.currentLeague?.scoring_type || '').toLowerCase()
  if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category') return true
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  const savedSt = (saved?.scoring_type || '').toLowerCase()
  return savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category'
})
</script>

<template>
  <CategoryMatchupsView v-if="isCategoryLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    Matchup is available for category leagues in this preview.
  </div>
</template>
```

- [ ] **Step 3: Register routes**

In `src/router/index.ts`, immediately after the `/matchups` route object (around line 93), add:
```typescript
    {
      path: '/my-team',
      name: 'my-team',
      component: () => import('@/views/MyTeamWrapper.vue')
    },
    {
      path: '/matchup',
      name: 'matchup',
      component: () => import('@/views/MatchupWrapper.vue')
    },
```

- [ ] **Step 4: Add nav entries**

In `src/App.vue`, replace the `tabs` computed (`:1192-1201`) with the My-Team-first order (keeps old routes reachable; Trades/Players come in Slices 2-3):
```typescript
const tabs = computed(() => [
  { name: 'My Team', path: '/my-team' },
  { name: isRotoLeague.value ? 'Roto Race' : 'Matchup', path: '/matchup' },
  { name: 'League', path: '/' },
  { name: 'Power Rankings', path: '/power-rankings' },
  { name: 'Draft', path: '/draft' },
  { name: 'History', path: '/history' },
  { name: 'Free Tools', path: '/free-tools' },
  { name: 'Ultimate Tools', path: '/ultimate-tools', isUltimate: true }
])
```

- [ ] **Step 5: Verify in the running app**

Run: `npm run dev`
In the browser, with the live baseball-category league selected:
- The nav shows **My Team** first; clicking it loads MyTeamView.
- The action feed shows at least one real weakness (e.g. a true bottom-third category) with the ordinal rank, and clicking a row navigates to `/`.
- The **Matchup** tab loads the category matchup view.
Expected: all three behaviors confirmed visually. If the action feed is empty, revisit the Task 9 wiring in MyTeamView (`TASK9_*` expressions) until `standings`, `categories`, and `myTeamId` are populated.

- [ ] **Step 6: Commit**

```bash
git add src/views/MyTeamWrapper.vue src/views/MatchupWrapper.vue src/router/index.ts src/App.vue
git commit -m "feat: add My Team + Matchup routes and My-Team-first navigation"
```

---

## Task 12: Sortable category breakdown table (Matchup)

**Files:**
- Create: `src/composables/useSortedRows.ts`
- Test: `src/composables/__tests__/useSortedRows.test.ts`
- Modify: `src/views/CategoryMatchupsView.vue` (category breakdown table at `:310-354`, `allCategories` usage)

A reusable pure sort composable, then applied to the matchup category list so the "Category" and win-prob columns become sortable. (First consumer of the future shared SortableTable from Slice 4.)

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useSortedRows.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSortedRows } from '@/composables/useSortedRows'

describe('useSortedRows', () => {
  it('sorts by a key and toggles direction', () => {
    const rows = ref([{ name: 'b', v: 2 }, { name: 'a', v: 3 }, { name: 'c', v: 1 }])
    const { sorted, sortBy, sortKey, sortDir } = useSortedRows(rows, (r) => r as any)

    sortBy('v')
    expect(sortKey.value).toBe('v')
    expect(sortDir.value).toBe('desc')
    expect(sorted.value.map((r) => r.v)).toEqual([3, 2, 1])

    sortBy('v')
    expect(sortDir.value).toBe('asc')
    expect(sorted.value.map((r) => r.v)).toEqual([1, 2, 3])
  })

  it('returns rows unchanged when no sort key is set', () => {
    const rows = ref([{ v: 2 }, { v: 1 }])
    const { sorted } = useSortedRows(rows, (r) => r as any)
    expect(sorted.value.map((r) => r.v)).toEqual([2, 1])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/composables/__tests__/useSortedRows.test.ts`
Expected: FAIL ("Cannot find module '@/composables/useSortedRows'").

- [ ] **Step 3: Implement**

Create `src/composables/useSortedRows.ts`:
```typescript
import { computed, ref, type Ref } from 'vue'

export type SortDir = 'asc' | 'desc'

export function useSortedRows<T>(rows: Ref<T[]>, accessor: (row: T) => Record<string, number | string>) {
  const sortKey = ref<string | null>(null)
  const sortDir = ref<SortDir>('desc')

  function sortBy(key: string) {
    if (sortKey.value === key) {
      sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
    } else {
      sortKey.value = key
      sortDir.value = 'desc'
    }
  }

  const sorted = computed<T[]>(() => {
    if (!sortKey.value) return rows.value
    const key = sortKey.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    return [...rows.value].sort((a, b) => {
      const av = accessor(a)[key]
      const bv = accessor(b)[key]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  })

  return { sorted, sortBy, sortKey, sortDir }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/composables/__tests__/useSortedRows.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Apply to the matchup category table**

In `src/views/CategoryMatchupsView.vue`:
1. In `<script setup>`, import and build a sortable view of `allCategories` keyed by category name and each side's win prob:
```typescript
import { useSortedRows } from '@/composables/useSortedRows'

const sortedCategories = useSortedRows(allCategories, (cat: any) => ({
  name: String(cat.display_name ?? cat.name ?? cat.stat_id),
}))
```
2. Change the category table's row loop (`:332`) from `v-for="cat in allCategories"` to `v-for="cat in sortedCategories.sorted.value"`.
3. Make the "Category" header (`:312`) clickable:
```vue
<th class="text-left py-2 px-1 cursor-pointer select-none" @click="sortedCategories.sortBy('name')">
  Category
  <span v-if="sortedCategories.sortKey.value === 'name'">{{ sortedCategories.sortDir.value === 'asc' ? '▲' : '▼' }}</span>
</th>
```

- [ ] **Step 6: Verify in the running app**

Run: `npm run dev`
Open the Matchup tab, select a matchup, click the "Category" header.
Expected: the category breakdown rows reorder alphabetically and the arrow toggles. All other columns (win prob, ADV) still align with the correct category because they are keyed by `cat.stat_id`.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useSortedRows.ts src/composables/__tests__/useSortedRows.test.ts src/views/CategoryMatchupsView.vue
git commit -m "feat: sortable category breakdown in Matchup via reusable sort composable"
```

---

## Task 13: Full suite + type-check gate

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all tests pass (ordinal, categorySignals, buildActionFeed, fromStandings, ActionFeed, useSortedRows).

- [ ] **Step 2: Type-check the project**

Run: `npm run type-check`
Expected: no new errors introduced by this slice.

- [ ] **Step 3: Build (local only, do NOT deploy)**

Run: `npm run build`
Expected: build succeeds. Do NOT push or run `vercel --prod` (see the spec's local-only constraint).

- [ ] **Step 4: Final commit if anything changed**

```bash
git add -A
git commit -m "test: green suite + clean type-check for Slice 1" || echo "nothing to commit"
```

---

## Deliberate Slice-1 scope decisions (vs spec §5)
- **My Team is the first nav item, not yet the root (`/`) landing route.** The root stays the League view during this transition so existing test users are not stranded and so the app's no-league/onboarding flow at `/` is untouched. Making `/my-team` the default redirect is a fast follow once the feed is validated.
- **RosterPanel and CategoryProfile are deferred within Slice 1.** The thesis to validate is the action feed + the My-Team-first shell + the promoted Matchup (this maps exactly to the spec's §9 success criteria). The roster panel and category-profile bars add surface without changing what we are testing; they are the first follow-on once the feed lands.

## Notes for the executor
- **Local only.** No `git push`, no `vercel --prod`, until the owner has tested with their users.
- Work happens on branch `redesign/my-team-first` (already created).
- The only non-self-contained wiring is the three `TASK9_*` expressions in `MyTeamView.vue`, resolved against the sources recorded in Task 9. Every other task is fully specified and testable in isolation.
- Do not add any dependency on `src/editorial/` (that engine is TLB's job and is removed in Slice 4).
