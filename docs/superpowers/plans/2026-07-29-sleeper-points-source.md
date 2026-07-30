# Sleeper Points Source (Phase 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Sleeper points source and a platform-source facade so Sleeper leagues (primarily football/dynasty) render in the redesign points views (My Team / Matchup / Wire / Trades), feeding the Phase-3a value engine via `usePointsValue`.

**Architecture:** A thin `useSleeperLeaguePool` reads already-loaded `leagueStore` refs (rosters/users/players/currentLeague/currentUserId) and maps them to the source interface (keyed by Sleeper `player_id`, which id-matches football projections directly). A `useActivePointsSource` facade selects/normalizes ESPN/Yahoo/Sleeper into ONE shape and owns the `myTeamKey`/`teamNames`/`teamMeta`/`freeAgents` derivation that today lives per-platform inside each view. The 4 views swap their `isEspn ? espn.x : yahoo.x` computeds for `source.x`. ESPN/Yahoo values are unchanged (non-regression).

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-29-sleeper-points-source-design.md`

**Routing note (verified):** the 4 wrappers (`MyTeamWrapper`/`MatchupWrapper`/`PlayersWrapper`/`TradesWrapper`) select the Points view when `getLeagueType(scoring_type) === 'points'`. Sleeper leagues have no `scoring_type` field → `getLeagueType(undefined) === 'points'` → the Points views already render for Sleeper. **No wrapper/router change needed.**

**Non-regression rule (every task):** ESPN and Yahoo must render identically. Run after each task:
`npx vitest run` and `npm run build` (both green).

Reference — the source interface each view consumes today (from the ESPN/Yahoo branches):
- `pool: PointsPoolPlayer[]`, `fgByKey: Record<string, FGProjection|null>`, `rosterSlots: Record<string,number>`, `loading: boolean`
- `myTeamKey: string` (ESPN `espnPoints.myTeamId ?? ''`; Yahoo `yahooTeams.find(is_my_team).team_key`)
- `myTeamName`, `myTeamLogo`, `myRecord` (strings)
- `teamNames: Record<string,string>`, `teamMeta: Record<string, OutlookTeamMeta>` where `OutlookTeamMeta = { wins; losses; ties; pointsFor }` (from `@/myteam/seasonOutlook`)
- `freeAgents: AvailablePlayer[]` (Wire only; ESPN `espnPoints.freeAgents`, Yahoo `useAvailablePlayers().players`)

`PointsPoolPlayer` (`@/myteam/pointsTeam`): `{ playerKey; name; position; eligiblePositions?; teamKey; proTeam?; headshot?; onIL?; status? }`.
`AvailablePlayer` (`@/players/types`): `{ playerKey; name; position; eligiblePositions?; team; headshot?; percentOwned; percentChange?; status?; stats }`.

---

### Task 1: `useSleeperLeaguePool` + pure helpers

**Files:**
- Create: `src/composables/useSleeperLeaguePool.ts`
- Create: `src/composables/__tests__/useSleeperLeaguePool.test.ts`

The pure mapping helpers are exported for unit testing; the composable wraps them over the store refs.

- [ ] **Step 1: Write the failing test** — `src/composables/__tests__/useSleeperLeaguePool.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildSleeperPool, buildSleeperTeamNames, buildSleeperTeamMeta, buildSleeperFreeAgents, sleeperMyTeamKey } from '@/composables/useSleeperLeaguePool'

const players = {
  p1: { player_id: 'p1', full_name: 'Josh Allen', position: 'QB', fantasy_positions: ['QB'], team: 'BUF', injury_status: null, status: 'Active' },
  p2: { player_id: 'p2', full_name: 'Bijan Robinson', position: 'RB', fantasy_positions: ['RB'], team: 'ATL', injury_status: null, status: 'Active' },
  p3: { player_id: 'p3', full_name: 'CeeDee Lamb', position: 'WR', fantasy_positions: ['WR'], team: 'DAL', injury_status: 'Questionable', status: 'Active' },
  fa1: { player_id: 'fa1', full_name: 'Free Agent RB', position: 'RB', fantasy_positions: ['RB'], team: 'NYJ', injury_status: null, status: 'Active' },
  dst: { player_id: 'dst1', full_name: 'D/ST', position: 'DEF', fantasy_positions: ['DEF'], team: 'SF', injury_status: null, status: 'Active' },
} as any
const rosters = [
  { roster_id: 1, owner_id: 'u1', players: ['p1', 'p2'], starters: ['p1', 'p2'], settings: { wins: 3, losses: 1, ties: 0, fpts: 420, fpts_decimal: 5 } },
  { roster_id: 2, owner_id: 'u2', players: ['p3'], starters: ['p3'], settings: { wins: 2, losses: 2, ties: 0, fpts: 300, fpts_decimal: 0 } },
] as any
const users = [
  { user_id: 'u1', display_name: 'alice', metadata: { team_name: 'Alice Team' } },
  { user_id: 'u2', display_name: 'bob', metadata: {} },
] as any

describe('buildSleeperPool', () => {
  it('maps each roster player to a PointsPoolPlayer keyed by player_id, teamKey = roster_id', () => {
    const pool = buildSleeperPool(rosters, players)
    expect(pool).toHaveLength(3)
    const p1 = pool.find((p) => p.playerKey === 'p1')!
    expect(p1).toMatchObject({ playerKey: 'p1', name: 'Josh Allen', position: 'QB', teamKey: '1', proTeam: 'BUF' })
    expect(p1.eligiblePositions).toEqual(['QB'])
    const p3 = pool.find((p) => p.playerKey === 'p3')!
    expect(p3.teamKey).toBe('2')
    expect(p3.onIL).toBe(false) // 'Questionable' is not out
  })
  it('skips roster player_ids missing from the players map', () => {
    const pool = buildSleeperPool([{ roster_id: 9, owner_id: 'x', players: ['ghost'], starters: [], settings: {} }] as any, players)
    expect(pool).toHaveLength(0)
  })
})

describe('sleeperMyTeamKey', () => {
  it('is the String(roster_id) whose owner_id === currentUserId', () => {
    expect(sleeperMyTeamKey(rosters, 'u2')).toBe('2')
    expect(sleeperMyTeamKey(rosters, 'nope')).toBe('')
    expect(sleeperMyTeamKey(rosters, null)).toBe('')
  })
})

describe('buildSleeperTeamNames / Meta', () => {
  it('names by roster_id via team_name → display_name fallback', () => {
    const names = buildSleeperTeamNames(rosters, users)
    expect(names['1']).toBe('Alice Team')
    expect(names['2']).toBe('bob')
  })
  it('meta carries wins/losses/ties/pointsFor (fpts + decimal)', () => {
    const meta = buildSleeperTeamMeta(rosters)
    expect(meta['1']).toEqual({ wins: 3, losses: 1, ties: 0, pointsFor: 420.05 })
    expect(meta['2'].pointsFor) .toBe(300)
  })
})

describe('buildSleeperFreeAgents', () => {
  it('returns unrostered skill-position players with a team, as AvailablePlayer', () => {
    const fas = buildSleeperFreeAgents(rosters, players)
    const keys = fas.map((f) => f.playerKey)
    expect(keys).toContain('fa1')      // unrostered RB with team
    expect(keys).not.toContain('p1')   // rostered
    expect(keys).not.toContain('dst1') // DEF is not a valued skill position (v1)
    const fa = fas.find((f) => f.playerKey === 'fa1')!
    expect(fa).toMatchObject({ playerKey: 'fa1', name: 'Free Agent RB', position: 'RB', team: 'NYJ' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/composables/__tests__/useSleeperLeaguePool.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/composables/useSleeperLeaguePool.ts`**
```ts
import { computed, ref, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import { parseRosterSlots } from '@/trades/rosterSlots'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { OutlookTeamMeta } from '@/myteam/seasonOutlook'
import type { AvailablePlayer } from '@/players/types'
import type { SleeperRoster, SleeperUser, SleeperPlayer } from '@/types/sleeper'

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE'])
const OUT_STATUSES = new Set(['OUT', 'IR', 'PUP', 'SUSP', 'NA', 'DNR'])

function isOut(injury?: string | null): boolean {
  const u = String(injury ?? '').toUpperCase()
  return OUT_STATUSES.has(u)
}

/** Roster players → PointsPoolPlayer[], keyed by Sleeper player_id, teamKey = String(roster_id). */
export function buildSleeperPool(
  rosters: SleeperRoster[],
  players: Record<string, SleeperPlayer>,
): PointsPoolPlayer[] {
  const out: PointsPoolPlayer[] = []
  for (const r of rosters) {
    for (const pid of r.players ?? []) {
      const p = players[pid]
      if (!p) continue
      out.push({
        playerKey: pid,
        name: p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        position: p.position || (p.fantasy_positions?.[0] ?? ''),
        eligiblePositions: p.fantasy_positions?.length ? p.fantasy_positions : (p.position ? [p.position] : []),
        teamKey: String(r.roster_id),
        proTeam: p.team ?? '',
        onIL: isOut(p.injury_status),
        status: p.injury_status ?? p.status ?? '',
      })
    }
  }
  return out
}

export function sleeperMyTeamKey(rosters: SleeperRoster[], currentUserId: string | null): string {
  if (!currentUserId) return ''
  const mine = rosters.find((r) => r.owner_id === currentUserId)
  return mine ? String(mine.roster_id) : ''
}

export function buildSleeperTeamNames(rosters: SleeperRoster[], users: SleeperUser[]): Record<string, string> {
  const userById = new Map(users.map((u) => [u.user_id, u]))
  const out: Record<string, string> = {}
  for (const r of rosters) out[String(r.roster_id)] = sleeperService.getTeamName(r, userById.get(r.owner_id))
  return out
}

export function buildSleeperTeamMeta(rosters: SleeperRoster[]): Record<string, OutlookTeamMeta> {
  const out: Record<string, OutlookTeamMeta> = {}
  for (const r of rosters) {
    const s: any = r.settings ?? {}
    out[String(r.roster_id)] = {
      wins: Number(s.wins ?? 0),
      losses: Number(s.losses ?? 0),
      ties: Number(s.ties ?? 0),
      pointsFor: Number(s.fpts ?? 0) + Number(s.fpts_decimal ?? 0) / 100,
    }
  }
  return out
}

/** Unrostered skill-position players (with an NFL team) as AvailablePlayer[] — the Sleeper FA pool. */
export function buildSleeperFreeAgents(
  rosters: SleeperRoster[],
  players: Record<string, SleeperPlayer>,
): AvailablePlayer[] {
  const rostered = new Set<string>()
  for (const r of rosters) for (const pid of r.players ?? []) rostered.add(pid)
  const out: AvailablePlayer[] = []
  for (const [pid, p] of Object.entries(players)) {
    if (rostered.has(pid)) continue
    if (!p.team) continue
    const pos = p.position || (p.fantasy_positions?.[0] ?? '')
    if (!SKILL_POSITIONS.has(pos)) continue
    out.push({
      playerKey: pid,
      name: p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      position: pos,
      eligiblePositions: p.fantasy_positions?.length ? p.fantasy_positions : [pos],
      team: p.team,
      percentOwned: 0,
      status: p.injury_status ?? '',
      stats: {},
    })
  }
  return out
}

export function useSleeperLeaguePool(): {
  pool: ComputedRef<PointsPoolPlayer[]>
  fgByKey: ComputedRef<Record<string, FGProjection | null>>
  rosterSlots: ComputedRef<Record<string, number>>
  myTeamKey: ComputedRef<string>
  myTeamName: ComputedRef<string>
  myTeamLogo: ComputedRef<string>
  myRecord: ComputedRef<string>
  teamNames: ComputedRef<Record<string, string>>
  teamMeta: ComputedRef<Record<string, OutlookTeamMeta>>
  freeAgents: ComputedRef<AvailablePlayer[]>
  loading: ComputedRef<boolean>
  loaded: ComputedRef<boolean>
  supported: ComputedRef<boolean>
  load: () => void
} {
  const leagueStore = useLeagueStore()

  const pool = computed(() => buildSleeperPool(leagueStore.rosters as any, leagueStore.players as any))

  // Baseball matcher (symmetry; unused for football, which resolves via usePointsValue's pool path).
  const matchFG = ref<((p: { full_name?: string; mlb_team?: string }) => FGProjection | null) | null>(null)
  const fgByKey = computed<Record<string, FGProjection | null>>(() => {
    const m = matchFG.value
    if (!m) return {}
    const out: Record<string, FGProjection | null> = {}
    for (const p of pool.value) out[p.playerKey] = m({ full_name: p.name, mlb_team: p.proTeam })
    return out
  })

  const rosterSlots = computed(() =>
    parseRosterSlots('sleeper', { roster_positions: leagueStore.currentLeague?.roster_positions ?? [] }, leagueStore.activeSport),
  )

  const myTeamKey = computed(() => sleeperMyTeamKey(leagueStore.rosters as any, leagueStore.currentUserId))
  const teamNames = computed(() => buildSleeperTeamNames(leagueStore.rosters as any, leagueStore.users as any))
  const teamMeta = computed(() => buildSleeperTeamMeta(leagueStore.rosters as any))
  const freeAgents = computed(() => buildSleeperFreeAgents(leagueStore.rosters as any, leagueStore.players as any))

  const myRoster = computed(() => (leagueStore.rosters as any as SleeperRoster[]).find((r) => r.owner_id === leagueStore.currentUserId))
  const userById = computed(() => new Map((leagueStore.users as any as SleeperUser[]).map((u) => [u.user_id, u])))
  const myTeamName = computed(() => (myRoster.value ? sleeperService.getTeamName(myRoster.value, userById.value.get(myRoster.value.owner_id)) : 'My Team'))
  const myTeamLogo = computed(() =>
    myRoster.value && leagueStore.currentLeague
      ? sleeperService.getAvatarUrl(myRoster.value, userById.value.get(myRoster.value.owner_id), leagueStore.currentLeague as any)
      : '',
  )
  const myRecord = computed(() => {
    const s: any = myRoster.value?.settings
    if (!s) return ''
    return `${s.wins ?? 0}-${s.losses ?? 0}${s.ties ? `-${s.ties}` : ''}`
  })

  const loading = computed(() => Object.keys(leagueStore.players ?? {}).length === 0 && (leagueStore.rosters?.length ?? 0) === 0)
  const loaded = computed(() => (leagueStore.rosters?.length ?? 0) > 0)
  const supported = computed(() => true)

  function load() {
    // Store already loads rosters/users/players on league-select. Ensure the baseball
    // matcher (for the symmetry path) and the players map exist.
    if (!matchFG.value) buildPlayerMatchers().then((m) => { matchFG.value = m.matchFG })
    if (Object.keys(leagueStore.players ?? {}).length === 0) {
      sleeperService.getPlayers().then((p) => { (leagueStore as any).players = p }).catch(() => {})
    }
  }

  return { pool, fgByKey, rosterSlots, myTeamKey, myTeamName, myTeamLogo, myRecord, teamNames, teamMeta, freeAgents, loading, loaded, supported, load }
}
```
Note: `leagueStore.players`/`rosters`/`users` are exposed by the store (verified). If assigning `leagueStore.players = p` in `load()` triggers a lint/readonly error (Pinia state is writable via the store instance), instead call an existing store action that populates players — grep the store for a `loadPlayers`/`getPlayers` action; if none exists, drop that fallback line (the store already populates players on league-select, so it's belt-and-suspenders).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/composables/__tests__/useSleeperLeaguePool.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Build + commit**

Run: `npm run build` (clean — additive, no consumer yet).
```bash
git add src/composables/useSleeperLeaguePool.ts src/composables/__tests__/useSleeperLeaguePool.test.ts
git commit -m "feat: useSleeperLeaguePool — Sleeper points source (reads league store)"
```

---

### Task 2: `useActivePointsSource` facade

**Files:**
- Create: `src/composables/useActivePointsSource.ts`
- Create: `src/composables/__tests__/useActivePointsSource.test.ts`

The facade instantiates all three sources + `useAvailablePlayers` (cheap — refs only, no fetch until `load()`), and returns one normalized shape selected by `leagueStore.activePlatform`. It owns the per-platform `myTeamKey`/`teamNames`/`teamMeta`/`freeAgents` derivation.

- [ ] **Step 1: Write the failing test** — exercises the pure normalization helpers (the reactive selection is covered by smoke):
```ts
import { describe, it, expect } from 'vitest'
import { yahooMyTeamKey, yahooTeamNames, yahooTeamMeta, espnTeamMeta } from '@/composables/useActivePointsSource'

describe('yahoo identity helpers', () => {
  const teams = [
    { team_key: 'y.1', name: 'A', is_my_team: false, wins: 2, losses: 1, ties: 0, points_for: 100, logo_url: 'a.png' },
    { team_key: 'y.2', name: 'B', is_my_team: true, wins: 3, losses: 0, ties: 0, points_for: 150, logo_url: 'b.png' },
  ]
  it('myTeamKey is the is_my_team team_key', () => { expect(yahooMyTeamKey(teams)).toBe('y.2') })
  it('teamNames maps team_key → name', () => { expect(yahooTeamNames(teams)).toEqual({ 'y.1': 'A', 'y.2': 'B' }) })
  it('teamMeta maps records', () => { expect(yahooTeamMeta(teams)['y.2']).toEqual({ wins: 3, losses: 0, ties: 0, pointsFor: 150 }) })
})

describe('espnTeamMeta', () => {
  it('maps ESPN teamRecords → OutlookTeamMeta', () => {
    const recs = { '1': { wins: 4, losses: 1, ties: 0, pointsFor: 500 } }
    expect(espnTeamMeta(recs)).toEqual({ '1': { wins: 4, losses: 1, ties: 0, pointsFor: 500 } })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/composables/__tests__/useActivePointsSource.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/composables/useActivePointsSource.ts`**
```ts
import { computed, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useSleeperLeaguePool } from '@/composables/useSleeperLeaguePool'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { OutlookTeamMeta } from '@/myteam/seasonOutlook'
import type { AvailablePlayer } from '@/players/types'
import type { FGProjection } from '@/services/projectionService'

export function yahooMyTeamKey(teams: any[]): string {
  const me = (teams ?? []).find((t) => t?.is_my_team)
  return me ? String(me.team_key) : ''
}
export function yahooTeamNames(teams: any[]): Record<string, string> {
  return Object.fromEntries((teams ?? []).map((t) => [String(t.team_key), String(t.name ?? '')]))
}
export function yahooTeamMeta(teams: any[]): Record<string, OutlookTeamMeta> {
  const out: Record<string, OutlookTeamMeta> = {}
  for (const t of teams ?? []) {
    out[String(t.team_key)] = {
      wins: Number(t.wins ?? 0), losses: Number(t.losses ?? 0), ties: Number(t.ties ?? 0), pointsFor: Number(t.points_for ?? 0),
    }
  }
  return out
}
export function espnTeamMeta(recs: Record<string, { wins: number; losses: number; ties: number; pointsFor: number }>): Record<string, OutlookTeamMeta> {
  const out: Record<string, OutlookTeamMeta> = {}
  for (const [k, r] of Object.entries(recs ?? {})) out[k] = { wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor }
  return out
}

export interface ActivePointsSource {
  pool: ComputedRef<PointsPoolPlayer[]>
  fgByKey: ComputedRef<Record<string, FGProjection | null>>
  rosterSlots: ComputedRef<Record<string, number>>
  loading: ComputedRef<boolean>
  myTeamKey: ComputedRef<string>
  myTeamName: ComputedRef<string>
  myTeamLogo: ComputedRef<string>
  myRecord: ComputedRef<string>
  teamNames: ComputedRef<Record<string, string>>
  teamMeta: ComputedRef<Record<string, OutlookTeamMeta>>
  freeAgents: ComputedRef<AvailablePlayer[]>
  load: () => void
  loadFreeAgents: (count?: number) => void
}

export function useActivePointsSource(): ActivePointsSource {
  const leagueStore = useLeagueStore()
  const espn = useEspnPointsTeamData()
  const yahoo = useYahooLeaguePool()
  const sleeper = useSleeperLeaguePool()
  const avail = useAvailablePlayers()

  const platform = computed(() => leagueStore.activePlatform)
  const isEspn = computed(() => platform.value === 'espn')
  const isSleeper = computed(() => platform.value === 'sleeper')

  const pool = computed<PointsPoolPlayer[]>(() =>
    (isEspn.value ? espn.pool.value : isSleeper.value ? sleeper.pool.value : yahoo.pool.value) as PointsPoolPlayer[],
  )
  const fgByKey = computed(() => (isEspn.value ? espn.fgByKey.value : isSleeper.value ? sleeper.fgByKey.value : yahoo.fgByKey.value))
  const rosterSlots = computed(() => (isEspn.value ? espn.rosterSlots.value : isSleeper.value ? sleeper.rosterSlots.value : yahoo.rosterSlots.value))
  const loading = computed(() => (isEspn.value ? espn.loading.value : isSleeper.value ? sleeper.loading.value : yahoo.loading.value))

  const myTeamKey = computed(() =>
    isEspn.value ? (espn.myTeamId.value ?? '') : isSleeper.value ? sleeper.myTeamKey.value : yahooMyTeamKey(leagueStore.yahooTeams as any),
  )
  const myTeamName = computed(() => {
    if (isEspn.value) return espn.myTeamName.value || 'My Team'
    if (isSleeper.value) return sleeper.myTeamName.value
    const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
    return String(me?.name ?? 'My Team')
  })
  const myTeamLogo = computed(() => {
    if (isEspn.value) return espn.myTeamLogo.value
    if (isSleeper.value) return sleeper.myTeamLogo.value
    const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
    return String(me?.logo_url ?? '')
  })
  const myRecord = computed(() => (isEspn.value ? espn.myRecord.value : isSleeper.value ? sleeper.myRecord.value : ''))

  const teamNames = computed(() =>
    isEspn.value ? espn.teamNames.value : isSleeper.value ? sleeper.teamNames.value : yahooTeamNames(leagueStore.yahooTeams as any),
  )
  const teamMeta = computed(() =>
    isEspn.value ? espnTeamMeta(espn.teamRecords.value) : isSleeper.value ? sleeper.teamMeta.value : yahooTeamMeta(leagueStore.yahooTeams as any),
  )

  const freeAgents = computed<AvailablePlayer[]>(() =>
    isEspn.value ? (espn.freeAgents.value as any) : isSleeper.value ? sleeper.freeAgents.value : avail.players.value,
  )

  function load() {
    if (isEspn.value) espn.load()
    else if (isSleeper.value) sleeper.load()
    else yahoo.load()
  }
  function loadFreeAgents(count = 200) {
    // ESPN loads FAs inside load(); Sleeper derives them from the store. Only Yahoo needs a fetch.
    if (!isEspn.value && !isSleeper.value) avail.load(count)
  }

  return { pool, fgByKey, rosterSlots, loading, myTeamKey, myTeamName, myTeamLogo, myRecord, teamNames, teamMeta, freeAgents, load, loadFreeAgents }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/composables/__tests__/useActivePointsSource.test.ts`
Expected: PASS.

- [ ] **Step 5: Build + commit**

Run: `npm run build` (clean — additive).
```bash
git add src/composables/useActivePointsSource.ts src/composables/__tests__/useActivePointsSource.test.ts
git commit -m "feat: useActivePointsSource — platform-source facade (espn/yahoo/sleeper)"
```

---

### Task 3: Rewire `PointsMyTeamView.vue`

**Files:** Modify `src/views/PointsMyTeamView.vue`

Replace the ESPN/Yahoo source instantiation + all `isEspn ? … : …` source computeds + the Yahoo-branch identity computeds with the facade.

- [ ] **Step 1: Swap imports + instantiation.** Remove `import { useYahooLeaguePool }` and `import { useEspnPointsTeamData }`; add `import { useActivePointsSource } from '@/composables/useActivePointsSource'`. Replace:
```ts
const yahooLeague = useYahooLeaguePool()
const espnPoints = useEspnPointsTeamData()
const scoring = useLeagueScoring()
```
with:
```ts
const source = useActivePointsSource()
const scoring = useLeagueScoring()
```
Keep `isEspn`/`isFootball` only if still referenced elsewhere in the file (grep; `isFootball` IS used for display — keep it; `isEspn` is likely now unused — remove if so).

- [ ] **Step 2: Swap `loadAll`.**
```ts
function loadAll() {
  scoring.load()
  source.load()
}
```

- [ ] **Step 3: Swap the source computeds.** Replace lines 34-82 (pool/fgByKey/rosterSlots/loading + myTeamKey/myTeamName/myRecord/myTeamLogo + teamMeta) with:
```ts
const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const loading = source.loading
const myTeamKey = source.myTeamKey
const myTeamName = source.myTeamName
const myRecord = source.myRecord
const myTeamLogo = source.myTeamLogo
const teamMeta = source.teamMeta
```
(`usePointsValue({ pool, fgByKey, sport, season })` and `useSeasonOutlook({ pool, valueByKey, rosterSlots, myTeamKey, teamMeta })` calls stay unchanged — they now receive the facade refs. `buildPointsTeam(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value)` unchanged.)

- [ ] **Step 4: Verify + commit.**
Run: `npx vitest run && npm run build` (green; ESPN/Yahoo identical). Manually confirm no remaining `espnPoints.`/`yahooLeague.` references: `grep -nE "espnPoints|yahooLeague" src/views/PointsMyTeamView.vue` → none.
```bash
git add src/views/PointsMyTeamView.vue && git commit -m "refactor: PointsMyTeamView uses useActivePointsSource facade"
```

---

### Task 4: Rewire `PointsMatchupView.vue`

**Files:** Modify `src/views/PointsMatchupView.vue`

- [ ] **Step 1: Imports + instantiation** — same swap as Task 3 (remove the two source imports, add `useActivePointsSource`; `const source = useActivePointsSource()`). Keep `useThisWeekOpponent`, schedule refs, `useLeagueScoring`.

- [ ] **Step 2: `loadAll`:**
```ts
function loadAll() {
  scoring.load()
  oppSvc.load()
  loadSchedule()
  source.load()
}
```

- [ ] **Step 3: Swap source computeds** (lines 49-75 and the teamMeta at 109-127):
```ts
const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const loading = source.loading
const myTeamKey = source.myTeamKey
const myTeamName = source.myTeamName
const myTeamLogo = source.myTeamLogo
const teamMeta = source.teamMeta
```
`usePointsValue`, `useSeasonOutlook`, both `buildPointsMatchup(...)` calls, `volMatchup`, `seasonStakes` wiring unchanged. **In `myRank` (line 136-144)** there's an `if (!isEspn.value)` Yahoo-specific fallback reading `leagueStore.yahooTeams`. Keep that block but guard it to Yahoo only: change `if (!isEspn.value)` to `if (leagueStore.activePlatform === 'yahoo')` (Sleeper has no `rank` on a yahoo-teams shape; its rank comes from the outlook). Remove the now-unused `isEspn` if nothing else uses it (grep; `leagueSize` at line 104 references `leagueStore.yahooTeams?.length` — leave as a fallback, harmless for Sleeper).

- [ ] **Step 4: Verify + commit.**
Run: `npx vitest run && npm run build` (green). `grep -nE "espnPoints|yahooLeague" src/views/PointsMatchupView.vue` → none.
```bash
git add src/views/PointsMatchupView.vue && git commit -m "refactor: PointsMatchupView uses useActivePointsSource facade"
```

---

### Task 5: Rewire `PointsWireView.vue`

**Files:** Modify `src/views/PointsWireView.vue`

This view additionally uses `freeAgents` (now from the facade) and `useAvailablePlayers` (now owned by the facade).

- [ ] **Step 1: Imports + instantiation.** Remove `useYahooLeaguePool`, `useEspnPointsTeamData`, and `useAvailablePlayers` imports + their instantiations; add `useActivePointsSource`. `const source = useActivePointsSource()`. Keep `useLeagueScoring`, schedule.

- [ ] **Step 2: `loadAll`** — the facade decides whether a FA fetch is needed:
```ts
function loadAll() {
  scoring.load()
  loadSchedule()
  source.load()
  source.loadFreeAgents(200)
}
```

- [ ] **Step 3: Swap source computeds** (lines 44-61):
```ts
const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const myTeamKey = source.myTeamKey

// Free agents minus anyone already rostered (the platform FA feed can leak rostered players).
const freeAgents = computed(() => {
  const rostered = new Set(pool.value.map((p) => p.playerKey))
  const guard = pool.value.length > 0
  return source.freeAgents.value.filter((fa) => !guard || !rostered.has(fa.playerKey))
})
```
The `usePointsValue({ pool, fgByKey, sport, season, freeAgents })` call (with `valueByKey, valueOf, loading: valueLoading`) stays unchanged — `freeAgents` is now the facade-derived, roster-filtered list. `buildPointsTeam`, `rosterBodies`, `buildPointsWire(freeAgents.value, valueOf.value, schedule.value, rosterBodies.value)`, `drops` unchanged.

- [ ] **Step 4: Verify + commit.**
Run: `npx vitest run && npm run build` (green). `grep -nE "espnPoints|yahooLeague|useAvailablePlayers|avail\." src/views/PointsWireView.vue` → none.
```bash
git add src/views/PointsWireView.vue && git commit -m "refactor: PointsWireView uses useActivePointsSource facade (incl. free agents)"
```

---

### Task 6: Rewire `PointsTradesView.vue`

**Files:** Modify `src/views/PointsTradesView.vue`

- [ ] **Step 1: Imports + instantiation** — same swap (remove the two source imports, add `useActivePointsSource`; `const source = useActivePointsSource()`).

- [ ] **Step 2: `loadAll`:**
```ts
function loadAll() {
  scoring.load()
  source.load()
}
```

- [ ] **Step 3: Swap source computeds** (lines 29-44):
```ts
const pool = source.pool
const fgByKey = source.fgByKey
const rosterSlots = source.rosterSlots
const loading = source.loading
const myTeamKey = source.myTeamKey
const teamNames = source.teamNames
```
`usePointsValue`, `buildPointsTrades(pool.value, valueByKey.value, myTeamKey.value, rosterSlots.value, teamNames.value)`, and `buildPointsTradeLandscape(pool.value, valueByKey.value, fgByKey.value, myTeamKey.value, teamNames.value, leagueStore.activeSport)` unchanged. Remove `isEspn` if now unused (grep; `isFootball` stays for display).

- [ ] **Step 4: Verify + commit.**
Run: `npx vitest run && npm run build` (green). `grep -nE "espnPoints|yahooLeague" src/views/PointsTradesView.vue` → none.
```bash
git add src/views/PointsTradesView.vue && git commit -m "refactor: PointsTradesView uses useActivePointsSource facade"
```

---

## Final verification (after Task 6)

- [ ] `npx vitest run` — full suite green.
- [ ] `npm run build` — clean.
- [ ] Grep confirms the views no longer touch the raw sources: `grep -rnE "espnPoints|yahooLeague|useEspnPointsTeamData|useYahooLeaguePool" src/views/Points*.vue` → no hits (all four go through the facade).
- [ ] Confirm ESPN/Yahoo unchanged (non-regression) and the facade is the single platform-branch site.

## Smoke test (manual, after Task 6)

On a real **Sleeper football** dynasty league (set active):
1. My Team — roster rows show per-week football value; QB/RB/WR/TE ranked; team name/record/logo populate.
2. Wire — unrostered skill players show per-week value; adds ranked.
3. Trades — landscape shows QB/RB/WR/TE rows with Sleeper team names.
4. Matchup — season-total lineup strength (weekly = Phase 4).

On existing **ESPN** and **Yahoo** points leagues — **no visible change** (facade returns identical values).
