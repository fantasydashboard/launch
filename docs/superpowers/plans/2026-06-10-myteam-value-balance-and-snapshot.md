# My Team: Positional Value Balance + Legible Roster + This-Week Snapshot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (A) rank/judge players within role via a pool-relative `roleValue`; (B) make the roster legible (two role sections, a 0-100 number, hairline tier dividers); (C) add a this-week win-probability snapshot. Spec: `docs/superpowers/specs/2026-06-10-myteam-value-balance-and-snapshot-design.md`.

**Architecture:** Pure-module changes in `src/myteam/` (value, types, dropCandidates) + RosterPanel restructure for A/B; a new pure `src/services/categoryWinProbability.ts`, a `useThisWeekMatchup` composable, and a `MatchupSnapshot.vue` for C. Plan-sequenced: Slice 1 (A+B) ships first; Slice 2 (C) layers on.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, Vitest + happy-dom, TypeScript.

**Branch:** `redesign/my-team-first` (LOCAL ONLY — never push/deploy).

**Verify each task:** `npm test` green, `npm run build` ok, `npx vue-tsc --noEmit -p tsconfig.json` no NEW errors (known pre-existing: `yahoo-daily-stats-methods.ts`, `DraftPage.vue`, `HistoryPage.vue`, `MatchupsPage.vue`). `git commit` prints a harmless `fatal: bad object refs/remotes/origin/main 2` warning but succeeds (verify `git log --oneline -1`). No em dashes.

---

## SLICE 1 — Positional value balance + legible roster

## Task 1: Types + `valueTier`

**Files:** Modify `src/myteam/types.ts`.

- [ ] **Step 1:** Add `role` and `roleValue` to `PlayerContribution` (after `valueScore`):
```typescript
  /** 'hitter' | 'pitcher', from position (two-way assigned by majority participated cats). */
  role: 'hitter' | 'pitcher'
  /** Percentile (0-100) of valueScore among rostered POOL players of the same role. */
  roleValue: number
```
- [ ] **Step 2:** Type-check only (`npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "myteam/"`). It will show errors in `value.ts` (return object missing the new required fields) and `contribution.ts` is already deleted — that's expected and fixed in Task 2. Do not commit yet; commit happens with Task 2.

(No standalone commit; this is folded into Task 2's commit since the type is only satisfiable once `value.ts` populates it.)

---

## Task 2: `value.ts` — pool-wide scoring + role + roleValue

**Files:** Modify `src/myteam/value.ts`; Modify `src/myteam/__tests__/value.test.ts`.

- [ ] **Step 1: Write the failing tests** (append to `value.test.ts`):
```typescript
  it('roleValue is a within-role percentile, fair across roles with different cat counts', () => {
    // 4 hitters touch 5 cats; 4 pitchers touch only ERA (1 cat). Each role's best
    // should get a high roleValue even though pitchers' raw valueScore is smaller.
    const pool: ValuePoolPlayer[] = [
      hitter('h1', 40, 30, 100, 100, 0.320), // best hitter
      hitter('h2', 20, 15, 80, 80, 0.270),
      hitter('h3', 12, 8, 60, 60, 0.255),
      hitter('h4', 5, 2, 45, 45, 0.240),     // worst hitter
      { playerKey: 'p1', position: 'SP', stats: { ERA: 2.0, IP: 180 } }, // best pitcher
      { playerKey: 'p2', position: 'SP', stats: { ERA: 3.2, IP: 170 } },
      { playerKey: 'p3', position: 'SP', stats: { ERA: 4.0, IP: 150 } },
      { playerKey: 'p4', position: 'SP', stats: { ERA: 5.2, IP: 120 } }, // worst pitcher
    ]
    const res = computeRosterValue(pool, ['h1', 'p1', 'h4', 'p4'], cats)
    const byKey = Object.fromEntries(res.map((r) => [r.playerKey, r]))
    expect(byKey.h1.role).toBe('hitter')
    expect(byKey.p1.role).toBe('pitcher')
    // best of each role ranks high within role; worst of each ranks low
    expect(byKey.h1.roleValue).toBeGreaterThan(byKey.h4.roleValue)
    expect(byKey.p1.roleValue).toBeGreaterThan(byKey.p4.roleValue)
    // the best pitcher is NOT buried under hitters: top-of-role is comparably high
    expect(byKey.p1.roleValue).toBeGreaterThanOrEqual(75)
    expect(byKey.h1.roleValue).toBeGreaterThanOrEqual(75)
  })
```
- [ ] **Step 2: Run to verify it fails** (`role`/`roleValue` undefined): `npx vitest run src/myteam/__tests__/value.test.ts` → FAIL.

- [ ] **Step 3: Implement.** In `value.ts`, add a role classifier and pool-wide scoring. Add after `participatesIn`:
```typescript
/** Classify a player's role. Two-way (both pitcher and hitter eligible) is assigned
 *  to whichever side they participate in more categories (tie -> hitter). */
function playerRole(player: ValuePoolPlayer, cats: CatSpec[]): 'hitter' | 'pitcher' {
  const pitcher = isPitcherPos(player.position)
  const hitter = isHitterPos(player.position)
  if (pitcher && !hitter) return 'pitcher'
  if (hitter && !pitcher) return 'hitter'
  // two-way: count participated cats per side
  let pit = 0, hit = 0
  for (const c of cats) {
    if (!participatesIn(player, c)) continue
    if (c.side === 'pit') pit++
    else hit++
  }
  return pit > hit ? 'pitcher' : 'hitter'
}
```
Replace the final `return mine.map(...)` block so it (1) scores EVERY pool player, (2) computes each role's valueScore distribution, (3) returns my players with `role` + `roleValue`. Replace from `const myKeys = new Set(myPlayerKeys)` to the end of the function with:
```typescript
  // valueScore for EVERY pool player (cheap: z's already computed per category).
  const scoreOf = (player: ValuePoolPlayer): number => {
    let s = 0
    for (const cat of cats) {
      if (!participatesIn(player, cat)) continue
      s += zByCat.get(cat.statId)?.get(player.playerKey) ?? 0
    }
    return s
  }
  const roleOf = new Map<string, 'hitter' | 'pitcher'>()
  const scoreByKey = new Map<string, number>()
  const scoresByRole: Record<'hitter' | 'pitcher', number[]> = { hitter: [], pitcher: [] }
  for (const p of pool) {
    const role = playerRole(p, cats)
    const score = scoreOf(p)
    roleOf.set(p.playerKey, role)
    scoreByKey.set(p.playerKey, score)
    scoresByRole[role].push(score)
  }
  for (const k of ['hitter', 'pitcher'] as const) scoresByRole[k].sort((a, b) => a - b)
  // Percentile (0-100) of a value within a sorted ascending array: fraction strictly
  // below + half of ties, so a lone player is 50 and the max is ~100.
  const percentile = (arr: number[], v: number): number => {
    const n = arr.length
    if (n === 0) return 50
    let below = 0, equal = 0
    for (const x of arr) { if (x < v) below++; else if (x === v) equal++ }
    return Math.round(((below + equal / 2) / n) * 100)
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
      if (!participatesIn(player, cat)) {
        contribs.push({ statId: cat.statId, tier: 'neutral', value, percentile: 0 })
        continue
      }
      const z = zByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      const percentileVal = pctByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      valueScore += z

      let tier: PlayerCategoryContrib['tier'] = 'neutral'
      if (percentileVal >= PLUS_THRESHOLD) { tier = 'plus'; plusCount++ }
      else if (cat.lowerIsBetter && percentileVal <= MINUS_THRESHOLD) { tier = 'minus'; minusCount++ }
      contribs.push({ statId: cat.statId, tier, value, percentile: percentileVal })
      contributedPercentiles.push(percentileVal)
      if (percentileVal > topPercentile) { topPercentile = percentileVal; topStatId = cat.statId }
    }

    const overallValue =
      contributedPercentiles.length === 0 ? 0
        : contributedPercentiles.reduce((s, p) => s + p, 0) / contributedPercentiles.length

    const role = roleOf.get(player.playerKey) ?? 'hitter'
    const roleValue = percentile(scoresByRole[role], scoreByKey.get(player.playerKey) ?? 0)

    return { playerKey: player.playerKey, contribs, plusCount, minusCount, overallValue, valueScore, role, roleValue, topStatId }
  })
```
Also add the exported tier helper at the end of the file:
```typescript
export function valueTier(roleValue: number): 'core' | 'solid' | 'fringe' {
  if (roleValue >= 67) return 'core'
  if (roleValue >= 34) return 'solid'
  return 'fringe'
}
```
- [ ] **Step 4: Run to verify pass:** `npx vitest run src/myteam/__tests__/value.test.ts` → all pass (the new one + the 4 existing).
- [ ] **Step 5: Commit:**
```bash
git add src/myteam/types.ts src/myteam/value.ts src/myteam/__tests__/value.test.ts
git commit -m "feat(myteam): pool-relative roleValue + role classification + valueTier"
```

---

## Task 3: `dropCandidates.ts` — judge by roleValue

**Files:** Modify `src/myteam/dropCandidates.ts`; Modify `src/myteam/__tests__/dropCandidates.test.ts`.

- [ ] **Step 1: Replace the test** with role-relative expectations:
```typescript
import { describe, it, expect } from 'vitest'
import { computeDropCandidates } from '../dropCandidates'
import type { PlayerContribution } from '../types'

function pc(playerKey: string, role: 'hitter' | 'pitcher', roleValue: number): PlayerContribution {
  return { playerKey, contribs: [], plusCount: 0, minusCount: 0, overallValue: 0, valueScore: 0, role, roleValue, topStatId: null }
}

describe('computeDropCandidates', () => {
  it('flags the lowest-roleValue players across roles, protects mid/high, caps at 3', () => {
    const res = computeDropCandidates([
      pc('aceP', 'pitcher', 95), pc('studH', 'hitter', 88), pc('midH', 'hitter', 55),
      pc('fringeP', 'pitcher', 18), pc('fringeH', 'hitter', 12), pc('scrubP', 'pitcher', 5), pc('scrubH', 'hitter', 8),
    ])
    const keys = res.candidates.map((c) => c.playerKey)
    expect(keys).not.toContain('aceP')
    expect(keys).not.toContain('studH')
    expect(keys).not.toContain('midH')
    expect(keys.length).toBeLessThanOrEqual(3)
    expect(keys).toContain('scrubP')
    expect(res.weakLink).toBe('scrubP') // lowest roleValue overall
  })

  it('flags nobody when everyone is mid or better', () => {
    const res = computeDropCandidates([pc('a', 'hitter', 60), pc('b', 'pitcher', 52), pc('c', 'hitter', 40)])
    expect(res.candidates).toHaveLength(0)
    expect(res.weakLink).toBe('c')
  })

  it('marks the very lowest as strong severity', () => {
    const res = computeDropCandidates([pc('a', 'pitcher', 6), pc('b', 'hitter', 22)])
    expect(res.candidates.find((c) => c.playerKey === 'a')?.strength).toBe('strong')
  })
})
```
- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/myteam/__tests__/dropCandidates.test.ts` → FAIL (still keyed on valueScore).
- [ ] **Step 3: Implement.** Replace the body of `dropCandidates.ts`:
```typescript
import type { PlayerContribution } from './types'

export interface DropCandidate {
  playerKey: string
  strength: 'strong' | 'mild'
  reason: string
}

export interface DropAnalysis {
  candidates: DropCandidate[]
  weakLink: string | null // my-player with the lowest roleValue (even if not droppable)
}

const DROP_THRESHOLD = 25 // roleValue below this (bottom of role) can be a drop candidate
const PROTECT_FLOOR = 50  // roleValue at/above this is never a drop candidate
const STRONG_THRESHOLD = 10 // roleValue below this is a strong (not mild) candidate
const MAX_CANDIDATES = 3

/**
 * Flags the lowest role-relative players. roleValue is a within-role percentile, so a
 * bottom pitcher and a bottom hitter are comparably droppable (each judged vs their role).
 */
export function computeDropCandidates(contributions: PlayerContribution[]): DropAnalysis {
  const sorted = [...contributions].sort((a, b) => a.roleValue - b.roleValue)
  const candidates: DropCandidate[] = []
  for (const c of sorted) {
    if (candidates.length >= MAX_CANDIDATES) break
    if (c.roleValue >= PROTECT_FLOOR) continue
    if (c.roleValue >= DROP_THRESHOLD) continue
    candidates.push({
      playerKey: c.playerKey,
      strength: c.roleValue < STRONG_THRESHOLD ? 'strong' : 'mild',
      reason: c.roleValue < STRONG_THRESHOLD ? `bottom-tier ${c.role}` : `low-value ${c.role}`,
    })
  }
  const weakLink = sorted.length > 0 ? sorted[0].playerKey : null
  return { candidates, weakLink }
}
```
- [ ] **Step 4: Run to verify pass.** Then full `npm test` (expect green).
- [ ] **Step 5: Commit:**
```bash
git add src/myteam/dropCandidates.ts src/myteam/__tests__/dropCandidates.test.ts
git commit -m "feat(myteam): drops/weak-link judged by role-relative roleValue"
```

---

## Task 4: RosterPanel — two role sections, value number, tier dividers

**Files:** Modify `src/components/myteam/RosterPanel.vue`.

The panel receives `contributions: PlayerContribution[]` (now with `role`, `roleValue`) and `players: RosterPlayer[]`. Restructure the rendered list into two sections, each tier-grouped.

- [ ] **Step 1:** In `<script setup>`, import the tier helper and build grouped rows. Add `import { valueTier } from '@/myteam/value'`. Extend the row interface with `role`, `roleValue`, `tier`, and replace the flat `rows` sort with a grouped structure:
```typescript
type Tier = 'core' | 'solid' | 'fringe'
interface RosterRow {
  player: RosterPlayer
  plus: ContribChip[]
  minus: ContribChip[]
  plusOverflow: number
  topChip: ContribChip | null
  roleValue: number
  tier: Tier
  dropReason: string | null
  isWeakLink: boolean
}
interface RosterSection { role: 'hitter' | 'pitcher'; label: string; rows: RosterRow[] }
```
Build each row as today (chips/overflow/topChip unchanged) but read `roleValue`/`role`/`tier` from the contribution; replace the single `rows` computed with a `sections` computed that splits by `contrib.role`, sorts each by `roleValue` desc, and labels them. A player with no contribution (shouldn't happen) defaults to role 'hitter', roleValue 0. Compute `tier = valueTier(row.roleValue)`.
```typescript
const sections = computed<RosterSection[]>(() => {
  const weakLink = props.drops?.weakLink ?? null
  const build = (player: RosterPlayer): RosterRow => {
    const contrib = contribByKey.value.get(player.playerKey)
    const allPlus: { chip: ContribChip; percentile: number }[] = []
    const allMinus: { chip: ContribChip; percentile: number }[] = []
    if (contrib) {
      for (const c of contrib.contribs) {
        const label = labelByStatId.value.get(c.statId) || c.statId
        const entry = { chip: { statId: c.statId, label }, percentile: c.percentile }
        if (c.tier === 'plus') allPlus.push(entry)
        else if (c.tier === 'minus') allMinus.push(entry)
      }
    }
    allPlus.sort((a, b) => b.percentile - a.percentile)
    allMinus.sort((a, b) => a.percentile - b.percentile)
    const plus = allPlus.slice(0, MAX_PLUS_CHIPS).map((x) => x.chip)
    const minus = allMinus.slice(0, MAX_MINUS_CHIPS).map((x) => x.chip)
    const plusOverflow = Math.max(0, allPlus.length - MAX_PLUS_CHIPS)
    let topChip: ContribChip | null = null
    if (plus.length === 0 && contrib?.topStatId) {
      topChip = { statId: contrib.topStatId, label: labelByStatId.value.get(contrib.topStatId) || contrib.topStatId }
    }
    const roleValue = contrib?.roleValue ?? 0
    return {
      player, plus, minus, plusOverflow, topChip,
      roleValue, tier: valueTier(roleValue),
      dropReason: dropReasonByKey.value.get(player.playerKey) ?? null,
      isWeakLink: weakLink !== null && player.playerKey === weakLink,
    }
  }
  const rows = props.players.map(build)
  const roleByKey = new Map(props.contributions?.map((c) => [c.playerKey, c.role]) ?? [])
  const split = (role: 'hitter' | 'pitcher') =>
    rows.filter((r) => (roleByKey.get(r.player.playerKey) ?? 'hitter') === role)
        .sort((a, b) => b.roleValue - a.roleValue)
  return [
    { role: 'hitter', label: 'Hitters', rows: split('hitter') },
    { role: 'pitcher', label: 'Pitchers', rows: split('pitcher') },
  ].filter((s) => s.rows.length > 0)
})
```
- [ ] **Step 2:** In the template, render per section with a header naming the comparison basis, and insert a hairline tier divider with a small label when the tier changes. Replace the single `v-for="row in rows"` block with:
```html
  <div v-for="section in sections" :key="section.role">
    <div class="px-4 pt-4 pb-1 text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">
      {{ section.label }} <span class="font-mono text-[10px] normal-case tracking-normal text-dark-textMuted/70">· ranked vs rostered {{ section.label.toLowerCase() }}</span>
    </div>
    <template v-for="(row, i) in section.rows" :key="row.player.playerKey">
      <!-- tier divider: render when this row's tier differs from the previous row's -->
      <div v-if="i === 0 || row.tier !== section.rows[i - 1].tier"
           class="flex items-center gap-2 px-4 pt-2 pb-1">
        <span class="font-mono text-[10px] uppercase tracking-wider"
              :class="row.tier === 'core' ? 'text-primary' : row.tier === 'fringe' ? 'text-dark-textMuted' : 'text-dark-textSecondary'">{{ row.tier }}</span>
        <span class="h-px flex-1 bg-dark-border/50"></span>
      </div>
      <div class="flex items-center gap-3 px-4 py-2.5">
        <!-- existing row contents (headshot, name+tags, chips) unchanged -->
        <!-- ADD a muted roleValue number at the far right, before/after chips: -->
      </div>
    </template>
  </div>
```
Keep the existing headshot / name+tags / chips markup inside the row `div` exactly as today. Add a muted value number at the row's right edge (after the chips span):
```html
        <span class="ml-2 w-8 shrink-0 text-right font-mono text-xs text-dark-textMuted tabular-nums">{{ row.roleValue }}</span>
```
Keep the `drop?` / `weak link` tags exactly as today (they now naturally land in the fringe group). Update the empty-state guard from the old `rows.length === 0` to `sections.length === 0` (the `rows` computed no longer exists — it is replaced by `sections`).
- [ ] **Step 3:** Verify `npm run build`, `npx vue-tsc --noEmit ... | grep RosterPanel` (no output), `npm test` green. Dev visual: roster shows Hitters then Pitchers, each with CORE/SOLID/FRINGE hairline dividers and a 0-100 number; Chris Sale sits among pitchers.
- [ ] **Step 4: Commit:**
```bash
git add src/components/myteam/RosterPanel.vue
git commit -m "feat(myteam): roster grouped by role with value number + tier dividers"
```

---

## Task 5: Extract the win-prob engine (pure module)

**Files:** Create `src/services/categoryWinProbability.ts`; Test `src/services/__tests__/categoryWinProbability.test.ts`.

- [ ] **Step 1: Write the failing test:**
```typescript
import { describe, it, expect } from 'vitest'
import { calcOverallWinProb, calcCatWinProb, clampWinProb, bucketCategory } from '../categoryWinProbability'

describe('categoryWinProbability', () => {
  it('bucketCategory thresholds', () => {
    expect(bucketCategory(85)).toBe('safe')
    expect(bucketCategory(70)).toBe('safe')
    expect(bucketCategory(50)).toBe('tossup')
    expect(bucketCategory(30)).toBe('loss')
    expect(bucketCategory(12)).toBe('loss')
  })
  it('clampWinProb keeps active matchups off 0/100 but allows it when completed', () => {
    expect(clampWinProb(0, false)).toBe(0.1)
    expect(clampWinProb(100, false)).toBe(99.9)
    expect(clampWinProb(0, true)).toBe(0)
  })
  it('days=0 is deterministic: current leader wins the category', () => {
    expect(calcCatWinProb(10, 4, '4', 0, 'espn')).toEqual({ team1: 100, team2: 0 })
    expect(calcCatWinProb(4, 10, '4', 0, 'espn')).toEqual({ team1: 0, team2: 100 })
    // inverse stat (lower better): ESPN '18' is inverse
    expect(calcCatWinProb(3.0, 4.5, '18', 0, 'espn')).toEqual({ team1: 100, team2: 0 })
  })
  it('a large multi-category lead yields a high overall win prob', () => {
    const t1 = { '2': 60, '3': 20, '4': 60 }
    const t2 = { '2': 20, '3': 5, '4': 20 }
    const res = calcOverallWinProb(t1, t2, ['2', '3', '4'], 1, 'espn')
    expect(res.team1).toBeGreaterThan(80)
  })
  it('identical stats are roughly a coin flip', () => {
    const t = { '2': 30, '3': 10, '4': 30 }
    const res = calcOverallWinProb({ ...t }, { ...t }, ['2', '3', '4'], 3, 'espn')
    expect(res.team1).toBeGreaterThan(35)
    expect(res.team1).toBeLessThan(65)
  })
})
```
- [ ] **Step 2: Run to verify it fails:** `npx vitest run src/services/__tests__/categoryWinProbability.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** — copy the engine from `CategoryMatchupsView.vue:1152-1276` verbatim, parameterized by `platform` instead of the `isEspn.value` ref, with the volatility + inverse tables as module constants:
```typescript
// Per-stat daily volatility (std dev), keyed by platform stat ids. Copied from
// CategoryMatchupsView.vue; that view is the DRY-pass target later.
const STAT_VOLATILITY: { yahoo: Record<string, number>; espn: Record<string, number> } = {
  yahoo: { '60':8,'7':3,'12':8,'16':2,'3':0.02,'55':0.02,'56':0.03,'28':0.5,'32':0.5,'42':15,'26':0.5,'27':0.15,'48':0.5 },
  espn: { '2':8,'3':3,'4':8,'5':2,'8':0.02,'9':0.02,'10':0.03,'17':0.5,'20':0.5,'34':15,'18':0.5,'19':0.15,'32':0.5 },
}
const INVERSE_STATS = { yahoo: ['26', '27'], espn: ['7', '12', '14', '18', '19', '21', '22', '24', '33', '45'] }
type Platform = 'yahoo' | 'espn'

export function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random(); const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stdDev
}

export function clampWinProb(prob: number, isCompleted = false): number {
  if (isCompleted) return prob
  return Math.min(99.9, Math.max(0.1, prob))
}

export function calcCatWinProb(v1: number, v2: number, id: string, days: number, platform: Platform): { team1: number; team2: number } {
  const inv = INVERSE_STATS[platform].includes(id)
  const dailyVol = STAT_VOLATILITY[platform][id] || 5
  const totalVol = dailyVol * Math.sqrt(Math.max(0.5, days))
  if (days <= 0) {
    if (inv) { if (v1 < v2) return { team1: 100, team2: 0 }; if (v2 < v1) return { team1: 0, team2: 100 } }
    else { if (v1 > v2) return { team1: 100, team2: 0 }; if (v2 > v1) return { team1: 0, team2: 100 } }
    return { team1: 50, team2: 50 }
  }
  const SIMS = 1000
  let team1Wins = 0
  for (let i = 0; i < SIMS; i++) {
    const f1 = v1 + randomNormal(0, totalVol)
    const f2 = v2 + randomNormal(0, totalVol)
    if (inv) { if (f1 < f2) team1Wins++; else if (f1 === f2) team1Wins += 0.5 }
    else { if (f1 > f2) team1Wins++; else if (f1 === f2) team1Wins += 0.5 }
  }
  const p1 = (team1Wins / SIMS) * 100
  return { team1: Math.round(p1 * 100) / 100, team2: Math.round((100 - p1) * 100) / 100 }
}

export function calcOverallWinProb(
  team1Stats: Record<string, number>, team2Stats: Record<string, number>,
  categoryIds: string[], days: number, platform: Platform,
): { team1: number; team2: number; avgT1Cats: number; avgT2Cats: number } {
  const SIMULATIONS = 10000
  let team1Wins = 0, team2Wins = 0, ties = 0, totalT1 = 0, totalT2 = 0
  const inverse = INVERSE_STATS[platform]
  for (let sim = 0; sim < SIMULATIONS; sim++) {
    let t1 = 0, t2 = 0
    for (const catId of categoryIds) {
      const v1 = team1Stats[catId] || 0
      const v2 = team2Stats[catId] || 0
      const totalVol = (STAT_VOLATILITY[platform][catId] || 5) * Math.sqrt(Math.max(0.5, days))
      const isInv = inverse.includes(catId)
      const f1 = v1 + randomNormal(0, totalVol)
      const f2 = v2 + randomNormal(0, totalVol)
      if (isInv) { if (f1 < f2) t1++; else if (f2 < f1) t2++ }
      else { if (f1 > f2) t1++; else if (f2 > f1) t2++ }
    }
    if (t1 > t2) team1Wins++; else if (t2 > t1) team2Wins++; else ties++
    totalT1 += t1; totalT2 += t2
  }
  const t1Prob = ((team1Wins + ties / 2) / SIMULATIONS) * 100
  const t2Prob = ((team2Wins + ties / 2) / SIMULATIONS) * 100
  return {
    team1: Math.round(t1Prob * 100) / 100, team2: Math.round(t2Prob * 100) / 100,
    avgT1Cats: Math.round((totalT1 / SIMULATIONS) * 10) / 10,
    avgT2Cats: Math.round((totalT2 / SIMULATIONS) * 10) / 10,
  }
}

export type CatStatus = 'safe' | 'tossup' | 'loss'
export function bucketCategory(myWinPct: number): CatStatus {
  if (myWinPct >= 70) return 'safe'
  if (myWinPct <= 30) return 'loss'
  return 'tossup'
}
```
- [ ] **Step 4: Run to verify pass.** Then full `npm test`.
- [ ] **Step 5: Commit:**
```bash
git add src/services/categoryWinProbability.ts src/services/__tests__/categoryWinProbability.test.ts
git commit -m "feat(matchup): extract pure category win-probability engine"
```

---

## Task 6: `useThisWeekMatchup` composable

**Files:** Create `src/composables/useThisWeekMatchup.ts`.

No unit test (network orchestration over the tested engine; verified via the view). Type-check + build are the gate.

- [ ] **Step 1: Implement.** Mirror the other composables (refs + `load()` + stale-league guard). Resolve platform/week, fetch the week's matchup, find mine, normalize both teams' week-to-date stats, compute days remaining (standard-week helper; clamp ≥0), run the engine, bucket per category.
```typescript
import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { calcOverallWinProb, calcCatWinProb, bucketCategory, type CatStatus } from '@/services/categoryWinProbability'

export interface SnapshotCategory { statId: string; label: string; status: CatStatus; myWinPct: number }
export interface ThisWeekSnapshot {
  opponentName: string
  myWinPct: number
  projWins: number; projLosses: number; projTies: number
  daysRemaining: number
  completed: boolean
  categories: SnapshotCategory[]
}

// Days left until the end of the standard fantasy week (Sun). Snapshot-grade
// approximation; the full Matchup view has exact per-week dates.
function daysUntilWeekEnd(): number {
  const dow = new Date().getDay() // 0 = Sun
  return dow === 0 ? 0 : 7 - dow
}

export function useThisWeekMatchup() {
  const snapshot = ref<ThisWeekSnapshot | null>(null)
  const loading = ref(false)
  const loaded = ref(false)

  async function load(
    catSpecs: { statId: string; label: string }[],
  ) {
    const leagueStore = useLeagueStore()
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const requestedId = leagueKey
    const platform: 'yahoo' | 'espn' = leagueStore.activePlatform === 'espn' ? 'espn' : 'yahoo'
    loading.value = true
    snapshot.value = null
    try {
      const catIds = catSpecs.map((c) => c.statId)
      const labelByStat = new Map(catSpecs.map((c) => [c.statId, c.label]))
      let myStats: Record<string, number> = {}
      let oppStats: Record<string, number> = {}
      let opponentName = ''

      if (platform === 'yahoo') {
        const week = parseInt(String(leagueStore.currentLeague?.current_week ?? '')) || 0
        if (!week) return
        const { yahooService } = await import('@/services/yahoo')
        const matchups = await yahooService.getCategoryMatchups(String(leagueKey), week)
        if (leagueStore.activeLeagueId !== requestedId) return
        const mine = (matchups || []).find((m: any) => (m.teams || []).some((t: any) => t.is_my_team))
        if (!mine) return
        const me = mine.teams.find((t: any) => t.is_my_team)
        const opp = mine.teams.find((t: any) => !t.is_my_team)
        if (!me || !opp) return
        myStats = me.stats || {}
        oppStats = opp.stats || {}
        opponentName = opp.name || 'Opponent'
      } else {
        const parts = String(leagueKey).split('_') // espn_{sport}_{id}_{season}
        const sport = parts[1] as any, espnId = parts[2], season = parseInt(parts[3], 10)
        const week = parseInt(String(leagueStore.currentLeague?.status?.currentMatchupPeriod ?? '')) || 0
        if (!week) return
        const { espnService } = await import('@/services/espn')
        const matchups = await espnService.getMatchups(sport, espnId, season, week)
        if (leagueStore.activeLeagueId !== requestedId) return
        // myTeamId resolved elsewhere as `espn_<id>`; here match the numeric id.
        const myNumericId = await resolveEspnMyTeamId(sport, espnId, season)
        const mine = (matchups || []).find((m: any) => m.homeTeamId === myNumericId || m.awayTeamId === myNumericId)
        if (!mine || myNumericId == null) return
        const iAmHome = mine.homeTeamId === myNumericId
        const myBy = iAmHome ? mine.homeScoreByStat : mine.awayScoreByStat
        const oppBy = iAmHome ? mine.awayScoreByStat : mine.homeScoreByStat
        const flat = (by: Record<string, { score: number }> | undefined) =>
          Object.fromEntries(Object.entries(by || {}).map(([k, v]) => [k, v?.score ?? 0]))
        myStats = flat(myBy); oppStats = flat(oppBy)
        opponentName = mine.opponentName || (iAmHome ? mine.awayTeamName : mine.homeTeamName) || 'Opponent'
      }

      const days = daysUntilWeekEnd()
      const overall = calcOverallWinProb(myStats, oppStats, catIds, days, platform)
      const categories: SnapshotCategory[] = catIds.map((statId) => {
        const p = calcCatWinProb(myStats[statId] || 0, oppStats[statId] || 0, statId, days, platform)
        return { statId, label: labelByStat.get(statId) || statId, status: bucketCategory(p.team1), myWinPct: Math.round(p.team1) }
      })
      if (leagueStore.activeLeagueId !== requestedId) return
      snapshot.value = {
        opponentName,
        myWinPct: Math.round(overall.team1),
        projWins: Math.round(overall.avgT1Cats),
        projLosses: Math.round(overall.avgT2Cats),
        projTies: Math.max(0, catIds.length - Math.round(overall.avgT1Cats) - Math.round(overall.avgT2Cats)),
        daysRemaining: days,
        completed: days <= 0,
        categories,
      }
      loaded.value = true
    } catch (e) {
      console.error('[useThisWeekMatchup] load failed', e)
      loaded.value = true
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return { snapshot, loading, loaded, load }
}
```
**Implementer note (resolve before coding):** the ESPN "my team id" helper `resolveEspnMyTeamId` is a stand-in. The app already resolves my ESPN team via `espnService.getMyTeam(sport, leagueId, season)` (returns `EspnTeam` with numeric `id`) using stored SWID — reuse that to get `myNumericId = (await espnService.getMyTeam(sport, espnId, season))?.id ?? null` (initialize the service + set credentials the same way `useEspnCategoryTeamData` does). Also confirm the actual field names on the ESPN matchup object (`homeScoreByStat`/`awayScoreByStat`/`homeTeamId`/`awayTeamId`/opponent name) against `espnService.getMatchups` return shape, and the Yahoo `getCategoryMatchups` `teams[].is_my_team`/`stats`/`name` fields; adapt the extraction to the real shapes. If a field differs, match intent (both teams' week-to-date `Record<statId, number>` + opponent name).
- [ ] **Step 2:** Type-check (`grep -iE "useThisWeekMatchup"` → no output), `npm run build`, `npm test` (62, unchanged).
- [ ] **Step 3: Commit:**
```bash
git add src/composables/useThisWeekMatchup.ts
git commit -m "feat(myteam): useThisWeekMatchup composable (cross-platform)"
```

---

## Task 7: `MatchupSnapshot.vue` + wire into MyTeamView

**Files:** Create `src/components/myteam/MatchupSnapshot.vue`; Modify `src/views/MyTeamView.vue`.

- [ ] **Step 1: Build `MatchupSnapshot.vue`.** Props `snapshot: ThisWeekSnapshot | null`. Render nothing when null. Compact band, athletic-terminal styling: header "THIS WEEK · vs {opponent}" with a `router-link` to `/matchup`; the win % (large, mono, lime if ≥50 else neutral) + "projected {W}-{L}"; three grouped chip rows — safe (lime), coin-flips (amber `#F2B33A`), likely losses (red `#FF5C5C`) — each a small mono chip list of category labels filtered by `status`. Show a coin-flips row only if any exist; lead with it (it's the decision). For `completed`, replace the live framing with a muted "Final" note.
```html
<script setup lang="ts">
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
const props = defineProps<{ snapshot: ThisWeekSnapshot | null }>()
const byStatus = (s: 'safe' | 'tossup' | 'loss') => (props.snapshot?.categories ?? []).filter((c) => c.status === s)
</script>
<template>
  <router-link v-if="snapshot" to="/matchup"
    class="block rounded-xl bg-dark-card border border-dark-border px-4 py-3 hover:border-primary/50 transition-colors">
    <div class="flex items-center justify-between">
      <span class="text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">
        This Week · vs {{ snapshot.opponentName }}
      </span>
      <span class="font-mono text-xs text-dark-textMuted">{{ snapshot.completed ? 'Final' : snapshot.daysRemaining + 'd left' }} →</span>
    </div>
    <div class="mt-1 flex items-baseline gap-3">
      <span class="font-display text-3xl font-bold tabular-nums" :class="snapshot.myWinPct >= 50 ? 'text-primary' : 'text-dark-text'">{{ snapshot.myWinPct }}%</span>
      <span class="font-mono text-sm text-dark-textSecondary">projected {{ snapshot.projWins }}-{{ snapshot.projLosses }}</span>
    </div>
    <div class="mt-2 space-y-1 text-xs">
      <div v-if="byStatus('tossup').length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-[#F2B33A]">coin-flips</span>
        <span v-for="c in byStatus('tossup')" :key="c.statId" class="rounded px-1.5 py-0.5 font-mono text-[#F2B33A] bg-[#F2B33A]/10">{{ c.label }}</span>
      </div>
      <div v-if="byStatus('safe').length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-primary">safe</span>
        <span v-for="c in byStatus('safe')" :key="c.statId" class="rounded px-1.5 py-0.5 font-mono text-primary bg-primary/10">{{ c.label }}</span>
      </div>
      <div v-if="byStatus('loss').length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-[#FF5C5C]">likely loss</span>
        <span v-for="c in byStatus('loss')" :key="c.statId" class="rounded px-1.5 py-0.5 font-mono text-[#FF5C5C] bg-[#FF5C5C]/10">{{ c.label }}</span>
      </div>
    </div>
  </router-link>
</template>
```
- [ ] **Step 2: Wire into `MyTeamView.vue`.** Import the composable + component. Instantiate `const thisWeek = useThisWeekMatchup()`. Trigger its load alongside the others, passing the category list `{ statId, label }` (from `categories.value`): add to `maybeLoadSeasonData`/the existing category-gated loaders a call `thisWeek.load(categories.value.map((c) => ({ statId: c.statId, label: c.label })))`, and re-run on active-league change and when `categories` becomes available (watch `categories`). Render `<MatchupSnapshot :snapshot="thisWeek.snapshot.value" />` directly under `<SituationStrip>` (only renders when non-null). Confirm `/matchup` is the correct route path (check `src/router/index.ts`; adjust the `to` in the component if the path differs).
- [ ] **Step 3:** Gate — `npx vue-tsc --noEmit ... | grep -iE "MyTeamView|MatchupSnapshot|useThisWeekMatchup"` (no output), `npm test` green, `npm run build` ok. Dev visual on a mid-week league: band shows opponent, win %, coin-flips; deep-links to Matchup; absent in offseason.
- [ ] **Step 4: Commit:**
```bash
git add src/components/myteam/MatchupSnapshot.vue src/views/MyTeamView.vue
git commit -m "feat(myteam): this-week win-probability snapshot band"
```

---

## Task 8: Final gate
- [ ] `npm test` (all green), `npm run build` ok, `npx vue-tsc --noEmit` no new errors. Clean tree. No deploy.
- [ ] Manual: Yahoo roster grouped Hitters/Pitchers with numbers + tier dividers, Sale among pitchers; ESPN unchanged-good; win-prob band correct mid-week on both. Note the `[ProjectionService]` match line is unrelated here.

## Notes
- Local only; no push/deploy. Pure modules TDD'd; Vue pieces visual.
- Honest copy: roleValue is a within-role percentile among rostered players; the snapshot is week-to-date + days-remaining volatility, not pitching-schedule aware.
- Deferred (not here): within-position ranking (needs research per the spec); a DRY pass to make `CategoryMatchupsView.vue` import the extracted engine.
- No banned patterns, no em dashes.
