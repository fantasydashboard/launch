# Category-League Draft Report (Phase 2, Yahoo-first) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grade Yahoo category-league drafts by ranking each drafted player on summed season category z-scores instead of season points, reusing the entire existing points-report pipeline.

**Architecture:** One new pure helper (`categorySeasonValue`) computes each drafted player's summed per-category z-score within the drafted pool. A new Yahoo category loader mirrors `loadYahooPointsDraft` but ranks players within position by that value instead of `total_points`. `useDraftReport` branches to it when the active league is category-scoring. The shared grader (`calculatePickScore`), `buildDraftReport`, and the UI are untouched.

**Tech Stack:** TypeScript, Vitest, existing `yahooService`, Vue 3 (Pinia store already wired).

**Spec:** `docs/superpowers/specs/2026-07-27-category-draft-report-design.md`

**Standing constraint:** Local only — commit but never push/deploy (per project rule). Build with `npm run build`; run tests with `npx vitest run <path>`.

---

## File Structure

- **Create** `src/draft/report/categorySeasonValue.ts` — pure z-score value helper (the only new logic).
- **Create** `src/draft/report/__tests__/categorySeasonValue.test.ts` — unit tests for it.
- **Create** `src/draft/report/loadYahooCategoryDraft.ts` — Yahoo category loader (clone of the points loader with the value swap).
- **Modify** `src/composables/useDraftReport.ts` — add `isCategory` to `load()` args and branch to the category loader for Yahoo.
- **Modify** `src/views/HistoryView.vue:55` — pass `isCategory: scoring.value === 'category'`.

---

### Task 1: `categorySeasonValue` pure helper (TDD)

**Files:**
- Create: `src/draft/report/categorySeasonValue.ts`
- Test: `src/draft/report/__tests__/categorySeasonValue.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/draft/report/__tests__/categorySeasonValue.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { categorySeasonValue, type CatValuePlayer, type CatValueCat } from '../categorySeasonValue'

const cats: CatValueCat[] = [
  { statId: 'HR', lowerIsBetter: false },
  { statId: 'ERA', lowerIsBetter: true },
]

describe('categorySeasonValue', () => {
  it('higher-is-better: more HR ranks higher', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'a', position: 'OF', stats: { HR: 40 } },
      { playerId: 'b', position: 'OF', stats: { HR: 10 } },
    ]
    const v = categorySeasonValue(players, [{ statId: 'HR', lowerIsBetter: false }])
    expect(v.get('a')!).toBeGreaterThan(v.get('b')!)
  })

  it('lowerIsBetter inverts: a low-ERA pitcher outranks a high-ERA one', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'ace', position: 'SP', stats: { ERA: 2.5 } },
      { playerId: 'bad', position: 'SP', stats: { ERA: 5.5 } },
    ]
    const v = categorySeasonValue(players, [{ statId: 'ERA', lowerIsBetter: true }])
    expect(v.get('ace')!).toBeGreaterThan(v.get('bad')!)
  })

  it('a zero-variance category contributes 0 to everyone', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'a', position: 'OF', stats: { HR: 20 } },
      { playerId: 'b', position: 'OF', stats: { HR: 20 } },
    ]
    const v = categorySeasonValue(players, [{ statId: 'HR', lowerIsBetter: false }])
    expect(v.get('a')).toBe(0)
    expect(v.get('b')).toBe(0)
  })

  it('a missing stat is treated as 0, never NaN', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'a', position: 'OF', stats: { HR: 30 } },
      { playerId: 'b', position: 'OF', stats: {} },
    ]
    const v = categorySeasonValue(players, [{ statId: 'HR', lowerIsBetter: false }])
    expect(Number.isFinite(v.get('a')!)).toBe(true)
    expect(Number.isFinite(v.get('b')!)).toBe(true)
    expect(v.get('a')!).toBeGreaterThan(v.get('b')!)
  })

  it('single-player pool → std 0 → value 0 (no NaN)', () => {
    const v = categorySeasonValue(
      [{ playerId: 'solo', position: 'OF', stats: { HR: 25 } }],
      [{ statId: 'HR', lowerIsBetter: false }],
    )
    expect(v.get('solo')).toBe(0)
  })

  it('sums across categories (stud > mid > scrub)', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'stud', position: 'UTIL', stats: { HR: 40, ERA: 2.0 } },
      { playerId: 'mid', position: 'UTIL', stats: { HR: 20, ERA: 4.0 } },
      { playerId: 'scrub', position: 'UTIL', stats: { HR: 5, ERA: 6.0 } },
    ]
    const v = categorySeasonValue(players, cats)
    expect(v.get('stud')!).toBeGreaterThan(v.get('mid')!)
    expect(v.get('mid')!).toBeGreaterThan(v.get('scrub')!)
  })

  it('empty players or empty cats → all zeros, no throw', () => {
    expect(categorySeasonValue([], cats).size).toBe(0)
    const v = categorySeasonValue([{ playerId: 'a', position: 'OF', stats: { HR: 10 } }], [])
    expect(v.get('a')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/draft/report/__tests__/categorySeasonValue.test.ts`
Expected: FAIL — "Failed to resolve import '../categorySeasonValue'" / function not defined.

- [ ] **Step 3: Write minimal implementation**

Create `src/draft/report/categorySeasonValue.ts`:

```ts
export interface CatValuePlayer {
  playerId: string | number
  position: string
  stats: Record<string, number> // season per-category stats, keyed by league statId
}

export interface CatValueCat {
  statId: string
  lowerIsBetter: boolean // ERA/WHIP/OBA → true
}

/**
 * Summed per-category z-score of each player within the given pool (the drafted players).
 * A missing/non-finite stat contributes 0 for that category (pool mean), never NaN. A
 * category whose pool has zero variance contributes 0 for everyone (can't differentiate).
 * lowerIsBetter cats are negated so "better" is always more-positive.
 */
export function categorySeasonValue(
  players: CatValuePlayer[],
  cats: CatValueCat[],
): Map<string | number, number> {
  const value = new Map<string | number, number>()
  for (const p of players) value.set(p.playerId, 0)
  if (players.length === 0 || cats.length === 0) return value

  for (const cat of cats) {
    const vals = players.map((p) => {
      const v = p.stats[cat.statId]
      return Number.isFinite(v) ? (v as number) : 0
    })
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const variance = vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length
    const std = Math.sqrt(variance)
    if (std === 0) continue // cat can't differentiate — contributes 0 to everyone
    const sign = cat.lowerIsBetter ? -1 : 1
    players.forEach((p, i) => {
      const z = ((vals[i] - mean) / std) * sign
      value.set(p.playerId, (value.get(p.playerId) ?? 0) + z)
    })
  }
  return value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/draft/report/__tests__/categorySeasonValue.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/draft/report/categorySeasonValue.ts src/draft/report/__tests__/categorySeasonValue.test.ts
git commit -m "feat: categorySeasonValue — summed season z-score value for cat draft grading"
```

---

### Task 2: `loadYahooCategoryDraft` loader

**Files:**
- Create: `src/draft/report/loadYahooCategoryDraft.ts`
- Reference (do not change): `src/draft/report/loadYahooPointsDraft.ts` (the clone source)

No unit test — matches the untested points loaders; verified by build + real-league smoke.

- [ ] **Step 1: Create the loader**

Create `src/draft/report/loadYahooCategoryDraft.ts` — identical to `loadYahooPointsDraft.ts` except: (a) fetch scoring categories, (b) build the players pool, (c) compute `catValue`, (d) rank `currentPositionRank` by `catValue` instead of `total_points`. Full file:

```ts
import { yahooService } from '@/services/yahoo'
import { calculatePickScore, scoreToGrade, calculateTeamGrade, getRelativeTeamGrade } from '@/services/draftGrading'
import { isLowerBetter } from '@/players/direction'
import { categorySeasonValue, type CatValueCat, type CatValuePlayer } from './categorySeasonValue'
import type { GradedDraft, GradedPick, GradedTeam } from './types'

/**
 * Fetch + grade a Yahoo CATEGORY-league draft for a season, normalized to GradedDraft.
 * Mirrors loadYahooPointsDraft but ranks each drafted player within position by summed
 * season category z-score (categorySeasonValue) instead of total fantasy points.
 * Like the points loader, Yahoo exposes no keeper flag or games-played source, so all
 * non-predraft picks are graded and there is no injury/incomplete guard.
 */
export async function loadYahooCategoryDraft(args: { leagueKey: string; sport?: string }): Promise<GradedDraft | null> {
  const { leagueKey } = args
  const sport = args.sport || 'baseball'

  let seasonLeagueKey = leagueKey

  let draftResults = await yahooService.getDraftResults(seasonLeagueKey)
  let playerKeys: string[] = draftResults.picks?.map((p: any) => p.player_key).filter(Boolean) || []

  // Predraft: picks exist but have no player_keys yet. Fall back to the previous
  // season's draft via the `renew` field ("prevGameKey_prevLeagueNum").
  if (playerKeys.length === 0 && draftResults.picks?.length > 0) {
    const renewedFrom = draftResults.renew
    if (renewedFrom) {
      const [prevGameKey, prevLeagueNum] = renewedFrom.split('_')
      const prevLeagueKey = `${prevGameKey}.l.${prevLeagueNum}`
      draftResults = await yahooService.getDraftResults(prevLeagueKey)
      seasonLeagueKey = prevLeagueKey
      playerKeys = draftResults.picks?.map((p: any) => p.player_key).filter(Boolean) || []
      if (playerKeys.length === 0) return null
    } else {
      return null
    }
  }

  if (!draftResults.picks || draftResults.picks.length === 0) return null

  const finalPlayerKeys: string[] = draftResults.picks.map((p: any) => p.player_key).filter(Boolean)

  const players = await yahooService.getPlayers(finalPlayerKeys, seasonLeagueKey)
  const stats = await yahooService.getPlayerStats(seasonLeagueKey, finalPlayerKeys)
  const standings = await yahooService.getStandings(seasonLeagueKey)

  // Scoring categories (+ direction) for this league — filter out display-only stats.
  let cats: CatValueCat[] = []
  try {
    const settings = await yahooService.getLeagueScoringSettings(seasonLeagueKey)
    const statCats: any[] = settings?.stat_categories ?? []
    cats = statCats
      .filter((c: any) => {
        const d = c.stat?.is_only_display_stat ?? c.is_only_display_stat
        return d !== '1' && d !== 1
      })
      .map((c: any) => {
        // statId (numeric) keys player.stats; the LABEL drives direction — LOWER_IS_BETTER
        // keys lower-is-better cats by label ('ERA','WHIP','L','CS'), only ERA/WHIP by id.
        const statId = String(c.stat?.stat_id ?? c.stat_id)
        const label = String(c.stat?.display_name ?? c.stat?.name ?? statId)
        return { statId, lowerIsBetter: isLowerBetter(label) }
      })
      .filter((c: any) => c.statId && c.statId !== 'undefined')
  } catch {
    cats = []
  }

  const teamLookup = new Map<string, any>()
  for (const team of standings) {
    teamLookup.set(team.team_key, team)
  }

  // Category value pool: every drafted player z-scored across all scoring cats.
  const valuePlayers: CatValuePlayer[] = draftResults.picks.map((pick: any) => {
    const player = players.get(pick.player_key) || {}
    const stat = stats.get(pick.player_key)
    return {
      playerId: pick.player_key,
      position: player.position || 'Unknown',
      stats: (stat?.stats as Record<string, number>) || {},
    }
  })
  const catValue = categorySeasonValue(valuePlayers, cats)

  // Position rank as drafted: order each position was taken in the draft
  const positionDraftOrder = new Map<string, string[]>()
  for (const pick of draftResults.picks) {
    const player = players.get(pick.player_key) || {}
    const position = player.position || 'Unknown'
    if (!positionDraftOrder.has(position)) positionDraftOrder.set(position, [])
    positionDraftOrder.get(position)!.push(pick.player_key)
  }
  const positionRankDraftedMap = new Map<string, number>()
  for (const [, playerKeysInPosition] of positionDraftOrder) {
    playerKeysInPosition.forEach((playerKey, index) => positionRankDraftedMap.set(playerKey, index + 1))
  }

  // Current position rank: players within a position sorted by category value desc
  const currentPositionRankMap = new Map<string, number>()
  for (const [, playerKeysInPosition] of positionDraftOrder) {
    const sortedByValue = [...playerKeysInPosition].sort(
      (a, b) => (catValue.get(b) ?? 0) - (catValue.get(a) ?? 0),
    )
    sortedByValue.forEach((playerKey, index) => currentPositionRankMap.set(playerKey, index + 1))
  }

  const numTeams = standings.length || 12
  const totalPicks = draftResults.picks.length

  const picks: GradedPick[] = draftResults.picks.map((pick: any) => {
    const player = players.get(pick.player_key) || {}
    const team = teamLookup.get(pick.team_key) || {}
    const position = player.position || 'Unknown'

    const positionRankDrafted = positionRankDraftedMap.get(pick.player_key) || 0
    const currentPositionRank = currentPositionRankMap.get(pick.player_key) || 999

    const result = calculatePickScore(
      pick.pick,
      pick.round,
      positionRankDrafted || pick.round,
      currentPositionRank,
      position,
      numTeams,
      totalPicks,
      sport,
    )

    return {
      teamKey: pick.team_key,
      teamName: team.name || 'Team',
      teamLogo: team.logo_url || '',
      playerName: player.name || 'Unknown Player',
      position,
      round: pick.round,
      overallPick: pick.pick,
      score: result.totalScore,
      grade: scoreToGrade(result.totalScore),
      verdict: result.verdict,
      tierMovement: result.tierMovement,
      draftedTier: result.draftedTier,
      finishedTier: result.finishedTier,
      headshot: player.headshot || undefined,
      proTeam: player.team || undefined,
    }
  })

  const picksByTeam = new Map<string, GradedPick[]>()
  for (const pick of picks) {
    if (!picksByTeam.has(pick.teamKey)) picksByTeam.set(pick.teamKey, [])
    picksByTeam.get(pick.teamKey)!.push(pick)
  }

  const unrankedTeams = [...picksByTeam.entries()].map(([teamKey, teamPicks]) => {
    const gradeResult = calculateTeamGrade(teamPicks.map((p) => ({ round: p.round, score: p.score, verdict: p.verdict })))
    const team = teamLookup.get(teamKey) || {}
    return {
      teamKey,
      teamName: team.name || teamPicks[0]?.teamName || 'Team',
      teamLogo: team.logo_url || teamPicks[0]?.teamLogo || '',
      gradeScore: gradeResult.gradeScore,
    }
  })

  unrankedTeams.sort((a, b) => b.gradeScore - a.gradeScore)

  const gradedTeamCount = unrankedTeams.length

  const teams: GradedTeam[] = unrankedTeams.map((t, index) => {
    const rank = index + 1
    return {
      teamKey: t.teamKey,
      teamName: t.teamName,
      teamLogo: t.teamLogo,
      gradeScore: t.gradeScore,
      grade: getRelativeTeamGrade(rank, gradedTeamCount, t.gradeScore),
      rank,
    }
  })

  let myTeamKey: string | null = null
  try {
    const teamsList = await yahooService.getTeams(seasonLeagueKey)
    myTeamKey = teamsList.find((t: any) => t.is_my_team)?.team_key ?? null
  } catch {
    myTeamKey = null
  }

  return { picks, teams, numTeams, myTeamKey, keeperCount: 0, keepers: [], incompleteCount: 0 }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: `✓ built in …` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/draft/report/loadYahooCategoryDraft.ts
git commit -m "feat: loadYahooCategoryDraft — grade Yahoo cat drafts by season category value"
```

---

### Task 3: Route category leagues to the new loader

**Files:**
- Modify: `src/composables/useDraftReport.ts`
- Modify: `src/views/HistoryView.vue:55`

- [ ] **Step 1: Add the import + branch in `useDraftReport.ts`**

At the top of `src/composables/useDraftReport.ts`, add the import next to the existing loader imports (after the `loadSleeperPointsDraft` import, line 7):

```ts
import { loadYahooCategoryDraft } from '@/draft/report/loadYahooCategoryDraft'
```

Change the `load` signature to accept `isCategory` (line 24):

```ts
  async function load(args: { platform: string; seasonKey: string; sport: string; season: number; isCategory?: boolean }) {
```

Replace the Yahoo branch (lines 33-34) so a category league routes to the new loader:

```ts
      } else if (args.platform === 'yahoo') {
        draft = args.isCategory
          ? await loadYahooCategoryDraft({ leagueKey: args.seasonKey, sport: args.sport })
          : await loadYahooPointsDraft({ leagueKey: args.seasonKey, sport: args.sport })
      } else if (args.platform === 'sleeper') {
```

(ESPN and Sleeper branches are unchanged — ESPN category is deferred and still falls through to its points loader.)

- [ ] **Step 2: Pass `isCategory` from HistoryView**

In `src/views/HistoryView.vue`, the `scoring` computed (line 103) already yields `'points' | 'category'`. Update the `draft.load(...)` call (line 55) to pass it:

```ts
  draft.load({ platform: history.platform.value, seasonKey: key, sport: history.sport.value, season, isCategory: scoring.value === 'category' })
```

- [ ] **Step 3: Lift the points-only UI gate for Yahoo category** (discovered during execution — the report is otherwise unreachable)

`HistoryView.vue` has a `draftReportPointsOnly` computed (~line 37) that hides the whole Draft Report for non-points leagues. Change it to allow Yahoo category through (ESPN/Sleeper category stay gated — ESPN is deferred):

```ts
const draftReportPointsOnly = computed(() => {
  const isPoints = getLeagueType(leagueStore.currentLeague?.scoring_type ?? undefined) === 'points'
  if (isPoints) return false
  // Category Draft Report is supported for Yahoo only (ESPN/Sleeper category deferred).
  if (leagueStore.activePlatform === 'yahoo' && scoring.value === 'category') return false
  return true
})
```

And update the gated message (~line 640) text to:
```
The graded Draft Report supports points leagues and Yahoo category leagues — ESPN category grading is coming next.
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: `✓ built in …` with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useDraftReport.ts src/views/HistoryView.vue
git commit -m "feat: route Yahoo category leagues to the category draft loader"
```

---

## Final verification

- [ ] Run the full touched-area test: `npx vitest run src/draft/report/__tests__/categorySeasonValue.test.ts` → PASS.
- [ ] `npm run build` → clean.
- [ ] Hand back for real-league smoke: open a **Yahoo category** league → History → Draft Report; confirm it renders and the grades look sane (e.g., an early pick who mashed grades well; a bust grades poorly), and that **points** Yahoo leagues + ESPN/Sleeper are unchanged.

## Notes / scope reminders

- **ESPN category is deferred** — it still routes to `loadEspnPointsDraft`. Do not build the ESPN category loader here; it is gated behind the player-stat id-space remap (memory `espn-player-stat-id-space`).
- No injury guard for Yahoo (matches the points loader; Yahoo has no games-played source).
- No UI changes — the category report renders through the existing `GradedDraft` UI.
