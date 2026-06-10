# ESPN Category Support for My Team — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the My Team page render its full intelligence (verdict, where-you're-losing with inline adds, your-edge, category profile, roster contributions/drops) for ESPN H2H category baseball leagues, by mapping ESPN service data into the platform-neutral shapes the existing analytics core already consumes.

**Architecture:** Pure mappers (`src/myteam/espn/`) turn ESPN's `getCategoryStatsBreakdown` / `getTeamsWithRosters` / `getFreeAgents` / `getMyTeam` into `StandingsEntryLike[]`, `CategoryDef[]`, `cats[]`, `PoolPlayer[]`, `RosterPlayer[]`, and `AvailablePlayer[]`. A composable `useEspnCategoryTeamData` orchestrates the service calls + mappers and exposes refs. `MyTeamView` keeps its Yahoo derivation untouched and adds a platform switch at the base inputs only; all downstream computeds are unchanged.

**Tech Stack:** Vue 3 `<script setup>` + Pinia, Vitest + @vue/test-utils + happy-dom, TypeScript.

**Branch:** `redesign/my-team-first` (local only — NEVER `git push`, NEVER `vercel --prod`).

**Verify each task:** `npm test` green (add/update tests), `npm run build` ok, `npx vue-tsc --noEmit -p tsconfig.json` no NEW errors (known pre-existing, unrelated: `yahoo-daily-stats-methods.ts`, `DraftPage.vue`, `HistoryPage.vue`, `MatchupsPage.vue`). No deploy. No em dashes, no banned patterns.

**Reference shapes (already in the codebase — do not redefine, import them):**
- `StandingsEntryLike` (`src/recommendations/fromStandings.ts`): `{ team: { teamId: string; name: string; avatar?: string }; perCategoryWins?: Record<string, number>; perCategoryLosses?: Record<string, number> }`
- `CategoryDef` (`src/recommendations/types.ts`): `{ statId: string; label: string; name: string; side: CatSide; higherIsBetter: boolean }` (`'hit'` is a valid `CatSide`)
- `PoolPlayer` / `RosterPlayer` (`src/composables/useMyRoster.ts`): `PoolPlayer = { playerKey: string; stats: Record<string, number> }`; `RosterPlayer = { playerKey: string; name: string; position: string; team: string; headshot?: string; status?: string; totalPoints: number; stats: Record<string, number> }`
- `AvailablePlayer` (`src/players/types.ts`): `{ playerKey: string; name: string; position: string; team: string; headshot?: string; percentOwned: number; status?: string; stats: Record<string, number> }`

**ESPN service facts (verified in `src/services/espn.ts`):**
- `getCategoryStatsBreakdown(sport, leagueId, season)` →
  `{ categories: { stat_id: string; name: string; display_name: string; is_negative?: boolean }[]; teamCategoryWins: Map<string, Record<string, number>>; teamCategoryLosses: Map<string, Record<string, number>>; teamCategoryTies: Map<string, Record<string, number>>; teamTotalCategoryWins: Map<string, number>; teamTotalCategoryLosses: Map<string, number>; hasRealStatValues: boolean }`. Map keys are `` `espn_${teamId}` ``.
- `getTeamsWithRosters(sport, leagueId, season)` → `EspnTeam[]` where each team has `id: number`, `name: string`, `logo: string`, and `roster?: EspnPlayer[]`.
- `getMyTeam(sport, leagueId, season)` → `EspnTeam | null` (matched by SWID; `null` if no credentials or no match). Use `team.id`.
- `getFreeAgents(sport, leagueId, season, limit?)` → `EspnPlayer[]`.
- `EspnPlayer`: `{ playerId: number; fullName: string; proTeam: string; position: string; injuryStatus: string; actualPoints: number; percentOwned: number; stats: Record<string, number> }`.
- `getLeague(sport, leagueId, season)` → has `scoringType` (`'H2H_CATEGORY'` for category leagues).
- Credential init pattern (from `stores/league.ts:1368-1385`): `await espnService.initialize(userId)`, then `const c = platformsStore.getEspnCredentials(); if (c) espnService.setCredentials(c.espn_s2, c.swid)`. League key parse: `const parts = leagueKey.split('_')` → `parts[1]=sport`, `parts[2]=leagueId`, `parts[3]=season`.

---

## Task 1: ESPN standings/categories mapper

**Files:**
- Create: `src/myteam/espn/mapStandings.ts`
- Test: `src/myteam/espn/__tests__/mapStandings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/myteam/espn/__tests__/mapStandings.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapBreakdownToCategoryData } from '../mapStandings'

const breakdown = {
  categories: [
    { stat_id: '20', name: 'Home Runs', display_name: 'HR' },
    { stat_id: '47', name: 'ERA', display_name: 'ERA', is_negative: true },
  ],
  teamCategoryWins: new Map<string, Record<string, number>>([
    ['espn_1', { '20': 5, '47': 2 }],
    ['espn_2', { '20': 1, '47': 6 }],
  ]),
  teamCategoryLosses: new Map<string, Record<string, number>>([
    ['espn_1', { '20': 1, '47': 4 }],
    ['espn_2', { '20': 5, '47': 0 }],
  ]),
  teamCategoryTies: new Map(),
  teamTotalCategoryWins: new Map<string, number>([['espn_1', 7], ['espn_2', 7]]),
  teamTotalCategoryLosses: new Map<string, number>([['espn_1', 5], ['espn_2', 5]]),
  hasRealStatValues: true,
}

const teams = [
  { id: 1, name: 'Sluggers', logo: 'http://x/1.png' },
  { id: 2, name: 'Aces', logo: 'http://x/2.png' },
]

describe('mapBreakdownToCategoryData', () => {
  it('builds standings keyed by espn_<id> with names from teams', () => {
    const { standings } = mapBreakdownToCategoryData(breakdown, teams)
    expect(standings).toHaveLength(2)
    const s1 = standings.find((s) => s.team.teamId === 'espn_1')!
    expect(s1.team.name).toBe('Sluggers')
    expect(s1.team.avatar).toBe('http://x/1.png')
    expect(s1.perCategoryWins).toEqual({ '20': 5, '47': 2 })
    expect(s1.perCategoryLosses).toEqual({ '20': 1, '47': 4 })
  })

  it('builds CategoryDef[] with label/name from display_name/name', () => {
    const { categories } = mapBreakdownToCategoryData(breakdown, teams)
    const era = categories.find((c) => c.statId === '47')!
    expect(era.label).toBe('ERA')
    expect(era.name).toBe('ERA')
    expect(era.higherIsBetter).toBe(false) // is_negative -> lower is better
    const hr = categories.find((c) => c.statId === '20')!
    expect(hr.higherIsBetter).toBe(true)
  })

  it('builds direction-bearing cats[] straight from is_negative', () => {
    const { cats } = mapBreakdownToCategoryData(breakdown, teams)
    expect(cats).toContainEqual({ statId: '20', lowerIsBetter: false })
    expect(cats).toContainEqual({ statId: '47', lowerIsBetter: true })
  })

  it('returns empty arrays when breakdown has no categories', () => {
    const empty = { ...breakdown, categories: [], teamCategoryWins: new Map(), teamCategoryLosses: new Map() }
    const out = mapBreakdownToCategoryData(empty, teams)
    expect(out.standings).toHaveLength(2) // teams still listed
    expect(out.categories).toHaveLength(0)
    expect(out.cats).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/myteam/espn/__tests__/mapStandings.test.ts`
Expected: FAIL (`Cannot find module '../mapStandings'`).

- [ ] **Step 3: Implement the mapper**

Create `src/myteam/espn/mapStandings.ts`:

```typescript
import type { StandingsEntryLike } from '@/recommendations/fromStandings'
import type { CategoryDef } from '@/recommendations/types'

/** The subset of the ESPN getCategoryStatsBreakdown result this mapper reads. */
export interface EspnBreakdownLike {
  categories: { stat_id: string; name: string; display_name: string; is_negative?: boolean }[]
  teamCategoryWins: Map<string, Record<string, number>>
  teamCategoryLosses: Map<string, Record<string, number>>
}

/** The subset of EspnTeam this mapper reads (id + display fields). */
export interface EspnTeamLike {
  id: number
  name: string
  logo?: string
}

export interface EspnCategoryData {
  standings: StandingsEntryLike[]
  categories: CategoryDef[]
  cats: { statId: string; lowerIsBetter: boolean }[]
}

/**
 * Map an ESPN category breakdown + team list into the platform-neutral shapes
 * MyTeamView's analytics core consumes. Standings are keyed by `espn_<id>` to
 * match the breakdown map keys and getMyTeam's team id.
 */
export function mapBreakdownToCategoryData(
  breakdown: EspnBreakdownLike,
  teams: EspnTeamLike[],
): EspnCategoryData {
  const standings: StandingsEntryLike[] = teams.map((t) => {
    const key = `espn_${t.id}`
    return {
      team: { teamId: key, name: t.name, avatar: t.logo },
      perCategoryWins: breakdown.teamCategoryWins.get(key) ?? {},
      perCategoryLosses: breakdown.teamCategoryLosses.get(key) ?? {},
    }
  })

  const categories: CategoryDef[] = breakdown.categories.map((c) => ({
    statId: c.stat_id,
    label: c.display_name || c.name || `S${c.stat_id}`,
    name: c.name || c.display_name || `Stat ${c.stat_id}`,
    side: 'hit',
    higherIsBetter: !c.is_negative,
  }))

  const cats = breakdown.categories.map((c) => ({
    statId: c.stat_id,
    lowerIsBetter: !!c.is_negative,
  }))

  return { standings, categories, cats }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/myteam/espn/__tests__/mapStandings.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/espn/mapStandings.ts src/myteam/espn/__tests__/mapStandings.test.ts
git commit -m "feat(espn): breakdown -> standings/categories/cats mapper"
```

---

## Task 2: ESPN roster + pool mapper

**Files:**
- Create: `src/myteam/espn/mapRosters.ts`
- Test: `src/myteam/espn/__tests__/mapRosters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/myteam/espn/__tests__/mapRosters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { espnHeadshotUrl, mapRostersToPool, mapRosterToPlayers } from '../mapRosters'

const player = (id: number, stats: Record<string, number>) => ({
  playerId: id,
  fullName: `Player ${id}`,
  proTeam: 'NYY',
  position: 'OF',
  injuryStatus: '',
  actualPoints: id,
  percentOwned: 50,
  stats,
})

const teams = [
  { id: 1, name: 'A', roster: [player(10, { '20': 30 }), player(11, { '20': 12 })] },
  { id: 2, name: 'B', roster: [player(20, { '20': 5 })] },
]

describe('mapRosters', () => {
  it('espnHeadshotUrl uses the sport-specific path', () => {
    expect(espnHeadshotUrl(123, 'baseball')).toBe(
      'https://a.espncdn.com/i/headshots/mlb/players/full/123.png',
    )
    expect(espnHeadshotUrl(123, 'hockey')).toBe(
      'https://a.espncdn.com/i/headshots/nhl/players/full/123.png',
    )
  })

  it('mapRostersToPool flattens all teams to {playerKey, stats}', () => {
    const pool = mapRostersToPool(teams)
    expect(pool).toHaveLength(3)
    expect(pool).toContainEqual({ playerKey: '10', stats: { '20': 30 } })
    expect(pool).toContainEqual({ playerKey: '20', stats: { '20': 5 } })
  })

  it('mapRosterToPlayers maps one team to RosterPlayer rows with headshots', () => {
    const rows = mapRosterToPlayers(teams[0], 'baseball')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      playerKey: '10',
      name: 'Player 10',
      position: 'OF',
      team: 'NYY',
      headshot: 'https://a.espncdn.com/i/headshots/mlb/players/full/10.png',
      totalPoints: 10,
      stats: { '20': 30 },
    })
  })

  it('handles a team with no roster', () => {
    expect(mapRostersToPool([{ id: 9, name: 'X' }])).toHaveLength(0)
    expect(mapRosterToPlayers({ id: 9, name: 'X' }, 'baseball')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/myteam/espn/__tests__/mapRosters.test.ts`
Expected: FAIL (`Cannot find module '../mapRosters'`).

- [ ] **Step 3: Implement the mapper**

Create `src/myteam/espn/mapRosters.ts`:

```typescript
import type { PoolPlayer, RosterPlayer } from '@/composables/useMyRoster'
import type { Sport } from '@/types/supabase'

/** The subset of EspnPlayer the roster mappers read. */
export interface EspnPlayerLike {
  playerId: number
  fullName: string
  proTeam: string
  position: string
  injuryStatus?: string
  actualPoints?: number
  stats: Record<string, number>
}

/** The subset of EspnTeam the roster mappers read. */
export interface EspnTeamRosterLike {
  id: number
  name: string
  roster?: EspnPlayerLike[]
}

const ESPN_SPORT_PATH: Record<Sport, string> = {
  football: 'nfl',
  baseball: 'mlb',
  basketball: 'nba',
  hockey: 'nhl',
}

/** ESPN CDN headshot URL for a player id, sport-aware. */
export function espnHeadshotUrl(playerId: number, sport: Sport): string {
  const path = ESPN_SPORT_PATH[sport] ?? 'mlb'
  return `https://a.espncdn.com/i/headshots/${path}/players/full/${playerId}.png`
}

/** Flatten every team's roster into the league-wide percentile pool. */
export function mapRostersToPool(teams: EspnTeamRosterLike[]): PoolPlayer[] {
  return teams.flatMap((t) =>
    (t.roster ?? []).map((p) => ({
      playerKey: String(p.playerId),
      stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
    })),
  )
}

/** Map one team's roster to the RosterPlayer rows the roster panel renders. */
export function mapRosterToPlayers(team: EspnTeamRosterLike, sport: Sport): RosterPlayer[] {
  return (team.roster ?? []).map((p) => ({
    playerKey: String(p.playerId),
    name: p.fullName ?? '',
    position: p.position ?? '',
    team: p.proTeam ?? '',
    headshot: espnHeadshotUrl(p.playerId, sport),
    status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : '',
    totalPoints: typeof p.actualPoints === 'number' ? p.actualPoints : 0,
    stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/myteam/espn/__tests__/mapRosters.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/espn/mapRosters.ts src/myteam/espn/__tests__/mapRosters.test.ts
git commit -m "feat(espn): roster -> pool + roster-panel mappers"
```

---

## Task 3: ESPN free-agent mapper

**Files:**
- Create: `src/myteam/espn/mapFreeAgents.ts`
- Test: `src/myteam/espn/__tests__/mapFreeAgents.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/myteam/espn/__tests__/mapFreeAgents.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapEspnFreeAgents } from '../mapFreeAgents'

const fa = [
  { playerId: 30, fullName: 'Mickey Moniak', proTeam: 'COL', position: 'OF', injuryStatus: '', percentOwned: 12, stats: { '20': 12 } },
  { playerId: 31, fullName: 'Jakob Junis', proTeam: 'MIL', position: 'SP', injuryStatus: 'DTD', percentOwned: 3, stats: { '47': 0.79 } },
]

describe('mapEspnFreeAgents', () => {
  it('maps EspnPlayer free agents to AvailablePlayer rows', () => {
    const out = mapEspnFreeAgents(fa, 'baseball')
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      playerKey: '30',
      name: 'Mickey Moniak',
      position: 'OF',
      team: 'COL',
      percentOwned: 12,
      stats: { '20': 12 },
    })
    expect(out[0].headshot).toBe('https://a.espncdn.com/i/headshots/mlb/players/full/30.png')
    expect(out[1].status).toBe('DTD')
  })

  it('handles an empty list', () => {
    expect(mapEspnFreeAgents([], 'baseball')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/myteam/espn/__tests__/mapFreeAgents.test.ts`
Expected: FAIL (`Cannot find module '../mapFreeAgents'`).

- [ ] **Step 3: Implement the mapper**

Create `src/myteam/espn/mapFreeAgents.ts`:

```typescript
import type { AvailablePlayer } from '@/players/types'
import type { Sport } from '@/types/supabase'
import { espnHeadshotUrl, type EspnPlayerLike } from './mapRosters'

/** Map ESPN free agents into the AvailablePlayer shape rankAddsForHoles consumes. */
export function mapEspnFreeAgents(
  freeAgents: (EspnPlayerLike & { percentOwned?: number })[],
  sport: Sport,
): AvailablePlayer[] {
  return freeAgents.map((p) => ({
    playerKey: String(p.playerId),
    name: p.fullName ?? '',
    position: p.position ?? '',
    team: p.proTeam ?? '',
    headshot: espnHeadshotUrl(p.playerId, sport),
    percentOwned: typeof p.percentOwned === 'number' ? p.percentOwned : 0,
    status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : '',
    stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/myteam/espn/__tests__/mapFreeAgents.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/espn/mapFreeAgents.ts src/myteam/espn/__tests__/mapFreeAgents.test.ts
git commit -m "feat(espn): free-agent -> AvailablePlayer mapper"
```

---

## Task 4: `useEspnCategoryTeamData` composable

**Files:**
- Create: `src/composables/useEspnCategoryTeamData.ts`

No unit test (it is thin orchestration over the network service + already-tested mappers; verified via the view). Type-check + build are the gate.

- [ ] **Step 1: Implement the composable**

Create `src/composables/useEspnCategoryTeamData.ts`:

```typescript
import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { espnService } from '@/services/espn'
import type { Sport } from '@/types/supabase'
import type { StandingsEntryLike } from '@/recommendations/fromStandings'
import type { CategoryDef } from '@/recommendations/types'
import type { PoolPlayer, RosterPlayer } from '@/composables/useMyRoster'
import type { AvailablePlayer } from '@/players/types'
import { mapBreakdownToCategoryData } from '@/myteam/espn/mapStandings'
import { mapRostersToPool, mapRosterToPlayers } from '@/myteam/espn/mapRosters'
import { mapEspnFreeAgents } from '@/myteam/espn/mapFreeAgents'

/** Parse an ESPN league key `espn_{sport}_{leagueId}_{season}`. */
function parseEspnKey(key: string): { sport: Sport; leagueId: string; season: number } | null {
  const parts = key.split('_')
  if (parts.length < 4 || parts[0] !== 'espn') return null
  return { sport: parts[1] as Sport, leagueId: parts[2], season: parseInt(parts[3], 10) }
}

/**
 * Loads an ESPN H2H category league and exposes the platform-neutral base
 * inputs MyTeamView needs. `supported` is null until resolved, then true for
 * H2H_CATEGORY leagues and false otherwise. `myTeamId` is null when ESPN
 * credentials can't identify the user's team.
 */
export function useEspnCategoryTeamData() {
  const standings = ref<StandingsEntryLike[]>([])
  const categories = ref<CategoryDef[]>([])
  const cats = ref<{ statId: string; lowerIsBetter: boolean }[]>([])
  const myTeamId = ref<string | null>(null)
  const myOverallRank = ref(0)
  const pool = ref<PoolPlayer[]>([])
  const rosterPlayers = ref<RosterPlayer[]>([])
  const freeAgents = ref<AvailablePlayer[]>([])
  const supported = ref<boolean | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  function reset() {
    standings.value = []
    categories.value = []
    cats.value = []
    myTeamId.value = null
    myOverallRank.value = 0
    pool.value = []
    rosterPlayers.value = []
    freeAgents.value = []
    supported.value = null
    loaded.value = false
  }

  async function load() {
    const leagueStore = useLeagueStore()
    const authStore = useAuthStore()
    const platformsStore = usePlatformsStore()

    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const parsed = parseEspnKey(leagueKey)
    if (!parsed) return
    const { sport, leagueId, season } = parsed
    const requestedId = leagueKey

    reset()
    loading.value = true
    try {
      if (authStore.user?.id) await espnService.initialize(authStore.user.id)
      const creds = platformsStore.getEspnCredentials()
      if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)

      // Detect category league via scoringType; bail (supported=false) otherwise.
      const league = await espnService.getLeague(sport, leagueId, season)
      if (leagueStore.activeLeagueId !== requestedId) return
      if (!league || league.scoringType !== 'H2H_CATEGORY') {
        supported.value = false
        loaded.value = true
        return
      }
      supported.value = true

      const [breakdown, teams, myTeam] = await Promise.all([
        espnService.getCategoryStatsBreakdown(sport, leagueId, season),
        espnService.getTeamsWithRosters(sport, leagueId, season),
        espnService.getMyTeam(sport, leagueId, season),
      ])
      if (leagueStore.activeLeagueId !== requestedId) return

      const mapped = mapBreakdownToCategoryData(breakdown, teams)
      standings.value = mapped.standings
      categories.value = mapped.categories
      cats.value = mapped.cats
      pool.value = mapRostersToPool(teams)

      if (myTeam) {
        myTeamId.value = `espn_${myTeam.id}`
        const myTeamWithRoster = teams.find((t) => t.id === myTeam.id) ?? myTeam
        rosterPlayers.value = mapRosterToPlayers(myTeamWithRoster, sport)
        // Overall rank: position among teams by total category wins (desc).
        const totals = breakdown.teamTotalCategoryWins
        const ranked = [...teams]
          .map((t) => ({ key: `espn_${t.id}`, wins: totals.get(`espn_${t.id}`) ?? 0 }))
          .sort((a, b) => b.wins - a.wins)
        const idx = ranked.findIndex((r) => r.key === myTeamId.value)
        myOverallRank.value = idx >= 0 ? idx + 1 : 0
      }

      // Free agents for the inline "top add per weak category" line.
      const fa = await espnService.getFreeAgents(sport, leagueId, season, 150)
      if (leagueStore.activeLeagueId !== requestedId) return
      freeAgents.value = mapEspnFreeAgents(fa, sport)

      loaded.value = true
    } catch (e) {
      console.error('[useEspnCategoryTeamData] load failed', e)
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return {
    standings,
    categories,
    cats,
    myTeamId,
    myOverallRank,
    pool,
    rosterPlayers,
    freeAgents,
    supported,
    loading,
    loaded,
    load,
  }
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "useEspnCategoryTeamData|mapStandings|mapRosters|mapFreeAgents"`
Expected: no output (no new type errors). If `getEspnCredentials()` return type lacks `espn_s2`/`swid`, inspect `usePlatformsStore` and adjust the access accordingly (it is the same shape used at `stores/league.ts:1372-1374`).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useEspnCategoryTeamData.ts
git commit -m "feat(espn): useEspnCategoryTeamData composable"
```

---

## Task 5: Wire the platform switch into MyTeamView

**Files:**
- Modify: `src/views/MyTeamView.vue`

Keep every existing Yahoo computed and the entire downstream chain. Rename the Yahoo *base inputs* to `yahoo*` and define canonical base inputs as platform-select computeds, so `profile`, `weaknesses`, `holes`, `addsByStatId`, `contributions`, `gaps`, `record`, `verdict`, etc. work unchanged for both platforms.

- [ ] **Step 1: Import the composable and add the ESPN instance + gate**

In the `<script setup>` imports (after the `useMyRoster` import at line 10), add:

```typescript
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
```

After the existing `const { players: rosterPlayers, ... } = useMyRoster()` destructure (line 24), rename the Yahoo-source destructures to avoid name clashes and add the ESPN instance:

Replace:
```typescript
const { players, load: loadPlayers } = useAvailablePlayers()
const { players: rosterPlayers, pool: rosterPool, loading: rosterLoading, loaded: rosterLoaded, load: loadRoster } = useMyRoster()
```
with:
```typescript
const { players: yahooFreeAgents, load: loadPlayers } = useAvailablePlayers()
const {
  players: yahooRosterPlayers,
  pool: yahooRosterPool,
  loading: yahooRosterLoading,
  loaded: yahooRosterLoaded,
  load: loadRoster,
} = useMyRoster()

const espn = useEspnCategoryTeamData()
const isEspnCategoryLeague = computed(
  () => leagueStore.activePlatform === 'espn' && espn.supported.value === true,
)
```

- [ ] **Step 2: Rename the Yahoo base computeds**

Rename these four computeds (their bodies unchanged) so the canonical names are free for the select layer:
- `const standings = computed<StandingsEntryLike[]>(...)` (line ~149) → `const yahooStandings_ = computed<StandingsEntryLike[]>(...)`
- `const categories = computed<CategoryDef[]>(...)` (line ~175) → `const yahooCategories = computed<CategoryDef[]>(...)`
- `const myTeamId = computed<string | null>(...)` (line ~190) → `const yahooMyTeamId = computed<string | null>(...)`
- `const myOverallRank = computed<number>(...)` (line ~296) → `const yahooMyOverallRank = computed<number>(...)`

(Note `leagueStore.yahooStandings` is a different symbol — that's a store getter, untouched. Use the trailing-underscore name `yahooStandings_` for the local computed to avoid confusion.)

- [ ] **Step 3: Add the canonical select computeds**

Immediately after `const isEspnCategoryLeague = ...` (Step 1), add the canonical base inputs. These are the names the downstream chain already references:

```typescript
const standings = computed<StandingsEntryLike[]>(() =>
  isEspnCategoryLeague.value ? espn.standings.value : yahooStandings_.value,
)
const categories = computed<CategoryDef[]>(() =>
  isEspnCategoryLeague.value ? espn.categories.value : yahooCategories.value,
)
const myTeamId = computed<string | null>(() =>
  isEspnCategoryLeague.value ? espn.myTeamId.value : yahooMyTeamId.value,
)
const myOverallRank = computed<number>(() =>
  isEspnCategoryLeague.value ? espn.myOverallRank.value : yahooMyOverallRank.value,
)
const rosterPlayers = computed(() =>
  isEspnCategoryLeague.value ? espn.rosterPlayers.value : yahooRosterPlayers.value,
)
const rosterPool = computed(() =>
  isEspnCategoryLeague.value ? espn.pool.value : yahooRosterPool.value,
)
const rosterLoading = computed(() =>
  isEspnCategoryLeague.value ? espn.loading.value : yahooRosterLoading.value,
)
const rosterLoaded = computed(() =>
  isEspnCategoryLeague.value ? espn.loaded.value : yahooRosterLoaded.value,
)
const players = computed(() =>
  isEspnCategoryLeague.value ? espn.freeAgents.value : yahooFreeAgents.value,
)
```

Because the four Yahoo computeds were renamed in Step 2, and `rosterPlayers`/`rosterPool`/`rosterLoading`/`rosterLoaded`/`players` were renamed in Step 1, these canonical names now resolve to the select computeds. Every downstream computed (`profile`, `record`, `weaknesses`, `holes`, `addsByStatId`, `contributions`, `gaps`, `myPlayerKeys`, etc.) already references these canonical names and needs NO change.

- [ ] **Step 4: Make `cats` direction-correct per platform**

The existing `cats` computed (line ~331) derives direction from the label heuristic. For ESPN, use the authoritative `is_negative`-based `cats` from the composable. Replace the `cats` computed body:

Replace:
```typescript
const cats = computed(() =>
  categories.value.map((c) => ({
    statId: c.statId,
    lowerIsBetter: isLowerBetter(c.label || c.name || c.statId),
  })),
)
```
with:
```typescript
const cats = computed(() =>
  isEspnCategoryLeague.value
    ? espn.cats.value
    : categories.value.map((c) => ({
        statId: c.statId,
        lowerIsBetter: isLowerBetter(c.label || c.name || c.statId),
      })),
)
```

- [ ] **Step 5: Make `holes` use the platform-correct direction**

The `holes` computed (line ~241) currently calls `isLowerBetter(cat.label || ...)`. Make it read from `cats` (which is now platform-correct) so ESPN holes rank with the right direction. Replace the `lowerIsBetter` line inside the `holes` map:

Replace:
```typescript
      lowerIsBetter: cat ? isLowerBetter(cat.label || cat.name || cat.statId) : false,
```
with:
```typescript
      lowerIsBetter: cats.value.find((c) => c.statId === rec.statId)?.lowerIsBetter ?? false,
```

- [ ] **Step 6: Add ESPN load triggers**

Add a loader for ESPN and call it alongside the Yahoo ones. After `function maybeLoadRoster() { ... }` (line ~83) add:

```typescript
// Load ESPN category data when the active league is ESPN (the composable itself
// verifies it's an H2H_CATEGORY league and no-ops otherwise).
function maybeLoadEspn() {
  if (leagueStore.activePlatform === 'espn') {
    espn.load()
  }
}
```

In the `onMounted` block (line ~85) and the `watch(() => leagueStore.activeLeagueId, ...)` block (line ~91), add `maybeLoadEspn()` to each:

```typescript
onMounted(() => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
  maybeLoadRoster()
  maybeLoadEspn()
})
watch(() => leagueStore.activeLeagueId, () => {
  maybeLoadSeasonData()
  maybeLoadPlayers()
  maybeLoadRoster()
  maybeLoadEspn()
})
```

- [ ] **Step 7: Update the empty-state message for ESPN**

Replace the `emptyStateMessage` computed (line ~216) with one that handles the ESPN cases (loading, unsupported scoring type, missing credentials):

```typescript
const emptyStateMessage = computed(() => {
  // ESPN branch
  if (leagueStore.activePlatform === 'espn') {
    if (!espn.loaded.value) return 'Loading your team’s edge…'
    if (espn.supported.value === false)
      return 'My Team supports head-to-head category leagues. This ESPN league isn’t a category league.'
    if (!espn.myTeamId.value)
      return 'Connect your ESPN account to see your team’s edge.'
    return 'No category data yet for this league. Check back once weeks have been scored.'
  }
  // Yahoo branch (unchanged behavior)
  if (isYahooCategoryLeague.value && !seasonLoaded.value) return 'Loading your team’s edge…'
  const id = leagueStore.activeLeagueId
  if (id && !isYahooCategoryLeague.value) {
    return 'My Team is built for head-to-head category leagues. This league type isn’t supported here yet.'
  }
  return 'Connect or select a category league to see your team’s edge.'
})
```

- [ ] **Step 8: Type-check, build, test**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "MyTeamView"`
Expected: no output (no new errors). If a downstream computed complains that a renamed symbol is undefined, you missed a rename in Step 2; fix it.

Run: `npm test`
Expected: all tests pass (existing 56 + the 10 new mapper tests = 66).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/views/MyTeamView.vue
git commit -m "feat(espn): platform switch wires ESPN category data into My Team"
```

---

## Task 6: Verification gate + manual check

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `npm test` (expect 66 passed), `npm run build` (ok), `npx vue-tsc --noEmit -p tsconfig.json` (no new errors beyond the 4 known pre-existing).

- [ ] **Step 2: Manual check on the real ESPN league**

Run: `npm run dev`. With the ESPN category league active ("No League for Ordinary Gentlemen"):
- My Team renders the verdict header (rank N of M), where-you're-losing with inline adds, your-edge, category profile, and roster.
- ERA/WHIP show as lower-is-better in the category profile (worst rank = far right, same as Yahoo).
- No stud is wrongly flagged DROP?; at most ~3 drop tags.
- Switching back to the Yahoo league still works identically (regression check).
- If the page is empty, read the console for `[useEspnCategoryTeamData] load failed` and the `[ESPN getCategoryStatsBreakdown]` logs to see whether it's a no-credentials, not-a-category-league, or no-completed-weeks case (each maps to the empty-state copy from Task 5 Step 7).

- [ ] **Step 3: No deploy**

Confirm: nothing pushed, nothing deployed. Branch `redesign/my-team-first` only.

---

## Notes
- Local only; no push/deploy. The analytics core (`src/myteam/`, `src/recommendations/`, `src/players/`) is NOT modified — only fed new inputs.
- Honest method: contribution stays "season-to-date among rostered players," not a projection (same as Yahoo).
- Out of scope (do not build): Players page ESPN adds, Matchup page, ESPN roto, non-baseball ESPN verification, true ROS projections.
- No banned patterns, no em dashes.
