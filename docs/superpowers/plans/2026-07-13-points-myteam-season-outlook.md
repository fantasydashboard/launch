# Points My Team — Season Outlook + Luck Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the points-league My Team page's mislabeled "Projected finish" hero (a rest-of-season points rank) with an honest **Season Outlook** (record + projected seed + playoff odds + standing badge) plus a **luck-based sell-high/buy-low action**, all from a shared, tested engine.

**Architecture:** A pure engine (`luckVerdict` + `buildSeasonOutlook`) computes the outlook from three inputs the page already loads (team records, a per-week points model, the remaining schedule). A thin composable (`useSeasonOutlook`) wires those reactive inputs and the Monte-Carlo playoff sim together. `PointsMyTeamView` swaps its hero card for the outlook and demotes the old talent rank to a labeled secondary line. Numbers match LeagueView/Matchup because they consume the same `simulatePlayoffOdds` and per-week `buildPointsTeam` basis.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest. Reuses `src/league/playoffOdds.ts` (`simulatePlayoffOdds`), `src/myteam/pointsTeam.ts` (`buildPointsTeam`, `perWeek` basis), `src/composables/usePowerTrajectory.ts`.

**Deviation from spec (intentional):** The spec proposed reusing `src/myteam/seasonStakes.ts` for the standing badge. During planning we found `seasonStakes` returns its `'clinch'` default ("comfortably in") for any team more than 2 weeks out regardless of position — so an 8th-of-10 team would be badged "in the field." Instead we derive a `standingState` from the Monte-Carlo playoff odds (`playoffPct`), which is honest and self-consistent with the odds line we already display. `seasonStakes` is left untouched (still used by Matchup). Update the spec's "reuse seasonStakes" note to reflect this after the build.

---

## File Structure

- **Create** `src/myteam/luckVerdict.ts` — pure. Record-vs-talent luck → a stance (`sell-high`/`buy-low`/`aligned`) with copy + CTA. Owns the shared `StandingState` type. Mirrors `powerRankings.ts` luck math (`tol = max(2, round(n/4))`).
- **Create** `src/myteam/seasonOutlook.ts` — pure. `buildSeasonOutlook(...)` assembles record rank, runs `simulatePlayoffOdds`, derives `standingState` + `reasoning`, and calls `luckVerdict`. Returns the `SeasonOutlook` view-model.
- **Create** `src/composables/useSeasonOutlook.ts` — thin reactive wrapper: owns `usePowerTrajectory`, builds the `perWeek` points model, calls `buildSeasonOutlook`.
- **Create** `src/myteam/__tests__/luckVerdict.test.ts`, `src/myteam/__tests__/seasonOutlook.test.ts`.
- **Modify** `src/views/PointsMyTeamView.vue` — assemble `teamMeta`, consume `useSeasonOutlook`, replace the "Projected finish" card with the Season Outlook + luck action, trim the header sub-line's competing rank, extend `?ptsaudit`.

**Reference signatures (already in the codebase — do not change):**

```ts
// src/league/playoffOdds.ts
interface OddsTeam { teamKey: string; strength: number; wins: number; losses: number; ties: number; pointsFor: number }
interface ScheduleWeek { week: number; matchups: [string, string][] }
interface OddsResult { teamKey: string; playoffPct: number; projWins: number; projLosses: number; projTies: number; avgSeed: number }
function simulatePlayoffOdds(teams: OddsTeam[], schedule: ScheduleWeek[],
  opts: { playoffSpots: number; sims?: number; scale?: number; rng?: () => number; force?: {...} }): { results: OddsResult[]; sims: number }

// src/myteam/pointsTeam.ts
interface TeamStanding { teamKey: string; startingPoints: number; rank: number }
interface PointsTeamModel { myLineupRank: number; teams: number; standings: TeamStanding[]; /* ...rosterRows, slotRanks, pitching */ }
function buildPointsTeam(pool, fgByKey, weights, myTeamKey, rosterSlots, opts?: { basis?: 'total' | 'perWeek'; weeksLeft?: number }): PointsTeamModel

// src/composables/usePowerTrajectory.ts → usePowerTrajectory()
//   returns { currentWeek, weeksLeft, playoffSpots, remainingSchedule: Ref<ScheduleWeek[]>, loading, loaded, load }

// src/composables/useEspnPointsTeamData.ts → useEspnPointsTeamData()
//   exposes teamRecords: Ref<Record<string, { wins; losses; ties; pointsFor }>>, myTeamId, ...
```

---

## Task 1: `luckVerdict` pure function

**Files:**
- Create: `src/myteam/luckVerdict.ts`
- Test: `src/myteam/__tests__/luckVerdict.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/myteam/__tests__/luckVerdict.test.ts
import { describe, it, expect } from 'vitest'
import { luckVerdict } from '@/myteam/luckVerdict'

describe('luckVerdict', () => {
  it('overperforming (record beats talent) -> sell-high, CTA to trades', () => {
    const v = luckVerdict({ recordRank: 2, talentRank: 8, leagueSize: 10, standingState: 'in' })
    expect(v.stance).toBe('sell-high')
    expect(v.cta?.route).toBe('/trades')
  })

  it('underperforming (talent beats record) -> buy-low', () => {
    const v = luckVerdict({ recordRank: 8, talentRank: 2, leagueSize: 10, standingState: 'chasing' })
    expect(v.stance).toBe('buy-low')
  })

  it('aligned within tolerance -> aligned, CTA to matchup', () => {
    const v = luckVerdict({ recordRank: 5, talentRank: 6, leagueSize: 10, standingState: 'in' })
    expect(v.stance).toBe('aligned')
    expect(v.cta?.route).toBe('/matchup')
  })

  it('clinched softens the sell-high headline', () => {
    const v = luckVerdict({ recordRank: 1, talentRank: 6, leagueSize: 10, standingState: 'clinched' })
    expect(v.stance).toBe('sell-high')
    expect(v.headline).toMatch(/locked in/i)
  })

  it('eliminated overrides buy-low to a play-it-out read', () => {
    const v = luckVerdict({ recordRank: 9, talentRank: 3, leagueSize: 10, standingState: 'eliminated' })
    expect(v.stance).toBe('aligned')
    expect(v.headline).toMatch(/out of the race/i)
  })

  it('tolerance scales with league size (round(n/4), min 2)', () => {
    // n=12 -> tol=3: delta 2 is aligned
    expect(luckVerdict({ recordRank: 3, talentRank: 5, leagueSize: 12, standingState: 'in' }).stance).toBe('aligned')
    // n=8 -> tol=2: delta 2 is sell-high
    expect(luckVerdict({ recordRank: 3, talentRank: 5, leagueSize: 8, standingState: 'in' }).stance).toBe('sell-high')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/myteam/__tests__/luckVerdict.test.ts`
Expected: FAIL — "Cannot find module '@/myteam/luckVerdict'".

- [ ] **Step 3: Write the implementation**

```ts
// src/myteam/luckVerdict.ts

/** Where a team sits in the playoff picture, derived from Monte-Carlo odds (not from record alone). */
export type StandingState = 'clinched' | 'eliminated' | 'in' | 'bubble' | 'chasing' | 'unknown'

export type LuckStance = 'sell-high' | 'buy-low' | 'aligned'

export interface LuckVerdict {
  stance: LuckStance
  luckDelta: number // talentRank - recordRank; positive = record beats talent = lucky (sell-high)
  headline: string
  detail: string
  cta: { label: string; route: string } | null
}

/**
 * Record-vs-talent luck as an actionable stance. Mirrors src/league/powerRankings.ts so the two
 * pages never disagree on who's lucky: tol = max(2, round(n/4)); luckDelta = talentRank - recordRank.
 * standingState gates the copy — an eliminated team is never told to "sell high to save the season",
 * a clinched team gets a next-year framing.
 */
export function luckVerdict(input: {
  recordRank: number // 1 = best by record
  talentRank: number // 1 = best by rest-of-season per-week points
  leagueSize: number
  standingState: StandingState
}): LuckVerdict {
  const { recordRank, talentRank, leagueSize, standingState } = input
  const tol = Math.max(2, Math.round(leagueSize / 4))
  const luckDelta = talentRank - recordRank
  const trades = { label: 'Explore trades', route: '/trades' }

  if (standingState === 'eliminated') {
    return {
      stance: 'aligned',
      luckDelta,
      headline: 'Out of the race',
      detail: 'Play the string out — move win-now pieces for next year if a partner will pay.',
      cta: trades,
    }
  }

  if (luckDelta >= tol) {
    if (standingState === 'clinched') {
      return {
        stance: 'sell-high',
        luckDelta,
        headline: 'Locked in — and outrunning your roster',
        detail: 'You are in the bracket but your talent trails your seed. Sell a hot bat high for a playoff or next-year upgrade.',
        cta: { label: 'Find sell-high trades', route: '/trades' },
      }
    }
    return {
      stance: 'sell-high',
      luckDelta,
      headline: 'You are outrunning your roster',
      detail: 'Your record beats your talent — sell high and trade from your inflated standing before it regresses.',
      cta: { label: 'Find sell-high trades', route: '/trades' },
    }
  }

  if (luckDelta <= -tol) {
    return {
      stance: 'buy-low',
      luckDelta,
      headline: 'Your roster is better than your record',
      detail: 'Talent says you are underachieving — buy low or stay patient. Do not sell your studs cheap.',
      cta: trades,
    }
  }

  return {
    stance: 'aligned',
    luckDelta,
    headline: 'Roster and record are in step',
    detail: 'No arbitrage in your standing — win at the margins with streams and lineup edges.',
    cta: { label: "Set this week's lineup", route: '/matchup' },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/myteam/__tests__/luckVerdict.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/myteam/luckVerdict.ts src/myteam/__tests__/luckVerdict.test.ts
git commit -m "feat: luckVerdict — record-vs-talent stance (sell-high/buy-low/aligned)"
```

---

## Task 2: `buildSeasonOutlook` pure engine

**Files:**
- Create: `src/myteam/seasonOutlook.ts`
- Test: `src/myteam/__tests__/seasonOutlook.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/myteam/__tests__/seasonOutlook.test.ts
import { describe, it, expect } from 'vitest'
import { buildSeasonOutlook, type OutlookTeamMeta } from '@/myteam/seasonOutlook'
import type { TeamStanding } from '@/myteam/pointsTeam'
import type { ScheduleWeek } from '@/league/playoffOdds'

// Deterministic RNG so the Monte-Carlo sim is reproducible in tests.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A 4-team league. team_a is 12-0 with the strongest roster; team_d is 0-12 and weak.
function fixture() {
  const teamMeta: Record<string, OutlookTeamMeta> = {
    team_a: { wins: 12, losses: 0, ties: 0, pointsFor: 1200 },
    team_b: { wins: 8, losses: 4, ties: 0, pointsFor: 1000 },
    team_c: { wins: 4, losses: 8, ties: 0, pointsFor: 800 },
    team_d: { wins: 0, losses: 12, ties: 0, pointsFor: 600 },
  }
  const standings: TeamStanding[] = [
    { teamKey: 'team_a', startingPoints: 500, rank: 1 },
    { teamKey: 'team_b', startingPoints: 450, rank: 2 },
    { teamKey: 'team_c', startingPoints: 400, rank: 3 },
    { teamKey: 'team_d', startingPoints: 350, rank: 4 },
  ]
  const schedule: ScheduleWeek[] = [
    { week: 13, matchups: [['team_a', 'team_b'], ['team_c', 'team_d']] },
    { week: 14, matchups: [['team_a', 'team_c'], ['team_b', 'team_d']] },
  ]
  return { teamMeta, standings, schedule }
}

describe('buildSeasonOutlook', () => {
  it('12-0 team reads as 1st / clinched, not a low points rank', () => {
    const { teamMeta, standings, schedule } = fixture()
    const o = buildSeasonOutlook({
      myTeamKey: 'team_a', teamMeta, standings, talentRank: 1,
      schedule, weeksLeft: 2, playoffSpots: 2, sims: 400, rng: mulberry32(42),
    })
    expect(o.ready).toBe(true)
    expect(o.recordRank).toBe(1)
    expect(o.standingState).toBe('clinched')
    expect(o.projSeed).toBe(1)
    expect(o.record).toEqual({ wins: 12, losses: 0, ties: 0 })
  })

  it('record rank uses win% with pointsFor tiebreak', () => {
    const { teamMeta, standings, schedule } = fixture()
    const o = buildSeasonOutlook({
      myTeamKey: 'team_c', teamMeta, standings, talentRank: 3,
      schedule, weeksLeft: 2, playoffSpots: 2, sims: 200, rng: mulberry32(7),
    })
    expect(o.recordRank).toBe(3)
  })

  it('no schedule -> not ready, seed/odds null, luck still computed from ranks', () => {
    const { teamMeta, standings } = fixture()
    const o = buildSeasonOutlook({
      myTeamKey: 'team_a', teamMeta, standings, talentRank: 4,
      schedule: [], weeksLeft: 0, playoffSpots: 0,
    })
    expect(o.ready).toBe(false)
    expect(o.projSeed).toBeNull()
    expect(o.playoffPct).toBeNull()
    expect(o.standingState).toBe('unknown')
    // team_a is 12-0 (recordRank 1) but talentRank 4 -> overperforming -> sell-high
    expect(o.luck.stance).toBe('sell-high')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/myteam/__tests__/seasonOutlook.test.ts`
Expected: FAIL — "Cannot find module '@/myteam/seasonOutlook'".

- [ ] **Step 3: Write the implementation**

```ts
// src/myteam/seasonOutlook.ts
import { simulatePlayoffOdds, type OddsTeam, type ScheduleWeek } from '@/league/playoffOdds'
import { luckVerdict, type LuckVerdict, type StandingState } from './luckVerdict'
import type { TeamStanding } from './pointsTeam'

export interface OutlookTeamMeta {
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

export interface SeasonOutlook {
  record: { wins: number; losses: number; ties: number }
  recordRank: number // 1 = best by win% (tiebreak pointsFor)
  leagueSize: number
  talentRank: number // rest-of-season per-week points rank (from buildPointsTeam.myLineupRank)
  projSeed: number | null // avg finishing seed from the sim (null until schedule known)
  playoffPct: number | null // 0..1 (null until schedule known)
  playoffSpots: number
  weeksLeft: number
  standingState: StandingState
  reasoning: string // honest one-liner for the badge sub-line ('' when not ready)
  luck: LuckVerdict
  ready: boolean // seed/odds/state available (remaining schedule present)
}

function winPct(m: OutlookTeamMeta): number {
  const g = m.wins + m.losses + m.ties
  return g > 0 ? (m.wins + 0.5 * m.ties) / g : 0
}

function standingStateOf(playoffPct: number, recordRank: number, playoffSpots: number): StandingState {
  if (playoffPct >= 0.99) return 'clinched'
  if (playoffPct <= 0.01) return 'eliminated'
  if (playoffPct >= 0.75) return 'in'
  if (playoffPct <= 0.25) return 'chasing'
  return 'bubble'
}

function reasoningOf(state: StandingState, weeksLeft: number, playoffSpots: number, playoffPct: number): string {
  const pct = Math.round(playoffPct * 100)
  switch (state) {
    case 'clinched': return `Locked into the top ${playoffSpots} with ${weeksLeft} to play.`
    case 'eliminated': return `Out of the top ${playoffSpots} with only ${weeksLeft} left — out of reach.`
    case 'in': return `Inside the cut — ${pct}% to hold a top-${playoffSpots} spot.`
    case 'chasing': return `Outside the top ${playoffSpots} — ${pct}% to climb in with ${weeksLeft} left.`
    case 'bubble': return `On the bubble — ${pct}% to make the top ${playoffSpots}, ${weeksLeft} to play.`
    default: return ''
  }
}

/**
 * Assemble the season outlook for one team from league records + a per-week points model + the
 * remaining schedule. recordRank + seeding use win% (tiebreak pointsFor), matching
 * simulatePlayoffOdds. When the schedule is unknown (pre-season / off-week), ready=false and the
 * seed/odds/state are withheld rather than invented; the luck stance still resolves from the ranks.
 */
export function buildSeasonOutlook(input: {
  myTeamKey: string
  teamMeta: Record<string, OutlookTeamMeta>
  standings: TeamStanding[]
  talentRank: number
  schedule: ScheduleWeek[]
  weeksLeft: number
  playoffSpots: number
  sims?: number
  rng?: () => number
}): SeasonOutlook {
  const { myTeamKey, teamMeta, standings, talentRank, schedule, weeksLeft, playoffSpots } = input
  const keys = Object.keys(teamMeta)
  const leagueSize = keys.length
  const meRec = teamMeta[myTeamKey] ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 }

  const ranked = [...keys].sort(
    (a, b) =>
      winPct(teamMeta[b]) - winPct(teamMeta[a]) ||
      teamMeta[b].pointsFor - teamMeta[a].pointsFor ||
      (a < b ? -1 : 1),
  )
  const recordRank = (ranked.indexOf(myTeamKey) + 1) || leagueSize

  const strengthByKey = new Map(standings.map((s) => [s.teamKey, s.startingPoints]))
  const ready = schedule.length > 0 && weeksLeft > 0 && playoffSpots > 0

  let projSeed: number | null = null
  let playoffPct: number | null = null
  let standingState: StandingState = 'unknown'
  let reasoning = ''

  if (ready) {
    const oddsTeams: OddsTeam[] = keys.map((k) => ({
      teamKey: k,
      strength: strengthByKey.get(k) ?? 0,
      wins: teamMeta[k].wins,
      losses: teamMeta[k].losses,
      ties: teamMeta[k].ties,
      pointsFor: teamMeta[k].pointsFor,
    }))
    const out = simulatePlayoffOdds(oddsTeams, schedule, {
      playoffSpots,
      sims: input.sims ?? 5000,
      rng: input.rng,
    })
    const mine = out.results.find((r) => r.teamKey === myTeamKey)
    projSeed = mine ? Math.round(mine.avgSeed) : null
    playoffPct = mine ? mine.playoffPct : null
    if (playoffPct != null) {
      standingState = standingStateOf(playoffPct, recordRank, playoffSpots)
      reasoning = reasoningOf(standingState, weeksLeft, playoffSpots, playoffPct)
    }
  }

  const luck = luckVerdict({ recordRank, talentRank, leagueSize, standingState })

  return {
    record: { wins: meRec.wins, losses: meRec.losses, ties: meRec.ties },
    recordRank,
    leagueSize,
    talentRank,
    projSeed,
    playoffPct,
    playoffSpots,
    weeksLeft,
    standingState,
    reasoning,
    luck,
    ready,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/myteam/__tests__/seasonOutlook.test.ts`
Expected: PASS (3 tests). If `projSeed` for the 12-0 team is not exactly 1 under `mulberry32(42)`, that means the seed is unstable — do NOT loosen the record/state assertions; instead raise `sims` in that test to 800 (a 12-0 top-strength team seeds 1st essentially always). Keep the `recordRank`/`standingState` assertions strict.

- [ ] **Step 5: Commit**

```bash
git add src/myteam/seasonOutlook.ts src/myteam/__tests__/seasonOutlook.test.ts
git commit -m "feat: buildSeasonOutlook — record rank + playoff sim + standing state + luck"
```

---

## Task 3: `useSeasonOutlook` composable

**Files:**
- Create: `src/composables/useSeasonOutlook.ts`

No unit test (thin reactive wrapper over the tested engine); verified via the page in Task 5.

- [ ] **Step 1: Write the composable**

```ts
// src/composables/useSeasonOutlook.ts
import { computed, onMounted, watch, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { usePowerTrajectory } from './usePowerTrajectory'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildSeasonOutlook, type OutlookTeamMeta, type SeasonOutlook } from '@/myteam/seasonOutlook'

/**
 * Reactive Season Outlook for the active points team. Owns the schedule/playoff-spots trajectory,
 * builds a per-week (schedule-neutral) points model for talent + strength, and hands both to the
 * pure buildSeasonOutlook. Inputs are passed in (the view already loads them) to avoid re-fetching.
 */
export function useSeasonOutlook(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  fgByKey: Ref<Record<string, unknown>>
  rosterSlots: Ref<Record<string, number>>
  weights: Ref<Record<string, number>>
  myTeamKey: Ref<string>
  teamMeta: Ref<Record<string, OutlookTeamMeta>>
}): { outlook: Ref<SeasonOutlook | null> } {
  const leagueStore = useLeagueStore()
  const trajectory = usePowerTrajectory()

  const load = () => trajectory.load()
  onMounted(load)
  watch(() => leagueStore.activeLeagueId, load)

  const outlook = computed<SeasonOutlook | null>(() => {
    if (!inputs.pool.value.length || !Object.keys(inputs.rosterSlots.value).length) return null
    if (!inputs.myTeamKey.value || !Object.keys(inputs.teamMeta.value).length) return null

    const wl = trajectory.weeksLeft.value
    const model = buildPointsTeam(
      inputs.pool.value,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputs.fgByKey.value as any,
      inputs.weights.value,
      inputs.myTeamKey.value,
      inputs.rosterSlots.value,
      { basis: wl > 0 ? 'perWeek' : 'total', weeksLeft: wl },
    )

    return buildSeasonOutlook({
      myTeamKey: inputs.myTeamKey.value,
      teamMeta: inputs.teamMeta.value,
      standings: model.standings,
      talentRank: model.myLineupRank,
      schedule: trajectory.remainingSchedule.value,
      weeksLeft: wl,
      playoffSpots: trajectory.playoffSpots.value,
    })
  })

  return { outlook }
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no NEW errors from `useSeasonOutlook.ts` / `seasonOutlook.ts` / `luckVerdict.ts` (the repo has a known pre-existing count; nothing new should reference these files).

- [ ] **Step 3: Commit**

```bash
git add src/composables/useSeasonOutlook.ts
git commit -m "feat: useSeasonOutlook — reactive outlook wiring (trajectory + perWeek model)"
```

---

## Task 4: Wire the Season Outlook into `PointsMyTeamView`

**Files:**
- Modify: `src/views/PointsMyTeamView.vue`

- [ ] **Step 1: Add imports and team-meta assembly (script)**

In the `<script setup>` block, add to the imports near the top (after the existing `buildPointsTeam` import on line 8):

```ts
import { useSeasonOutlook } from '@/composables/useSeasonOutlook'
import type { OutlookTeamMeta } from '@/myteam/seasonOutlook'
```

Then, after the `myTeamLogo` computed (around line 54), add the team-meta map and the composable call:

```ts
// All-team records for the playoff sim (mirror LeagueView's pointsTeamMeta, records only).
const teamMeta = computed<Record<string, OutlookTeamMeta>>(() => {
  if (isEspn.value) {
    const out: Record<string, OutlookTeamMeta> = {}
    for (const [k, r] of Object.entries(espnPoints.teamRecords.value)) {
      out[k] = { wins: r.wins, losses: r.losses, ties: r.ties, pointsFor: r.pointsFor }
    }
    return out
  }
  const out: Record<string, OutlookTeamMeta> = {}
  for (const t of (leagueStore.yahooTeams ?? []) as any[]) {
    out[String(t.team_key)] = {
      wins: Number(t.wins ?? 0),
      losses: Number(t.losses ?? 0),
      ties: Number(t.ties ?? 0),
      pointsFor: Number(t.points_for ?? 0),
    }
  }
  return out
})

const { outlook } = useSeasonOutlook({
  pool,
  fgByKey,
  rosterSlots,
  weights: scoring.weights,
  myTeamKey,
  teamMeta,
})

const recordLabel = computed(() => {
  const r = outlook.value?.record
  if (!r) return ''
  return `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}`
})

const standingBadge = computed(() => {
  const s = outlook.value?.standingState
  switch (s) {
    case 'clinched': return { label: 'CLINCHED', cls: 'bg-primary/15 text-primary' }
    case 'in': return { label: 'IN THE FIELD', cls: 'bg-dark-textMuted/15 text-dark-text' }
    case 'bubble': return { label: 'ON THE BUBBLE', cls: 'bg-amber-500/15 text-amber-400' }
    case 'chasing': return { label: 'CHASING', cls: 'bg-dark-textMuted/15 text-dark-textMuted' }
    case 'eliminated': return { label: 'ELIMINATED', cls: 'bg-[#FF5C5C]/15 text-[#FF5C5C]' }
    default: return null
  }
})

const luckColor = computed(() => {
  const st = outlook.value?.luck.stance
  return st === 'sell-high' ? 'text-amber-400' : st === 'buy-low' ? 'text-primary' : 'text-dark-text'
})
```

> Note: `pool`, `fgByKey`, `rosterSlots`, `myTeamKey`, `scoring`, `isEspn`, `espnPoints`, `leagueStore` are all already declared in this file (lines 12–54). Do not redeclare them.

- [ ] **Step 2: Replace the "Projected finish" card (template)**

Replace the entire block currently at lines 153–163 (the `<!-- Projected finish card -->` `<div>`) with:

```html
      <!-- Season Outlook -->
      <div v-if="outlook" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Season outlook</div>

        <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-3xl font-display font-bold text-dark-text">{{ recordLabel }}</span>
          <span class="text-sm text-dark-textMuted">{{ ord(outlook.recordRank) }} of {{ outlook.leagueSize }}</span>
          <span v-if="standingBadge" class="rounded px-2 py-0.5 font-mono text-[11px] font-semibold" :class="standingBadge.cls">
            {{ standingBadge.label }}
          </span>
        </div>

        <div v-if="outlook.ready && outlook.projSeed != null && outlook.playoffPct != null"
          class="mt-1 font-mono text-xs text-dark-textMuted">
          Projected seed <span class="text-dark-text">{{ ord(outlook.projSeed) }}</span>
          · <span class="text-dark-text">{{ Math.round(outlook.playoffPct * 100) }}%</span> to make the playoffs
          · top {{ outlook.playoffSpots }} advance
        </div>
        <div v-if="outlook.reasoning" class="mt-1 text-xs text-dark-textMuted">{{ outlook.reasoning }}</div>

        <div class="mt-2 text-[11px] text-dark-textMuted/80">
          Roster talent: {{ ord(outlook.talentRank) }} of {{ outlook.leagueSize }} · rest-of-season points
        </div>

        <!-- Luck action -->
        <div class="mt-3 flex items-start gap-3 rounded-lg border border-dark-border/70 bg-dark-bg/40 p-3">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold" :class="luckColor">{{ outlook.luck.headline }}</div>
            <div class="mt-0.5 text-xs text-dark-textMuted">{{ outlook.luck.detail }}</div>
          </div>
          <RouterLink v-if="outlook.luck.cta" :to="outlook.luck.cta.route"
            class="shrink-0 rounded-md bg-primary/15 px-2.5 py-1 font-mono text-[11px] text-primary hover:bg-primary/25">
            {{ outlook.luck.cta.label }}
          </RouterLink>
        </div>
      </div>
```

- [ ] **Step 3: Trim the competing rank from the header sub-line (template)**

The header sub-line (currently lines 138–143) still shows "Best lineup projects Nth of M", which now competes with the outlook's "Roster talent" line. Replace that `<p v-if="verdict">` block with:

```html
      <p v-if="verdict" class="mt-1 text-sm text-dark-textMuted">
        Strongest: {{ verdict.best.slot }} ({{ ord(verdict.best.rank) }})
        · Biggest hole: {{ verdict.worst.slot }} ({{ ord(verdict.worst.rank) }})
      </p>
```

- [ ] **Step 4: Extend the `?ptsaudit` panel (script + template)**

In the `<script setup>`, add an audit summary computed (near `auditRows`, ~line 108):

```ts
const auditOutlook = computed(() => {
  const o = outlook.value
  if (!showAudit.value || !o) return null
  return {
    record: recordLabel.value,
    recordRank: o.recordRank,
    talentRank: o.talentRank,
    projSeed: o.projSeed,
    playoffPct: o.playoffPct == null ? null : Math.round(o.playoffPct * 100),
    state: o.standingState,
    luck: `${o.luck.stance} (Δ${o.luck.luckDelta})`,
  }
})
```

In the audit `<section v-if="showAudit">` (~line 283), add before the `<pre>`:

```html
        <div v-if="auditOutlook" class="mb-2 border-t border-amber-600/20 pt-2 text-dark-textMuted">
          outlook: {{ auditOutlook.record }} · recordRank {{ auditOutlook.recordRank }} · talentRank {{ auditOutlook.talentRank }}
          · seed {{ auditOutlook.projSeed }} · {{ auditOutlook.playoffPct }}% · {{ auditOutlook.state }} · {{ auditOutlook.luck }}
        </div>
```

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: no NEW errors introduced by `PointsMyTeamView.vue`.

- [ ] **Step 6: Commit**

```bash
git add src/views/PointsMyTeamView.vue
git commit -m "feat: points My Team — Season Outlook hero + luck action (replaces fake finish)"
```

---

## Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all pass, including the new `luckVerdict` (6) and `seasonOutlook` (3) tests. The prior suite count (~306) should increase by 9, none regressed.

- [ ] **Step 2: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: build succeeds. Type-check error count is not higher than the pre-existing baseline for files unrelated to this change.

- [ ] **Step 3: Manual smoke (dev server) — REQUIRED, build alone does not catch missing imports/runtime**

Run: `npm run dev`, open a **points** league's My Team page. Confirm:
- The hero reads `W-L · Nth of M` with a standing badge — NOT "Projected finish 6th" for a first-place team.
- Mid-season: "Projected seed X · Y% to make the playoffs · top K advance" and a reasoning line appear.
- The luck action row shows a headline/detail and (except when aligned→/matchup) a trades link.
- Append `?ptsaudit=1`: the new `outlook:` line appears; cross-check `recordRank`/seed against the **League** page Standings for the same league — they should agree.
- Repeat on both an ESPN and a Yahoo points league if available.

- [ ] **Step 4: Commit any smoke-fix (only if needed)**

```bash
git add -A && git commit -m "fix: points My Team Season Outlook — <smoke finding>"
```

---

## Self-Review Notes (already reconciled)

- **Spec coverage:** hero finish→seed (Tasks 2,4), stakes/standing badge (Task 2 `standingState` + Task 4 badge), playoff odds (Task 2 sim), demoted talent read (Task 4), luck→action (Tasks 1,4), cross-page consistency (shared `simulatePlayoffOdds` + perWeek `buildPointsTeam`, verified in Task 5 Step 3). Phases 2 (IL) and 3 (Today) are out of scope per the spec.
- **Type consistency:** `StandingState` defined once in `luckVerdict.ts`, imported by `seasonOutlook.ts`. `OutlookTeamMeta`/`SeasonOutlook` defined in `seasonOutlook.ts`, imported by the composable + view. `buildSeasonOutlook` input/return names match every call site.
- **Deviation logged:** standing badge is odds-derived, not `seasonStakes`-derived (rationale at top). Post-build, update the spec note and the `points-league-myteam-reconciliation` memory.
