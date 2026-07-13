# Today — Daily Optimizer (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new first-position **"Today"** nav tab: a daily optimizer that shows your open lineup holes today (off-day / empty / injured) with the best plug for each, the best streaming arms, and upgrade/sit alerts — each ranked by a local matchup multiplier (opposing-SP quality × park factor), drop-cost-aware, deep-linked to The Wire.

**Architecture:** Pure, tested units in `src/today/` (`openSlots`, `parkFactors`, `oppMatchup`, `scoreToday`, `todayBoard`) reduce the roster + free agents + today's MLB schedule into a board view-model. The pure units take **normalized inputs** (a park number, a normalized pitcher-quality object) so the graceful best-effort resolution lives in the `useToday` composable and everything degrades to base-projection (multiplier 1.0) on missing data. Candidate *enumeration* reuses the existing `dailyCandidates` from `src/myteam/yourMove/`; `scoreToday` owns all *value*, so points vs. category is a scoring-only concern.

**Tech Stack:** Vue 3 (`<script setup>` + Composition API), TypeScript, Pinia, public MLB Stats API (via existing `mlbSchedule.ts`), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-13-today-daily-optimizer-design.md`

**Standing constraints (do not violate):**
- All work stays on branch `redesign/my-team-first`. NEVER push, deploy, PR, or merge. Phase 1 needs no external feed/proxy.
- Type-check baseline is **62 errors, none in touched files**. Build must stay clean. All tests pass.
- Scope: **baseball, ESPN + Yahoo, points + category**. Not football/NBA/NHL/Sleeper. Vegas/splits are **Phase 2** — out of scope here.
- Commit with `git -c gc.auto=0 commit -q -F - <<'EOF' … EOF`, message ending:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. NO push.
- zsh has exclamation-mark issues — if a script is needed, write it to `/tmp/`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/services/mlbSchedule.ts` | **modify** — add `homeTeamByTeam` to `WeekSchedule` (each team → the home team of their game today, for park lookup). Existing behavior unchanged. |
| `src/today/parkFactors.ts` (+ test) | **new**, pure — embedded ~30-park static table + `parkFactor(homeTeamAbbr)`. |
| `src/today/oppMatchup.ts` (+ test) | **new**, pure — `opposingStarterName(schedule, teamAbbr)` + `spQualityFactor(quality)` on a normalized `PitcherQuality`. |
| `src/today/scoreToday.ts` (+ test) | **new**, pure — `scoreToday(base, {parkFactor, spFactor})` → clamped value + 0–6 bucket. |
| `src/today/openSlots.ts` (+ test) | **new**, pure — `findOpenSlots(lineup, schedule)` (off-day / empty / injured). |
| `src/today/todayBoard.ts` (+ test) | **new**, pure — reduce enumerated candidates + open slots + scores into `{ hero, openSlots, streamers, upgrades, sitAlerts }`. |
| `src/composables/useToday.ts` | **new** — orchestrate schedule fetch + roster/FA sourcing + best-effort matchup resolution + base projection (points/cat) → board VM. |
| `src/views/TodayView.vue` + `TodayWrapper.vue` | **new** — the board. |
| `src/router/index.ts`, `src/App.vue` | **modify** — `/today` route + "Today" nav entry (first position). |

**Types note (verified):** `AvailablePlayer` (`src/players/types.ts`) has `{ playerKey, name, position, eligiblePositions?, team, percentOwned, status?, stats: Record<string,number> }` — `status` is the injury/IL string (`''` if healthy). `dailyCandidates(freeAgents, benched, today, cats, seasonFraction)` (`src/myteam/yourMove/dailyCandidates.ts`) returns `MoveCandidate[]` (kinds `stream`/`add`/`startSit`). `WeekSchedule` = `{ gamesByTeam, startsByPitcher }`; `ProbableStart` = `{ pitcherName, teamAbbr, opponentAbbr, date }`. `teamAbbrVariants(abbr)` normalizes cross-source team codes.

---

## Task 1: Extend `mlbSchedule` with `homeTeamByTeam` (park venue)

**Files:** Modify `src/services/mlbSchedule.ts`, test `src/services/__tests__/mlbSchedule.test.ts` (create if absent).

Park factor depends on the game's venue = the home team's park. `parseSchedule` already reads `home`/`away` per game; expose, for each team playing today, who is home.

- [ ] **Step 1: Write the failing test**

Add to (or create) `src/services/__tests__/mlbSchedule.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseSchedule } from '../mlbSchedule'

const RAW = {
  dates: [
    {
      games: [
        {
          gameDate: '2026-07-13T23:00:00Z',
          teams: {
            home: { team: { abbreviation: 'COL' }, probablePitcher: { fullName: 'Kyle Freeland' } },
            away: { team: { abbreviation: 'LAD' }, probablePitcher: { fullName: 'Yoshinobu Yamamoto' } },
          },
        },
      ],
    },
  ],
}

describe('parseSchedule homeTeamByTeam', () => {
  it('maps every team (and variants) to the home team of their game', () => {
    const s = parseSchedule(RAW)
    expect(s.homeTeamByTeam['COL']).toBe('COL')
    expect(s.homeTeamByTeam['LAD']).toBe('COL')
  })
  it('is empty for no games', () => {
    expect(parseSchedule({ dates: [] }).homeTeamByTeam).toEqual({})
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`homeTeamByTeam` undefined).

Run: `npx vitest run src/services/__tests__/mlbSchedule.test.ts`

- [ ] **Step 3: Implement**

In `src/services/mlbSchedule.ts`, add `homeTeamByTeam` to the interface:

```ts
export interface WeekSchedule {
  gamesByTeam: Record<string, number>
  startsByPitcher: Record<string, ProbableStart[]>
  // Each team (all abbr variants) -> the home team abbr of their game in range (park venue).
  // On multiple games the latest wins; fine for the single-day "today" use.
  homeTeamByTeam: Record<string, string>
}
```

In `parseSchedule`, initialize `const homeTeamByTeam: Record<string, string> = {}` next to the other maps, and inside the per-game loop (right after the `gamesByTeam` increments) add:

```ts
      if (home) {
        for (const v of teamAbbrVariants(home)) homeTeamByTeam[v] = home
        if (away) for (const v of teamAbbrVariants(away)) homeTeamByTeam[v] = home
      }
```

Return it: `return { gamesByTeam, startsByPitcher, homeTeamByTeam }`.

Also update the two empty-schedule literals so they type-check: `const EMPTY: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }` (line ~119), and any other `{ gamesByTeam: {}, startsByPitcher: {} }` literal in this file.

- [ ] **Step 4: Run it — expect PASS.**

Run: `npx vitest run src/services/__tests__/mlbSchedule.test.ts`

- [ ] **Step 5: Fix other `WeekSchedule` literals repo-wide**

Run: `grep -rn "gamesByTeam: {}, startsByPitcher: {} }" src` — for each hit (e.g. `useYourMove.ts`, `useMatchupBattlePlan.ts`), add `, homeTeamByTeam: {}` so they satisfy the new required field.

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → must be `62`.

- [ ] **Step 6: Commit**

```bash
git add src/services/mlbSchedule.ts src/services/__tests__/mlbSchedule.test.ts src/composables/useYourMove.ts src/composables/useMatchupBattlePlan.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: mlbSchedule exposes homeTeamByTeam (park venue)

Each team -> the home team of their game today, so the Today board can
look up park factors. Additive; existing gamesByTeam/startsByPitcher intact.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 2: `parkFactors.ts` (pure table + lookup)

**Files:** Create `src/today/parkFactors.ts`, test `src/today/__tests__/parkFactors.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { parkFactor } from '../parkFactors'

describe('parkFactor', () => {
  it('Coors (COL) boosts hitters, suppresses pitching', () => {
    const f = parkFactor('COL')
    expect(f.hit).toBeGreaterThan(1)
    expect(f.pit).toBeLessThan(1)
  })
  it('a pitcher-friendly park (SEA) suppresses hitters', () => {
    expect(parkFactor('SEA').hit).toBeLessThan(1)
  })
  it('unknown/empty team is neutral', () => {
    expect(parkFactor('ZZZ')).toEqual({ hit: 1, pit: 1 })
    expect(parkFactor('')).toEqual({ hit: 1, pit: 1 })
  })
  it('accepts an abbr variant (OAK == ATH)', () => {
    expect(parkFactor('OAK')).toEqual(parkFactor('ATH'))
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (module missing).

Run: `npx vitest run src/today/__tests__/parkFactors.test.ts`

- [ ] **Step 3: Implement**

Create `src/today/parkFactors.ts`:

```ts
/**
 * Park factors for the Today matchup layer: a hitter factor (>1 = hitter-friendly) and
 * pitcher factor (<1 = pitcher gets suppressed, i.e. good for the pitcher's own value).
 * Small embedded static table (public, roughly stable year to year); no external feed.
 * Unknown parks are neutral. Keyed by home-team abbreviation; accepts cross-source variants.
 */
import { teamAbbrVariants } from '@/services/mlbSchedule'

export interface ParkFactor {
  hit: number
  pit: number
}

// hit = run/offense factor at that park (1.0 neutral). pit is derived as the inverse-ish
// benefit to a pitcher throwing there. Values are coarse, directional buckets.
const HITTER_FACTOR: Record<string, number> = {
  COL: 1.2, CIN: 1.08, BOS: 1.07, KC: 1.05, ARI: 1.04, PHI: 1.04, TEX: 1.03,
  BAL: 1.03, LAA: 1.02, ATL: 1.02, TOR: 1.02, WSH: 1.01, HOU: 1.01, MIN: 1.0,
  CHC: 1.0, NYY: 1.0, MIL: 1.0, STL: 0.99, PIT: 0.99, WAS: 1.01, CLE: 0.98,
  CHW: 0.98, LAD: 0.98, NYM: 0.98, DET: 0.97, TB: 0.97, ATH: 0.96, SF: 0.95,
  MIA: 0.95, SD: 0.94, SEA: 0.93,
}

export function parkFactor(homeTeamAbbr: string): ParkFactor {
  for (const v of teamAbbrVariants(homeTeamAbbr)) {
    const hit = HITTER_FACTOR[v]
    if (hit != null) return { hit, pit: +(2 - hit).toFixed(3) } // pitcher benefits inversely
  }
  return { hit: 1, pit: 1 }
}
```

- [ ] **Step 4: Run it — expect PASS.**

Run: `npx vitest run src/today/__tests__/parkFactors.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/today/parkFactors.ts src/today/__tests__/parkFactors.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: parkFactors — embedded park table for the Today matchup layer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 3: `oppMatchup.ts` (opposing starter + SP-quality factor)

**Files:** Create `src/today/oppMatchup.ts`, test `src/today/__tests__/oppMatchup.test.ts`.

The pure module operates on a **normalized** `PitcherQuality` (the composable resolves raw stat_id-keyed stats into this best-effort, or passes `null` when it can't). `opposingStarterName` finds who starts against a given team today.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { opposingStarterName, spQualityFactor } from '../oppMatchup'
import type { WeekSchedule } from '@/services/mlbSchedule'

const schedule: WeekSchedule = {
  gamesByTeam: { LAD: 1, COL: 1 },
  homeTeamByTeam: { LAD: 'COL', COL: 'COL' },
  startsByPitcher: {
    'kyle freeland': [{ pitcherName: 'Kyle Freeland', teamAbbr: 'COL', opponentAbbr: 'LAD', date: '' }],
    'yoshinobu yamamoto': [{ pitcherName: 'Yoshinobu Yamamoto', teamAbbr: 'LAD', opponentAbbr: 'COL', date: '' }],
  },
}

describe('opposingStarterName', () => {
  it('finds the starter facing a given team', () => {
    expect(opposingStarterName(schedule, 'LAD')).toBe('Kyle Freeland')
    expect(opposingStarterName(schedule, 'COL')).toBe('Yoshinobu Yamamoto')
  })
  it('resolves cross-source team variants (OAK->ATH etc.)', () => {
    const s: WeekSchedule = { gamesByTeam: {}, homeTeamByTeam: {}, startsByPitcher: {
      'x': [{ pitcherName: 'X', teamAbbr: 'SEA', opponentAbbr: 'ATH', date: '' }],
    } }
    expect(opposingStarterName(s, 'OAK')).toBe('X')
  })
  it('returns null when no one starts against them', () => {
    expect(opposingStarterName(schedule, 'NYY')).toBeNull()
  })
})

describe('spQualityFactor', () => {
  it('an ace (high K%, low ERA) is a HARD matchup for a hitter (<1)', () => {
    expect(spQualityFactor({ kRate: 0.32, era: 2.6 })).toBeLessThan(1)
  })
  it('a soft arm (low K%, high ERA) is a GOOD matchup for a hitter (>1)', () => {
    expect(spQualityFactor({ kRate: 0.15, era: 5.4 })).toBeGreaterThan(1)
  })
  it('null quality is neutral', () => {
    expect(spQualityFactor(null)).toBe(1)
  })
  it('is clamped to a sane band', () => {
    expect(spQualityFactor({ kRate: 0.5, era: 0.5 })).toBeGreaterThanOrEqual(0.75)
    expect(spQualityFactor({ kRate: 0, era: 12 })).toBeLessThanOrEqual(1.25)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL.**

Run: `npx vitest run src/today/__tests__/oppMatchup.test.ts`

- [ ] **Step 3: Implement**

Create `src/today/oppMatchup.ts`:

```ts
/**
 * Opposing-starter resolution + a normalized SP-quality factor for the Today matchup
 * layer. The factor answers "how good is TODAY's spot for a HITTER facing this arm":
 * >1 for a soft opposing starter, <1 for an ace. The composable resolves raw stats
 * into PitcherQuality best-effort and passes null when it can't (→ neutral 1.0).
 */
import type { WeekSchedule } from '@/services/mlbSchedule'
import { teamAbbrVariants } from '@/services/mlbSchedule'

export interface PitcherQuality {
  kRate?: number // strikeouts / batters faced (or / IP-derived), ~0.10–0.35
  era?: number
}

/** Name of the pitcher starting AGAINST `teamAbbr` today, or null. */
export function opposingStarterName(schedule: WeekSchedule, teamAbbr: string): string | null {
  const wanted = new Set(teamAbbrVariants(teamAbbr))
  for (const starts of Object.values(schedule.startsByPitcher)) {
    for (const s of starts) {
      if (wanted.has(s.opponentAbbr)) return s.pitcherName
    }
  }
  return null
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 * Hitter-facing factor. League-average anchors: K% ~0.22, ERA ~4.0. A tougher-than-average
 * arm pushes below 1; a softer one above 1. Missing inputs contribute nothing.
 */
export function spQualityFactor(q: PitcherQuality | null): number {
  if (!q) return 1
  let tilt = 0 // positive = good for the hitter
  if (q.kRate != null) tilt += (0.22 - q.kRate) * 1.5 // facing high-K arm → negative tilt
  if (q.era != null) tilt += (q.era - 4.0) * 0.05 // facing high-ERA arm → positive tilt
  return clamp(+(1 + tilt).toFixed(3), 0.75, 1.25)
}
```

- [ ] **Step 4: Run it — expect PASS.**

Run: `npx vitest run src/today/__tests__/oppMatchup.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/today/oppMatchup.ts src/today/__tests__/oppMatchup.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: oppMatchup — opposing-starter resolution + SP-quality factor

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 4: `scoreToday.ts` (base × matchup multiplier, bucketed)

**Files:** Create `src/today/scoreToday.ts`, test `src/today/__tests__/scoreToday.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { scoreToday } from '../scoreToday'

describe('scoreToday', () => {
  it('multiplies base by park × sp factor', () => {
    const r = scoreToday(10, { parkFactor: 1.2, spFactor: 1.1 })
    expect(r.value).toBeCloseTo(10 * 1.2 * 1.1, 3)
  })
  it('clamps the combined multiplier to 0.7–1.3', () => {
    expect(scoreToday(10, { parkFactor: 1.5, spFactor: 1.5 }).value).toBeCloseTo(13, 3)
    expect(scoreToday(10, { parkFactor: 0.5, spFactor: 0.5 }).value).toBeCloseTo(7, 3)
  })
  it('missing factors default to 1.0 (base only)', () => {
    expect(scoreToday(10, {}).value).toBe(10)
  })
  it('buckets the multiplier into 0..6 blocks', () => {
    expect(scoreToday(10, { parkFactor: 1.3, spFactor: 1.0 }).bucket).toBe(6)
    expect(scoreToday(10, { parkFactor: 0.7, spFactor: 1.0 }).bucket).toBe(0)
    expect(scoreToday(10, {}).bucket).toBe(3)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL.**

Run: `npx vitest run src/today/__tests__/scoreToday.test.ts`

- [ ] **Step 3: Implement**

Create `src/today/scoreToday.ts`:

```ts
/**
 * One daily play's value = base single-game projection × a clamped matchup multiplier.
 * The multiplier only TILTS the ranking (park + opposing-SP), never dominates it, and is
 * bucketed to 0..6 blocks for the ▓▓▓▓▓░ bar. Missing factors → neutral 1.0 (base only).
 */
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export interface MatchupFactors {
  parkFactor?: number
  spFactor?: number
}

export interface TodayScore {
  value: number
  multiplier: number
  bucket: number // 0..6
}

export function scoreToday(base: number, f: MatchupFactors): TodayScore {
  const raw = (f.parkFactor ?? 1) * (f.spFactor ?? 1)
  const multiplier = clamp(raw, 0.7, 1.3)
  // Map 0.7..1.3 → 0..6.
  const bucket = Math.round(((multiplier - 0.7) / 0.6) * 6)
  return { value: +(base * multiplier).toFixed(3), multiplier, bucket: clamp(bucket, 0, 6) }
}
```

- [ ] **Step 4: Run it — expect PASS.**

Run: `npx vitest run src/today/__tests__/scoreToday.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/today/scoreToday.ts src/today/__tests__/scoreToday.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: scoreToday — base projection × clamped matchup multiplier, bucketed

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 5: `openSlots.ts` (off-day / empty / injured detection)

**Files:** Create `src/today/openSlots.ts`, test `src/today/__tests__/openSlots.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { findOpenSlots } from '../openSlots'
import type { WeekSchedule } from '@/services/mlbSchedule'

const schedule: WeekSchedule = {
  gamesByTeam: { LAD: 1, NYY: 0, ATH: 1 }, // NYY off today; OAK resolves via ATH
  homeTeamByTeam: {},
  startsByPitcher: {},
}

const lineup = [
  { slot: 'C', playerKey: 'a', name: 'Has Game', team: 'LAD', position: 'C', status: '' },
  { slot: 'OF', playerKey: 'b', name: 'Off Today', team: 'NYY', position: 'OF', status: '' },
  { slot: '1B', playerKey: 'c', name: 'Hurt', team: 'OAK', position: '1B', status: 'IL10' },
  { slot: 'SP', playerKey: '', name: '', team: '', position: 'SP', status: '' }, // empty slot
]

describe('findOpenSlots', () => {
  it('flags off-day, injured, and empty active slots; leaves playing/healthy alone', () => {
    const open = findOpenSlots(lineup, schedule)
    const bySlot = Object.fromEntries(open.map((o) => [o.slot, o.reason]))
    expect(bySlot).toEqual({ OF: 'off-day', '1B': 'injured', SP: 'empty' })
    expect(bySlot['C']).toBeUndefined() // has a game, healthy
  })
  it('is empty when everyone plays and is healthy', () => {
    const ok = [{ slot: 'C', playerKey: 'a', name: 'A', team: 'LAD', position: 'C', status: '' }]
    expect(findOpenSlots(ok, schedule)).toEqual([])
  })
})
```

- [ ] **Step 2: Run it — expect FAIL.**

Run: `npx vitest run src/today/__tests__/openSlots.test.ts`

- [ ] **Step 3: Implement**

Create `src/today/openSlots.ts`:

```ts
/**
 * Detect a manager's OPEN active lineup slots for today — the holes that cost games right
 * now: an empty slot, a starter whose team has no game today, or an injured/out starter.
 * Injury detection here also closes the app's injury-blindness gap (IL/DTD were invisible).
 */
import type { WeekSchedule } from '@/services/mlbSchedule'
import { teamAbbrVariants } from '@/services/mlbSchedule'

export interface LineupSlot {
  slot: string // active slot label, e.g. 'C', 'OF', 'SP', 'UTIL'
  playerKey: string // '' when the slot is empty
  name: string
  team: string
  position: string // eligibility of the current occupant
  status?: string // injury/IL string; '' or undefined = healthy
}

export type OpenReason = 'empty' | 'off-day' | 'injured'

export interface OpenSlot {
  slot: string
  reason: OpenReason
  vacating?: { playerKey: string; name: string; position: string } // the absent starter, if any
}

const INJURED = /IL|DTD|OUT|NA|SUSP/i

function playsToday(team: string, schedule: WeekSchedule): boolean {
  return teamAbbrVariants(team).some((v) => (schedule.gamesByTeam[v] ?? 0) > 0)
}

export function findOpenSlots(lineup: LineupSlot[], schedule: WeekSchedule): OpenSlot[] {
  const out: OpenSlot[] = []
  for (const s of lineup) {
    let reason: OpenReason | null = null
    if (!s.playerKey) reason = 'empty'
    else if (s.status && INJURED.test(s.status)) reason = 'injured'
    else if (!playsToday(s.team, schedule)) reason = 'off-day'
    if (!reason) continue
    out.push({
      slot: s.slot,
      reason,
      vacating: s.playerKey ? { playerKey: s.playerKey, name: s.name, position: s.position } : undefined,
    })
  }
  return out
}
```

- [ ] **Step 4: Run it — expect PASS.**

Run: `npx vitest run src/today/__tests__/openSlots.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/today/openSlots.ts src/today/__tests__/openSlots.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: openSlots — off-day / empty / injured active-slot detection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 6: `todayBoard.ts` (pure board reducer)

**Files:** Create `src/today/todayBoard.ts`, test `src/today/__tests__/todayBoard.test.ts`.

Reduce **already-scored candidate plays** + open slots into the board view-model. The composable (Task 7) does the scoring/resolution; this pure reducer just organizes + selects, so it's fully testable. A `ScoredPlay` is a candidate with its `scoreToday` value attached.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildTodayBoard, type ScoredPlay } from '../todayBoard'
import type { OpenSlot } from '../openSlots'

function play(p: Partial<ScoredPlay> & { name: string; value: number }): ScoredPlay {
  return {
    kind: 'stream',
    playerKey: p.name,
    team: 'LAD',
    position: 'SP',
    value: p.value,
    bucket: 4,
    detail: '',
    oneDay: true,
    fillsSlot: undefined,
    ...p,
  }
}

describe('buildTodayBoard', () => {
  it('hero = highest-value play; streamers sorted desc; assigns fills to open slots', () => {
    const plays: ScoredPlay[] = [
      play({ name: 'Ace', value: 18, kind: 'stream', fillsSlot: 'SP' }),
      play({ name: 'Mid', value: 9, kind: 'stream' }),
      play({ name: 'BenchBat', value: 7, kind: 'startSit', fillsSlot: 'OF', oneDay: false, position: 'OF' }),
    ]
    const openSlots: OpenSlot[] = [
      { slot: 'SP', reason: 'empty' },
      { slot: 'OF', reason: 'off-day', vacating: { playerKey: 'x', name: 'Off Guy', position: 'OF' } },
    ]
    const board = buildTodayBoard(plays, openSlots)
    expect(board.hero?.playerKey).toBe('Ace')
    expect(board.streamers.map((s) => s.playerKey)).toEqual(['Ace', 'Mid'])
    // open slots get their best matching fill
    const fills = Object.fromEntries(board.openSlots.map((o) => [o.slot, o.fill?.playerKey ?? null]))
    expect(fills).toEqual({ SP: 'Ace', OF: 'BenchBat' })
  })
  it('empty inputs → all empty, hero null', () => {
    const b = buildTodayBoard([], [])
    expect(b).toEqual({ hero: null, openSlots: [], streamers: [], upgrades: [], sitAlerts: [] })
  })
})
```

- [ ] **Step 2: Run it — expect FAIL.**

Run: `npx vitest run src/today/__tests__/todayBoard.test.ts`

- [ ] **Step 3: Implement**

Create `src/today/todayBoard.ts`:

```ts
/**
 * Pure reducer: organize already-scored daily plays + detected open slots into the Today
 * board view-model. Selection only — the composable does the fetching/scoring. Deterministic.
 */
import type { OpenSlot } from './openSlots'

export type PlayKind = 'stream' | 'add' | 'startSit'

export interface ScoredPlay {
  kind: PlayKind
  playerKey: string
  name: string
  team: string
  position: string
  value: number // scoreToday value
  bucket: number // 0..6 matchup bar
  detail: string // e.g. "vs COL"
  oneDay: boolean // pure stream / one-day play → "drop tomorrow"
  fillsSlot?: string // the open slot this play is eligible to fill, if any
}

export interface FilledSlot extends OpenSlot {
  fill?: ScoredPlay // best play to plug this slot (bench-first handled upstream via value/kind)
}

export interface TodayBoard {
  hero: ScoredPlay | null
  openSlots: FilledSlot[]
  streamers: ScoredPlay[]
  upgrades: ScoredPlay[]
  sitAlerts: ScoredPlay[]
}

export function buildTodayBoard(plays: ScoredPlay[], openSlots: OpenSlot[]): TodayBoard {
  const byValue = [...plays].sort((a, b) => b.value - a.value)

  // Each open slot gets the highest-value play eligible to fill it.
  const filled: FilledSlot[] = openSlots.map((slot) => ({
    ...slot,
    fill: byValue.find((p) => p.fillsSlot === slot.slot),
  }))

  const streamers = byValue.filter((p) => p.kind === 'stream')
  // Upgrades = non-stream adds/startSits that DON'T fill an open slot (i.e. improve a filled slot).
  const filledSlotSet = new Set(openSlots.map((s) => s.slot))
  const upgrades = byValue.filter((p) => p.kind !== 'stream' && (!p.fillsSlot || !filledSlotSet.has(p.fillsSlot)))

  return {
    hero: byValue[0] ?? null,
    openSlots: filled,
    streamers,
    upgrades,
    sitAlerts: [], // populated by the composable when a rostered starter has a poor today spot
  }
}
```

- [ ] **Step 4: Run it — expect PASS.**

Run: `npx vitest run src/today/__tests__/todayBoard.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/today/todayBoard.ts src/today/__tests__/todayBoard.test.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: todayBoard — pure reducer organizing scored plays + open slots

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 7: `useToday.ts` composable (orchestration)

**Files:** Create `src/composables/useToday.ts`.

Integration glue over the tested units; verified by type-check + build + a real-league smoke (Task 9), same posture as the other composables. It mirrors how `useWire`/`useMatchupBattlePlan` source data (see `src/composables/useWire.ts` for the platform-switch + roster/FA sourcing + combined-readiness loading pattern — follow it exactly, including the `reactive`/plain-object return lesson and Yahoo clobber-race guard noted in [[user-pages-one-lever-architecture]]).

- [ ] **Step 1: Build the composable**

Create `src/composables/useToday.ts`. Responsibilities, in order:

1. **Inputs / sourcing:** reuse the exact roster + free-agent + myTeam sourcing `useWire.ts` uses (platform switch ESPN/Yahoo; the light `getRoster`/pool path, not the throttled heavy calls). Expose `{ vm, loading, error, load }` returning a **plain object** (not `reactive({})`) so the `vm` ComputedRef auto-unwraps in the view.
2. **Schedule:** `const today = ymd(new Date()); const schedule = await getWeekSchedule(today, today)`. On empty schedule (non-baseball / off day / fetch fail) → `error='no-games'`, empty board.
3. **Open slots:** map the active lineup into `LineupSlot[]` (slot label, occupant, `status` from the roster's injury field) and call `findOpenSlots(lineup, schedule)`.
4. **Candidates:** call `dailyCandidates(freeAgents, benched, schedule, catSpecs, seasonFraction)` (reuse) to enumerate stream/add/startSit plays. Derive `benched` from the roster (bench players) as `useYourMove` does.
5. **Base projection per play (points vs category):**
   - **category league:** base = sum of the candidate's `addDelta` weighted by the team's category needs (reuse the existing helped-cats weighting, or a simple sum of positive deltas) → a single comparable number.
   - **points league:** base = the player's projected points for one game = `projectGames`-style single-game points from `stats` (reuse the points projection the points-My-Team model already uses; if not directly importable, sum the candidate's `addDelta` which for points leagues is already points-shaped).
   Keep this in a small local helper `baseValue(candidate, scoring)`.
6. **Matchup factors per play:**
   - `parkFactor(schedule.homeTeamByTeam[play.team] ?? '')` → use `.hit` for hitters, `.pit` for pitchers.
   - For a **hitter** add/startSit: `spFactor = spQualityFactor(resolveOppQuality(play.team))`, where `resolveOppQuality` finds `opposingStarterName(schedule, play.team)` then looks that pitcher up in the **full league player pool** (rostered + FA) to build a `PitcherQuality {kRate, era}` from their `stats`; returns `null` if not found (→ neutral). Stat-id → kRate/era mapping is best-effort per platform; on any doubt pass `null`. **This is the one lossy resolution; it degrades to base-only, never throws.**
   - For a **stream** (my SP): `spFactor = 1` for Phase 1 (opposing-lineup strength is a Phase-2 signal); park `.pit` still applies.
7. **Score + assemble:** `scoreToday(base, { parkFactor, spFactor })` per play → `ScoredPlay[]` (set `oneDay = kind==='stream'`; set `fillsSlot` by matching the play's eligibility to an open slot — a stream/SP add fills an open `SP`/`P` slot; a hitter add/startSit fills an open hitter slot its `position` is eligible for). Then `buildTodayBoard(scoredPlays, openSlots)`.
8. **Sit alerts:** for each rostered *active* starter who plays today but faces a hard matchup (their `scoreToday` bucket ≤ 1) AND a bench/FA alternative outscores them, push a sit alert. Keep this to a max of 2; skip entirely if it complicates — it's the least critical block.
9. **Deep-links:** each `add`/`stream` play carries the info the view needs to link to `/players` (The Wire) — no new data, just the player key.

- [ ] **Step 2: Type-check + build**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`.
Run: `npx vue-tsc --noEmit 2>&1 | grep -E "useToday" || echo "none in touched files"` → `none in touched files`.
Run: `npm run build 2>&1 | tail -3` → `✓ built in …`.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useToday.ts
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: useToday — daily board orchestration (schedule + enumerate + score)

Reuses dailyCandidates for enumeration; scoreToday owns value (points + cat).
Best-effort opposing-SP quality + park factor, degrading to base-only.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 8: `TodayView.vue` + wrapper + nav tab

**Files:** Create `src/views/TodayView.vue`, `src/views/TodayWrapper.vue`; modify `src/router/index.ts`, `src/App.vue`.

- [ ] **Step 1: Build the view + wrapper**

Create `src/views/TodayView.vue` rendering the Section-2 board from `useToday().vm`: header ("Today" + date + "Stream an arm, plug your holes — win the day."), **★ Today's best play** (hero), **Your open slots** (each with reason + `fill` + `→ Wire` link + "(free)" for bench fills / one-day flag for streams), **Streaming** (streamers, matchup `▓▓▓▓▓░` bar via `bucket`, `→ Wire`), **Upgrade today** (upgrades + sitAlerts). Terminal aesthetic (mono, `bg-dark-card`, lime on hero/best, red on sit). The matchup bar: render `'▓'.repeat(bucket) + '░'.repeat(6 - bucket)`. Good empty state when `error==='no-games'` or board is all-empty: *"You're set for today — lineup's optimal."* Create `TodayWrapper.vue` that renders `<TodayView />` (mirrors `HistoryWrapper.vue`).

Deep-link: an add/stream row links to `/players` (The Wire). Phase 1 may pass the player key as a query param the Wire ignores gracefully — a plain `<router-link to="/players">→ Wire</router-link>` is acceptable if pre-fill isn't wired yet.

- [ ] **Step 2: Route**

In `src/router/index.ts`, add near the other top-level redesign routes:

```ts
{ path: '/today', name: 'today', component: () => import('@/views/TodayWrapper.vue') },
```

- [ ] **Step 3: Nav tab (first position)**

In `src/App.vue`, the league nav array begins (line ~1214) with `{ name: 'My Team', path: '/my-team' }`. Insert **before** it:

```ts
  { name: 'Today', path: '/today' },
```

- [ ] **Step 4: Type-check, build, full suite**

Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`.
Run: `npx vue-tsc --noEmit 2>&1 | grep -E "TodayView|TodayWrapper" || echo "none in touched files"` → `none in touched files`.
Run: `npx vitest run 2>&1 | tail -4` → all pass.
Run: `npm run build 2>&1 | tail -3` → `✓ built in …`.

- [ ] **Step 5: Commit**

```bash
git add src/views/TodayView.vue src/views/TodayWrapper.vue src/router/index.ts src/App.vue
git -c gc.auto=0 commit -q -F - <<'EOF'
feat: Today tab — daily optimizer board + route + first-position nav

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Task 9: Final verification + real-league smoke + memory

- [ ] **Step 1: Full suite + gates**

Run: `npx vitest run 2>&1 | tail -4` → all pass (new `today/` + `mlbSchedule` tests included).
Run: `npx vue-tsc --noEmit 2>&1 | grep -c "error TS"` → `62`; and `grep -E "today|mlbSchedule|useToday|TodayView"` → none in touched files.
Run: `npm run build 2>&1 | tail -3` → clean.

- [ ] **Step 2: Real-league smoke (dev server)**

With `npm run dev` running + signed in, open **Today** on a baseball league mid-day:
1. If you have an empty/off-day/injured active slot, it appears under **Your open slots** with a suggested fill (bench "(free)" or a FA `→ Wire`).
2. **Streaming** lists FA arms starting today, best matchup first, with the `▓▓▓▓▓░` bar.
3. The **hero** is the single highest-value play; streams flag "drop tomorrow".
4. On an off-day / non-baseball league / fetch failure → the "you're set for today" empty state, nav not blocked.
5. Sanity-check a couple of matchup bars against reality (an ace opponent should dim a hitter's bar; Coors should brighten).
Record anything off; do not push/deploy.

- [ ] **Step 3: Update memory**

Add a `today-daily-optimizer` memory (+ MEMORY.md line): Today tab built (Phase 1, local, `redesign/my-team-first`); revived YourMove enumeration + new `src/today/` pure modules + `useToday` + `TodayView`, first-position nav; matchup layer = opp-SP quality × park (best-effort, degrades to base); injury-awareness now surfaced via `openSlots`; Phase 2 = Vegas/splits (needs feed+proxy, revisits local-only). Note the opp-SP-quality resolution is the lossy part (needs opposing-SP stats from the league pool + stat-id→kRate/era mapping) and to eyeball it on real data.

---

## Self-review notes (checked against the spec)

- **Full daily optimizer** (holes + streamers + upgrades + sit) → Tasks 5–8. Sit-alerts intentionally capped/optional (Task 7 step 8) — least-critical block, flagged.
- **Dedicated first-position Today tab, streaming hero, Wire deep-links** → Task 8.
- **Phase-1 light matchup layer (opp-SP × park), local, degrades to base** → Tasks 1–4, 7; park needed the `homeTeamByTeam` extension (Task 1); the opp-SP-quality resolution is the one lossy spot, isolated in the composable and degrading to neutral (spec's degradation clause).
- **Points + category** → base projection in Task 7 step 5; enumeration reused, scoring owns the distinction (spec §"enumeration vs scoring").
- **Injury awareness** → `openSlots` INJURED detection (Task 5) — closes the critique gap.
- **Types consistent:** `WeekSchedule.homeTeamByTeam` (T1) used in `parkFactor`/`oppMatchup`/`useToday`; `PitcherQuality`/`spQualityFactor` (T3) consumed in T7; `MatchupFactors`/`TodayScore` (T4) in T7; `LineupSlot`/`OpenSlot` (T5) in T6/T7; `ScoredPlay`/`TodayBoard` (T6) in T7/T8.
- **No placeholders in code steps.** Task 7 is deliberately interface+wiring (integration glue over tested units), matching the composable treatment in the History plan; its data-resolution risk (opp-SP stats) is called out explicitly with a safe fallback, not hand-waved.
- **Local only, no feed** — Phase 1 throughout; Vegas/splits explicitly Phase 2 / out of scope.
```
