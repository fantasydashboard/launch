# Matchup Weekly Battle Plan — Engines (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four pure-logic engines the new Matchup "Weekly Battle Plan" view will consume — projected-finish stats, season-stakes mode detection, the mode-aware battle plan (path + fight/concede/swing split), and the volume edge — each fully unit-tested.

**Architecture:** Four small, dependency-light pure modules. No Vue, no stores, no async — every function takes plain data and returns plain data, so each is independently testable. The view (Plan 2) wires them to live data. `seasonStakes` is deliberately reusable (My Team + the Wire consume it too).

**Tech Stack:** TypeScript, Vitest. No new deps.

**Spec:** `docs/superpowers/specs/2026-06-16-matchup-weekly-battle-plan-design.md`. This plan covers only the engines; the view, child components, win-prob-engine consolidation (deleting the inlined duplicate in `CategoryMatchupsView.vue`), and route swap are **Plan 2**.

**Constraints (CLAUDE.md + standing rules):**
- Stay **local** on branch `redesign/my-team-first`. NEVER push/deploy/PR.
- Commit with `git -c gc.auto=0` + trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **`npm run build` does NOT type-check.** The real check is **`npm run type-check`** (`vue-tsc` against `tsconfig.json` — there is NO `tsconfig.app.json`). Pre-existing unrelated errors live in `yahoo-daily-stats-methods.ts` / `DraftPage.vue` / `HistoryPage.vue` / `MatchupsPage.vue` — ignore those; confirm your touched files are absent from the error list.
- Run one test file: `npx vitest run <path>`; whole suite: `npx vitest run`.
- NO auto-import; import every symbol explicitly.

---

## File Structure

- **Modify `src/services/categoryWinProbability.ts`** — add `projectFinalStats()` (Task 1).
- **Create `src/myteam/seasonStakes.ts`** + test — stakes-mode detection (Task 2).
- **Create `src/myteam/matchupPlan.ts`** + test — mode-aware path + fight/concede/swing split, reusing `matchupPath` (Task 3).
- **Create `src/myteam/volumeEdge.ts`** + test — games/starts left, you vs opponent (Task 4).

Existing signatures these build on (already in the codebase, do not change):
- `categoryWinProbability.ts`: `calcOverallWinProb(t1Stats, t2Stats, categoryIds, days, platform) → { team1, team2, avgT1Cats, avgT2Cats, winPct, tiePct, lossPct }`; `overallWinProbClosed(...)`; `bucketCategory(myWinPct) → 'safe'|'tossup'|'loss'`.
- `src/myteam/matchupPath.ts`: `matchupPath(categories: { status: 'safe'|'tossup'|'loss' }[]) → string | null`.
- `src/services/mlbSchedule.ts`: `interface WeekSchedule { gamesByTeam: Record<string, number>; startsByPitcher: Record<string, ProbableStart[]> }`; `lookupStarts(schedule, name) → ProbableStart[]`.

---

## Task 1: `projectFinalStats` — extrapolate this-week totals to an end-of-week projection

**Files:** Modify `src/services/categoryWinProbability.ts`; Test `src/services/__tests__/categoryWinProbability.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test.** Create/append `src/services/__tests__/categoryWinProbability.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { projectFinalStats } from '../categoryWinProbability'

const CATS = [
  { statId: 'HR', isRatio: false },
  { statId: 'ERA', isRatio: true },
]

describe('projectFinalStats', () => {
  it('scales counting cats by daysTotal/daysPlayed and leaves ratio cats unchanged', () => {
    const out = projectFinalStats({ HR: 6, ERA: 3.0 }, 3, 7, CATS)
    expect(out.HR).toBeCloseTo(6 * 7 / 3, 5) // pace held to full week
    expect(out.ERA).toBe(3.0) // ratio is pace-invariant
  })
  it('does not divide by zero when no days played yet (scale = 1)', () => {
    const out = projectFinalStats({ HR: 0, ERA: 0 }, 0, 7, CATS)
    expect(out.HR).toBe(0)
    expect(out.ERA).toBe(0)
  })
  it('treats a missing stat as 0', () => {
    const out = projectFinalStats({}, 2, 6, CATS)
    expect(out.HR).toBe(0)
    expect(out.ERA).toBe(0)
  })
})
```

- [ ] **Step 2: Run it — verify it fails.** `npx vitest run src/services/__tests__/categoryWinProbability.test.ts` → FAIL (`projectFinalStats` not exported).

- [ ] **Step 3: Implement.** Append to `src/services/categoryWinProbability.ts`:

```ts
/**
 * Extrapolate this-week stat totals to an end-of-week projection: counting cats scale by
 * (daysTotal / daysPlayed) — the current pace held to the full week; ratio cats are pace-invariant
 * and kept as-is. The view feeds the result to the win-prob engine (with days=0) to draw the
 * dotted "projected finish" point. daysPlayed=0 → scale 1 (no division by zero).
 */
export function projectFinalStats(
  currentStats: Record<string, number>,
  daysPlayed: number,
  daysTotal: number,
  cats: { statId: string; isRatio: boolean }[],
): Record<string, number> {
  const scale = daysPlayed > 0 ? daysTotal / daysPlayed : 1
  const out: Record<string, number> = {}
  for (const c of cats) {
    const v = currentStats[c.statId] ?? 0
    out[c.statId] = c.isRatio ? v : v * scale
  }
  return out
}
```

- [ ] **Step 4: Run it — verify it passes.** `npx vitest run src/services/__tests__/categoryWinProbability.test.ts` → PASS.

- [ ] **Step 5: Commit.**
```bash
git -c gc.auto=0 add src/services/categoryWinProbability.ts src/services/__tests__/categoryWinProbability.test.ts
git -c gc.auto=0 commit -m "$(printf 'feat: projectFinalStats — extrapolate week totals for the projected-finish trend\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: `seasonStakes` — detect the stakes mode from standings + weeks left

**Files:** Create `src/myteam/seasonStakes.ts`; Test `src/myteam/__tests__/seasonStakes.test.ts`

- [ ] **Step 1: Write the failing test.** Create `src/myteam/__tests__/seasonStakes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { seasonStakes } from '../seasonStakes'

describe('seasonStakes', () => {
  it('coast — locked into the bracket (cushion outlasts the weeks left)', () => {
    // 2nd of 10, 6 playoff spots, 2 weeks left → cushion 4 >= weeksLeft(2)+2
    expect(seasonStakes({ rank: 2, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).mode).toBe('coast')
  })
  it('coast — out of reach (deficit exceeds weeks left)', () => {
    // 10th, 6 spots, 2 weeks left → deficit 4 > weeksLeft 2 → can't catch up
    expect(seasonStakes({ rank: 10, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).mode).toBe('coast')
  })
  it('must-win — just outside, time short, still catchable', () => {
    // 7th, 6 spots, 2 weeks left → deficit 1 (<= weeksLeft) and weeksLeft<=2
    expect(seasonStakes({ rank: 7, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).mode).toBe('must-win')
  })
  it('clinch — comfortably in, default', () => {
    // 4th, 6 spots, 5 weeks left → in, cushion modest, lots of time → clinch
    expect(seasonStakes({ rank: 4, leagueSize: 10, weeksLeft: 5, playoffSpots: 6 }).mode).toBe('clinch')
  })
  it('never auto-detects maximize (override-only) and always explains itself', () => {
    const s = seasonStakes({ rank: 7, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 })
    expect(s.mode).not.toBe('maximize')
    expect(s.reasoning.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it — verify it fails.** `npx vitest run src/myteam/__tests__/seasonStakes.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement.** Create `src/myteam/seasonStakes.ts`:

```ts
export type StakesMode = 'clinch' | 'maximize' | 'must-win' | 'coast'
export interface StakesInput {
  rank: number // 1 = first
  leagueSize: number
  weeksLeft: number // playoffWeekStart - currentWeek
  playoffSpots: number // teams that make the bracket
}
export interface Stakes {
  mode: StakesMode
  reasoning: string // always shown — never a black box
}

/**
 * Detect the season stakes mode from standings position + time left. Conservative and transparent:
 * defaults to 'clinch' when uncertain, never auto-asserts 'must-win' without a clear bubble signal,
 * and never returns 'maximize' (that needs seeding/total-cats rules we can't parse — it's override
 * only). The manual override in the view is the safety valve for league nuances.
 */
export function seasonStakes({ rank, leagueSize, weeksLeft, playoffSpots }: StakesInput): Stakes {
  const cushion = playoffSpots - rank // >0 inside the cut by N
  const deficit = rank - playoffSpots // >0 outside the cut by N
  // Ordinal that includes the number: 2 -> "2nd", 11 -> "11th", 21 -> "21st".
  const ord = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  // Locked in: cushion outlasts what the remaining weeks could plausibly swing.
  if (cushion >= weeksLeft + 2) {
    return { mode: 'coast', reasoning: `${ord(rank)} of ${leagueSize} — locked into the bracket with ${weeksLeft} to play.` }
  }
  // Out of reach: can't make up the deficit even running the table.
  if (deficit > weeksLeft) {
    return { mode: 'coast', reasoning: `${ord(rank)} of ${leagueSize}, ${deficit} out with only ${weeksLeft} left — out of reach. Save your resources.` }
  }
  // Bubble, time short, still catchable.
  if (weeksLeft <= 2 && deficit >= 0 && deficit <= weeksLeft) {
    return { mode: 'must-win', reasoning: `${ord(rank)} of ${leagueSize}, on the bubble with ${weeksLeft} to play — you need this one.` }
  }
  return { mode: 'clinch', reasoning: `${ord(rank)} of ${leagueSize}, in good shape — take the week and conserve moves.` }
}
```

- [ ] **Step 4: Run it — verify it passes.** `npx vitest run src/myteam/__tests__/seasonStakes.test.ts` → PASS.

- [ ] **Step 5: Commit.**
```bash
git -c gc.auto=0 add src/myteam/seasonStakes.ts src/myteam/__tests__/seasonStakes.test.ts
git -c gc.auto=0 commit -m "$(printf 'feat: seasonStakes — clinch/must-win/coast mode from standings + weeks left\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: `matchupPlan` — the mode-aware path + fight/concede/swing split

**Files:** Create `src/myteam/matchupPlan.ts`; Test `src/myteam/__tests__/matchupPlan.test.ts`

This reuses the existing `matchupPath` for the clinch sentence and adds the stakes-mode reframing + the category bucket split. Input categories carry `myWinPct` (from the snapshot's `SnapshotCategory`).

- [ ] **Step 1: Write the failing test.** Create `src/myteam/__tests__/matchupPlan.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchupPlan, type PlanCategory } from '../matchupPlan'

// 7 cats: 3 safe, 2 tossups, 2 losses (one close loss at 40%, one far loss at 10%).
const CATS: PlanCategory[] = [
  { statId: 'OPS', status: 'safe', myWinPct: 88 },
  { statId: 'H', status: 'safe', myWinPct: 80 },
  { statId: 'AB', status: 'safe', myWinPct: 75 },
  { statId: 'RBI', status: 'tossup', myWinPct: 52 },
  { statId: 'K', status: 'tossup', myWinPct: 48 },
  { statId: 'TB', status: 'loss', myWinPct: 40 }, // close loss
  { statId: 'R', status: 'loss', myWinPct: 10 }, // far loss
]

describe('matchupPlan', () => {
  it('clinch: fight the tossups, concede ALL losses, no swing tier', () => {
    const p = matchupPlan(CATS, 'clinch')
    expect(p.fight.sort()).toEqual(['K', 'RBI'])
    expect(p.concede.sort()).toEqual(['R', 'TB'])
    expect(p.swing).toEqual([])
    expect(p.path).toMatch(/coin-flip/i)
  })
  it('maximize: close losses become a swing tier; only far losses stay conceded', () => {
    const p = matchupPlan(CATS, 'maximize')
    expect(p.fight.sort()).toEqual(['K', 'RBI'])
    expect(p.swing).toEqual(['TB']) // 40% >= swing floor
    expect(p.concede).toEqual(['R']) // 10% stays conceded
    expect(p.path).toMatch(/ground|beyond the majority|seeding/i)
  })
  it('must-win: everything not already safe is a fight; nothing conceded', () => {
    const p = matchupPlan(CATS, 'must-win')
    expect(p.fight.sort()).toEqual(['K', 'R', 'RBI', 'TB'])
    expect(p.concede).toEqual([])
    expect(p.swing).toEqual([])
    expect(p.path).toMatch(/tank|every move|must/i)
  })
  it('coast: dial down — path tells you to save resources', () => {
    const p = matchupPlan(CATS, 'coast')
    expect(p.path).toMatch(/save|conserve|playoffs/i)
  })
})
```

- [ ] **Step 2: Run it — verify it fails.** `npx vitest run src/myteam/__tests__/matchupPlan.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement.** Create `src/myteam/matchupPlan.ts`:

```ts
import { matchupPath } from './matchupPath'
import type { StakesMode } from './seasonStakes'

export interface PlanCategory {
  statId: string
  status: 'safe' | 'tossup' | 'loss'
  myWinPct: number // 0..100
}
export interface MatchupPlan {
  path: string // the one-line strategic read, reframed for the mode
  fight: string[] // statIds to push (tossups, + losses in must-win)
  swing: string[] // statIds worth a stretch (close losses in maximize)
  concede: string[] // statIds to leave alone
}

// A loss within this win% of flipping is "worth a swing" when you need ground.
const SWING_FLOOR = 35

/**
 * Turn the per-category statuses into a stakes-aware plan: which categories to fight, stretch for, or
 * concede, plus the one-line path. 'clinch' uses the base matchupPath and concedes all losses;
 * 'maximize' promotes close losses to a swing tier; 'must-win' fights everything winnable; 'coast'
 * keeps the split but tells you to conserve.
 */
export function matchupPlan(categories: PlanCategory[], mode: StakesMode): MatchupPlan {
  const tossups = categories.filter((c) => c.status === 'tossup').map((c) => c.statId)
  const losses = categories.filter((c) => c.status === 'loss')
  const base = matchupPath(categories) ?? 'No categories to plan around yet.'

  if (mode === 'must-win') {
    return {
      path: `Must-win. Empty the tank — take every move that lifts you, even small ones, and stream aggressively. There's no next week to save for.`,
      fight: [...tossups, ...losses.map((c) => c.statId)],
      swing: [],
      concede: [],
    }
  }
  if (mode === 'maximize') {
    const swing = losses.filter((c) => c.myWinPct >= SWING_FLOOR).map((c) => c.statId)
    const concede = losses.filter((c) => c.myWinPct < SWING_FLOOR).map((c) => c.statId)
    return {
      path: `Don't just clinch — every extra category is seeding. Push beyond the majority: the close losses are worth a swing.`,
      fight: tossups,
      swing,
      concede,
    }
  }
  // clinch + coast share the base split (fight tossups, concede losses); coast adds a save-resources nudge.
  const concede = losses.map((c) => c.statId)
  const path = mode === 'coast'
    ? `${base} You're set for the bracket — save your FAAB and streamers for the playoffs.`
    : base
  return { path, fight: tossups, swing: [], concede }
}
```

- [ ] **Step 4: Run it — verify it passes.** `npx vitest run src/myteam/__tests__/matchupPlan.test.ts` → PASS.

- [ ] **Step 5: Commit.**
```bash
git -c gc.auto=0 add src/myteam/matchupPlan.ts src/myteam/__tests__/matchupPlan.test.ts
git -c gc.auto=0 commit -m "$(printf 'feat: matchupPlan — stakes-aware path + fight/swing/concede split\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: `volumeEdge` — games & starts left this week, you vs opponent

**Files:** Create `src/myteam/volumeEdge.ts`; Test `src/myteam/__tests__/volumeEdge.test.ts`

Pure over a minimal player shape + a `WeekSchedule`, so the view maps its roster down to `VolPlayer[]`.

- [ ] **Step 1: Write the failing test.** Create `src/myteam/__tests__/volumeEdge.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { volumeEdge, type VolPlayer } from '../volumeEdge'
import type { WeekSchedule } from '@/services/mlbSchedule'

const schedule: WeekSchedule = {
  gamesByTeam: { NYY: 4, BOS: 3, LAD: 2 },
  startsByPitcher: { 'gerrit cole': [{ pitcherName: 'Gerrit Cole', teamAbbr: 'NYY', opponentAbbr: 'BOS', date: '2026-06-17' }] },
}
const mine: VolPlayer[] = [
  { name: 'Aaron Judge', teamAbbr: 'NYY', isPitcher: false },
  { name: 'Rafael Devers', teamAbbr: 'BOS', isPitcher: false },
  { name: 'Gerrit Cole', teamAbbr: 'NYY', isPitcher: true },
]
const opp: VolPlayer[] = [
  { name: 'Mookie Betts', teamAbbr: 'LAD', isPitcher: false },
]

describe('volumeEdge', () => {
  it('sums hitter-games by team and pitcher starts from the schedule', () => {
    const v = volumeEdge(mine, opp, schedule)
    expect(v.myGames).toBe(7) // NYY 4 + BOS 3
    expect(v.myStarts).toBe(1) // Cole one start
    expect(v.oppGames).toBe(2) // LAD 2
    expect(v.oppStarts).toBe(0)
    expect(v.read.length).toBeGreaterThan(0)
  })
  it('an unknown team contributes 0 games (degrades, never throws)', () => {
    const v = volumeEdge([{ name: 'X', teamAbbr: 'ZZZ', isPitcher: false }], [], schedule)
    expect(v.myGames).toBe(0)
  })
})
```

- [ ] **Step 2: Run it — verify it fails.** `npx vitest run src/myteam/__tests__/volumeEdge.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement.** Create `src/myteam/volumeEdge.ts`:

```ts
import { lookupStarts, type WeekSchedule } from '@/services/mlbSchedule'

export interface VolPlayer {
  name: string
  teamAbbr: string // MLB team abbreviation
  isPitcher: boolean
}
export interface VolumeEdge {
  myGames: number
  myStarts: number
  oppGames: number
  oppStarts: number
  read: string // one-line "the volume is on your side / it's even / they out-volume you"
}

function tally(players: VolPlayer[], schedule: WeekSchedule): { games: number; starts: number } {
  let games = 0
  let starts = 0
  for (const p of players) {
    if (p.isPitcher) starts += lookupStarts(schedule, p.name).length
    else games += schedule.gamesByTeam[p.teamAbbr] ?? 0
  }
  return { games, starts }
}

/**
 * Counting-stat volume left this week. Hitter-games come from each player's MLB team schedule;
 * pitcher starts from the probable-starter list. The read is a one-liner on who has more bites at
 * the apple in the counting cats. Pure given a schedule + the two rosters; an unknown team is 0.
 */
export function volumeEdge(mine: VolPlayer[], opp: VolPlayer[], schedule: WeekSchedule): VolumeEdge {
  const m = tally(mine, schedule)
  const o = tally(opp, schedule)
  const diff = m.games - o.games
  const read =
    diff >= 3 ? `The volume is on your side — push the counting cats.`
      : diff <= -3 ? `They out-game you this week — your counting cats are at risk; lean on rate stats.`
        : `Volume's about even — the counting cats are a true coin-flip.`
  return { myGames: m.games, myStarts: m.starts, oppGames: o.games, oppStarts: o.starts, read }
}
```

- [ ] **Step 4: Run it — verify it passes.** `npx vitest run src/myteam/__tests__/volumeEdge.test.ts` → PASS.

- [ ] **Step 5: Commit.**
```bash
git -c gc.auto=0 add src/myteam/volumeEdge.ts src/myteam/__tests__/volumeEdge.test.ts
git -c gc.auto=0 commit -m "$(printf 'feat: volumeEdge — games & starts left this week, you vs opponent\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification (after all tasks)

- [ ] `npx vitest run` — all green (4 new test files + the existing suite).
- [ ] `npm run type-check 2>&1 | grep -E "categoryWinProbability|seasonStakes|matchupPlan|volumeEdge" || echo "touched files clean"` — expect `touched files clean`.
- [ ] `npm run build` — succeeds.
- [ ] Do NOT push/deploy. These engines are now ready for Plan 2 (the view) to consume.

---

## Self-Review

**Spec coverage (engines portion):**
- Projected-finish trend math → Task 1 (`projectFinalStats`). The win% wrapper (`calcOverallWinProb` with days=0) is a one-liner the view calls — no new function needed. ✓
- Stakes engine (clinch/must-win/coast auto, maximize override-only, always-reasoned) → Task 2 (`seasonStakes`). ✓
- Stakes-adaptive path + fight/concede/swing split → Task 3 (`matchupPlan`, reusing `matchupPath`). ✓
- Volume edge (games/starts left, you vs opp) → Task 4 (`volumeEdge`, using `mlbSchedule`). ✓
- Win-prob consolidation, the view, child components, route swap, daily/weekly, lineup check, trend rendering, cutting the data dump → **Plan 2** (explicitly out of scope here). ✓

**Placeholder scan:** No TBD/TODO; every step has complete code + exact commands. `SWING_FLOOR = 35` concrete; detection thresholds concrete.

**Type consistency:** `StakesMode` (Task 2) is imported and used by `matchupPlan` (Task 3). `PlanCategory`/`MatchupPlan` defined and used consistently in Task 3. `VolPlayer`/`VolumeEdge` consistent in Task 4. `WeekSchedule`/`lookupStarts` match the real `mlbSchedule.ts` exports. `projectFinalStats` signature `(currentStats, daysPlayed, daysTotal, cats)` is self-consistent and matches its test. No dangling references.
