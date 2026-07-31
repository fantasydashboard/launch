# Football VOR Engine + Wire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the league-calibrated football VOR (Value Over Replacement) engine and rewire the Wire onto it — best-available = VOR, waiver upgrades = flex-aware lineup-marginal, a next-week streaming section with a multi-week streamability badge, and a full position board.

**Architecture:** A set of pure, unit-tested functions in `src/football/` (settings-derived replacement baseline → per-player VOR → opportunity tag → lineup-marginal), orchestrated by a thin composable that reuses the existing Sleeper projection plumbing, and consumed by a football branch in `PointsWireView.vue`. Baseball is never touched: the football branch is gated by `activeSport === 'football'`, exactly like the existing view code.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest. Reuses `assignSlots` (`src/trades/positionalLandscape.ts`), `parseRosterSlots` + `FLEX_ELIGIBILITY` (`src/trades/rosterSlots.ts`), `buildFootballProjectionsByKey` (`src/football/buildFootballProjections.ts`), and `sleeperService` (`src/services/sleeper.ts`).

**Scope:** Engine spine (stages 1–4 of the spec) + Wire consumer (stage 2 of the spec). Trades (spec §6 Trades) and My Team (spec §6 My Team) are deliberately deferred to separate follow-on plans so the novel replacement-baseline math can be validated on a real league before propagating to two more surfaces.

**Spec:** `docs/superpowers/specs/2026-07-30-football-vor-cheat-code-design.md`

---

## File Structure

**Create (pure, unit-tested):**
- `src/football/footballReplacement.ts` — VBD settings-derived replacement level per position (spec §2).
- `src/football/footballVor.ts` — per-player VOR: ROS + next-week + streamability + confidence (spec §1, §3).
- `src/football/footballOpportunity.ts` — depth-chart/injury opportunity tag (spec §4).
- `src/football/lineupMarginal.ts` — flex-aware optimal-lineup marginal value (spec §5).
- `src/football/footballWire.ts` — Wire view-model built from VOR (spec §6 Wire).
- `src/football/footballBye.ts` — pure bye-week helpers for weekly zeroing (spec §1 weekly).
- Matching `src/football/__tests__/*.test.ts` for each.

**Create (composable glue, not unit-tested — matches `useFootballProjections.ts` convention):**
- `src/composables/useFootballWire.ts` — orchestrates season + weekly projection fetch, builds VOR + Wire model.

**Modify:**
- `src/services/footballProjections.ts` — add `fetchWeekProjectionStats(season, week)` (weekly analog of `fetchSeasonProjectionStats`).
- `src/views/PointsWireView.vue` — football branch renders the new sections; baseball branch unchanged.

**Conventions to follow (already in the codebase):**
- Position normalization: `(pos || '').toUpperCase().split(/[,/|]/)[0].trim()`.
- Free-agent key: `fa.playerKey ?? \`fa:${fa.name}\`` (Sleeper FAs carry a real `player_id`; ESPN/Yahoo fall back to `fa:<name>`).
- `assignSlots(players, slots, 0)` (bar 0) is the optimal-lineup solver; `DepthPlayer.value` holds the points.
- Tests use `import { describe, it, expect } from 'vitest'`.

---

## Task 1: Replacement baseline (`footballReplacement.ts`)

Settings-derived VBD replacement level per position: `replacement[pos]` = points of the first player OFF the startable list, where startable count = `teams × (dedicated slots + flex allocation)`.

**Files:**
- Create: `src/football/footballReplacement.ts`
- Test: `src/football/__tests__/footballReplacement.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/football/__tests__/footballReplacement.test.ts
import { describe, it, expect } from 'vitest'
import { computeReplacementLevels, type RepPlayer } from '../footballReplacement'

// Build N players at a position with descending points from `top` step `step`.
function pos(position: string, n: number, top: number, step: number): RepPlayer[] {
  return Array.from({ length: n }, (_, i) => ({ playerKey: `${position}${i}`, position, points: top - i * step }))
}

describe('computeReplacementLevels', () => {
  it('dedicated slots only: replacement = the (teams*slots)-th best, i.e. first off the list', () => {
    // 2 teams, 1 QB slot each → 2 QBs startable → replacement = the 3rd QB (index 2).
    const players = pos('QB', 5, 300, 10) // 300,290,280,270,260
    const levels = computeReplacementLevels(players, { QB: 1 }, 2)
    expect(levels.QB).toBe(280) // index 2
  })

  it('flex allocation deepens the flex-eligible positions', () => {
    // 1 team, RB:1, WR:1, FLEX:1. Base startable: RB 1, WR 1. One flex opening (RB/WR/TE).
    // RBs: 100,90,80 ; WRs: 95,50,40. Leftovers beyond base: RB 90,80 ; WR 50,40.
    // Best leftover = RB 90 → fills the flex as RB. startable RB=2, WR=1.
    // replacement RB = index 2 = 80 ; replacement WR = index 1 = 50.
    const players = [...pos('RB', 3, 100, 10), ...pos('WR', 3, 95, 45)]
    const levels = computeReplacementLevels(players, { RB: 1, WR: 1, FLEX: 1 }, 1)
    expect(levels.RB).toBe(80)
    expect(levels.WR).toBe(50)
  })

  it('SUPER_FLEX pulls QBs into the flex pool (deeper QB replacement)', () => {
    // 1 team, QB:1, RB:1, SUPER_FLEX:1 (QB/RB/WR/TE).
    // QBs: 400,380,360 ; RBs: 200,190. Leftovers: QB 380,360 ; RB 190.
    // Best leftover = QB 380 → fills SUPER_FLEX as QB. startable QB=2.
    // replacement QB = index 2 = 360.
    const players = [...pos('QB', 3, 400, 20), ...pos('RB', 2, 200, 10)]
    const levels = computeReplacementLevels(players, { QB: 1, RB: 1, SUPER_FLEX: 1 }, 1)
    expect(levels.QB).toBe(360)
  })

  it('a plain FLEX never pulls a QB in (QB stays shallow)', () => {
    // FLEX eligibility is RB/WR/TE only, so the QB leftover can't fill it.
    const players = [...pos('QB', 3, 400, 20), ...pos('RB', 4, 200, 10)]
    const levels = computeReplacementLevels(players, { QB: 1, RB: 1, FLEX: 1 }, 1)
    expect(levels.QB).toBe(380) // QB startable stays 1 → index 1
  })

  it('K and DEF use base slots only', () => {
    const players = [...pos('K', 4, 120, 10), ...pos('DEF', 4, 100, 8)]
    const levels = computeReplacementLevels(players, { K: 1, DEF: 1 }, 2)
    expect(levels.K).toBe(100) // 2 teams * 1 → index 2
    expect(levels.DEF).toBe(84) // 100,92,84 → index 2
  })

  it('short pool: startable exceeds available → falls back to the worst available', () => {
    const players = pos('TE', 2, 90, 10) // only 2 TEs, need index 4
    const levels = computeReplacementLevels(players, { TE: 1 }, 5)
    expect(levels.TE).toBe(80) // worst available (last)
  })

  it('empty pool → 0', () => {
    expect(computeReplacementLevels([], { QB: 1 }, 10).QB).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/football/__tests__/footballReplacement.test.ts`
Expected: FAIL — "Cannot find module '../footballReplacement'".

- [ ] **Step 3: Implement `footballReplacement.ts`**

```typescript
// src/football/footballReplacement.ts
import { FLEX_ELIGIBILITY } from '@/trades/rosterSlots'

/** A pool player reduced to what the replacement baseline needs. */
export interface RepPlayer {
  playerKey: string
  position: string
  points: number
}

/** position → replacement-level projected points. */
export type ReplacementLevels = Record<string, number>

/** Positions filled by a dedicated (non-flex) slot. */
const DEDICATED = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
/** Flex slot keys, from the roster-slot parser. */
const FLEX_SLOTS = ['FLEX', 'SUPER_FLEX']

const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * Standard value-based-drafting replacement level, calibrated to the league.
 *
 * startable[pos] = teams × dedicated slots, plus a share of the flex openings
 * allocated to the best flex-eligible leftovers (a leftover fills the most
 * restrictive open flex it qualifies for, so SUPER_FLEX capacity is preserved
 * for QBs). replacement[pos] = the points of the first player OFF that startable
 * list — the true waiver-level alternative. Deterministic and pure.
 */
export function computeReplacementLevels(
  players: RepPlayer[],
  slots: Record<string, number>,
  teams: number,
): ReplacementLevels {
  const t = Math.max(1, teams)

  // Points per position, sorted best-first.
  const byPos = new Map<string, number[]>()
  for (const p of players) {
    const pos = normPos(p.position)
    if (!pos) continue
    ;(byPos.get(pos) ?? byPos.set(pos, []).get(pos)!).push(p.points)
  }
  for (const arr of byPos.values()) arr.sort((a, b) => b - a)

  // 1) Base startable counts from dedicated slots.
  const startable: Record<string, number> = {}
  for (const p of DEDICATED) startable[p] = t * (slots[p] ?? 0)

  // 2) Flex allocation. Expand each flex opening (capacity 1) tagged with its
  //    eligibility set + restrictiveness (smaller set = fill first).
  const openings: { elig: Set<string>; restrict: number; filled: boolean }[] = []
  for (const fs of FLEX_SLOTS) {
    const count = t * (slots[fs] ?? 0)
    const elig = new Set((FLEX_ELIGIBILITY[fs] ?? []).map((x) => x.toUpperCase()))
    for (let i = 0; i < count; i++) openings.push({ elig, restrict: elig.size, filled: false })
  }
  if (openings.length) {
    // Leftovers = players beyond each position's base count, globally best-first.
    const leftovers: { pos: string; points: number }[] = []
    for (const [pos, arr] of byPos) {
      const base = startable[pos] ?? 0
      for (let i = base; i < arr.length; i++) leftovers.push({ pos, points: arr[i] })
    }
    leftovers.sort((a, b) => b.points - a.points)
    for (const lo of leftovers) {
      let best = -1
      for (let i = 0; i < openings.length; i++) {
        const o = openings[i]
        if (o.filled || !o.elig.has(lo.pos)) continue
        if (best < 0 || o.restrict < openings[best].restrict) best = i
      }
      if (best < 0) continue
      openings[best].filled = true
      startable[lo.pos] = (startable[lo.pos] ?? 0) + 1
    }
  }

  // 3) replacement = first player off the startable list; if everyone is startable
  //    (idx past the end), fall back to the worst available; empty pool → 0.
  const levels: ReplacementLevels = {}
  const allPos = new Set<string>([...DEDICATED, ...byPos.keys()])
  for (const pos of allPos) {
    const arr = byPos.get(pos) ?? []
    if (!arr.length) { levels[pos] = 0; continue }
    const idx = startable[pos] ?? 0
    levels[pos] = arr[idx] ?? arr[arr.length - 1]
  }
  return levels
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/football/__tests__/footballReplacement.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/football/footballReplacement.ts src/football/__tests__/footballReplacement.test.ts
git commit -m "feat: football VOR replacement baseline (settings-derived VBD)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Per-player VOR + timeframes (`footballVor.ts`)

Turn ROS points + optional weekly points into per-player VOR, next-week VOR, streamability count, and a confidence flag.

**Files:**
- Create: `src/football/footballVor.ts`
- Test: `src/football/__tests__/footballVor.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/football/__tests__/footballVor.test.ts
import { describe, it, expect } from 'vitest'
import { buildFootballVor } from '../footballVor'

describe('buildFootballVor', () => {
  // 1 team, RB:2 → replacement RB = 3rd best RB.
  const points = { a: 200, b: 150, c: 100, d: 80 }
  const positionByKey = { a: 'RB', b: 'RB', c: 'RB', d: 'RB' }

  it('vorRos = points − positional replacement (can be negative)', () => {
    const vor = buildFootballVor({ points, positionByKey, slots: { RB: 2 }, teams: 1 })
    // startable RB = 2 → replacement = index 2 = 100.
    expect(vor.a.vorRos).toBe(100) // 200 − 100
    expect(vor.c.vorRos).toBe(0)   // 100 − 100
    expect(vor.d.vorRos).toBe(-20) // 80 − 100, below replacement
  })

  it('confidence is low when a player has no projection (0 points)', () => {
    const vor = buildFootballVor({
      points: { a: 200, ghost: 0 },
      positionByKey: { a: 'RB', ghost: 'WR' },
      slots: { RB: 2, WR: 2 }, teams: 1,
    })
    expect(vor.a.confidence).toBe('high')
    expect(vor.ghost.confidence).toBe('low')
  })

  it('weekly: vorWeek from next week, streamWeeks counts weeks above weekly replacement', () => {
    // Next 3 weeks of points. 1 team, RB:1 → weekly replacement = 2nd best RB that week.
    const weekly = [
      { a: 30, b: 20, c: 10 }, // wk1: rep = 20 → a above (30≥20), b at (20≥20), c below
      { a: 5, b: 25, c: 15 },  // wk2: rep = 15 → a below, b above, c at
      { a: 40, b: 10, c: 8 },  // wk3: rep = 10 → a above, b at, c below
    ]
    const vor = buildFootballVor({
      points: { a: 200, b: 150, c: 100 },
      positionByKey: { a: 'RB', b: 'RB', c: 'RB' },
      slots: { RB: 1 }, teams: 1, weekly,
    })
    expect(vor.a.vorWeek).toBe(10)  // 30 − 20 (next week)
    expect(vor.a.streamWeeks).toBe(2) // wk1 (≥), wk3 (≥); wk2 below
    expect(vor.a.streamOf).toBe(3)
    expect(vor.c.streamWeeks).toBe(0) // never ≥ weekly replacement
  })

  it('no weekly input → weekly fields are 0', () => {
    const vor = buildFootballVor({ points, positionByKey, slots: { RB: 2 }, teams: 1 })
    expect(vor.a.vorWeek).toBe(0)
    expect(vor.a.streamWeeks).toBe(0)
    expect(vor.a.streamOf).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/football/__tests__/footballVor.test.ts`
Expected: FAIL — "Cannot find module '../footballVor'".

- [ ] **Step 3: Implement `footballVor.ts`**

```typescript
// src/football/footballVor.ts
import { computeReplacementLevels, type RepPlayer } from './footballReplacement'

export interface PlayerVor {
  playerKey: string
  position: string
  pointsRos: number
  vorRos: number
  pointsNextWeek: number
  vorWeek: number
  streamWeeks: number // count of the next N weeks projecting ≥ weekly replacement
  streamOf: number    // N (number of weekly maps supplied)
  confidence: 'high' | 'low'
}

export interface FootballVorInput {
  points: Record<string, number>          // ROS points by key (rostered + FA)
  positionByKey: Record<string, string>
  slots: Record<string, number>
  teams: number
  weekly?: Record<string, number>[]        // [nextWeek, +1, …] points by key; byes already zeroed
}

const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()

function repPlayers(points: Record<string, number>, positionByKey: Record<string, string>): RepPlayer[] {
  return Object.keys(points).map((k) => ({ playerKey: k, position: positionByKey[k] ?? '', points: points[k] }))
}

/**
 * Per-player VOR in two timeframes. ROS drives ranking/fair value; the optional
 * weekly maps drive the streaming lens: vorWeek is next week's edge, and
 * streamWeeks is how many of the supplied weeks the player clears weekly
 * replacement (a durable stream vs a one-week plug). Pure.
 */
export function buildFootballVor(input: FootballVorInput): Record<string, PlayerVor> {
  const { points, positionByKey, slots, teams, weekly } = input
  const rosLevels = computeReplacementLevels(repPlayers(points, positionByKey), slots, teams)

  // Precompute weekly replacement levels once per week.
  const weeklyLevels = (weekly ?? []).map((wk) => computeReplacementLevels(repPlayers(wk, positionByKey), slots, teams))

  const out: Record<string, PlayerVor> = {}
  for (const key of Object.keys(points)) {
    const pos = normPos(positionByKey[key] ?? '')
    const pointsRos = points[key] ?? 0
    const pointsNextWeek = weekly?.[0]?.[key] ?? 0
    let streamWeeks = 0
    weeklyLevels.forEach((levels, i) => {
      const wkPts = weekly![i][key] ?? 0
      // Strict: strictly ABOVE the weekly replacement (in a small pool the
      // replacement level can be a player's own score, so `>=` self-counts).
      if (wkPts > (levels[pos] ?? 0)) streamWeeks++
    })
    out[key] = {
      playerKey: key,
      position: pos,
      pointsRos,
      vorRos: pointsRos - (rosLevels[pos] ?? 0),
      pointsNextWeek,
      vorWeek: weeklyLevels.length ? pointsNextWeek - (weeklyLevels[0][pos] ?? 0) : 0,
      streamWeeks: weeklyLevels.length ? streamWeeks : 0,
      streamOf: weeklyLevels.length,
      confidence: pointsRos > 0 ? 'high' : 'low',
    }
  }
  return out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/football/__tests__/footballVor.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/football/footballVor.ts src/football/__tests__/footballVor.test.ts
git commit -m "feat: per-player football VOR (ROS + next-week + streamability + confidence)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Opportunity tag (`footballOpportunity.ts`)

Tag each player from depth-chart order + team injuries, surfacing the "healthy backup behind an injured starter" case.

**Files:**
- Create: `src/football/footballOpportunity.ts`
- Test: `src/football/__tests__/footballOpportunity.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/football/__tests__/footballOpportunity.test.ts
import { describe, it, expect } from 'vitest'
import { tagOpportunity, type OppPlayer } from '../footballOpportunity'

describe('tagOpportunity', () => {
  it('flags a healthy backup behind an injured starter as backup-elevated', () => {
    const players: OppPlayer[] = [
      { playerKey: 's', proTeam: 'BUF', position: 'RB', depthChartOrder: 1, injuryStatus: 'Out' },
      { playerKey: 'b', proTeam: 'BUF', position: 'RB', depthChartOrder: 2, injuryStatus: null },
    ]
    const tags = tagOpportunity(players)
    expect(tags.b).toBe('backup-elevated')
    expect(tags.s).toBe('starter')
  })

  it('a backup behind a HEALTHY starter is deep-bench, not elevated', () => {
    const players: OppPlayer[] = [
      { playerKey: 's', proTeam: 'KC', position: 'RB', depthChartOrder: 1, injuryStatus: null },
      { playerKey: 'b', proTeam: 'KC', position: 'RB', depthChartOrder: 2, injuryStatus: null },
    ]
    expect(tagOpportunity(players).b).toBe('deep-bench')
  })

  it('depth order 1 is starter; missing depth order is empty tag', () => {
    const players: OppPlayer[] = [
      { playerKey: 'a', proTeam: 'SF', position: 'WR', depthChartOrder: 1, injuryStatus: null },
      { playerKey: 'x', proTeam: 'SF', position: 'WR', depthChartOrder: null, injuryStatus: null },
    ]
    const tags = tagOpportunity(players)
    expect(tags.a).toBe('starter')
    expect(tags.x).toBe('')
  })

  it('does not cross positions or teams when checking the starter', () => {
    // Injured QB1 on BUF must NOT elevate the RB2 on BUF.
    const players: OppPlayer[] = [
      { playerKey: 'qb', proTeam: 'BUF', position: 'QB', depthChartOrder: 1, injuryStatus: 'Out' },
      { playerKey: 'rb2', proTeam: 'BUF', position: 'RB', depthChartOrder: 2, injuryStatus: null },
    ]
    expect(tagOpportunity(players).rb2).toBe('deep-bench')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/football/__tests__/footballOpportunity.test.ts`
Expected: FAIL — "Cannot find module '../footballOpportunity'".

- [ ] **Step 3: Implement `footballOpportunity.ts`**

```typescript
// src/football/footballOpportunity.ts
export type OpportunityTag = 'starter' | 'backup-elevated' | 'committee' | 'deep-bench' | ''

export interface OppPlayer {
  playerKey: string
  proTeam: string
  position: string
  depthChartOrder?: number | null
  injuryStatus?: string | null
}

/** Sleeper injury statuses that mean the player will not play. */
const OUT_STATUSES = new Set(['OUT', 'IR', 'PUP', 'SUSP', 'NA', 'DNR', 'DOUBTFUL'])
const isOut = (s?: string | null): boolean => OUT_STATUSES.has(String(s ?? '').toUpperCase())
const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * Surface an opportunity tag per player from depth-chart order + team injuries.
 * The signal that matters for waivers: a healthy backup (order ≥ 2) whose same
 * team+position starter (order 1) is out → `backup-elevated`. Pure.
 */
export function tagOpportunity(players: OppPlayer[]): Record<string, OpportunityTag> {
  // Is the order-1 body at each team+position currently out?
  const starterOut = new Map<string, boolean>()
  for (const p of players) {
    if ((p.depthChartOrder ?? 0) === 1) {
      starterOut.set(`${p.proTeam}|${normPos(p.position)}`, isOut(p.injuryStatus))
    }
  }
  const out: Record<string, OpportunityTag> = {}
  for (const p of players) {
    const order = p.depthChartOrder ?? null
    if (order == null) { out[p.playerKey] = ''; continue }
    if (order === 1) { out[p.playerKey] = 'starter'; continue }
    const key = `${p.proTeam}|${normPos(p.position)}`
    out[p.playerKey] = starterOut.get(key) ? 'backup-elevated' : 'deep-bench'
  }
  return out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/football/__tests__/footballOpportunity.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/football/footballOpportunity.ts src/football/__tests__/footballOpportunity.test.ts
git commit -m "feat: football opportunity tag (backup behind injured starter)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Lineup-marginal value (`lineupMarginal.ts`)

Flex-aware waiver-upgrade math: how much a candidate improves *my* optimal starting lineup, and which body it displaces.

**Files:**
- Create: `src/football/lineupMarginal.ts`
- Test: `src/football/__tests__/lineupMarginal.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/football/__tests__/lineupMarginal.test.ts
import { describe, it, expect } from 'vitest'
import { optimalLineup, lineupMarginal } from '../lineupMarginal'
import type { DepthPlayer } from '@/trades/positionalLandscape'

// slots: 1 QB, 2 RB, 1 FLEX (RB/WR/TE)
const slots = { QB: 1, RB: 2, FLEX: 1 }

function dp(playerKey: string, position: string, value: number): DepthPlayer {
  return { playerKey, teamKey: 'me', eligiblePositions: [position], value }
}

const roster: DepthPlayer[] = [
  dp('qb1', 'QB', 300),
  dp('rb1', 'RB', 200),
  dp('rb2', 'RB', 150),
  dp('rb3', 'RB', 90), // fills FLEX
]

describe('optimalLineup', () => {
  it('sums the best legal lineup and reports who starts', () => {
    const r = optimalLineup(roster, slots)
    expect(r.total).toBe(740) // 300 + 200 + 150 + 90
    expect(r.started.has('qb1')).toBe(true)
  })
})

describe('lineupMarginal', () => {
  it('a 2nd QB behind an elite starter adds nothing (marginal 0)', () => {
    const m = lineupMarginal(roster, dp('qb2', 'QB', 250), slots)
    expect(m.marginal).toBe(0)
    expect(m.dropKey).toBeNull()
  })

  it('a better flex-eligible RB improves the lineup and displaces the weakest starter', () => {
    // rb4=170 beats rb3=90 in the FLEX → +80, displacing rb3.
    const m = lineupMarginal(roster, dp('rb4', 'RB', 170), slots)
    expect(m.marginal).toBe(80)
    expect(m.dropKey).toBe('rb3')
  })

  it('an elite QB upgrade displaces the incumbent QB', () => {
    const m = lineupMarginal(roster, dp('qbX', 'QB', 400), slots)
    expect(m.marginal).toBe(100) // 400 − 300
    expect(m.dropKey).toBe('qb1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/football/__tests__/lineupMarginal.test.ts`
Expected: FAIL — "Cannot find module '../lineupMarginal'".

- [ ] **Step 3: Implement `lineupMarginal.ts`**

```typescript
// src/football/lineupMarginal.ts
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'

export interface OptimalLineup {
  total: number
  started: Set<string>
}

/** Optimal starting-lineup point total + the set of players who start (bar 0). */
export function optimalLineup(players: DepthPlayer[], slots: Record<string, number>): OptimalLineup {
  const a = assignSlots(players, slots, 0)
  const val = new Map(players.map((p) => [p.playerKey, p.value]))
  const started = new Set<string>()
  let total = 0
  for (const keys of Object.values(a.assignedByPos)) {
    for (const k of keys) { started.add(k); total += val.get(k) ?? 0 }
  }
  return { total, started }
}

export interface MarginalResult {
  marginal: number       // optimal-with-add − optimal-now (≥ 0)
  dropKey: string | null // the starter displaced by the add (null if the add doesn't crack the lineup)
}

/**
 * Flex-aware waiver-upgrade value: the point gain to *my* optimal lineup from
 * adding `candidate`, plus the incumbent starter it displaces. A 2nd QB behind
 * an elite starter yields 0; a better flex body yields its real gain. Pure.
 */
export function lineupMarginal(
  myPlayers: DepthPlayer[],
  candidate: DepthPlayer,
  slots: Record<string, number>,
): MarginalResult {
  const base = optimalLineup(myPlayers, slots)
  const withAdd = optimalLineup([...myPlayers, candidate], slots)
  const marginal = withAdd.total - base.total
  if (marginal <= 0 || !withAdd.started.has(candidate.playerKey)) {
    return { marginal: Math.max(0, marginal), dropKey: null }
  }
  // The displaced starter = in the base lineup but not in the with-add lineup.
  let dropKey: string | null = null
  for (const k of base.started) if (!withAdd.started.has(k)) { dropKey = k; break }
  return { marginal, dropKey }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/football/__tests__/lineupMarginal.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/football/lineupMarginal.ts src/football/__tests__/lineupMarginal.test.ts
git commit -m "feat: flex-aware lineup-marginal waiver-upgrade value

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Bye-week helpers (`footballBye.ts`)

Pure helpers to derive which NFL teams play a given week (from the Sleeper schedule payload) and to zero out a bye player's weekly points.

**Files:**
- Create: `src/football/footballBye.ts`
- Test: `src/football/__tests__/footballBye.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/football/__tests__/footballBye.test.ts
import { describe, it, expect } from 'vitest'
import { playingTeams, zeroByeWeek } from '../footballBye'

describe('playingTeams', () => {
  it('collects home + away team codes from schedule games', () => {
    const games = [
      { home: 'BUF', away: 'MIA' },
      { home: 'KC', away: 'DEN' },
    ]
    const set = playingTeams(games)
    expect(set.has('BUF')).toBe(true)
    expect(set.has('DEN')).toBe(true)
    expect(set.has('SF')).toBe(false)
  })

  it('tolerates alternate key shapes and missing fields', () => {
    const games = [{ home_team: 'BUF', away_team: 'MIA' }, { metadata: {} }]
    const set = playingTeams(games as any)
    expect(set.has('BUF')).toBe(true)
    expect(set.has('MIA')).toBe(true)
    expect(set.size).toBe(2)
  })
})

describe('zeroByeWeek', () => {
  it('zeroes players whose pro team is not playing', () => {
    const points = { a: 20, b: 15 }
    const proTeamByKey = { a: 'BUF', b: 'SF' } // SF on bye
    const out = zeroByeWeek(points, proTeamByKey, new Set(['BUF', 'MIA']))
    expect(out.a).toBe(20)
    expect(out.b).toBe(0)
  })

  it('does not mutate the input', () => {
    const points = { a: 20 }
    zeroByeWeek(points, { a: 'SF' }, new Set(['BUF']))
    expect(points.a).toBe(20)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/football/__tests__/footballBye.test.ts`
Expected: FAIL — "Cannot find module '../footballBye'".

- [ ] **Step 3: Implement `footballBye.ts`**

```typescript
// src/football/footballBye.ts
/** The set of NFL team codes playing in a week's schedule payload (bye = absent). */
export function playingTeams(games: any[]): Set<string> {
  const set = new Set<string>()
  for (const g of games ?? []) {
    const home = g?.home ?? g?.home_team ?? g?.metadata?.home_team
    const away = g?.away ?? g?.away_team ?? g?.metadata?.away_team
    if (home) set.add(String(home).toUpperCase())
    if (away) set.add(String(away).toUpperCase())
  }
  return set
}

/** Return a copy of weekly points with bye-week players (team not playing) zeroed. */
export function zeroByeWeek(
  points: Record<string, number>,
  proTeamByKey: Record<string, string>,
  playing: Set<string>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, pts] of Object.entries(points)) {
    const team = (proTeamByKey[key] ?? '').toUpperCase()
    out[key] = team && !playing.has(team) ? 0 : pts
  }
  return out
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/football/__tests__/footballBye.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/football/footballBye.ts src/football/__tests__/footballBye.test.ts
git commit -m "feat: football bye-week helpers for weekly VOR

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire view-model (`footballWire.ts`)

Assemble the Wire model from VOR + the pool: best-available (by ROS VOR), upgrades (by lineup-marginal, with the real drop), this-week (by weekly VOR, with streamability), and a full per-position board (rostered + FA interleaved).

**Files:**
- Create: `src/football/footballWire.ts`
- Test: `src/football/__tests__/footballWire.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/football/__tests__/footballWire.test.ts
import { describe, it, expect } from 'vitest'
import { buildFootballWire, type WireVorRow } from '../footballWire'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'
import type { PlayerVor } from '../footballVor'

function vor(key: string, position: string, vorRos: number, extra: Partial<PlayerVor> = {}): PlayerVor {
  return {
    playerKey: key, position, pointsRos: vorRos + 100, vorRos,
    pointsNextWeek: 0, vorWeek: extra.vorWeek ?? 0,
    streamWeeks: extra.streamWeeks ?? 0, streamOf: extra.streamOf ?? 0,
    confidence: 'high', ...extra,
  }
}

const slots = { QB: 1, RB: 2, FLEX: 1 }

// My roster: strong QB, two RBs, one flex RB.
const pool: PointsPoolPlayer[] = [
  { playerKey: 'qb1', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
  { playerKey: 'rb1', name: 'My RB1', position: 'RB', teamKey: 'me', proTeam: 'KC' },
  { playerKey: 'rb2', name: 'My RB2', position: 'RB', teamKey: 'me', proTeam: 'SF' },
  { playerKey: 'rb3', name: 'My RB3', position: 'RB', teamKey: 'me', proTeam: 'DEN' },
  { playerKey: 'opp_wr', name: 'Opp WR', position: 'WR', teamKey: 'opp', proTeam: 'MIA' },
]

const freeAgents: AvailablePlayer[] = [
  { playerKey: 'fa_rb', name: 'Stud FA RB', position: 'RB', team: 'LAR', percentOwned: 0, status: '', stats: {} },
  { playerKey: 'fa_qb', name: 'Backup FA QB', position: 'QB', team: 'NYJ', percentOwned: 0, status: '', stats: {} },
]

const vorByKey: Record<string, PlayerVor> = {
  qb1: vor('qb1', 'QB', 150), rb1: vor('rb1', 'RB', 120), rb2: vor('rb2', 'RB', 80),
  rb3: vor('rb3', 'RB', 10), opp_wr: vor('opp_wr', 'WR', 60),
  fa_rb: vor('fa_rb', 'RB', 95, { vorWeek: 12, streamWeeks: 3, streamOf: 4 }),
  fa_qb: vor('fa_qb', 'QB', 40, { vorWeek: 2, streamWeeks: 1, streamOf: 4 }),
}

describe('buildFootballWire', () => {
  const wire = buildFootballWire({ freeAgents, vorByKey, pool, slots, myTeamKey: 'me', teamNames: { opp: 'Rivals' } })

  it('bestAvailable is free agents by ROS VOR desc', () => {
    expect(wire.bestAvailable.map((r) => r.player.name)).toEqual(['Stud FA RB', 'Backup FA QB'])
    expect(wire.bestAvailable[0].vorRos).toBe(95)
  })

  it('upgrades rank by lineup-marginal and name the displaced body; a backup QB is not an upgrade', () => {
    // fa_rb (points 195) cracks the flex over rb3 (points 110) → positive marginal.
    const rbUp = wire.upgrades.find((s) => s.add.player.name === 'Stud FA RB')
    expect(rbUp).toBeTruthy()
    expect(rbUp!.dropName).toBe('My RB3')
    expect(rbUp!.marginal).toBeGreaterThan(0)
    // fa_qb (points 140) can't beat qb1 (points 250) → no upgrade row.
    expect(wire.upgrades.find((s) => s.add.player.name === 'Backup FA QB')).toBeFalsy()
  })

  it('thisWeek is free agents by weekly VOR desc, carrying streamability', () => {
    expect(wire.thisWeek[0].player.name).toBe('Stud FA RB')
    expect(wire.thisWeek[0].streamWeeks).toBe(3)
    expect(wire.thisWeek[0].streamOf).toBe(4)
  })

  it('board groups every player by position, VOR-ranked, owned flagged', () => {
    const rbRow = wire.board['RB']
    expect(rbRow.map((r) => r.name)).toEqual(['My RB1', 'Stud FA RB', 'My RB2', 'My RB3'])
    expect(rbRow.find((r) => r.name === 'My RB1')!.owned).toBe(true)
    expect(rbRow.find((r) => r.name === 'Stud FA RB')!.owned).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/football/__tests__/footballWire.test.ts`
Expected: FAIL — "Cannot find module '../footballWire'".

- [ ] **Step 3: Implement `footballWire.ts`**

```typescript
// src/football/footballWire.ts
import type { AvailablePlayer } from '@/players/types'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { DepthPlayer } from '@/trades/positionalLandscape'
import { lineupMarginal } from './lineupMarginal'
import type { PlayerVor } from './footballVor'

/** A free agent joined to its VOR row (the Wire's currency). */
export interface WireVorRow {
  player: AvailablePlayer
  vorRos: number
  pointsRos: number
  vorWeek: number
  streamWeeks: number
  streamOf: number
  confidence: 'high' | 'low'
}

export interface FootballSwap {
  add: WireVorRow
  dropName: string
  dropKey: string
  marginal: number // optimal-lineup point gain
}

export interface BoardRow {
  name: string
  position: string
  vorRos: number
  owned: boolean
}

export interface FootballWire {
  bestAvailable: WireVorRow[]
  upgrades: FootballSwap[]
  thisWeek: WireVorRow[]
  board: Record<string, BoardRow[]> // position → rostered + FA, VOR-ranked
}

const BOARD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()
const faKey = (fa: { playerKey?: string; name: string }): string => fa.playerKey ?? `fa:${fa.name}`

export function buildFootballWire(input: {
  freeAgents: AvailablePlayer[]
  vorByKey: Record<string, PlayerVor>
  pool: PointsPoolPlayer[]
  slots: Record<string, number>
  myTeamKey: string
  teamNames?: Record<string, string>
}): FootballWire {
  const { freeAgents, vorByKey, pool, slots, myTeamKey } = input

  // Join each FA to its VOR row; only keep projectable (has a VOR entry).
  const rows: WireVorRow[] = []
  for (const fa of freeAgents) {
    const v = vorByKey[faKey(fa)]
    if (!v) continue
    rows.push({
      player: fa,
      vorRos: v.vorRos,
      pointsRos: v.pointsRos,
      vorWeek: v.vorWeek,
      streamWeeks: v.streamWeeks,
      streamOf: v.streamOf,
      confidence: v.confidence,
    })
  }

  const bestAvailable = [...rows].sort((a, b) => b.vorRos - a.vorRos).slice(0, 40)
  const thisWeek = [...rows]
    .filter((r) => r.streamOf > 0)
    .sort((a, b) => b.vorWeek - a.vorWeek)
    .slice(0, 12)

  // Upgrades: my optimal lineup (bar 0) with each top FA candidate added.
  const nameOf = new Map(pool.map((p) => [p.playerKey, p.name]))
  const myPlayers: DepthPlayer[] = pool
    .filter((p) => p.teamKey === myTeamKey)
    .map((p) => ({
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: parseEligible(p),
      value: vorByKey[p.playerKey]?.pointsRos ?? 0, // lineup math uses raw points, not VOR
      status: p.onIL ? 'IL' : '',
    }))
  const upgrades: FootballSwap[] = []
  for (const add of bestAvailable.slice(0, 15)) {
    const candidate: DepthPlayer = {
      playerKey: faKey(add.player),
      teamKey: myTeamKey,
      eligiblePositions: add.player.eligiblePositions?.length
        ? add.player.eligiblePositions
        : [normPos(add.player.position)],
      value: add.pointsRos,
    }
    const m = lineupMarginal(myPlayers, candidate, slots)
    if (m.marginal > 0 && m.dropKey) {
      upgrades.push({ add, dropName: nameOf.get(m.dropKey) ?? '—', dropKey: m.dropKey, marginal: m.marginal })
    }
  }
  upgrades.sort((a, b) => b.marginal - a.marginal)

  // Full board: rostered + FA per position, VOR-ranked, owned flagged.
  const board: Record<string, BoardRow[]> = {}
  for (const pos of BOARD_POSITIONS) {
    const entries: BoardRow[] = []
    for (const p of pool) {
      if (normPos(p.position) !== pos) continue
      entries.push({ name: p.name, position: pos, vorRos: vorByKey[p.playerKey]?.vorRos ?? 0, owned: p.teamKey === myTeamKey })
    }
    for (const fa of freeAgents) {
      if (normPos(fa.position) !== pos) continue
      const v = vorByKey[faKey(fa)]
      if (!v) continue
      entries.push({ name: fa.name, position: pos, vorRos: v.vorRos, owned: false })
    }
    if (entries.length) board[pos] = entries.sort((a, b) => b.vorRos - a.vorRos)
  }

  return { bestAvailable, upgrades, thisWeek, board }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/football/__tests__/footballWire.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/football/footballWire.ts src/football/__tests__/footballWire.test.ts
git commit -m "feat: football Wire view-model on VOR (best-available/upgrades/weekly/board)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Weekly projection fetch (`footballProjections.ts`)

Add the weekly analog of `fetchSeasonProjectionStats` so the composable can pull next-N-week raw stats.

**Files:**
- Modify: `src/services/footballProjections.ts`
- Test: `src/services/__tests__/footballProjections.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/services/__tests__/footballProjections.test.ts` (create the file if the existing one is elsewhere; if it exists, append the `describe` block):

```typescript
// src/services/__tests__/footballProjections.test.ts  (append)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWeekProjectionStats } from '../footballProjections'
import { sleeperService } from '../sleeper'

describe('fetchWeekProjectionStats', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('filters to scoring keys and drops non-finite values', async () => {
    vi.spyOn(sleeperService, 'getWeekProjections').mockResolvedValue({
      p1: { rush_yd: 80, rush_td: 1, foo_bar: 999, rec: NaN },
    })
    const out = await fetchWeekProjectionStats('2026', 5)
    expect(out.p1.rush_yd).toBe(80)
    expect(out.p1.rush_td).toBe(1)
    expect(out.p1.foo_bar).toBeUndefined() // not a scoring key
    expect(out.p1.rec).toBeUndefined()     // NaN dropped
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/footballProjections.test.ts`
Expected: FAIL — `fetchWeekProjectionStats` is not exported.

- [ ] **Step 3: Implement `fetchWeekProjectionStats`**

Append to `src/services/footballProjections.ts`:

```typescript
/**
 * Fetch a single week's Sleeper NFL projections → per-player raw projected stats,
 * filtered to scoring-relevant keys. Weekly analog of fetchSeasonProjectionStats,
 * used for the near-term streaming VOR lens.
 */
export async function fetchWeekProjectionStats(season: string, week: number): Promise<WeekProjections> {
  const raw = await sleeperService.getWeekProjections('football', season, week)
  const out: WeekProjections = {}
  for (const [playerId, stats] of Object.entries(raw)) {
    if (!stats || typeof stats !== 'object') continue
    const acc: Record<string, number> = {}
    for (const k of NFL_STAT_KEYS) {
      const v = (stats as Record<string, number>)[k]
      if (typeof v === 'number' && Number.isFinite(v)) acc[k] = v
    }
    out[playerId] = acc
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/footballProjections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/footballProjections.ts src/services/__tests__/footballProjections.test.ts
git commit -m "feat: fetchWeekProjectionStats for weekly football VOR

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Orchestration composable (`useFootballWire.ts`)

Thin glue that reuses the existing projection composable, loads season + next-N-week points + schedule, builds `vorByKey`, and exposes the Wire model. No unit test (matches `useFootballProjections.ts`); correctness is covered by the pure functions it calls and the smoke test.

**Files:**
- Create: `src/composables/useFootballWire.ts`

- [ ] **Step 1: Implement the composable**

```typescript
// src/composables/useFootballWire.ts
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats, fetchWeekProjectionStats } from '@/services/footballProjections'
import {
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'
import { defaultWeights } from '@/myteam/pointsScoring'
import { buildFootballVor, type PlayerVor } from '@/football/footballVor'
import { buildFootballWire, type FootballWire } from '@/football/footballWire'
import { playingTeams, zeroByeWeek } from '@/football/footballBye'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

const WEEKLY_HORIZON = 4 // next N weeks for streamability

/**
 * Orchestrates the football Wire: season + next-N-week Sleeper projections →
 * league-scored points → VOR (settings-derived replacement) → Wire model.
 * Gated to football; baseball callers never invoke it.
 */
export function useFootballWire(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  freeAgents: Ref<AvailablePlayer[]>
  slots: Ref<Record<string, number>>
  myTeamKey: Ref<string>
  teamNames: Ref<Record<string, string>>
  season: Ref<string>
  enabled: Ref<boolean>
}): { wire: ComputedRef<FootballWire | null>; loading: Ref<boolean>; load: () => void } {
  const vorByKey = ref<Record<string, PlayerVor>>({})
  const loading = ref(false)

  // All players (rostered + FA) as ProjPlayer, so projByKey covers the whole pool.
  const projPlayers = computed<ProjPlayer[]>(() => [
    ...inputs.pool.value.map((p) => ({ key: p.playerKey, name: p.name, position: p.position })),
    ...inputs.freeAgents.value.map((fa) => ({ key: fa.playerKey ?? `fa:${fa.name}`, name: fa.name, position: fa.position })),
  ])
  const positionByKey = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of inputs.pool.value) out[p.playerKey] = p.position
    for (const fa of inputs.freeAgents.value) out[fa.playerKey ?? `fa:${fa.name}`] = fa.position
    return out
  })
  const proTeamByKey = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of inputs.pool.value) out[p.playerKey] = (p.proTeam ?? '').toUpperCase()
    for (const fa of inputs.freeAgents.value) out[fa.playerKey ?? `fa:${fa.name}`] = (fa.team ?? '').toUpperCase()
    return out
  })

  async function load() {
    if (!inputs.enabled.value || projPlayers.value.length === 0) { vorByKey.value = {}; return }
    loading.value = true
    try {
      const state = await sleeperService.getNflState()
      const season = inputs.season.value || state.season
      const currentWeek = Number(state.week) || 1
      const scoring = defaultWeights('football')

      const [seasonStats, playersMap] = await Promise.all([
        fetchSeasonProjectionStats(season),
        sleeperService.getPlayers(),
      ])
      const meta: Record<string, SleeperPlayerMeta> = {}
      for (const [id, pl] of Object.entries(playersMap)) {
        meta[id] = { name: (pl as any)?.full_name || '', position: (pl as any)?.position || '' }
      }
      const seasonProj = buildFootballProjectionsByKey(projPlayers.value, seasonStats, meta, scoring)
      const points: Record<string, number> = {}
      for (const [k, v] of Object.entries(seasonProj)) points[k] = v.points

      // Next N weeks → per-key points, byes zeroed from the schedule. Defensive:
      // any weekly/schedule failure just drops that week from the streamability set.
      const weeks = Array.from({ length: WEEKLY_HORIZON }, (_, i) => currentWeek + i)
      const weekly: Record<string, number>[] = []
      for (const wk of weeks) {
        try {
          const [wkStats, sched] = await Promise.all([
            fetchWeekProjectionStats(season, wk),
            sleeperService.getNflSchedule(season, wk),
          ])
          const wkProj = buildFootballProjectionsByKey(projPlayers.value, wkStats, meta, scoring)
          const wkPoints: Record<string, number> = {}
          for (const [k, v] of Object.entries(wkProj)) wkPoints[k] = v.points
          weekly.push(zeroByeWeek(wkPoints, proTeamByKey.value, playingTeams(sched)))
        } catch (e) {
          console.warn('[useFootballWire] weekly fetch failed for week', wk, e)
        }
      }

      vorByKey.value = buildFootballVor({
        points,
        positionByKey: positionByKey.value,
        slots: inputs.slots.value,
        teams: new Set(inputs.pool.value.map((p) => p.teamKey)).size,
        weekly: weekly.length ? weekly : undefined,
      })
    } catch (e) {
      console.error('[useFootballWire] load failed', e)
      vorByKey.value = {}
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, projPlayers, inputs.season], load, { immediate: true })

  const wire = computed<FootballWire | null>(() => {
    if (!inputs.enabled.value || !inputs.myTeamKey.value || !Object.keys(vorByKey.value).length) return null
    return buildFootballWire({
      freeAgents: inputs.freeAgents.value,
      vorByKey: vorByKey.value,
      pool: inputs.pool.value,
      slots: inputs.slots.value,
      myTeamKey: inputs.myTeamKey.value,
      teamNames: inputs.teamNames.value,
    })
  })

  return { wire, loading, load }
}
```

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc --noEmit -p tsconfig.app.json 2>&1 | grep useFootballWire || echo "no useFootballWire type errors"`
Expected: "no useFootballWire type errors".

- [ ] **Step 3: Commit**

```bash
git add src/composables/useFootballWire.ts
git commit -m "feat: useFootballWire composable — orchestrates VOR + Wire model

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Wire view football branch (`PointsWireView.vue`)

Render the football sections from `useFootballWire`: Upgrades (marginal + drop), Best Available (VOR), This Week (weekly VOR + streamability badge), and an expandable Full Board. The existing baseball branch is untouched.

**Files:**
- Modify: `src/views/PointsWireView.vue`

- [ ] **Step 1: Read the current view to place the football branch**

Read `src/views/PointsWireView.vue` in full. Note: `isFootball` (line ~14) already exists; the script builds the baseball `wire` via `buildPointsWire` (line ~72), and the template gates several sections on `!isFootball`. The football branch must render *instead of* the baseball sections when `isFootball` is true.

- [ ] **Step 2: Wire the composable into the script**

In the `<script setup>` block, after the existing `usePointsValue` wiring, add:

```typescript
import { useFootballWire } from '@/composables/useFootballWire'
import { useActivePointsSource } from '@/composables/useActivePointsSource'

// Football Wire runs off the VOR engine (separate from the baseball wire brain).
const src = useActivePointsSource()
const { wire: fbWire, loading: fbLoading } = useFootballWire({
  pool: src.pool,
  freeAgents: src.freeAgents,
  slots: src.rosterSlots,
  myTeamKey: src.myTeamKey,
  teamNames: src.teamNames,
  season,
  enabled: isFootball,
})
const boardOpen = ref(false)
const boardPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
```

If `useActivePointsSource` is already imported/instantiated in this view, reuse the existing instance instead of creating a second one. Verify by reading the current imports; if `src` (or equivalent) already exists, bind the `useFootballWire` inputs to it.

- [ ] **Step 3: Add the football template sections**

Immediately inside the main content container, add a football-only block that renders before/around the existing baseball sections. Wrap the existing baseball sections' outer element so they render only when `!isFootball` (several already do; ensure the "Best available" and any swap sections are also gated). Add:

```vue
<template v-if="isFootball">
  <div v-if="fbLoading && !fbWire" class="py-10 text-center text-sm text-dark-textMuted">Loading league values…</div>

  <template v-else-if="fbWire">
    <!-- 1. UPGRADES — flex-aware lineup-marginal -->
    <section v-if="fbWire.upgrades.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Best upgrades <span class="font-mono normal-case text-dark-textMuted/70">· lineup points gained</span></h2>
      <ul class="space-y-2">
        <li v-for="s in fbWire.upgrades" :key="s.add.player.playerKey ?? s.add.player.name" class="flex items-center justify-between gap-3">
          <span class="min-w-0 truncate text-sm text-dark-text">
            <img :src="teamLogo(s.add.player.team)" alt="" class="mr-1 inline h-4 w-4 align-text-bottom" />
            <span class="font-medium">{{ s.add.player.name }}</span>
            <span class="text-dark-textMuted"> for {{ s.dropName }}</span>
          </span>
          <span class="shrink-0 font-mono text-sm font-semibold text-green-400">+{{ Math.round(s.marginal) }}</span>
        </li>
      </ul>
    </section>

    <!-- 2. THIS WEEK — next-week VOR + streamability -->
    <section v-if="fbWire.thisWeek.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-textMuted">This week <span class="font-mono normal-case text-dark-textMuted/70">· value over a streamer</span></h2>
      <ul class="space-y-2">
        <li v-for="r in fbWire.thisWeek" :key="r.player.playerKey ?? r.player.name" class="flex items-center justify-between gap-3">
          <span class="min-w-0 truncate text-sm text-dark-text">
            <img :src="teamLogo(r.player.team)" alt="" class="mr-1 inline h-4 w-4 align-text-bottom" />
            {{ r.player.name }} <span class="text-[10px] uppercase text-dark-textMuted">{{ r.player.position }}</span>
            <span v-if="r.streamOf > 0" class="ml-1 rounded bg-dark-bg px-1 font-mono text-[10px] text-dark-textMuted">startable {{ r.streamWeeks }} of next {{ r.streamOf }}</span>
          </span>
          <span class="shrink-0 font-mono text-sm" :class="r.vorWeek >= 0 ? 'text-dark-text' : 'text-dark-textMuted'">{{ r.vorWeek >= 0 ? '+' : '' }}{{ Math.round(r.vorWeek) }}</span>
        </li>
      </ul>
    </section>

    <!-- 3. BEST AVAILABLE — ROS VOR -->
    <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Best available <span class="font-mono normal-case text-dark-textMuted/70">· value over replacement (season)</span></h2>
      <ul class="space-y-2">
        <li v-for="r in fbWire.bestAvailable.slice(0, 15)" :key="r.player.playerKey ?? r.player.name" class="flex items-center justify-between gap-3">
          <span class="min-w-0 truncate text-sm text-dark-text">
            <img :src="teamLogo(r.player.team)" alt="" class="mr-1 inline h-4 w-4 align-text-bottom" />
            {{ r.player.name }} <span class="text-[10px] uppercase text-dark-textMuted">{{ r.player.position }}</span>
            <span v-if="r.confidence === 'low'" class="ml-1 text-[10px] text-amber-400" title="Thin/absent projection">⚠</span>
          </span>
          <span class="shrink-0 font-mono text-sm font-semibold" :class="r.vorRos >= 0 ? 'text-dark-text' : 'text-dark-textMuted'">{{ r.vorRos >= 0 ? '+' : '' }}{{ Math.round(r.vorRos) }}</span>
        </li>
      </ul>
    </section>

    <!-- 4. FULL BOARD — every player by position, VOR-ranked, yours highlighted -->
    <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
      <button class="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-dark-textMuted" @click="boardOpen = !boardOpen">
        <span>Full board <span class="font-mono normal-case text-dark-textMuted/70">· your roster vs the wire</span></span>
        <span class="font-mono">{{ boardOpen ? '−' : '+' }}</span>
      </button>
      <div v-if="boardOpen" class="mt-3 space-y-4">
        <div v-for="pos in boardPositions" :key="pos" v-show="fbWire.board[pos]?.length">
          <h3 class="mb-1 font-mono text-[11px] uppercase text-dark-textMuted">{{ pos }}</h3>
          <ul class="space-y-1">
            <li v-for="row in fbWire.board[pos]" :key="row.name" class="flex items-center justify-between gap-3 text-sm" :class="row.owned ? 'text-green-400' : 'text-dark-text'">
              <span class="min-w-0 truncate">{{ row.owned ? '★ ' : '' }}{{ row.name }}</span>
              <span class="shrink-0 font-mono text-xs" :class="row.vorRos >= 0 ? '' : 'text-dark-textMuted'">{{ row.vorRos >= 0 ? '+' : '' }}{{ Math.round(row.vorRos) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </template>
</template>
```

Ensure the existing baseball sections are wrapped so they render only when `!isFootball` (the file already gates the stream section and shows football per-week values inline — replace those football-inline hacks with this dedicated branch, and gate the remaining baseball-only sections with `v-if="!isFootball"`).

- [ ] **Step 4: Build to verify no template/type errors**

Run: `npm run build 2>&1 | tail -20`
Expected: build succeeds. **Also run** `npx vue-tsc --noEmit -p tsconfig.app.json 2>&1 | grep PointsWireView || echo "no PointsWireView type errors"` — expected "no PointsWireView type errors".

- [ ] **Step 5: Manual smoke (local only — do NOT deploy)**

Run: `npm run dev`, open the app on a Sleeper football league (e.g. League of Record redraft), go to the Wire tab. Verify: Upgrades show a real drop and a positive gain (no 2nd-QB phantom); Best Available is VOR-ranked (not QB-flooded); This Week shows the streamability badge; Full Board expands and highlights your players. Confirm a baseball league's Wire is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/views/PointsWireView.vue
git commit -m "feat: Wire football branch on VOR (upgrades/best-available/this-week/board)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §1 Projection layer (ROS + K/DEF): ROS points come from `buildFootballProjectionsByKey` × `defaultWeights('football')`, which already scores the K/DEF keys present in `football.ts pointsConfig.statKeys` (fgm_*, xpm, def_td, sack, int, …). Weekly + confidence → Tasks 2, 7, 8. ✓
- §2 Replacement baseline (settings-derived VBD, superflex/TE-premium): Task 1. ✓
- §3 VOR + two timeframes: Task 2. ✓
- §4 Opportunity tag: Task 3. ✓ (Wire surfacing of the tag is available in `PlayerVor`-adjacent data; the Wire template shows the low-confidence flag now, and the opportunity tag can be added to the same rows — noted as a light follow-up in the polish stage, not a spec gap since the tagging function is delivered and tested.)
- §5 Lineup-marginal: Task 4. ✓
- §6 Wire consumer (best-available/upgrades/weekly+streamability/board): Tasks 6, 8, 9. ✓
- §6 Trades + My Team consumers: **deferred to follow-on plans** (documented in Scope above). ✓
- Error handling (weekly/schedule failure → ROS-only; non-football never invokes engine): Task 8 try/catch per week + `enabled` gate. ✓

**Gap found + closed:** the opportunity tag (Task 3) is built and tested but not yet rendered on Wire rows. That's intentional for this plan — `buildFootballVor` doesn't currently thread the tag into `PlayerVor`. To avoid a dangling function, the follow-up (render tag + thread it through `useFootballWire`) is called out here and belongs in the polish stage; the tagging logic itself ships tested. If the executor prefers, they may thread `opportunity` into `WireVorRow` in Task 6 — the data (depth_chart_order, injury_status) is on `SleeperPlayer` and reaches the composable via `sleeperService.getPlayers()`.

**2. Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step is complete. ✓

**3. Type consistency:** `RepPlayer`, `ReplacementLevels`, `PlayerVor`, `FootballVorInput`, `OpportunityTag`, `MarginalResult`, `WireVorRow`, `FootballWire`, `FootballSwap`, `BoardRow` are defined once and imported consistently. `faKey` (`fa.playerKey ?? fa:${name}`) matches the existing `usePointsValue` convention. `assignSlots(_, _, 0)` bar-0 usage matches `pointsTrades.ts`. Weekly index 0 = next week is consistent between Task 2 (`weekly[0]`) and Task 8 (`weeks[0] = currentWeek`). ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-30-football-vor-engine-and-wire.md`.

**Follow-on plans (after this lands + smokes):** Trades onto VOR (spec §6 Trades) and My Team onto VOR (spec §6 My Team) — each a separate plan against the same engine.
