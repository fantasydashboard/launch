# Roster Value: Role-Aware VOR + ROS Blend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace My Team's roster value (`overallValue` mean-percentile) with a role-aware value-above-replacement score (`valueScore` = sum of clamped z-scores), computed on projected full-season stats (FanGraphs where matched, season-to-date extrapolated otherwise), so balanced studs rank correctly and drops/sort are accurate, cross-platform.

**Architecture:** Three new pure modules — `categorySide.ts` (classify hit/pit + ratio), `effectiveStats.ts` (project to full-season, FG blend), `value.ts` (role-aware z-score VOR) — feed the existing roster surfaces. The value model ships first on season-to-date (Slice 1); the FanGraphs blend layers onto the `effectiveStats` seam (Slice 2). No change to the per-category chip UI.

**Tech Stack:** Vue 3 `<script setup>` + Pinia, Vitest + happy-dom, TypeScript.

**Branch:** `redesign/my-team-first` (LOCAL ONLY — never `git push`, never `vercel --prod`).

**Verify each task:** `npm test` green (add tests), `npm run build` ok, `npx vue-tsc --noEmit -p tsconfig.json` no NEW errors (known pre-existing, unrelated: `yahoo-daily-stats-methods.ts`, `DraftPage.vue`, `HistoryPage.vue`, `MatchupsPage.vue`). No deploy. No em dashes.

**Shared type (define once in `value.ts`, import elsewhere):**
```typescript
export interface CatSpec {
  statId: string
  lowerIsBetter: boolean
  side: 'hit' | 'pit'
  isRatio: boolean
  volumeStatId?: string // statId of the volume stat for a ratio cat (IP / AB / PA)
}
```

**Facts (verified):**
- `overallValue` in `src/myteam/` is used ONLY by `contribution.ts`, `types.ts`, `dropCandidates.ts`, `RosterPanel.vue`. (The many `CategoryProjectionsView.vue` hits are an unrelated local variable — do NOT touch that file.)
- `PlayerContribution` (`src/myteam/types.ts`): `{ playerKey, contribs: PlayerCategoryContrib[], plusCount, minusCount, overallValue, topStatId }`. `PlayerCategoryContrib`: `{ statId, tier: 'plus'|'neutral'|'minus', value, percentile }`.
- FG matching API (`src/services/projectionService.ts`): `buildPlayerMatchers()` → `{ matchFG(p: {full_name?, mlb_team?}) → FGProjection|null }`; `enrichPlayersWithProjections(players[], categories:{stat_id, display_name?, isPitching?}[])` → `Map<playerKey, { mappedStats: Record<statId, number> }>` (FG projected stats already mapped to your league's stat_ids). `loadProjectionData()` returns `{ projections, statcast }` and the map is empty if the FG table is empty.

---

## SLICE 1 — Role-aware VOR value model (season-to-date, cross-platform)

## Task 1: Category classifier (`categorySide.ts`)

**Files:**
- Create: `src/myteam/categorySide.ts`
- Test: `src/myteam/__tests__/categorySide.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { classifyCategory } from '../categorySide'

describe('classifyCategory', () => {
  it('classifies pitching categories', () => {
    expect(classifyCategory('ERA', true)).toEqual({ side: 'pit', isRatio: true })
    expect(classifyCategory('W', false)).toEqual({ side: 'pit', isRatio: false })
    expect(classifyCategory('WHIP', true)).toEqual({ side: 'pit', isRatio: true })
    expect(classifyCategory('SV', false)).toEqual({ side: 'pit', isRatio: false })
    expect(classifyCategory('Innings Pitched', false)).toEqual({ side: 'pit', isRatio: false })
  })
  it('classifies hitting categories', () => {
    expect(classifyCategory('HR', false)).toEqual({ side: 'hit', isRatio: false })
    expect(classifyCategory('AVG', false)).toEqual({ side: 'hit', isRatio: true })
    expect(classifyCategory('OPS', false)).toEqual({ side: 'hit', isRatio: true })
    expect(classifyCategory('SB', false)).toEqual({ side: 'hit', isRatio: false })
  })
  it('defaults unknown to hitting, non-ratio', () => {
    expect(classifyCategory('Mystery Stat', false)).toEqual({ side: 'hit', isRatio: false })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/categorySide.test.ts`
Expected: FAIL (`Cannot find module '../categorySide'`).

- [ ] **Step 3: Implement**

```typescript
// Pitching category display names (uppercased). Anything not here is treated as hitting.
const PITCHING_NAMES = new Set([
  'W', 'L', 'SV', 'HLD', 'HD', 'SVHD', 'SVH', 'SV+HLD', 'BS',
  'ERA', 'WHIP', 'IP', 'GS', 'QS', 'K/9', 'BB/9', 'K/BB', 'FIP', 'OBA',
  'BF', 'TBF', 'ER', 'HRA', 'GP',
  'INNINGS PITCHED', 'SAVES', 'HOLDS', 'WINS', 'QUALITY STARTS',
  'OPPONENT BATTING AVG', 'OPPONENT BATTING AVERAGE',
])
// Ratio / rate categories (uppercased) on either side.
const RATIO_NAMES = new Set([
  'ERA', 'WHIP', 'K/9', 'BB/9', 'K/BB', 'FIP', 'OBA', 'OPPONENT BATTING AVG', 'OPPONENT BATTING AVERAGE',
  'AVG', 'BA', 'OBP', 'SLG', 'OPS', 'ISO', 'BABIP', 'FPCT', 'WOBA',
])

/** Classify a scoring category by display name into hitting/pitching and ratio/counting. */
export function classifyCategory(displayName: string, _lowerIsBetter: boolean): { side: 'hit' | 'pit'; isRatio: boolean } {
  const key = (displayName || '').toUpperCase().trim()
  const side: 'hit' | 'pit' = PITCHING_NAMES.has(key) ? 'pit' : 'hit'
  const isRatio = RATIO_NAMES.has(key)
  return { side, isRatio }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/categorySide.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/myteam/categorySide.ts src/myteam/__tests__/categorySide.test.ts
git commit -m "feat(myteam): category hit/pit + ratio classifier"
```

---

## Task 2: Effective stats transform (`effectiveStats.ts`)

**Files:**
- Modify: `src/myteam/types.ts` (add `CatSpec`, `ValuePoolPlayer`, `valueScore`)
- Create: `src/myteam/effectiveStats.ts`
- Test: `src/myteam/__tests__/effectiveStats.test.ts`

Projects a player's raw season-to-date stats to a full-season scale, preferring FanGraphs where provided. In Slice 1 it is always called with `fgStats = null` and `seasonFractionComplete = 1`, so it returns the raw values unchanged; the FG branch is built and tested now so Slice 2 only wires data.

- [ ] **Step 0: Add the shared types to `types.ts`**

The value types live in `src/myteam/types.ts` so both `effectiveStats.ts` and `value.ts` import them (avoids a circular/forward dependency). Add:
```typescript
export interface CatSpec {
  statId: string
  lowerIsBetter: boolean
  side: 'hit' | 'pit'
  isRatio: boolean
  volumeStatId?: string // statId of the volume stat for a ratio cat (IP / AB / PA)
}

export interface ValuePoolPlayer {
  playerKey: string
  position: string
  stats: Record<string, number> // effective (projected full-season) stats
}
```
And add `valueScore: number` to `PlayerContribution` (right after `overallValue`):
```typescript
  /** Sum of clamped per-category z-scores across the categories the player participates in (role-aware VOR). */
  valueScore: number
```

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { toEffectiveStats } from '../effectiveStats'
import type { CatSpec } from '../types'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
  { statId: 'IP', lowerIsBetter: false, side: 'pit', isRatio: false },
]

describe('toEffectiveStats', () => {
  it('returns raw stats unchanged when fgStats is null and fraction is 1 (Slice 1 mode)', () => {
    const raw = { HR: 20, ERA: 3.5, IP: 100 }
    expect(toEffectiveStats(raw, null, cats, 1)).toEqual({ HR: 20, ERA: 3.5, IP: 100 })
  })
  it('extrapolates counting stats to full season when no FG and fraction < 1', () => {
    const raw = { HR: 20, ERA: 3.5, IP: 100 }
    const out = toEffectiveStats(raw, null, cats, 0.5)
    expect(out.HR).toBe(40)   // counting doubled
    expect(out.IP).toBe(200)  // volume doubled
    expect(out.ERA).toBe(3.5) // ratio rate unchanged
  })
  it('prefers FG values where present, falls back to extrapolated raw otherwise', () => {
    const raw = { HR: 20, ERA: 3.5, IP: 100 }
    const fg = { HR: 35, ERA: 4.0 } // FG has HR + ERA, not IP
    const out = toEffectiveStats(raw, fg, cats, 0.5)
    expect(out.HR).toBe(35)   // FG full-season total used directly
    expect(out.ERA).toBe(4.0) // FG rate used
    expect(out.IP).toBe(200)  // no FG IP -> extrapolated raw
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/effectiveStats.test.ts`
Expected: FAIL (`Cannot find module '../effectiveStats'`).

- [ ] **Step 3: Implement**

```typescript
import type { CatSpec } from './types'

/**
 * Project a player's raw season-to-date stats to a full-season scale so matched
 * (FanGraphs full-season) and unmatched (extrapolated) players are comparable.
 *  - FG value present for a stat -> use it (full-season total, or rate for ratios).
 *  - else counting/volume stat -> raw / seasonFractionComplete (extrapolate).
 *  - else ratio rate -> raw unchanged (rates are already scale-free).
 * Slice 1 passes fgStats=null, seasonFractionComplete=1 -> returns raw unchanged.
 */
export function toEffectiveStats(
  rawStats: Record<string, number>,
  fgStats: Record<string, number> | null,
  cats: CatSpec[],
  seasonFractionComplete: number,
): Record<string, number> {
  const frac = seasonFractionComplete > 0 ? seasonFractionComplete : 1
  const out: Record<string, number> = { ...rawStats }
  // Volume stats referenced by ratio cats must also be projected (for ratio weighting).
  const volumeStatIds = new Set(cats.map((c) => c.volumeStatId).filter(Boolean) as string[])

  for (const cat of cats) {
    const fg = fgStats?.[cat.statId]
    if (fg !== undefined && fg !== null && !Number.isNaN(fg)) {
      out[cat.statId] = fg
      continue
    }
    const raw = rawStats[cat.statId]
    if (raw === undefined) continue
    if (cat.isRatio) {
      out[cat.statId] = raw // rate is scale-free
    } else {
      out[cat.statId] = raw / frac // counting -> full season
    }
  }
  // Project volume stats that aren't themselves scoring cats (e.g. IP used only for ERA weighting).
  for (const vId of volumeStatIds) {
    if (cats.some((c) => c.statId === vId)) continue // already handled above
    const fg = fgStats?.[vId]
    if (fg !== undefined && fg !== null && !Number.isNaN(fg)) out[vId] = fg
    else if (rawStats[vId] !== undefined) out[vId] = rawStats[vId] / frac
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/effectiveStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/myteam/types.ts src/myteam/effectiveStats.ts src/myteam/__tests__/effectiveStats.test.ts
git commit -m "feat(myteam): shared value types + effective-stats projection transform"
```

---

## Task 3: Role-aware VOR value model (`value.ts`)

**Files:**
- Create: `src/myteam/value.ts`
- Test: `src/myteam/__tests__/value.test.ts`

(`CatSpec`, `ValuePoolPlayer`, and `valueScore` were already added to `types.ts` in Task 2 Step 0.)

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { computeRosterValue } from '../value'
import type { CatSpec, ValuePoolPlayer } from '../types'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'R', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'RBI', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'AVG', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
]

function hitter(key: string, hr: number, sb: number, r: number, rbi: number, avg: number): ValuePoolPlayer {
  return { playerKey: key, position: 'OF', stats: { HR: hr, SB: sb, R: r, RBI: rbi, AVG: avg } }
}

describe('computeRosterValue', () => {
  it('rewards breadth: a good-everywhere player outranks a one-category specialist', () => {
    // pool: one balanced stud, one HR-only masher, plus filler to form a distribution
    const pool: ValuePoolPlayer[] = [
      hitter('balanced', 25, 25, 90, 90, 0.300),
      hitter('masher', 45, 1, 70, 80, 0.240),
      hitter('f1', 10, 8, 50, 50, 0.250),
      hitter('f2', 12, 5, 55, 52, 0.255),
      hitter('f3', 8, 10, 48, 45, 0.248),
    ]
    const res = computeRosterValue(pool, ['balanced', 'masher'], cats)
    const balanced = res.find((r) => r.playerKey === 'balanced')!
    const masher = res.find((r) => r.playerKey === 'masher')!
    expect(balanced.valueScore).toBeGreaterThan(masher.valueScore)
  })

  it('is role-fair: a pitcher only participates in pitching cats (not penalized for 0 HR)', () => {
    const pool: ValuePoolPlayer[] = [
      { playerKey: 'sp1', position: 'SP', stats: { ERA: 2.5, IP: 120 } },
      { playerKey: 'sp2', position: 'SP', stats: { ERA: 4.5, IP: 110 } },
      hitter('h1', 20, 10, 70, 70, 0.270),
    ]
    const res = computeRosterValue(pool, ['sp1'], cats)
    const sp1 = res.find((r) => r.playerKey === 'sp1')!
    // sp1 only has the ERA contrib among participated cats; HR/SB/etc are neutral (not participated)
    const eraContrib = sp1.contribs.find((c) => c.statId === 'ERA')!
    expect(eraContrib.tier).not.toBe('neutral')
    const hrContrib = sp1.contribs.find((c) => c.statId === 'HR')!
    expect(hrContrib.tier).toBe('neutral')
    expect(sp1.valueScore).toBeGreaterThan(0) // good ERA -> positive
  })

  it('volume-weights ratios: a tiny-sample great ERA does not dominate a workhorse', () => {
    const pool: ValuePoolPlayer[] = [
      { playerKey: 'tiny', position: 'RP', stats: { ERA: 0.0, IP: 2 } },
      { playerKey: 'horse', position: 'SP', stats: { ERA: 2.6, IP: 140 } },
      { playerKey: 'mid', position: 'SP', stats: { ERA: 3.8, IP: 120 } },
    ]
    const res = computeRosterValue(pool, ['tiny', 'horse'], cats)
    const tiny = res.find((r) => r.playerKey === 'tiny')!
    const horse = res.find((r) => r.playerKey === 'horse')!
    expect(horse.valueScore).toBeGreaterThan(tiny.valueScore)
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/value.test.ts`
Expected: FAIL (`Cannot find module '../value'`).

- [ ] **Step 4: Implement**

```typescript
import type { CatSpec, PlayerCategoryContrib, PlayerContribution, ValuePoolPlayer } from './types'

// Re-export so existing imports `from '@/myteam/value'` keep resolving.
export type { CatSpec, ValuePoolPlayer } from './types'

const PLUS_THRESHOLD = 0.66
const MINUS_THRESHOLD = 0.33
const Z_CLAMP = 3

function isPitcherPos(position: string): boolean {
  return (position || '')
    .split(/[,/|]/)
    .some((t) => ['SP', 'RP', 'P'].includes(t.trim().toUpperCase()))
}
function isHitterPos(position: string): boolean {
  const tokens = (position || '').split(/[,/|]/).map((t) => t.trim().toUpperCase()).filter(Boolean)
  return tokens.some((t) => !['SP', 'RP', 'P'].includes(t))
}
function participates(position: string, side: 'hit' | 'pit'): boolean {
  return side === 'pit' ? isPitcherPos(position) : isHitterPos(position)
}

function clamp(z: number): number {
  return Math.max(-Z_CLAMP, Math.min(Z_CLAMP, z))
}

/**
 * Role-aware value-above-replacement. For each category, only role-matching
 * players participate. Counting cats z-score the value directly; ratio cats
 * z-score a volume-weighted impact so tiny samples don't dominate. A player's
 * valueScore is the sum of clamped z-scores across participated cats. Per-cat
 * percentile + tier are retained for the chip UI.
 */
export function computeRosterValue(
  pool: ValuePoolPlayer[],
  myPlayerKeys: string[],
  cats: CatSpec[],
): PlayerContribution[] {
  // Per category: z by playerKey, percentile by playerKey (both over participants).
  const zByCat = new Map<string, Map<string, number>>()
  const pctByCat = new Map<string, Map<string, number>>()

  for (const cat of cats) {
    const participants = pool.filter((p) => participates(p.position, cat.side))
    const dir = cat.lowerIsBetter ? -1 : 1
    const zMap = new Map<string, number>()
    const pctMap = new Map<string, number>()

    // Build the quantity we z-score: counting -> value; ratio -> volume-weighted impact.
    let quantities: { key: string; q: number }[]
    if (cat.isRatio && cat.volumeStatId) {
      const withVol = participants.filter((p) => (p.stats[cat.volumeStatId!] ?? 0) > 0)
      const totalVol = withVol.reduce((s, p) => s + (p.stats[cat.volumeStatId!] ?? 0), 0)
      const wMean =
        totalVol > 0
          ? withVol.reduce((s, p) => s + (p.stats[cat.statId] ?? 0) * (p.stats[cat.volumeStatId!] ?? 0), 0) / totalVol
          : 0
      quantities = withVol.map((p) => ({
        key: p.playerKey,
        q: ((p.stats[cat.statId] ?? 0) - wMean) * (p.stats[cat.volumeStatId!] ?? 0) * dir,
      }))
    } else {
      quantities = participants.map((p) => ({ key: p.playerKey, q: (p.stats[cat.statId] ?? 0) * dir }))
    }

    const n = quantities.length
    const mean = n > 0 ? quantities.reduce((s, x) => s + x.q, 0) / n : 0
    const variance = n > 0 ? quantities.reduce((s, x) => s + (x.q - mean) ** 2, 0) / n : 0
    const std = Math.sqrt(variance)
    for (const { key, q } of quantities) {
      zMap.set(key, std > 0 ? clamp((q - mean) / std) : 0)
    }
    // Percentile for chips: rank by raw value (direction-aware) over participants.
    const sorted = [...participants].sort((a, b) =>
      cat.lowerIsBetter ? (a.stats[cat.statId] ?? 0) - (b.stats[cat.statId] ?? 0) : (b.stats[cat.statId] ?? 0) - (a.stats[cat.statId] ?? 0),
    )
    sorted.forEach((p, idx) => pctMap.set(p.playerKey, sorted.length === 0 ? 0 : (sorted.length - idx) / sorted.length))

    zByCat.set(cat.statId, zMap)
    pctByCat.set(cat.statId, pctMap)
  }

  const myKeys = new Set(myPlayerKeys)
  const mine = pool.filter((p) => myKeys.has(p.playerKey))

  return mine.map((player) => {
    const contribs: PlayerCategoryContrib[] = []
    let plusCount = 0
    let minusCount = 0
    let valueScore = 0
    const contributedPercentiles: number[] = []
    let topStatId: string | null = null
    let topPercentile = -Infinity

    for (const cat of cats) {
      const value = typeof player.stats[cat.statId] === 'number' ? player.stats[cat.statId] : 0
      if (!participates(player.position, cat.side)) {
        contribs.push({ statId: cat.statId, tier: 'neutral', value, percentile: 0 })
        continue
      }
      const z = zByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      const percentile = pctByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      valueScore += z

      let tier: PlayerCategoryContrib['tier'] = 'neutral'
      if (percentile >= PLUS_THRESHOLD) {
        tier = 'plus'
        plusCount++
      } else if (cat.lowerIsBetter && percentile <= MINUS_THRESHOLD) {
        tier = 'minus'
        minusCount++
      }
      contribs.push({ statId: cat.statId, tier, value, percentile })
      contributedPercentiles.push(percentile)
      if (percentile > topPercentile) {
        topPercentile = percentile
        topStatId = cat.statId
      }
    }

    const overallValue =
      contributedPercentiles.length === 0
        ? 0
        : contributedPercentiles.reduce((s, p) => s + p, 0) / contributedPercentiles.length

    return { playerKey: player.playerKey, contribs, plusCount, minusCount, overallValue, valueScore, topStatId }
  })
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/value.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/myteam/value.ts src/myteam/__tests__/value.test.ts
git commit -m "feat(myteam): role-aware VOR value model (z-score sum)"
```

---

## Task 4: Drops driven by `valueScore`

**Files:**
- Modify: `src/myteam/dropCandidates.ts`
- Modify: `src/myteam/__tests__/dropCandidates.test.ts`

Switch from `overallValue` (0..1) to `valueScore` (z-sum centered at 0). A replacement-level player sums ~0; clearly-negative players are droppable; clearly-positive players are protected.

- [ ] **Step 1: Update the test**

Replace `src/myteam/__tests__/dropCandidates.test.ts` with:
```typescript
import { describe, it, expect } from 'vitest'
import { computeDropCandidates } from '../dropCandidates'
import type { PlayerContribution } from '../types'

function pc(playerKey: string, valueScore: number): PlayerContribution {
  return { playerKey, contribs: [], plusCount: 0, minusCount: 0, overallValue: 0, valueScore, topStatId: null }
}

describe('computeDropCandidates', () => {
  it('flags the most-negative players, protects positive-value studs, caps at 3', () => {
    const res = computeDropCandidates([
      pc('stud', 6.2), pc('good', 2.1), pc('ok', 0.3),
      pc('weak1', -1.2), pc('weak2', -2.5), pc('weak3', -3.1), pc('weak4', -4.0),
    ])
    const keys = res.candidates.map((c) => c.playerKey)
    expect(keys).not.toContain('stud')
    expect(keys).not.toContain('good')
    expect(keys.length).toBeLessThanOrEqual(3)
    expect(keys).toContain('weak4')
    expect(res.weakLink).toBe('weak4') // lowest valueScore
  })

  it('flags nobody when all players are above the cutoff', () => {
    const res = computeDropCandidates([pc('a', 3.0), pc('b', 1.5), pc('c', 0.6)])
    expect(res.candidates).toHaveLength(0)
    expect(res.weakLink).toBe('c')
  })

  it('marks the most-negative as strong severity', () => {
    const res = computeDropCandidates([pc('a', -3.5), pc('b', -0.8)])
    const a = res.candidates.find((c) => c.playerKey === 'a')
    expect(a?.strength).toBe('strong')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/myteam/__tests__/dropCandidates.test.ts`
Expected: FAIL (still keyed on `overallValue`).

- [ ] **Step 3: Implement**

Replace the body of `src/myteam/dropCandidates.ts` with:
```typescript
import type { PlayerContribution } from './types'

export interface DropCandidate {
  playerKey: string
  strength: 'strong' | 'mild'
  reason: string
}

export interface DropAnalysis {
  candidates: DropCandidate[]
  weakLink: string | null // my-player with the lowest valueScore (even if not droppable)
}

const DROP_THRESHOLD = 0 // valueScore below this (below replacement) can be a drop candidate
const STUD_FLOOR = 0.5 // valueScore at/above this is never a drop candidate
const STRONG_THRESHOLD = -2 // valueScore below this is a strong (not mild) candidate
const MAX_CANDIDATES = 3

/**
 * Flags the lowest-valueScore players, protecting positive-value players.
 *  - Sort my players by valueScore ascending.
 *  - Drop candidate only if valueScore < 0 (below replacement); never if valueScore >= 0.5.
 *  - Cap at the 3 lowest qualifiers.
 *  - Severity: valueScore < -2 -> 'strong' ("below replacement"), else 'mild' ("low value").
 *  - weakLink = the single player with the lowest valueScore (null if none).
 */
export function computeDropCandidates(contributions: PlayerContribution[]): DropAnalysis {
  const sorted = [...contributions].sort((a, b) => a.valueScore - b.valueScore)

  const candidates: DropCandidate[] = []
  for (const c of sorted) {
    if (candidates.length >= MAX_CANDIDATES) break
    if (c.valueScore >= STUD_FLOOR) continue
    if (c.valueScore >= DROP_THRESHOLD) continue
    candidates.push({
      playerKey: c.playerKey,
      strength: c.valueScore < STRONG_THRESHOLD ? 'strong' : 'mild',
      reason: c.valueScore < STRONG_THRESHOLD ? 'below replacement' : 'low value',
    })
  }

  const weakLink = sorted.length > 0 ? sorted[0].playerKey : null
  return { candidates, weakLink }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/myteam/__tests__/dropCandidates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/myteam/dropCandidates.ts src/myteam/__tests__/dropCandidates.test.ts
git commit -m "feat(myteam): drops/weak-link driven by valueScore"
```

---

## Task 5: Wire the value model into MyTeamView + RosterPanel (Slice 1 complete)

**Files:**
- Modify: `src/views/MyTeamView.vue`
- Modify: `src/components/myteam/RosterPanel.vue`

- [ ] **Step 1: Add position to the pool players consumed for value**

`MyTeamView` currently builds `cats` and calls `computePlayerContributions(rosterPool.value, myPlayerKeys.value, cats.value)`. The pool needs `position`. In `useMyRoster.ts`, the `PoolPlayer` type is `{ playerKey, stats }`. Add `position`:

In `src/composables/useMyRoster.ts`, change the `PoolPlayer` interface and `normalizePoolPlayer`:
```typescript
export interface PoolPlayer {
  playerKey: string
  position: string
  stats: Record<string, number>
}

function normalizePoolPlayer(raw: any): PoolPlayer {
  return {
    playerKey: String(raw.player_key ?? raw.player_id ?? ''),
    position: String(raw.position ?? ''),
    stats: raw.stats && typeof raw.stats === 'object' ? { ...raw.stats } : {},
  }
}
```

For ESPN, `useEspnCategoryTeamData` builds `pool` via `mapRostersToPool(teams)`. Update `mapRostersToPool` in `src/myteam/espn/mapRosters.ts` to include position, and its test:
```typescript
export function mapRostersToPool(teams: EspnTeamRosterLike[]): PoolPlayer[] {
  return teams.flatMap((t) =>
    (t.roster ?? []).map((p) => ({
      playerKey: String(p.playerId),
      position: p.position ?? '',
      stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
    })),
  )
}
```
Update `src/myteam/espn/__tests__/mapRosters.test.ts` `mapRostersToPool` expectations to include `position: 'OF'` (the fixture players already have `position: 'OF'`). Run that test to confirm green.

- [ ] **Step 2: Build catSpecs and switch to computeRosterValue in MyTeamView**

In `src/views/MyTeamView.vue` add imports:
```typescript
import { computeRosterValue, type CatSpec } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { classifyCategory } from '@/myteam/categorySide'
```
Remove the `computePlayerContributions` import.

Replace the existing `cats` computed (the one mapping categories to `{ statId, lowerIsBetter }`) with a `catSpecs` computed that adds side/isRatio/volumeStatId. Find the league's volume stat ids by display name (IP for pitching ratios, AB or PA for batting ratios), looked up against the league `categories` (fall back to the conventional statId if the league also scores it):
```typescript
const catSpecs = computed<CatSpec[]>(() => {
  const findStatId = (names: string[]): string | undefined => {
    for (const c of categories.value) {
      const label = (c.label || c.name || '').toUpperCase().trim()
      if (names.includes(label)) return c.statId
    }
    return undefined
  }
  const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
  const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
  return categories.value.map((c) => {
    const { side, isRatio } = classifyCategory(c.label || c.name || c.statId, isLowerBetterFor(c.statId))
    const lowerIsBetter = isLowerBetterFor(c.statId)
    return {
      statId: c.statId,
      lowerIsBetter,
      side,
      isRatio,
      volumeStatId: isRatio ? (side === 'pit' ? ipStatId : abStatId) : undefined,
    }
  })
})
```
Add a small helper next to it that reads the platform-correct direction already available via `cats`-style logic. Since the existing `cats` computed already produced `{ statId, lowerIsBetter }`, reuse it: define
```typescript
const lowerBetterByStatId = computed(() => {
  const m = new Map<string, boolean>()
  for (const c of cats.value) m.set(c.statId, c.lowerIsBetter)
  return m
})
function isLowerBetterFor(statId: string): boolean {
  return lowerBetterByStatId.value.get(statId) ?? false
}
```
(Keep the existing `cats` computed as-is — it already dispatches ESPN `is_negative` vs the Yahoo label heuristic. `catSpecs` builds on it.)

Replace the `contributions` computed:
```typescript
const contributions = computed(() => {
  if (!rosterPool.value.length || !myPlayerKeys.value.length || !catSpecs.value.length) return []
  // Slice 1: effective stats = season-to-date (fgStats=null, fraction=1).
  const effectivePool = rosterPool.value.map((p) => ({
    playerKey: p.playerKey,
    position: p.position,
    stats: toEffectiveStats(p.stats, null, catSpecs.value, 1),
  }))
  return computeRosterValue(effectivePool, myPlayerKeys.value, catSpecs.value)
})
```
`gaps` and everything else that used `cats.value` keep working (`cats` still exists). `drops` already consumes `contributions`.

- [ ] **Step 3: RosterPanel sorts by valueScore**

In `src/components/myteam/RosterPanel.vue`, the `RosterRow` interface has `overallValue: number` and the sort is `built.sort((a, b) => b.overallValue - a.overallValue)`. Change both to `valueScore`:
- interface field: `valueScore: number`
- row build: `valueScore: contrib?.valueScore ?? 0,` (replace the `overallValue:` line)
- sort: `return built.sort((a, b) => b.valueScore - a.valueScore)`

- [ ] **Step 4: Retire the old contribution module**

Delete `src/myteam/contribution.ts` and `src/myteam/__tests__/contribution.test.ts` (superseded by `value.ts`). Confirm nothing else imports `computePlayerContributions`:
Run: `grep -rn "computePlayerContributions\|myteam/contribution" src` → expect no matches.

- [ ] **Step 5: Gate**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "MyTeamView|RosterPanel|myteam/|useMyRoster"` → expect no output.
Run: `npm test` → expect green (old contribution test removed; new value/effectiveStats/categorySide/dropCandidates tests added).
Run: `npm run build` → success.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(myteam): wire role-aware VOR value into My Team (Slice 1)"
```

---

## SLICE 2 — FanGraphs ROS blend (forward-looking input)

## Task 6: Attach FanGraphs projections to the pool

**Files:**
- Modify: `src/composables/useMyRoster.ts`
- Modify: `src/composables/useEspnCategoryTeamData.ts`

Both composables expose, alongside `pool`, a `fgStatsByKey: Record<playerKey, Record<statId, number>>` (FG projected stats mapped to the league's stat_ids) and `seasonFractionComplete: number`. Built via `enrichPlayersWithProjections(rawPlayers, categories)` where `categories` carry `display_name` + `isPitching`.

- [ ] **Step 1: Yahoo — useMyRoster**

In `src/composables/useMyRoster.ts`, add refs `pool` already exists; add `fgStatsByKey = ref<Record<string, Record<string, number>>>({})`. After fetching `all` (the raw rostered players, which carry `full_name`, `mlb_team`, `player_key`), enrich. You need the league categories with display names + isPitching; accept them as a `load(categories)` argument:
```typescript
import { enrichPlayersWithProjections } from '@/services/projectionService'
import { classifyCategory } from '@/myteam/categorySide'
// load signature becomes load(categories: { statId: string; label: string; name: string; lowerIsBetter: boolean }[])
```
After `pool.value = all.map(normalizePoolPlayer)` and the stale-league guard, build FG stats:
```typescript
const fgCats = categories.map((c) => {
  const { side } = classifyCategory(c.label || c.name || c.statId, c.lowerIsBetter)
  return { stat_id: c.statId, display_name: c.label || c.name, isPitching: side === 'pit' }
})
const enriched = await enrichPlayersWithProjections(all, fgCats)
if (leagueStore.activeLeagueId !== requestedId) return
const map: Record<string, Record<string, number>> = {}
for (const p of all) {
  const key = String(p.player_key ?? p.player_id ?? '')
  const e = enriched.get(p.player_key || p.player_id?.toString() || p.full_name)
  if (e?.mappedStats) map[key] = e.mappedStats
}
fgStatsByKey.value = map
```
Return `fgStatsByKey` and a `seasonFractionComplete` constant (baseball; `97 / 162 ≈ 0.6`). Export it as `const seasonFractionComplete = 0.6`.

- [ ] **Step 2: ESPN — useEspnCategoryTeamData**

Mirror the same: after building `pool`, call `enrichPlayersWithProjections(teamsFlatPlayers, fgCats)` where `teamsFlatPlayers` are the raw ESPN roster players carrying `fullName`/`proTeam`. ESPN players use `full_name`/`mlb_team` keys in the matcher, so adapt: pass objects `{ full_name: p.fullName, mlb_team: p.proTeam, player_id: p.playerId }`. Build `fgStatsByKey` keyed by `String(p.playerId)`. Expose `fgStatsByKey` and `seasonFractionComplete = 0.6`.

- [ ] **Step 3: Gate**

Run type-check + `npm test` (expect unchanged green; this task adds no tests, only data plumbing) + `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(myteam): attach FanGraphs projections to the rostered pool"
```

---

## Task 7: Feed FG projections into the value model

**Files:**
- Modify: `src/views/MyTeamView.vue`

- [ ] **Step 1: Use fgStatsByKey + seasonFractionComplete in the effective pool**

Destructure the new refs from the composables (`fgStatsByKey`, `seasonFractionComplete`) — platform-dispatched like the others (`isEspnCategoryLeague.value ? espn.fgStatsByKey.value : yahooFgStatsByKey.value`). Update the `contributions` computed:
```typescript
const contributions = computed(() => {
  if (!rosterPool.value.length || !myPlayerKeys.value.length || !catSpecs.value.length) return []
  const fgMap = effectiveFgStatsByKey.value
  const frac = effectiveSeasonFraction.value
  const effectivePool = rosterPool.value.map((p) => ({
    playerKey: p.playerKey,
    position: p.position,
    stats: toEffectiveStats(p.stats, fgMap[p.playerKey] ?? null, catSpecs.value, frac),
  }))
  return computeRosterValue(effectivePool, myPlayerKeys.value, catSpecs.value)
})
```
Pass the league categories (with `lowerIsBetter`) into each composable's `load(...)` (Yahoo `loadRoster`, ESPN `espn.load`) so they can build `fgStatsByKey`. The categories are available from `categories.value` + `cats.value`; thread them through the existing `maybeLoadRoster()` / `maybeLoadEspn()` triggers. Where the load is triggered before categories are known, re-run the FG enrichment in a `watch` on `[categories, rosterLoaded]`, or pass categories at call time if already derived. Keep the season load order intact.

- [ ] **Step 2: Gate + manual verification**

Run type-check, `npm test`, `npm run build` (all green).
`npm run dev`: on the real ESPN 20-cat league and a Yahoo league, confirm the roster sort now reflects projected value (balanced studs near the top), drops are sane, and the console logs `[ProjectionService] Matched X/Y players`. If FanGraphs returns no rows for the season, the page must look exactly like Slice 1 (graceful degrade).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(myteam): blend FanGraphs ROS projections into roster value (Slice 2)"
```

---

## Notes
- Local only; no push/deploy. The analytics core stays pure + TDD'd.
- Degrades safely: empty FG table or unmatched player ⇒ season-to-date behavior.
- Honest copy: value is forward-looking where projections matched, season-to-date otherwise. No new claims.
- No banned patterns, no em dashes.
