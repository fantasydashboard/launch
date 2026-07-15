# Draft Report in History — Phase 1 (Points Parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graded **Draft Report** to the bottom of the League History page for **points** leagues on all three platforms (ESPN/Yahoo/Sleeper) — steal, bust, best/worst drafter, every-team grades, your-team spotlight — reusing the live `draftGrading.ts` engine; and retire the standalone `/draft` page from the primary nav (kept reachable).

**Architecture:** Per-platform *loaders* fetch each season's draft + player season data, compute position ranks, grade every pick via `calculatePickScore`/`scoreToGrade` and teams via `calculateTeamGrade`/`getRelativeTeamGrade`, and normalize to one platform-agnostic `GradedDraft`. A pure, tested reducer `buildDraftReport(GradedDraft)` selects the highlights. A composable `useDraftReport` routes to the right loader and never throws into History. A lazy `HistoryView` section renders it with a season picker. Category leagues get an honest "points only for now" note (Phase 2 adds them). The old `/draft` views are left untouched.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest. Reuses `src/services/draftGrading.ts`, the platform services (`espnService`/`yahooService`/`sleeperService`), `useLeagueHistory`, `TeamAvatar`.

**Local only** — no push/prod.

---

## Unified contract (defined in Task 1, consumed by all later tasks)

```ts
export interface GradedPick {
  teamKey: string          // 'espn_team_<id>' | '<yahooLeagueKey>.t.<id>' | 'sleeper_<roster_id>'
  teamName: string
  teamLogo?: string
  playerName: string
  position: string
  round: number
  overallPick: number
  score: number            // PickScoreResult.totalScore
  grade: string            // scoreToGrade(score)
  verdict: string          // JACKPOT|STEAL|HIT|SOLID|MISS|BUST|DISASTER
  tierMovement: string     // e.g. 'BENCH→ELITE'
  draftedTier: string
  finishedTier: string
}
export interface GradedTeam {
  teamKey: string
  teamName: string
  teamLogo?: string
  gradeScore: number
  grade: string            // getRelativeTeamGrade(...)
  rank: number             // 1 = best drafter
}
export interface GradedDraft {
  picks: GradedPick[]
  teams: GradedTeam[]      // pre-sorted by rank asc (rank 1 first)
  numTeams: number
  myTeamKey: string | null
}
```

The loaders (Tasks 3–5) each return a `GradedDraft`. The reducer (Task 1), composable (Task 6), and view (Task 7) depend ONLY on these types — never on platform raw shapes.

---

## Task 1: `buildDraftReport` pure reducer + contract types

**Files:**
- Create: `src/draft/report/types.ts`
- Create: `src/draft/report/buildDraftReport.ts`
- Test: `src/draft/report/__tests__/buildDraftReport.test.ts`

- [ ] **Step 1: Create the contract types** — `src/draft/report/types.ts`

Paste the `GradedPick`, `GradedTeam`, `GradedDraft` interfaces from the "Unified contract" section above, plus the report output types:
```ts
export interface DraftHighlight {
  teamKey: string
  teamName: string
  teamLogo?: string
  playerName: string
  position: string
  round: number
  overallPick: number
  grade: string
  score: number
  verdict: string
  valueLabel: string       // human line, e.g. 'Rd 6 · BENCH→ELITE'
}
export interface TeamGradeRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  grade: string
  gradeScore: number
  rank: number
  isMe: boolean
}
export interface DraftReport {
  season: number
  teamCount: number
  steal: DraftHighlight | null
  bust: DraftHighlight | null
  bestDrafter: TeamGradeRow | null
  worstDrafter: TeamGradeRow | null
  teamGrades: TeamGradeRow[]
  mySpotlight: {
    grade: string
    rank: number
    bestPick: DraftHighlight | null
    worstPick: DraftHighlight | null
  } | null
}
```

- [ ] **Step 2: Write the failing test** — `src/draft/report/__tests__/buildDraftReport.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { buildDraftReport } from '@/draft/report/buildDraftReport'
import type { GradedDraft, GradedPick, GradedTeam } from '@/draft/report/types'

function pick(p: Partial<GradedPick> & { teamKey: string; playerName: string; round: number; score: number }): GradedPick {
  return {
    teamName: p.teamKey, teamLogo: '', position: p.position ?? 'OF',
    overallPick: p.overallPick ?? p.round * 10, grade: p.grade ?? 'B',
    verdict: p.verdict ?? 'SOLID', tierMovement: p.tierMovement ?? 'STARTER→STARTER',
    draftedTier: 'STARTER', finishedTier: 'STARTER', ...p,
  }
}
function team(teamKey: string, gradeScore: number, rank: number): GradedTeam {
  return { teamKey, teamName: teamKey, teamLogo: '', gradeScore, grade: 'B', rank }
}

const draft: GradedDraft = {
  numTeams: 3,
  myTeamKey: 't2',
  teams: [team('t1', 30, 1), team('t2', 10, 2), team('t3', -20, 3)],
  picks: [
    pick({ teamKey: 't1', playerName: 'Steal Guy', round: 8, score: 45, verdict: 'JACKPOT', tierMovement: 'WAIVER→ELITE' }),
    pick({ teamKey: 't3', playerName: 'Bust Guy', round: 2, score: -35, verdict: 'DISASTER', tierMovement: 'ELITE→WAIVER' }),
    pick({ teamKey: 't2', playerName: 'My Best', round: 3, score: 20 }),
    pick({ teamKey: 't2', playerName: 'My Worst', round: 1, score: -10 }),
    pick({ teamKey: 't1', playerName: 'Late Flier', round: 14, score: -40 }), // worse score but late round — NOT the bust
  ],
}

describe('buildDraftReport', () => {
  it('steal = highest-score pick', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.steal?.playerName).toBe('Steal Guy')
    expect(r.steal?.valueLabel).toBe('Rd 8 · WAIVER→ELITE')
  })
  it('bust = lowest score among early (round<=5) picks, not a late flier', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.bust?.playerName).toBe('Bust Guy') // -35 in round 2 beats Late Flier's -40 in round 14
  })
  it('best/worst drafter come from ranked teams', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.bestDrafter?.teamKey).toBe('t1')
    expect(r.worstDrafter?.teamKey).toBe('t3')
    expect(r.teamGrades.map((t) => t.teamKey)).toEqual(['t1', 't2', 't3'])
    expect(r.teamGrades.find((t) => t.teamKey === 't2')?.isMe).toBe(true)
  })
  it('spotlight uses my team, with my best/worst pick', () => {
    const r = buildDraftReport(draft, 2024)
    expect(r.mySpotlight?.rank).toBe(2)
    expect(r.mySpotlight?.bestPick?.playerName).toBe('My Best')
    expect(r.mySpotlight?.worstPick?.playerName).toBe('My Worst')
  })
  it('no myTeamKey -> null spotlight', () => {
    const r = buildDraftReport({ ...draft, myTeamKey: null }, 2024)
    expect(r.mySpotlight).toBeNull()
  })
  it('empty draft -> all null / empty, no throw', () => {
    const r = buildDraftReport({ picks: [], teams: [], numTeams: 0, myTeamKey: null }, 2024)
    expect(r.steal).toBeNull(); expect(r.bust).toBeNull()
    expect(r.bestDrafter).toBeNull(); expect(r.teamGrades).toEqual([])
    expect(r.mySpotlight).toBeNull()
  })
  it('bust falls back to overall min when there are no early picks', () => {
    const late: GradedDraft = { numTeams: 1, myTeamKey: null, teams: [team('t1', 0, 1)], picks: [
      pick({ teamKey: 't1', playerName: 'A', round: 9, score: -5 }),
      pick({ teamKey: 't1', playerName: 'B', round: 12, score: -30 }),
    ] }
    expect(buildDraftReport(late, 2024).bust?.playerName).toBe('B')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/draft/report/__tests__/buildDraftReport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement** — `src/draft/report/buildDraftReport.ts`

```ts
import type { GradedDraft, GradedPick, DraftReport, DraftHighlight, TeamGradeRow } from './types'

function toHighlight(p: GradedPick): DraftHighlight {
  return {
    teamKey: p.teamKey, teamName: p.teamName, teamLogo: p.teamLogo,
    playerName: p.playerName, position: p.position, round: p.round, overallPick: p.overallPick,
    grade: p.grade, score: p.score, verdict: p.verdict,
    valueLabel: `Rd ${p.round} · ${p.tierMovement}`,
  }
}

/** Pure highlight selection over a normalized, pre-graded draft. Never throws. */
export function buildDraftReport(draft: GradedDraft, season: number): DraftReport {
  const { picks, teams, numTeams, myTeamKey } = draft

  const steal = picks.length
    ? toHighlight([...picks].sort((a, b) => b.score - a.score)[0])
    : null

  // Bust = worst early pick (round <= 5); fall back to the worst pick overall if none are early.
  const early = picks.filter((p) => p.round <= 5)
  const bustPool = early.length ? early : picks
  const bust = bustPool.length
    ? toHighlight([...bustPool].sort((a, b) => a.score - b.score)[0])
    : null

  const teamGrades: TeamGradeRow[] = teams.map((t) => ({
    teamKey: t.teamKey, teamName: t.teamName, teamLogo: t.teamLogo,
    grade: t.grade, gradeScore: t.gradeScore, rank: t.rank,
    isMe: myTeamKey != null && t.teamKey === myTeamKey,
  }))

  const bestDrafter = teamGrades[0] ?? null
  const worstDrafter = teamGrades.length ? teamGrades[teamGrades.length - 1] : null

  let mySpotlight: DraftReport['mySpotlight'] = null
  if (myTeamKey != null) {
    const me = teamGrades.find((t) => t.teamKey === myTeamKey)
    if (me) {
      const mine = picks.filter((p) => p.teamKey === myTeamKey)
      const bestPick = mine.length ? toHighlight([...mine].sort((a, b) => b.score - a.score)[0]) : null
      const worstPick = mine.length ? toHighlight([...mine].sort((a, b) => a.score - b.score)[0]) : null
      mySpotlight = { grade: me.grade, rank: me.rank, bestPick, worstPick }
    }
  }

  return {
    season, teamCount: numTeams,
    steal, bust, bestDrafter, worstDrafter, teamGrades, mySpotlight,
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/draft/report/__tests__/buildDraftReport.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/draft/report/types.ts src/draft/report/buildDraftReport.ts src/draft/report/__tests__/buildDraftReport.test.ts
git commit -m "feat: buildDraftReport reducer + GradedDraft contract (draft report)"
```
(Harmless `.git/gc.log` / "bad object" warning may print — ignore; verify with `git log --oneline -1`.)

---

## Task 2: expose `seasonKeys` from `useLeagueHistory`

**Files:**
- Modify: `src/composables/useLeagueHistory.ts`

Older Draft Reports need that year's platform key. `useLeagueHistory` already walks each platform's season chain — capture the per-season key in a map.

- [ ] **Step 1: Add the ref**

Near the other top-level refs in the composable (e.g. beside `data`/`firstYear`), add:
```ts
  const seasonKeys = ref<Map<number, string>>(new Map())
```
In the `load()` function, where the other refs are reset at the start, add:
```ts
  seasonKeys.value = new Map()
```

- [ ] **Step 2: Populate per platform (locate each loader by content)**

**ESPN loader** — inside the `for (let s = currentSeason; s >= currentSeason - 5; s--)` loop body, after `s` is known, add (uses the same constant `leagueId` from `parseEspnKey` and the loop var `s`):
```ts
      seasonKeys.value.set(s, leagueId)
```

**Yahoo loader** — inside the `while (currentKey && ...)` chain loop, after `const season = Number(metadata.season) || ...` and BEFORE `currentKey` is reassigned (the `currentKey = renew ? ... : undefined` line at the loop's end), add:
```ts
      seasonKeys.value.set(season, currentKey)
```

**Sleeper loader** — inside the `for (const league of hist.seasons)` loop, after `const season = Number(league.season)`, add:
```ts
      seasonKeys.value.set(season, league.league_id)
```

- [ ] **Step 3: Expose it**

In the `return { ... }` object, add `seasonKeys`:
```ts
  return { data, firstYear, platform, sport, myTeamKey, backfilled, snapshotKey, origin, loading, loaded, load, seasonKeys }
```

- [ ] **Step 4: Type-check + suite**

Run: `npm run type-check 2>&1 | grep -i useLeagueHistory` → expect no output.
Run: `npm test` → expect the existing suite still green (this change is additive).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useLeagueHistory.ts
git commit -m "feat: useLeagueHistory — expose per-season platform keys (seasonKeys)"
```
(Ignore the gc.log warning; verify with `git log --oneline -1`.)

---

## Task 3: ESPN points draft loader

**Files:**
- Create: `src/draft/report/loadEspnPointsDraft.ts`

No unit test (I/O orchestration, like the `useLeagueHistory` posture; verified via type-check + build + smoke). Produces a `GradedDraft`.

- [ ] **Step 1: Read the reference implementation**

READ `src/views/PointsDraftView.vue` lines ~2020–2249 (its ESPN branch). This is the exact fetch + rank + grade you are replicating into a pure async function. Note the shapes it uses:
- `espnService.getDraftWithPlayers(sport, leagueId, season)` → `EspnDraftPick[]` (`overallPickNumber`, `roundId`/`round`, `roundPickNumber`, `playerId: number`, `playerName`, `position`, `teamId: number`, `proTeam`, `keeper`, `bidAmount`).
- `espnService.getTeams(sport, leagueId, season)` → `EspnTeam[]` (`id: number`, `name`, `logo`) for team names/logos and `numTeams`.
- `espnService.getTeamsWithRosters(sport, leagueId, season)` → to harvest `player.actualPoints` per `playerId` as season total points.
- Position-rank-drafted map (draft order per position) and current-position-rank map (players within a position sorted by season points), lines ~2118–2176.
- Per-pick grading via `calculatePickScore(overallPickNumber, round, position_rank_drafted || round, current_position_rank, position, numTeams, totalPicks, sport)` + `scoreToGrade(...)`, lines ~2198–2239.

- [ ] **Step 2: Implement `loadEspnPointsDraft`**

Create `src/draft/report/loadEspnPointsDraft.ts` exporting:
```ts
export async function loadEspnPointsDraft(args: {
  sport: string; leagueId: string; season: number
}): Promise<GradedDraft | null>
```
Requirements (mirror the reference branch exactly for fetch + rank + grade, then normalize):
1. Fetch draft picks, teams, and season points as in the reference. If picks are empty → `return null` (the composable maps that to `no-data`).
2. Build the position-rank-drafted map and current-position-rank map exactly as the reference does.
3. For each pick, call `calculatePickScore(...)` and `scoreToGrade(...)` and build a `GradedPick`:
   - `teamKey: 'espn_team_' + pick.teamId`, `teamName`/`teamLogo` from the teams map, `playerName`, `position`,
     `round`, `overallPick: pick.overallPickNumber`, `score: result.totalScore`, `grade`, `verdict: result.verdict`,
     `tierMovement`, `draftedTier`, `finishedTier`.
4. Team grades: group `GradedPick`s by `teamKey`; for each team `calculateTeamGrade(picks.map(p => ({ round: p.round, score: p.score, verdict: p.verdict })))`; sort teams by `gradeResult.gradeScore` desc; assign `rank = index+1`; `grade = getRelativeTeamGrade(rank, numTeams, gradeScore)`. Produce `GradedTeam[]` (rank-sorted).
5. **My team:** `const myTeam = await espnService.getMyTeam(sport, leagueId, season)`; `myTeamKey = myTeam ? 'espn_team_' + myTeam.id : null`. Wrap in try/catch → `null` on failure (spotlight simply omits).
6. Return `{ picks, teams, numTeams, myTeamKey }`. Any thrown fetch error must propagate to the caller (the composable try/catches it) — do NOT swallow it into an empty-but-valid draft; only an empty *picks* result returns `null`.

Import `calculatePickScore`, `scoreToGrade`, `calculateTeamGrade`, `getRelativeTeamGrade` from `@/services/draftGrading`, `espnService` from `@/services/espn`, and the `GradedDraft`/`GradedPick`/`GradedTeam` types from `./types`. `sport` is cast to the service's `Sport` type as the reference does.

- [ ] **Step 3: Type-check**

Run: `npm run type-check 2>&1 | grep -i loadEspnPointsDraft` → expect no output.

- [ ] **Step 4: Commit**

```bash
git add src/draft/report/loadEspnPointsDraft.ts
git commit -m "feat: ESPN points draft loader -> GradedDraft"
```
(Ignore gc.log; verify with `git log --oneline -1`.)

---

## Task 4: Yahoo points draft loader

**Files:**
- Create: `src/draft/report/loadYahooPointsDraft.ts`

- [ ] **Step 1: Read the reference implementation**

READ `src/views/PointsDraftView.vue` lines ~2418–2649 (its Yahoo branch). Key shapes:
- `yahooService.getDraftResults(leagueKey)` → `{ picks: { pick, round, team_key, player_key }[], type, renew }`. If `player_key`s are empty (predraft), the reference falls back to the previous season via `renew` — replicate that fallback.
- `yahooService.getPlayers(playerKeys, leagueKey)` → Map keyed by `player_key` (`{ player_id, name, position, ... }`).
- `yahooService.getPlayerStats(leagueKey, playerKeys)` → Map keyed by `player_key` (`{ total_points }`).
- `yahooService.getStandings(leagueKey)` → `any[]` (`team_key`, `team_id: string`, `name`, `logo_url`) for team names/logos, `numTeams`, and the `team_key → team_id` mapping.
- Position-rank-drafted + current-position-rank maps (by `total_points` within position), lines ~2549–2648.

- [ ] **Step 2: Implement `loadYahooPointsDraft`**

Export:
```ts
export async function loadYahooPointsDraft(args: { leagueKey: string }): Promise<GradedDraft | null>
```
Mirror the reference for fetch + rank + grade, then normalize to `GradedDraft`:
- `yahooService.initialize(...)` if the reference does; fetch draft results (+ `renew` fallback), players, player stats, standings. Empty picks → `return null`.
- Per pick: `calculatePickScore(pick.pick, pick.round, position_rank_drafted || pick.round, current_position_rank, position, numTeams, totalPicks, sport)`. Yahoo `sport` — derive from the league (the reference uses the league's sport; if unavailable, pass `'baseball'` as `calculatePickScore`'s default). Build `GradedPick` with `teamKey: pick.team_key`, `teamName`/`teamLogo` from the standings map (by `team_key`), `overallPick: pick.pick`.
- Team grades exactly as Task 3 step 4, grouping by `teamKey` (= `team_key`).
- **My team:** `const myTeam = await yahooService.getMyTeam(leagueKey)`; `myTeamKey = myTeam?.team_key ?? null` (its `team_key` is already the same string the picks carry — no `team_id` parsing needed for the key). try/catch → `null`.
- Return `{ picks, teams, numTeams, myTeamKey }`.

Import the same `draftGrading` functions + `yahooService`.

- [ ] **Step 3: Type-check**

Run: `npm run type-check 2>&1 | grep -i loadYahooPointsDraft` → expect no output.

- [ ] **Step 4: Commit**

```bash
git add src/draft/report/loadYahooPointsDraft.ts
git commit -m "feat: Yahoo points draft loader -> GradedDraft"
```

---

## Task 5: Sleeper points draft loader

**Files:**
- Create: `src/draft/report/loadSleeperPointsDraft.ts`

- [ ] **Step 1: Read the reference implementation**

READ `src/views/PointsDraftView.vue` lines ~2252–2416 (its Sleeper branch). Key facts:
- Picks come from `leagueStore.historicalDrafts.get(String(season))` (`.picks`: `{ pick_no, round, draft_slot, roster_id, player_id, metadata.position, metadata.first_name/last_name }`). If absent, the store loads it via `leagueStore.loadHistoricalDraft(...)` — replicate the load-if-missing, or require the caller to have loaded it (the composable will call the store loader first; see Task 6).
- Matchups via `leagueStore.historicalMatchups.get(String(season))` (load via `leagueStore.loadHistoricalMatchups(...)` if missing).
- Rosters/users via `leagueStore.historicalRosters.get(String(season))` / `historicalUsers.get(String(season))`; team name via `sleeperService.getTeamName(roster, user)`, logo via `sleeperService.getAvatarUrl(...)`, keyed by `roster.roster_id`.
- Per-pick draftedRank/currentRank maps computed inline (lines ~2354–2367). `numTeams = rosters.length`.

- [ ] **Step 2: Implement `loadSleeperPointsDraft`**

Export:
```ts
export async function loadSleeperPointsDraft(args: {
  leagueId: string; season: number; currentUserId: string | null
}): Promise<GradedDraft | null>
```
Mirror the reference: read the (already-loaded, see Task 6) historical draft/matchups/rosters/users from `leagueStore`; if the draft or its `.picks` is missing → `return null`. Compute drafted/current position ranks, grade each pick via `calculatePickScore(pick.pick_no, pick.round, draftedRank || pick.round, currentRank, position, numTeams, totalPicks, sport)` + `scoreToGrade`, and build `GradedPick` with `teamKey: 'sleeper_' + pick.roster_id`, team name/logo from the roster/user lookup, `overallPick: pick.pick_no`.
- Team grades as Task 3 step 4, grouping by `teamKey`.
- **My team:** find the roster in `historicalRosters` whose `owner_id === currentUserId`; `myTeamKey = found ? 'sleeper_' + found.roster_id : null`.
- Return `{ picks, teams, numTeams, myTeamKey }`.

Import `sleeperService`, `useLeagueStore`, the `draftGrading` functions, and `./types`.

- [ ] **Step 3: Type-check**

Run: `npm run type-check 2>&1 | grep -i loadSleeperPointsDraft` → expect no output.

- [ ] **Step 4: Commit**

```bash
git add src/draft/report/loadSleeperPointsDraft.ts
git commit -m "feat: Sleeper points draft loader -> GradedDraft"
```

---

## Task 6: `useDraftReport` composable

**Files:**
- Create: `src/composables/useDraftReport.ts`

- [ ] **Step 1: Implement**

```ts
import { ref, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { buildDraftReport } from '@/draft/report/buildDraftReport'
import type { DraftReport } from '@/draft/report/types'
import { loadEspnPointsDraft } from '@/draft/report/loadEspnPointsDraft'
import { loadYahooPointsDraft } from '@/draft/report/loadYahooPointsDraft'
import { loadSleeperPointsDraft } from '@/draft/report/loadSleeperPointsDraft'

export function useDraftReport(): {
  report: Ref<DraftReport | null>
  loading: Ref<boolean>
  error: Ref<'no-data' | 'failed' | null>
  load: (args: { platform: string; seasonKey: string; sport: string; season: number }) => Promise<void>
} {
  const leagueStore = useLeagueStore()
  const report = ref<DraftReport | null>(null)
  const loading = ref(false)
  const error = ref<'no-data' | 'failed' | null>(null)

  async function load(args: { platform: string; seasonKey: string; sport: string; season: number }) {
    loading.value = true
    error.value = null
    report.value = null
    try {
      let draft = null
      if (args.platform === 'espn') {
        draft = await loadEspnPointsDraft({ sport: args.sport, leagueId: args.seasonKey, season: args.season })
      } else if (args.platform === 'yahoo') {
        draft = await loadYahooPointsDraft({ leagueKey: args.seasonKey })
      } else if (args.platform === 'sleeper') {
        // Ensure the season's draft/matchups/rosters/users are in the store first.
        await leagueStore.loadHistoricalDraft?.(args.seasonKey, args.season)
        await leagueStore.loadHistoricalMatchups?.(args.seasonKey, args.season)
        draft = await loadSleeperPointsDraft({
          leagueId: args.seasonKey, season: args.season,
          currentUserId: (leagueStore as any).currentUserId ?? null,
        })
      }
      if (!draft || !draft.picks.length) {
        error.value = 'no-data'
        return
      }
      report.value = buildDraftReport(draft, args.season)
    } catch (e) {
      console.error('[useDraftReport] load failed', e)
      error.value = 'failed'
    } finally {
      loading.value = false
    }
  }

  return { report, loading, error, load }
}
```
Note: confirm the exact `leagueStore.loadHistoricalDraft` / `loadHistoricalMatchups` signatures while implementing (READ `src/stores/league.ts`); adjust the two Sleeper pre-load calls to match (the reference `PointsDraftView` Sleeper branch shows how they're invoked). If those store methods take only a leagueId, drop the extra arg. Keep the optional-chaining guard so a signature mismatch degrades to `no-data`, never throws.

- [ ] **Step 2: Type-check + build**

Run: `npm run type-check 2>&1 | grep -i useDraftReport` → expect no output.
Run: `npm run build` → expect success.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useDraftReport.ts
git commit -m "feat: useDraftReport — route to platform loader + reducer, never throws"
```

---

## Task 7: `DraftReportSection` in `HistoryView.vue`

**Files:**
- Modify: `src/views/HistoryView.vue`

READ the file first. It uses `const history = useLeagueHistory()`, imports `TeamAvatar`, and its last template section is "Legendary moments" (~lines 527–562). The Legacy grade-bar pattern is an inline absolutely-positioned `<span>` (~lines 440–444). `history` now also exposes `seasonKeys` (Task 2).

- [ ] **Step 1: Script — wire the composable + season list + expand-on-demand**

In `<script setup>`, add:
```ts
import { useDraftReport } from '@/composables/useDraftReport'
import { getLeagueType } from '@/config/sports'
```
Then, after the existing `history` setup, add:
```ts
const draft = useDraftReport()
const showDraftReport = ref(false)

// Points-only in Phase 1. Category leagues see an honest note instead of a report.
const draftReportPointsOnly = computed(
  () => getLeagueType(leagueStore.currentLeague?.scoring_type ?? undefined) !== 'points',
)

// Seasons we can grade = the history seasons we captured a platform key for, newest first.
const draftSeasons = computed<number[]>(() =>
  [...history.seasonKeys.value.keys()].sort((a, b) => b - a),
)
const selectedDraftSeason = ref<number | null>(null)

function loadDraftSeason(season: number) {
  const key = history.seasonKeys.value.get(season)
  if (!key) return
  selectedDraftSeason.value = season
  draft.load({
    platform: history.platform.value,
    seasonKey: key,
    sport: history.sport.value,
    season,
  })
}

function openDraftReport() {
  showDraftReport.value = true
  if (selectedDraftSeason.value == null && draftSeasons.value.length && !draftReportPointsOnly.value) {
    loadDraftSeason(draftSeasons.value[0]) // newest gradeable season by default
  }
}
```
(Confirm `history.platform` / `history.sport` are exposed refs — they are, per the composable's return. Confirm `leagueStore` is already imported in this file; if not, add `import { useLeagueStore } from '@/stores/league'` and `const leagueStore = useLeagueStore()`.)

- [ ] **Step 2: Template — add the section after "Legendary moments"**

After the closing tag of the Legendary-moments `<section>`, add a new section. Use the file's existing section/card classes (match the surrounding markup) and `TeamAvatar`:
```html
      <!-- Draft Report -->
      <section class="mt-8">
        <button type="button" class="flex w-full items-center justify-between text-left"
          @click="showDraftReport ? (showDraftReport = false) : openDraftReport()">
          <h2 class="font-display text-sm font-semibold uppercase tracking-wide text-dark-textMuted">Draft report</h2>
          <span class="font-mono text-xs text-dark-textMuted">{{ showDraftReport ? '▾ hide' : '▸ show' }}</span>
        </button>

        <div v-if="showDraftReport" class="mt-3">
          <!-- Season picker -->
          <div v-if="draftSeasons.length && !draftReportPointsOnly" class="mb-3 flex flex-wrap gap-1.5">
            <button v-for="s in draftSeasons" :key="s" type="button"
              class="rounded px-2 py-1 font-mono text-xs"
              :class="s === selectedDraftSeason ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
              @click="loadDraftSeason(s)">{{ s }}</button>
          </div>

          <!-- Category note (Phase 1 = points only) -->
          <p v-if="draftReportPointsOnly" class="rounded-xl border border-dark-border bg-dark-card p-4 text-sm text-dark-textMuted">
            The graded Draft Report is available on points leagues for now — category-league grading is coming next.
          </p>

          <!-- States -->
          <p v-else-if="draft.loading.value" class="rounded-xl border border-dark-border bg-dark-card p-4 text-sm text-dark-textMuted">Grading the draft…</p>
          <p v-else-if="draft.error.value === 'no-data'" class="rounded-xl border border-dark-border bg-dark-card p-4 text-sm text-dark-textMuted">
            We couldn't pull enough of {{ selectedDraftSeason }}'s draft to grade it — this can happen with older seasons.
          </p>
          <p v-else-if="draft.error.value === 'failed'" class="rounded-xl border border-dark-border bg-dark-card p-4 text-sm text-dark-textMuted">
            Couldn't load the draft. Try another season.
          </p>

          <!-- Report -->
          <div v-else-if="draft.report.value" class="space-y-4">
            <!-- Steal + bust -->
            <div class="grid gap-3 sm:grid-cols-2">
              <div v-if="draft.report.value.steal" class="rounded-xl border border-dark-border bg-dark-card p-4">
                <div class="font-mono text-[10px] uppercase tracking-wider text-primary">Biggest steal</div>
                <div class="mt-1 text-lg font-display font-bold text-dark-text">{{ draft.report.value.steal.playerName }}</div>
                <div class="text-xs text-dark-textMuted">{{ draft.report.value.steal.teamName }} · {{ draft.report.value.steal.valueLabel }} · {{ draft.report.value.steal.grade }}</div>
              </div>
              <div v-if="draft.report.value.bust" class="rounded-xl border border-dark-border bg-dark-card p-4">
                <div class="font-mono text-[10px] uppercase tracking-wider text-[#e0625a]">Biggest bust</div>
                <div class="mt-1 text-lg font-display font-bold text-dark-text">{{ draft.report.value.bust.playerName }}</div>
                <div class="text-xs text-dark-textMuted">{{ draft.report.value.bust.teamName }} · {{ draft.report.value.bust.valueLabel }} · {{ draft.report.value.bust.grade }}</div>
              </div>
            </div>

            <!-- Draft MVP -->
            <div v-if="draft.report.value.bestDrafter" class="rounded-xl border border-dark-border bg-dark-card p-4">
              <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Draft MVP · best & worst drafter</div>
              <div class="mt-2 flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <TeamAvatar :name="draft.report.value.bestDrafter.teamName" :logo="draft.report.value.bestDrafter.teamLogo" :size="28" />
                  <span class="text-sm text-dark-text">{{ draft.report.value.bestDrafter.teamName }}</span>
                </span>
                <span class="font-display text-lg font-bold text-primary">{{ draft.report.value.bestDrafter.grade }}</span>
              </div>
              <div v-if="draft.report.value.worstDrafter" class="mt-2 flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <TeamAvatar :name="draft.report.value.worstDrafter.teamName" :logo="draft.report.value.worstDrafter.teamLogo" :size="28" />
                  <span class="text-sm text-dark-text">{{ draft.report.value.worstDrafter.teamName }}</span>
                </span>
                <span class="font-display text-lg font-bold text-[#e0625a]">{{ draft.report.value.worstDrafter.grade }}</span>
              </div>
            </div>

            <!-- Every team graded -->
            <div class="rounded-xl border border-dark-border bg-dark-card p-4">
              <div class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Every team, graded</div>
              <div v-for="t in draft.report.value.teamGrades" :key="t.teamKey"
                class="flex items-center justify-between border-b border-dark-border/40 py-1.5 last:border-0"
                :class="t.isMe ? 'text-primary' : 'text-dark-text'">
                <span class="flex items-center gap-2">
                  <span class="w-5 font-mono text-xs text-dark-textMuted">{{ t.rank }}</span>
                  <TeamAvatar :name="t.teamName" :logo="t.teamLogo" :size="24" />
                  <span class="text-sm">{{ t.teamName }}<span v-if="t.isMe" class="ml-1 text-xs">(you)</span></span>
                </span>
                <span class="font-display text-sm font-bold">{{ t.grade }}</span>
              </div>
            </div>

            <!-- Your team spotlight -->
            <div v-if="draft.report.value.mySpotlight" class="rounded-xl border border-primary/30 bg-dark-card p-4">
              <div class="font-mono text-[10px] uppercase tracking-wider text-primary">Your draft</div>
              <div class="mt-1 text-sm text-dark-text">Grade <span class="font-display text-lg font-bold text-primary">{{ draft.report.value.mySpotlight.grade }}</span> · {{ ordinalRank(draft.report.value.mySpotlight.rank) }} of {{ draft.report.value.teamCount }}</div>
              <div v-if="draft.report.value.mySpotlight.bestPick" class="mt-1 text-xs text-dark-textMuted">Best pick: {{ draft.report.value.mySpotlight.bestPick.playerName }} ({{ draft.report.value.mySpotlight.bestPick.valueLabel }})</div>
              <div v-if="draft.report.value.mySpotlight.worstPick" class="text-xs text-dark-textMuted">Worst pick: {{ draft.report.value.mySpotlight.worstPick.playerName }} ({{ draft.report.value.mySpotlight.worstPick.valueLabel }})</div>
            </div>

            <RouterLink to="/draft" class="inline-block font-mono text-xs text-dark-textMuted hover:text-primary">deep draft board →</RouterLink>
          </div>
        </div>
      </section>
```
Add a small ordinal helper in the script if the file doesn't already have one:
```ts
function ordinalRank(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
```
(If `HistoryView` already defines an `ord`/ordinal helper, reuse it instead of adding a duplicate.)

- [ ] **Step 2b: `TeamAvatar` prop check**

Confirm `TeamAvatar`'s prop names (`name`/`logo`/`size`) against its definition and the existing usages in this file; adjust the new usages to match exactly.

- [ ] **Step 3: Type-check + build**

Run: `npm run type-check 2>&1 | grep -i HistoryView` → expect no output.
Run: `npm run build` → expect success.

- [ ] **Step 4: Commit**

```bash
git add src/views/HistoryView.vue
git commit -m "feat: History — lazy Draft Report section (points) + season picker + states"
```

---

## Task 8: retire `/draft` from the primary nav

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Remove the nav entry**

In the `tabs` computed (around `App.vue:1213`), delete exactly this line:
```ts
  { name: 'Draft', path: '/draft' },
```
Leave the `/draft` route, `DraftWrapper`, and the two draft views intact (reachable by URL + the History "deep draft board →" link). Do not touch `sectionTabs`/`toolTabs` (they derive from `tabs`).

- [ ] **Step 2: Build + confirm route still reachable**

Run: `npm run build` → expect success.
Grep to confirm the route still exists: `grep -n "path: '/draft'" src/router/index.ts` (or wherever routes live) → the ROUTE should still be present; only the nav TAB is removed.

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: retire Draft from primary nav (route kept reachable)"
```

---

## Task 9: Full verification

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: all pass, up by 7 (the `buildDraftReport` tests), none regressed.

- [ ] **Step 2: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: build succeeds; type-check error count not above the repo's pre-existing baseline (62) for unrelated files.

- [ ] **Step 3: Manual smoke (dev server) — REQUIRED**

Run `npm run dev`, open **History** on a **points** league:
- The "Draft report ▸ show" affordance appears after Legendary moments; History's initial load is not delayed.
- Expanding grades the newest season: steal + bust cards, Draft MVP, every-team grades (you tinted + "(you)"), your-team spotlight with best/worst pick.
- The season picker re-grades on demand; an ungradeable/older season shows the honest `no-data` copy without breaking History.
- The "deep draft board →" link still opens `/draft`.
- The **Draft** tab is gone from the top nav; `/draft` still loads by URL.
- Open History on a **category** league: the section shows the "points only for now" note (no crash).
- Check an **ESPN** and a **Yahoo** points league (and a Sleeper league if available).

- [ ] **Step 4: Commit any smoke fix (only if needed)**

```bash
git add -A && git commit -m "fix: draft report — <smoke finding>"
```

---

## Self-Review Notes (reconciled)

- **Spec coverage (Phase 1):** reducer + contract (Task 1); seasonKeys (Task 2); 3 points loaders producing `GradedDraft` incl. my-team resolution (Tasks 3–5); composable that never throws (Task 6); lazy History section + picker + states + deep-board link + category note (Task 7); nav retirement, route kept (Task 8). Content (a) steal/bust, (b) best/worst drafter, (c) every-team grades, (d) spotlight — all in the reducer + view. Category parity is the documented Phase 2 (own plan).
- **Type consistency:** all tasks depend on the `GradedDraft`/`GradedPick`/`GradedTeam` + `DraftReport`/`DraftHighlight`/`TeamGradeRow` types from Task 1's `types.ts`. `teamKey` is a string everywhere (no numeric `rosterId`), resolving the Yahoo no-numeric-roster-id problem. `buildDraftReport(draft, season)` signature is identical across Task 1 (def) and Task 6 (call).
- **Loaders replicate, views untouched:** Tasks 3–5 create new modules; the old `/draft` views are not modified. Duplication is intentional (isolation; old views retired).
- **Risk note:** the loaders are the smoke-test-dependent surface (finicky per-platform historical fetch). They carry no unit tests by design (I/O over the tested reducer/engine) — Step 3's manual smoke on real ESPN + Yahoo (+ Sleeper) points leagues is the real gate.
