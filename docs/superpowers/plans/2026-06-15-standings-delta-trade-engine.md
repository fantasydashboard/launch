# Standings-Delta Trade Engine — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score, rank, and display trades by their effect on expected categories won per week (ECW) instead of an abstract category z-fit, so a card reads "wins 6.5 → 8.0 cats/week" with a per-category rank ladder and a "fair to them / a reach / a steal" partner read.

**Architecture:** A new pure module `src/trades/standings.ts` aggregates each team's ROS-projected output into per-category totals (counting = sum; ratio = retained numerator/denominator), ranks teams per category, computes ECW, and previews a roster swap by re-ranking. `buildEngine` (engine.ts) exposes that data on `TradeEngine`; `buildOpportunities` (opportunities.ts) computes a `StandingsImpact` per deal; `useTradeOpportunities` sorts/gates on it; `OpportunityCard.vue` renders it.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Vitest. No new dependencies.

**Scope:** Phase 1 only — the standings engine + trade card. The category heat-matrix page (Phase B) and the Monte-Carlo overall-place simulator (Phase A) are deferred to separate plans, per the spec.

**Constraints (from CLAUDE.md + standing rules):**
- All work stays **local** on branch `redesign/my-team-first`. NEVER `git push`, deploy, or `vercel --prod`.
- Commit with `git -c gc.auto=0` (avoids a benign pre-existing gc warning) and the trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- NO auto-import: every symbol explicitly imported. `npm run build` is the gate but will NOT catch undefined-symbol runtime crashes or dangling Vue template refs — verify both by reading the diff.
- zsh exclamation-mark issues → write throwaway scripts to `/tmp/`.
- Run a single test file with `npx vitest run <path>`; the whole suite with `npx vitest run`.

---

## File Structure

- **Create `src/trades/standings.ts`** — pure standings math: aggregate projected totals (with ratio components), rank per category, ECW, swap preview, trade delta, partner-read classification. No Vue.
- **Create `src/trades/__tests__/standings.test.ts`** — unit tests for every function above.
- **Modify `src/trades/engine.ts`** — extend `TradeEngine` with `teamCatTotals`, `projByKey`, `teamByKey`, `numTeams`; populate in `buildEngine`.
- **Modify `src/trades/opportunities.ts`** — add `StandingsImpact` to `TradeOpportunity`; extend `OppContext`; compute the impact per deal; lead the headline with ECW.
- **Modify `src/trades/__tests__/opportunities.test.ts`** — assert `standings` is populated and the headline reads "wins X → Y cats/week".
- **Modify `src/composables/useTradeOpportunities.ts`** — sort by `standings.deltaYou`; gate hero/list/press-leverage on `standings.partnerRead`; pass the new `OppContext` fields.
- **Create `src/components/trades/StandingsMeter.vue`** — the 4-segment impact meter (replaces `FitMeter` on the card).
- **Modify `src/components/trades/OpportunityCard.vue`** — header leads with ECW + `StandingsMeter` + partner-read chip; drawer shows the rank ladder + existing pitch.

`fitScore.ts` and `FitMeter.vue` stay on disk (still imported by the analyzer / not-yet-migrated paths) but the card stops rendering `FitMeter`. Do not delete them in this plan.

---

## Task 1: Standings core — aggregate, rank, ECW

**Files:**
- Create: `src/trades/standings.ts`
- Test: `src/trades/__tests__/standings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/trades/__tests__/standings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { CatSpec } from '@/myteam/value'
import type { AggPlayer } from '@/trades/aggregate'
import { aggregateTeamCatTotals, rankInCategory, expectedCatsWon } from '../standings'

// 3 teams, 2 cats: HR (counting, higher better), ERA (ratio, lower better, vol = IP).
const CATS: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
]
const team = (teamId: string, players: AggPlayer[]) => ({ teamId, players })
const p = (playerKey: string, stats: Record<string, number>): AggPlayer => ({ playerKey, stats })

const PBT = [
  team('A', [p('a1', { HR: 30, ERA: 3.0, IP: 100 })]),                 // HR 30, ERA 3.00
  team('B', [p('b1', { HR: 20, ERA: 4.0, IP: 100 })]),                 // HR 20, ERA 4.00
  team('C', [p('c1', { HR: 10, ERA: 2.0, IP: 50 }), p('c2', { HR: 5, ERA: 5.0, IP: 50 })]), // HR 15, ERA 3.50
]

describe('aggregateTeamCatTotals', () => {
  it('sums counting cats and volume-weights ratio cats, retaining num/den', () => {
    const totals = aggregateTeamCatTotals(PBT, CATS)
    const c = totals.find((t) => t.teamId === 'C')!
    expect(c.cats.HR.value).toBe(15)
    expect(c.cats.ERA.value).toBeCloseTo(3.5, 5) // (2*50 + 5*50)/100
    expect(c.cats.ERA.num).toBeCloseTo(350, 5)
    expect(c.cats.ERA.den).toBe(100)
  })
})

describe('rankInCategory', () => {
  it('ranks higher-is-better desc and lower-is-better asc (1 = best)', () => {
    const totals = aggregateTeamCatTotals(PBT, CATS)
    const hr = rankInCategory(totals, CATS[0])
    expect(hr.get('A')).toBe(1); expect(hr.get('C')).toBe(2); expect(hr.get('B')).toBe(3)
    const era = rankInCategory(totals, CATS[1])
    expect(era.get('A')).toBe(1); expect(era.get('C')).toBe(2); expect(era.get('B')).toBe(3)
  })
  it('gives tied teams the average rank', () => {
    const tied = [team('X', [p('x', { HR: 10 })]), team('Y', [p('y', { HR: 10 })]), team('Z', [p('z', { HR: 5 })])]
    const hr = rankInCategory(aggregateTeamCatTotals(tied, [CATS[0]]), CATS[0])
    expect(hr.get('X')).toBe(1.5); expect(hr.get('Y')).toBe(1.5); expect(hr.get('Z')).toBe(3)
  })
  it('ranks a zero-denominator ratio team last', () => {
    const t = [team('X', [p('x', { ERA: 2, IP: 100 })]), team('Y', [p('y', { ERA: 0, IP: 0 })])]
    const era = rankInCategory(aggregateTeamCatTotals(t, [CATS[1]]), CATS[1])
    expect(era.get('X')).toBe(1); expect(era.get('Y')).toBe(2)
  })
})

describe('expectedCatsWon', () => {
  it('sums (N-rank)/(N-1) across cats', () => {
    const totals = aggregateTeamCatTotals(PBT, CATS)
    // A is 1st in both: (3-1)/(3-1) * 2 = 2.0
    expect(expectedCatsWon('A', totals, CATS)).toBeCloseTo(2.0, 5)
    // B is 3rd in both: (3-3)/2 * 2 = 0
    expect(expectedCatsWon('B', totals, CATS)).toBeCloseTo(0, 5)
    // C is 2nd in both: (3-2)/2 * 2 = 1.0
    expect(expectedCatsWon('C', totals, CATS)).toBeCloseTo(1.0, 5)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/trades/__tests__/standings.test.ts`
Expected: FAIL — `Failed to resolve import "../standings"` / functions not defined.

- [ ] **Step 3: Write the minimal implementation**

Create `src/trades/standings.ts`:

```ts
import type { CatSpec } from '@/myteam/value'
import type { AggPlayer } from './aggregate'

/** One category's aggregate for a team. `num`/`den` retained for ratio cats so a swap can recompute. */
export interface CatAgg {
  value: number
  num?: number // ratio numerator (Σ rate·vol)
  den?: number // ratio denominator (Σ vol)
}
export interface TeamCategoryTotals {
  teamId: string
  cats: Record<string, CatAgg>
}

/**
 * Aggregate each team's ROS-projected players into per-category totals:
 *  - counting cats → sum.
 *  - ratio cats → volume-weighted blend (Σ rate·vol / Σ vol), RETAINING num/den so a previewed
 *    swap can add/remove a player's (rate·vol, vol) and recompute the ratio (you can't add ratios).
 */
export function aggregateTeamCatTotals(
  playersByTeam: { teamId: string; players: AggPlayer[] }[],
  cats: CatSpec[],
): TeamCategoryTotals[] {
  return playersByTeam.map(({ teamId, players }) => {
    const out: Record<string, CatAgg> = {}
    for (const cat of cats) {
      if (cat.isRatio && cat.volumeStatId) {
        let num = 0, den = 0
        for (const p of players) {
          const vol = p.stats[cat.volumeStatId] ?? 0
          const rate = p.stats[cat.statId]
          if (rate === undefined || !Number.isFinite(rate) || vol <= 0) continue
          num += rate * vol
          den += vol
        }
        out[cat.statId] = { value: den > 0 ? num / den : 0, num, den }
      } else {
        let sum = 0
        for (const p of players) {
          const v = p.stats[cat.statId]
          if (Number.isFinite(v)) sum += v
        }
        out[cat.statId] = { value: sum }
      }
    }
    return { teamId, cats: out }
  })
}

// Sort key for a team in a category. Zero-denominator ratio teams sort to the worst end so a team
// with no innings is not "1st in ERA". Direction handled by the caller's asc/desc.
function sortValue(agg: CatAgg | undefined, cat: CatSpec): number {
  if (!agg) return cat.lowerIsBetter ? Infinity : -Infinity
  if (cat.isRatio && (agg.den ?? 0) <= 0) return cat.lowerIsBetter ? Infinity : -Infinity
  return agg.value
}

/** teamId -> rank (1 = best). Ties share the average of the positions they span. */
export function rankInCategory(totals: TeamCategoryTotals[], cat: CatSpec): Map<string, number> {
  const dir = cat.lowerIsBetter ? 1 : -1 // asc for lower-is-better, desc otherwise
  const sorted = [...totals].sort((a, b) => dir * (sortValue(a.cats[cat.statId], cat) - sortValue(b.cats[cat.statId], cat)))
  const out = new Map<string, number>()
  let i = 0
  while (i < sorted.length) {
    let j = i
    const v = sortValue(sorted[i].cats[cat.statId], cat)
    while (j + 1 < sorted.length && sortValue(sorted[j + 1].cats[cat.statId], cat) === v) j++
    const avgRank = (i + j) / 2 + 1 // positions i..j (0-based) -> 1-based average
    for (let k = i; k <= j; k++) out.set(sorted[k].teamId, avgRank)
    i = j + 1
  }
  return out
}

/** Expected categories won per week vs an average opponent: Σ_c (N - rank_c)/(N - 1). */
export function expectedCatsWon(teamId: string, totals: TeamCategoryTotals[], cats: CatSpec[]): number {
  const n = totals.length
  if (n < 2) return 0.5 * cats.length
  let ecw = 0
  for (const cat of cats) {
    const rank = rankInCategory(totals, cat).get(teamId) ?? n
    ecw += (n - rank) / (n - 1)
  }
  return ecw
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/trades/__tests__/standings.test.ts`
Expected: PASS (all cases in the three describe blocks).

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/trades/standings.ts src/trades/__tests__/standings.test.ts
git -c gc.auto=0 commit -m "$(printf 'feat: standings core — aggregate totals, per-cat rank, ECW\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: Swap preview, trade delta, partner read

**Files:**
- Modify: `src/trades/standings.ts`
- Test: `src/trades/__tests__/standings.test.ts`

- [ ] **Step 1: Write the failing test** (append to `standings.test.ts`)

```ts
import { tradeStandingsDelta, classifyPartnerRead } from '../standings'

describe('tradeStandingsDelta', () => {
  // A (HR 30 / ERA 3.0,100IP) trades its HR bat for B's arm. Stats by player:
  const statsById = new Map<string, Record<string, number>>([
    ['a1', { HR: 30, ERA: 3.0, IP: 100 }],
    ['b1', { HR: 20, ERA: 4.0, IP: 100 }],
    ['c1', { HR: 10, ERA: 2.0, IP: 50 }],
    ['c2', { HR: 5, ERA: 5.0, IP: 50 }],
  ])
  const totals = aggregateTeamCatTotals([
    team('A', [p('a1', statsById.get('a1')!)]),
    team('B', [p('b1', statsById.get('b1')!)]),
    team('C', [p('c1', statsById.get('c1')!), p('c2', statsById.get('c2')!)]),
  ], CATS)

  it('re-ranks both teams after the swap and returns ECW deltas + a ladder for me', () => {
    // A gives a1 (its only player) and gets c1 from C. After: A has c1 (HR10/ERA2.0,50IP), C has a1+c2.
    const d = tradeStandingsDelta(totals, statsById, CATS, 'A', 'C', ['a1'], ['c1'])
    expect(typeof d.you).toBe('number')
    expect(typeof d.them).toBe('number')
    // A's HR collapses 30 -> 10 (now last), so A's ECW should drop: delta negative.
    expect(d.you).toBeLessThan(0)
    // ladder covers every scored cat with before/after ranks for team A.
    expect(d.ladder.map((m) => m.statId).sort()).toEqual(['ERA', 'HR'])
    const hr = d.ladder.find((m) => m.statId === 'HR')!
    expect(hr.rankBefore).toBe(1)
    expect(hr.rankAfter).toBeGreaterThan(1)
    expect(hr.beatsMore).toBe(hr.rankBefore - hr.rankAfter)
  })
})

describe('classifyPartnerRead', () => {
  it('buckets the partner ECW delta into fair / reach / steal', () => {
    expect(classifyPartnerRead(0.5)).toBe('fair')   // they gain
    expect(classifyPartnerRead(-0.1)).toBe('fair')  // within eps
    expect(classifyPartnerRead(-0.4)).toBe('reach') // between eps and big
    expect(classifyPartnerRead(-1.2)).toBe('steal') // beyond big
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/trades/__tests__/standings.test.ts`
Expected: FAIL — `tradeStandingsDelta` / `classifyPartnerRead` not exported.

- [ ] **Step 3: Write the minimal implementation** (append to `standings.ts`)

```ts
export interface CatRankMove {
  statId: string
  rankBefore: number
  rankAfter: number
  beatsMore: number // rankBefore - rankAfter (positive = improved)
}
export interface StandingsDelta {
  you: number
  them: number
  ladder: CatRankMove[]
}
export type PartnerRead = 'fair' | 'reach' | 'steal'

// Apply a roster change to ONE team's totals (pure — returns a new object). `remove`/`add` are the
// projected stat lines leaving/joining the team. Counting cats add/subtract the stat; ratio cats
// adjust num (Σ rate·vol) and den (Σ vol) then recompute value.
function applySwapToTeam(
  team: TeamCategoryTotals,
  remove: Record<string, number>[],
  add: Record<string, number>[],
  cats: CatSpec[],
): TeamCategoryTotals {
  const next: Record<string, CatAgg> = {}
  for (const cat of cats) {
    const cur = team.cats[cat.statId] ?? { value: 0 }
    if (cat.isRatio && cat.volumeStatId) {
      let num = cur.num ?? 0
      let den = cur.den ?? 0
      const adj = (lines: Record<string, number>[], sign: number) => {
        for (const s of lines) {
          const vol = s[cat.volumeStatId!] ?? 0
          const rate = s[cat.statId]
          if (rate === undefined || !Number.isFinite(rate) || vol <= 0) continue
          num += sign * rate * vol
          den += sign * vol
        }
      }
      adj(remove, -1)
      adj(add, +1)
      next[cat.statId] = { value: den > 0 ? num / den : 0, num, den }
    } else {
      let sum = cur.value
      for (const s of remove) if (Number.isFinite(s[cat.statId])) sum -= s[cat.statId]
      for (const s of add) if (Number.isFinite(s[cat.statId])) sum += s[cat.statId]
      next[cat.statId] = { value: sum }
    }
  }
  return { teamId: team.teamId, cats: next }
}

/**
 * ECW impact of a swap for both teams, plus the per-category rank ladder for MY team. `giveKeys`
 * leave my team (and join the partner); `getKeys` leave the partner (and join me). Re-ranks the
 * whole league with both teams updated so a category where either team crosses a third team flips.
 */
export function tradeStandingsDelta(
  totals: TeamCategoryTotals[],
  statsById: Map<string, Record<string, number>>,
  cats: CatSpec[],
  myTeamId: string,
  partnerTeamId: string,
  giveKeys: string[],
  getKeys: string[],
): StandingsDelta {
  const lines = (keys: string[]) => keys.map((k) => statsById.get(k) ?? {})
  const give = lines(giveKeys)
  const get = lines(getKeys)

  const youBefore = expectedCatsWon(myTeamId, totals, cats)
  const themBefore = expectedCatsWon(partnerTeamId, totals, cats)
  const rankBefore = new Map(cats.map((c) => [c.statId, rankInCategory(totals, c).get(myTeamId) ?? totals.length]))

  const after = totals.map((t) => {
    if (t.teamId === myTeamId) return applySwapToTeam(t, give, get, cats)   // lose give, gain get
    if (t.teamId === partnerTeamId) return applySwapToTeam(t, get, give, cats) // lose get, gain give
    return t
  })

  const youAfter = expectedCatsWon(myTeamId, after, cats)
  const themAfter = expectedCatsWon(partnerTeamId, after, cats)
  const ladder: CatRankMove[] = cats.map((c) => {
    const rb = rankBefore.get(c.statId)!
    const ra = rankInCategory(after, c).get(myTeamId) ?? after.length
    return { statId: c.statId, rankBefore: rb, rankAfter: ra, beatsMore: rb - ra }
  })

  return { you: youAfter - youBefore, them: themAfter - themBefore, ladder }
}

// Partner read from THEIR ECW delta. ε = tolerated wash; β = "they clearly lose" (a steal you only
// pitch under press-leverage). Tuned after a screenshot pass.
const PARTNER_EPS = 0.15
const PARTNER_BIG = 0.6
export function classifyPartnerRead(deltaThem: number, eps = PARTNER_EPS, big = PARTNER_BIG): PartnerRead {
  if (deltaThem >= -eps) return 'fair'
  if (deltaThem >= -big) return 'reach'
  return 'steal'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/trades/__tests__/standings.test.ts`
Expected: PASS (all Task 1 + Task 2 cases).

- [ ] **Step 5: Commit**

```bash
git -c gc.auto=0 add src/trades/standings.ts src/trades/__tests__/standings.test.ts
git -c gc.auto=0 commit -m "$(printf 'feat: standings swap preview, trade delta + partner read\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: Expose standings data on the engine

**Files:**
- Modify: `src/trades/engine.ts` (interface `TradeEngine` ~lines 22-33; `buildEngine` body ~lines 50-75)

- [ ] **Step 1: Add the imports** at the top of `src/trades/engine.ts` (after the existing `aggregate` import):

```ts
import { aggregateTeamCatTotals, type TeamCategoryTotals } from './standings'
```

- [ ] **Step 2: Extend the `TradeEngine` interface** — add these four fields after `strengthByKey`:

```ts
  // Standings-delta inputs: per-team ROS-projected category totals (ratio cats retain num/den),
  // each player's projected stat line, the team each player is on, and the league size.
  teamCatTotals: TeamCategoryTotals[]
  projByKey: Map<string, Record<string, number>>
  teamByKey: Map<string, string>
  numTeams: number
```

- [ ] **Step 3: Populate them in `buildEngine`** — immediately after the `playersByTeam` line, before `const wins = ...`, insert:

```ts
  // Standings totals are ALWAYS the projected roster output (not the win-record landscape), because
  // only projected output can be re-ranked under a trade preview. Ratio cats retain num/den.
  const teamCatTotals = aggregateTeamCatTotals(playersByTeam, cats)
  const projByKey = new Map([...eff.entries()].map(([k, v]) => [k, v.stats]))
  const teamByKey = new Map<string, string>()
  for (const [teamId, ps] of byTeam) for (const pl of ps) teamByKey.set(pl.playerKey, teamId)
```

- [ ] **Step 4: Add them to the returned object** — find the `return { ... }` at the end of `buildEngine` and add the four fields. Show the exact addition (place after `strengthByKey,`):

```ts
    teamCatTotals,
    projByKey,
    teamByKey,
    numTeams: byTeam.size,
```

- [ ] **Step 5: Verify the build compiles**

Run: `npx vue-tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "engine.ts|standings.ts" || echo "no type errors in touched files"`
Expected: `no type errors in touched files`

- [ ] **Step 6: Commit**

```bash
git -c gc.auto=0 add src/trades/engine.ts
git -c gc.auto=0 commit -m "$(printf 'feat: expose projected team totals + player stats on TradeEngine\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: Compute `StandingsImpact` per opportunity

**Files:**
- Modify: `src/trades/opportunities.ts`
- Test: `src/trades/__tests__/opportunities.test.ts`

- [ ] **Step 1: Write the failing test** (add to `opportunities.test.ts`)

First read the existing test file to reuse its `ctx`/`raw` builders, then add a case. Append:

```ts
import { aggregateTeamCatTotals } from '../standings'

describe('buildOpportunities standings impact', () => {
  it('populates standings (ECW delta + ladder + partner read) and leads the headline with cats/week', () => {
    const cats = [
      { statId: 'HR', lowerIsBetter: false, side: 'hit' as const, isRatio: false },
      { statId: 'SB', lowerIsBetter: false, side: 'hit' as const, isRatio: false },
    ]
    const statsById = new Map<string, Record<string, number>>([
      ['mine', { HR: 5, SB: 25 }],     // my give: speed
      ['theirs', { HR: 30, SB: 2 }],   // their give: power
      ['x', { HR: 15, SB: 15 }],
    ])
    const projByKey = statsById
    const teamCatTotals = aggregateTeamCatTotals([
      { teamId: 'me', players: [{ playerKey: 'mine', stats: statsById.get('mine')! }] },
      { teamId: 'them', players: [{ playerKey: 'theirs', stats: statsById.get('theirs')! }] },
      { teamId: 'x', players: [{ playerKey: 'x', stats: statsById.get('x')! }] },
    ], cats)
    const teamByKey = new Map([['mine', 'me'], ['theirs', 'them'], ['x', 'x']])

    const raw = {
      partnerKey: 'them', partner: 'Them',
      get: [{ playerKey: 'theirs', name: 'Power Bat', pos: '1B', value: 80, eligible: ['1B'] }],
      give: [{ playerKey: 'mine', name: 'Speed Guy', pos: 'OF', value: 60, eligible: ['OF'] }],
      intents: ['winWin' as const],
    }
    const ctx = {
      myKey: 'me', statIds: ['HR', 'SB'],
      strengthByKey: new Map(), valueByKey: new Map(),
      catLandscape: new Map(), posLandscape: new Map(),
      myThin: [], weights: { pos: 0.25, cat: 0.5, val: 0.25 },
      hurtThreshold: 0.15, labelOf: (s: string) => s,
      cats, teamCatTotals, projByKey, teamByKey, numTeams: 3,
    }
    const [opp] = buildOpportunities([raw], ctx as any)
    expect(opp.standings).toBeDefined()
    expect(opp.standings.ladder.map((m) => m.statId).sort()).toEqual(['HR', 'SB'])
    expect(['fair', 'reach', 'steal']).toContain(opp.standings.partnerRead)
    expect(opp.headline).toMatch(/cats\/week/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/trades/__tests__/opportunities.test.ts`
Expected: FAIL — `opp.standings` undefined / `ctx.cats` etc. not used.

- [ ] **Step 3: Implement — extend types and `OppContext`** in `src/trades/opportunities.ts`.

Add the import at the top:

```ts
import { tradeStandingsDelta, expectedCatsWon, classifyPartnerRead, type CatRankMove, type PartnerRead, type TeamCategoryTotals } from './standings'
import type { CatSpec } from '@/myteam/value'
```

Add the `StandingsImpact` interface (above `TradeOpportunity`):

```ts
export interface StandingsImpact {
  ecwYouBefore: number
  ecwYouAfter: number
  ecwThemBefore: number
  ecwThemAfter: number
  deltaYou: number
  deltaThem: number
  partnerRead: PartnerRead
  ladder: CatRankMove[]
}
```

Add `standings` to `TradeOpportunity` (after `fit: FitPair`):

```ts
  standings: StandingsImpact
```

Extend `OppContext` (add after `labelOf`):

```ts
  cats: CatSpec[]
  teamCatTotals: TeamCategoryTotals[]
  projByKey: Map<string, Record<string, number>>
  teamByKey: Map<string, string>
  numTeams: number
```

- [ ] **Step 4: Implement — compute the impact in `buildOpportunities`.**

Add this helper above `buildOpportunities`:

```ts
const ecwOf = (teamId: string, ctx: OppContext): number =>
  expectedCatsWon(teamId, ctx.teamCatTotals, ctx.cats)

const standingsOf = (d: RawDeal, ctx: OppContext): StandingsImpact => {
  const giveKeys = d.give.map((s) => s.playerKey)
  const getKeys = d.get.map((s) => s.playerKey)
  const delta = tradeStandingsDelta(
    ctx.teamCatTotals, ctx.projByKey, ctx.cats, ctx.myKey, d.partnerKey, giveKeys, getKeys,
  )
  const ecwYouBefore = ecwOf(ctx.myKey, ctx)
  const ecwThemBefore = ecwOf(d.partnerKey, ctx)
  return {
    ecwYouBefore,
    ecwYouAfter: ecwYouBefore + delta.you,
    ecwThemBefore,
    ecwThemAfter: ecwThemBefore + delta.them,
    deltaYou: delta.you,
    deltaThem: delta.them,
    partnerRead: classifyPartnerRead(delta.them),
    ladder: delta.ladder,
  }
}
```

In the `buildOpportunities` loop, after the `fit` is computed and before constructing `opp`, add:

```ts
    const standings = standingsOf(d, ctx)
```

Add `standings,` to the `opp` object literal (next to `fit,`).

- [ ] **Step 5: Implement — lead the headline with ECW.** Replace the body of `headlineOf` so the standings outcome leads, with the positional/category text kept as the secondary phrase. Change its signature to receive the impact:

```ts
const headlineOf = (you: SideEffect, them: SideEffect, intents: Intent[], s: StandingsImpact): string => {
  const ecw = `wins ${s.ecwYouAfter.toFixed(1)} cats/week`
  let what = ''
  if (you.fillsPos) what = `fills your ${you.fillsPos}`
  else if (intents.includes('steal') && them.fillsPos) what = `press their ${them.fillsPos} hole`
  else if (you.fillsCats.length) what = `adds ${you.fillsCats[0]}`
  else if (intents.includes('buyLow')) what = 'buy-low window'
  return what ? `${ecw} · ${what}` : ecw
}
```

Update BOTH call sites of `headlineOf` in `buildOpportunities` (the dedupe/refresh branch and the new-opp branch) to pass the impact. In the new-opp branch compute `standings` BEFORE the headline and pass it: `headline: headlineOf(you, them, d.intents, standings)`. In the dedupe branch, reuse `existing.standings`: `existing.headline = headlineOf(existing.you, existing.them, existing.intents, existing.standings)`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/trades/__tests__/opportunities.test.ts`
Expected: PASS, including the existing pitch/intent cases (the pitch builder is unaffected).

- [ ] **Step 7: Run the whole suite to catch fallout**

Run: `npx vitest run`
Expected: all green. If the pre-existing `opportunities.test.ts` cases construct `ctx` without the new fields, update those `ctx` literals to include `cats: [], teamCatTotals: [], projByKey: new Map(), teamByKey: new Map(), numTeams: 0` so they still type-check, and the standings impact degrades to zeros (ECW returns `0.5 * cats.length` with `<2` teams — headline still renders "wins 0.0 cats/week"). Do not weaken the new test.

- [ ] **Step 8: Commit**

```bash
git -c gc.auto=0 add src/trades/opportunities.ts src/trades/__tests__/opportunities.test.ts
git -c gc.auto=0 commit -m "$(printf 'feat: standings impact per opportunity + ECW-led headline\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: Rank and gate on standings, pass the new context

**Files:**
- Modify: `src/composables/useTradeOpportunities.ts`

- [ ] **Step 1: Pass the new `OppContext` fields.** In the `all` computed, inside the `buildOpportunities({ ... })` call, add after `labelOf: inputs.labelOf,`:

```ts
      cats: eng.cats,
      teamCatTotals: eng.teamCatTotals,
      projByKey: eng.projByKey,
      teamByKey: eng.teamByKey,
      numTeams: eng.numTeams,
```

- [ ] **Step 2: Switch the hero sort + gate to standings.** Replace the first line of the `hero` computed:

```ts
    const sorted = [...all.value].filter((o) => o.standings.partnerRead !== 'steal').sort((a, b) => b.standings.deltaYou - a.standings.deltaYou)
```

(`partnerRead !== 'steal'` is the acceptance gate: fair + reach are pitchable; steals are leverage-only.)

- [ ] **Step 3: Switch the ranked list sort + press-leverage to standings.** In the `ranked` computed, replace the `pool` definition:

```ts
    const pool = [...all.value]
      .filter((o) => (pressLeverage.value ? o.standings.partnerRead === 'steal' : o.standings.partnerRead !== 'steal'))
      .filter((o) => !intents.size || o.intents.some((i) => intents.has(i)))
      .filter((o) => !heroIds.has(o.id))
      .sort((a, b) => b.standings.deltaYou - a.standings.deltaYou)
```

- [ ] **Step 4: Remove the now-unused `fit` ranking dial.** Delete the `ACCEPT_BAR` constant (line ~19) and its comment; it is replaced by `partnerRead`. Leave `FIT_WEIGHTS_POSITION`/`FIT_WEIGHTS_CATEGORY` imports and the `weights:` field (still consumed by `buildOpportunities` for the `fit` object, which the card no longer shows but tests still reference).

- [ ] **Step 5: Verify build + tests.**

Run: `npx vue-tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "useTradeOpportunities" || echo "clean"` → Expected: `clean`
Run: `npx vitest run` → Expected: all green.

- [ ] **Step 6: Commit**

```bash
git -c gc.auto=0 add src/composables/useTradeOpportunities.ts
git -c gc.auto=0 commit -m "$(printf 'feat: rank + gate trades by standings delta, not fit\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 6: Card UI — ECW header, partner-read chip, rank ladder

**Files:**
- Create: `src/components/trades/StandingsMeter.vue`
- Modify: `src/components/trades/OpportunityCard.vue`

- [ ] **Step 1: Create `StandingsMeter.vue`** — a 4-segment meter scaled by `deltaYou` (cats/week gained). About +2.0 cats/week fills it.

```vue
<script setup lang="ts">
import { computed } from 'vue'
// Standings impact meter: how many weekly categories this swap gains you. ~+2.0 cats/week = full.
const props = defineProps<{ delta: number }>()
const bands = computed(() => Math.max(0, Math.min(4, Math.round((props.delta / 2.0) * 4))))
</script>

<template>
  <span class="inline-flex items-center gap-1" :title="`+${props.delta.toFixed(1)} categories per week`">
    <span class="font-mono text-[10px] text-dark-textMuted">YOU</span>
    <span class="inline-flex gap-0.5">
      <i v-for="n in 4" :key="n" class="h-1.5 w-2 rounded-[1px]"
        :class="n <= bands ? 'bg-primary' : 'bg-dark-border'" />
    </span>
  </span>
</template>
```

- [ ] **Step 2: Update `OpportunityCard.vue` script** — swap the `FitMeter` import for `StandingsMeter` and add a partner-read label map. Replace the `import FitMeter` line:

```ts
import StandingsMeter from '@/components/trades/StandingsMeter.vue'
```

Add after the `INTENT_LABEL` block:

```ts
const PARTNER_LABEL: Record<'fair' | 'reach' | 'steal', string> = {
  fair: 'fair to them', reach: 'a reach for them', steal: 'a steal',
}
const partnerClass = (r: 'fair' | 'reach' | 'steal'): string =>
  r === 'fair' ? 'text-primary' : r === 'reach' ? 'text-[#F2B33A]' : 'text-[#ff6b6b]'
```

- [ ] **Step 3: Update the header template.** Replace the `<FitMeter ... />` element with `<StandingsMeter :delta="opp.standings.deltaYou" />`, and add the partner-read chip into the intent row. Specifically, change the meter line:

```html
      <StandingsMeter :delta="opp.standings.deltaYou" />
```

and append inside the intent `<span class="flex ...">`, after the `v-for` intents span:

```html
        <span class="text-[10px]" :class="partnerClass(opp.standings.partnerRead)">· {{ PARTNER_LABEL[opp.standings.partnerRead] }}</span>
```

(The headline `<b>{{ opp.headline }}</b>` now already reads "wins 8.0 cats/week · fills your 3B" from Task 4 — no change needed there.)

- [ ] **Step 4: Replace the drawer's YOU/THEM gain/cost rows with the rank ladder.** In the expanded `<div v-if="expanded" ...>`, replace the two `flex flex-wrap` rows (the YOU and THEM lines) with the ladder, keeping the PITCH block below unchanged:

```html
      <div v-for="m in opp.standings.ladder.filter((x) => x.beatsMore !== 0)" :key="m.statId"
        class="flex items-center gap-3">
        <span class="w-10 text-dark-textMuted/70">{{ labelOf(m.statId) }}</span>
        <span class="text-dark-textSecondary">{{ ordinal(m.rankBefore) }} → {{ ordinal(m.rankAfter) }}</span>
        <span :class="m.beatsMore > 0 ? 'text-primary' : 'text-[#ff6b6b]'">
          {{ m.beatsMore > 0 ? '▲'.repeat(Math.min(3, m.beatsMore)) : '▼'.repeat(Math.min(3, -m.beatsMore)) }}
          {{ m.beatsMore > 0 ? `beat ${m.beatsMore} more` : `slip ${-m.beatsMore}` }}
        </span>
      </div>
      <div v-if="opp.standings.ladder.every((x) => x.beatsMore === 0)" class="text-dark-textMuted">
        Holds your category ranks — value/depth move.
      </div>
```

- [ ] **Step 5: Add the `ordinal` + `labelOf` helpers to the script.** The card needs `labelOf` (statId → label). Add a prop for it and an ordinal formatter. Update `defineProps`:

```ts
const props = defineProps<{ opp: TradeOpportunity; labelOf: (statId: string) => string }>()
const labelOf = (s: string) => props.labelOf(s)
const ordinal = (n: number): string => {
  const r = Math.round(n)
  const s = ['th', 'st', 'nd', 'rd'], v = r % 100
  return r + (s[(v - 20) % 10] || s[v] || s[0])
}
```

Then find where `<OpportunityCard>` is rendered (in `TradesView.vue`) and pass `:labelOf="labelOf"` (the same `labelOf` already passed to `useTradeOpportunities`). Search: `grep -n "OpportunityCard" src/views/TradesView.vue`.

- [ ] **Step 6: Verify build + types + the dev render.**

Run: `npm run build`
Expected: build succeeds.
Run: `npx vue-tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "OpportunityCard|StandingsMeter|TradesView" || echo "clean"`
Expected: `clean`.
Then read the `OpportunityCard.vue` diff once more and confirm: no leftover `FitMeter` reference, no `opp.you`/`opp.them` template refs remain (they were replaced by the ladder), and `labelOf` is passed from `TradesView.vue`. (A green build will NOT catch a dangling `FitMeter` in the template — verify by eye.)

- [ ] **Step 7: Commit**

```bash
git -c gc.auto=0 add src/components/trades/StandingsMeter.vue src/components/trades/OpportunityCard.vue src/views/TradesView.vue
git -c gc.auto=0 commit -m "$(printf 'feat: trade card leads with standings delta + rank ladder\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification (after all tasks)

- [ ] Run the full suite: `npx vitest run` — all green (Task 1/2 standings tests + extended opportunities test + the existing 216).
- [ ] `npm run build` — succeeds.
- [ ] Manually reload the Trades page in both an ESPN and a Yahoo category league, both lenses, expanders open. Confirm: headers read "wins X.X cats/week · …"; the partner-read chip shows fair/reach/steal; the drawer shows the per-category rank ladder; the press-leverage toggle now surfaces only `steal` deals. Screenshot for the user.
- [ ] Do NOT push, deploy, merge, or open a PR. Report completion and await the user's screenshot review.

---

## Self-Review

**Spec coverage:**
- ECW primitive + formula → Task 1 (`expectedCatsWon`). ✓
- Trade score = ECW delta replacing `fit.you` → Task 2 (`tradeStandingsDelta`) + Task 5 (sort). ✓
- Partner read replacing `ACCEPT_BAR` → Task 2 (`classifyPartnerRead`) + Task 5 (gate). ✓
- Rank-ladder drawer → Task 2 (`ladder`) + Task 6 (template). ✓
- Ratio num/den data requirement → Task 1 (`CatAgg`/`aggregateTeamCatTotals`) + Task 2 (`applySwapToTeam`). ✓
- Header leads with cats/week (overall-place deferred) → Task 4 (`headlineOf`). ✓
- Fairness chip on the card → Task 6. ✓
- Edge cases (non-finite, zero-den ratio, N<2, ties) → Task 1 tests + `sortValue`/`expectedCatsWon` guards. ✓
- Overall place / playoff odds, league heat-matrix → explicitly out of Phase 1 scope (separate plans). ✓

**Placeholder scan:** No TBD/TODO; every code step is complete; thresholds are concrete (`PARTNER_EPS=0.15`, `PARTNER_BIG=0.6`; meter full at +2.0). ✓

**Type consistency:** `TeamCategoryTotals`, `CatAgg`, `CatRankMove`, `StandingsDelta`, `PartnerRead`, `StandingsImpact` are defined once and referenced with the same names/shapes across Tasks 1–6. `tradeStandingsDelta` signature `(totals, statsById, cats, myTeamId, partnerTeamId, giveKeys, getKeys)` matches its call in Task 4. `OppContext` additions in Task 4 match the values passed in Task 5. `StandingsMeter` prop `delta` matches its use. ✓
