# Today "Complete Moves" v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn every free-agent recommendation on the Today board (ESPN/Yahoo category leagues) into a complete `add X · drop Y` move with a league-relative safe drop, and replace the meaningless raw value with a normalized 0–100 score + "helps [cats]" chips.

**Architecture:** Two new pure, unit-tested modules (`safeDrop.ts`, `normalizeValue.ts`) hold the only genuinely new logic. `todayBoard.ts`'s `ScoredPlay` gains five fields and sorts by the normalized score. `useToday.ts` reuses the existing value model (`computeRosterValue` + `useValueBaseline`, same as Wire/My Team) to value the rostered + free-agent pools, derives droppable-today bodies and the wire replacement level per side, and attaches drops. `TodayView.vue` renders the drop line, the 0–100, and the chips. Four board sections unchanged.

**Tech Stack:** Vue 3 / TypeScript / Pinia / Vitest.

**Spec:** `docs/superpowers/specs/2026-07-20-today-complete-moves-design.md`

**Scope guardrails (do NOT do these — deferred):** no constraint plumbing (adds/IP/games caps), no points-league data path, no board reorganization, no roster-slot feasibility check on the drop. Category leagues only.

**Task order matters:** `safeDrop` (defines `SafeDrop`) → `todayBoard` (extends `ScoredPlay`, imports `SafeDrop`) → `normalizeValue` (uses the extended `ScoredPlay`) → `useToday` (wires it all, turns the type change green) → view. Tasks 2 and 3 leave a **transient** full-`type-check` failure in `useToday.ts` (it doesn't set the new required fields until Task 4); each of those tasks verifies only its own files, and Task 4 restores a clean check. This is expected.

---

## Task 1: `safeDrop.ts` — safe-drop selector (pure)

**Files:**
- Create: `src/today/safeDrop.ts`
- Test: `src/today/__tests__/safeDrop.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/today/__tests__/safeDrop.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pickSafeDrop, type DroppableBody } from '../safeDrop'

function body(p: Partial<DroppableBody> & { playerKey: string; rosValue: number }): DroppableBody {
  return { name: p.playerKey, side: 'pit', reason: 'benched', ...p }
}

// Wire replacement level per side: a body is a clean drop only when rosValue <= this.
const repl = (levels: Partial<Record<'hit' | 'pit', number>>) => (side: 'hit' | 'pit') =>
  levels[side] ?? -Infinity

describe('pickSafeDrop', () => {
  it('picks the lowest-value body at or below the wire replacement level', () => {
    const cands = [
      body({ playerKey: 'Low', rosValue: 10 }),
      body({ playerKey: 'Lower', rosValue: 4 }),
      body({ playerKey: 'High', rosValue: 80 }),
    ]
    const drop = pickSafeDrop(cands, repl({ pit: 30 }), new Set())
    expect(drop?.playerKey).toBe('Lower') // lowest of the two (4,10) under the 30 bar; High(80) excluded
  })

  it('returns null when every droppable body is above the replacement level (no clean drop)', () => {
    const cands = [body({ playerKey: 'Stud', rosValue: 90 }), body({ playerKey: 'Good', rosValue: 70 })]
    expect(pickSafeDrop(cands, repl({ pit: 40 }), new Set())).toBeNull()
  })

  it('skips bodies already claimed by another move (no double-drop)', () => {
    const cands = [body({ playerKey: 'A', rosValue: 5 }), body({ playerKey: 'B', rosValue: 8 })]
    const claimed = new Set(['A'])
    expect(pickSafeDrop(cands, repl({ pit: 50 }), claimed)?.playerKey).toBe('B')
  })

  it('empty wire for a side (replacement -Infinity) → no clean drop there (conservative)', () => {
    const cands = [body({ playerKey: 'X', rosValue: 1, side: 'hit' })]
    expect(pickSafeDrop(cands, repl({}), new Set())).toBeNull()
  })

  it('carries the reason label through', () => {
    const cands = [body({ playerKey: 'IL guy', rosValue: 2, reason: 'IL' })]
    expect(pickSafeDrop(cands, repl({ pit: 50 }), new Set())).toEqual({
      playerKey: 'IL guy',
      name: 'IL guy',
      reason: 'IL',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/today/__tests__/safeDrop.test.ts`
Expected: FAIL — `Cannot find module '../safeDrop'`.

- [ ] **Step 3: Implement `src/today/safeDrop.ts`**

```ts
/**
 * Safe-drop selector for the Today board. A "complete move" (add a free agent) needs a body to
 * cut; this picks the safe one. Pure — no Vue, no fetching. The composable supplies the
 * droppable-today candidate set, the per-side wire replacement level, and a `claimed` set so two
 * moves in the same board build never drop the same body.
 */

export interface SafeDrop {
  playerKey: string
  name: string
  reason: 'off-day' | 'IL' | 'benched'
}

/** A rostered body that is not contributing to today's active lineup (so cutting it loses zero
 * of today's production), with the rest-of-season value used to test expendability. */
export interface DroppableBody {
  playerKey: string
  name: string
  side: 'hit' | 'pit'
  rosValue: number // roleValue 0-100 from computeRosterValue, over the combined roster+FA pool
  reason: 'off-day' | 'IL' | 'benched'
}

/**
 * The safe drop for one free-agent move: the lowest rest-of-season-value droppable-today body
 * that is at or below this league's wire replacement level for its side (i.e. genuinely
 * replaceable off the wire) and not already claimed. `null` when nothing is expendable — the
 * caller renders "no clean drop". An empty wire for a side yields replacement -Infinity, so no
 * body of that side is ever cut (you can't safely drop what you can't replace).
 */
export function pickSafeDrop(
  candidates: DroppableBody[],
  replacementValueForSide: (side: 'hit' | 'pit') => number,
  claimed: Set<string>,
): SafeDrop | null {
  const eligible = candidates
    .filter((b) => !claimed.has(b.playerKey))
    .filter((b) => b.rosValue <= replacementValueForSide(b.side))
    .sort((a, b) => a.rosValue - b.rosValue)
  const pick = eligible[0]
  return pick ? { playerKey: pick.playerKey, name: pick.name, reason: pick.reason } : null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/today/__tests__/safeDrop.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/today/safeDrop.ts src/today/__tests__/safeDrop.test.ts
git commit -m "feat: Today safeDrop — league-relative safe add/drop selector"
```

---

## Task 2: `todayBoard.ts` — extend `ScoredPlay`, sort by score

**Files:**
- Modify: `src/today/todayBoard.ts`
- Modify: `src/today/__tests__/todayBoard.test.ts`

**Note:** after this task, a full `npm run type-check` reports errors in `useToday.ts` (it doesn't set the new required `ScoredPlay` fields yet) — those are fixed in Task 4. Verify only this task's files here (the grep in Step 5 scopes to them).

- [ ] **Step 1: Update the board test** — replace the `play()` helper and add a fields/sort test.

In `src/today/__tests__/todayBoard.test.ts`, replace the current `play()` helper with (adds `side`, `score` defaulting to `value`, `helpsCats`):

```ts
function play(p: Partial<ScoredPlay> & { name: string; value: number }): ScoredPlay {
  return {
    kind: 'stream',
    playerKey: p.name,
    team: 'LAD',
    position: 'SP',
    side: 'pit',
    value: p.value,
    score: p.value, // default: score mirrors value so ordering assertions hold unless overridden
    bucket: 4,
    detail: '',
    oneDay: true,
    fillsSlot: undefined,
    helpsCats: [],
    ...p,
  }
}
```

The existing "empty inputs" test is unchanged (`buildTodayBoard([], [])` still returns `{ hero: null, openSlots: [], streamers: [], upgrades: [], sitAlerts: [] }`). Add this test inside `describe('buildTodayBoard', ...)`:

```ts
  it('sorts by normalized score (not raw value) and carries drop / helpsCats fields', () => {
    const plays: ScoredPlay[] = [
      play({ name: 'RawBig', value: 99, score: 30, kind: 'stream', helpsCats: ['K'] }),
      play({ name: 'ScoreBig', value: 5, score: 90, kind: 'stream', drop: { playerKey: 'd', name: 'Cut Me', reason: 'off-day' } }),
    ]
    const board = buildTodayBoard(plays, [])
    expect(board.hero?.playerKey).toBe('ScoreBig') // score 90 beats score 30 despite lower raw value
    expect(board.streamers.map((s) => s.playerKey)).toEqual(['ScoreBig', 'RawBig'])
    expect(board.hero?.drop?.name).toBe('Cut Me')
    expect(board.streamers[1].helpsCats).toEqual(['K'])
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/today/__tests__/todayBoard.test.ts`
Expected: FAIL — TypeScript/assertion errors: `side`/`score`/`helpsCats`/`drop` not on `ScoredPlay`, and sort still by `value`.

- [ ] **Step 3: Extend `ScoredPlay` and sort by score** in `src/today/todayBoard.ts`.

Add the import at the top (after the existing `import type { OpenSlot } from './openSlots'`):

```ts
import type { SafeDrop } from './safeDrop'
```

Replace the `ScoredPlay` interface with:

```ts
export interface ScoredPlay {
  kind: PlayKind
  playerKey: string
  name: string
  team: string
  position: string
  side: 'hit' | 'pit'
  value: number // raw within-side single-game value (park/SP-adjusted)
  score: number // 0..100 normalized (percentile within side) — the number the UI shows and sorts by
  bucket: number // 0..6 matchup bar (legacy; the view now bars off `score`)
  detail: string // e.g. "vs COL"
  oneDay: boolean // pure stream / one-day play → "drop tomorrow"
  fillsSlot?: string // the open slot this play is eligible to fill, if any
  helpsCats: string[] // category labels this move helps (positive addDelta), for chips
  drop?: SafeDrop // the safe body to cut for this free-agent add (stream/add only)
  noCleanDrop?: boolean // an FA add with no expendable body to cut → "no clean drop"
}
```

In `buildTodayBoard`, change the sort key from `value` to `score`:

```ts
  const byValue = [...plays].sort((a, b) => b.score - a.score)
```

(Leave the rest of `buildTodayBoard` unchanged — `streamers`/`upgrades`/`hero` all derive from `byValue`, now score-sorted.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/today/__tests__/todayBoard.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify this task's files type-check**

Run: `npm run type-check 2>&1 | grep -iE "todayBoard"`
Expected: no output. (Full check will show `useToday.ts` errors — expected, fixed in Task 4.)

- [ ] **Step 6: Commit**

```bash
git add src/today/todayBoard.ts src/today/__tests__/todayBoard.test.ts
git commit -m "feat: Today board — ScoredPlay gains side/score/helpsCats/drop; sort by score"
```

---

## Task 3: `normalizeValue.ts` — 0–100 normalization (pure)

**Files:**
- Create: `src/today/normalizeValue.ts`
- Test: `src/today/__tests__/normalizeValue.test.ts`

Depends on the extended `ScoredPlay` from Task 2 (`side`, `score`). Same transient-`useToday` caveat as Task 2 — verify only this task's file here.

- [ ] **Step 1: Write the failing test**

Create `src/today/__tests__/normalizeValue.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeMoves } from '../normalizeValue'
import type { ScoredPlay } from '../todayBoard'

function play(name: string, side: 'hit' | 'pit', value: number): ScoredPlay {
  return {
    kind: side === 'pit' ? 'stream' : 'add',
    playerKey: name,
    name,
    team: 'LAD',
    position: side === 'pit' ? 'SP' : 'OF',
    side,
    value,
    score: 0,
    bucket: 4,
    detail: '',
    oneDay: side === 'pit',
    helpsCats: [],
  }
}

describe('normalizeMoves', () => {
  it('maps each move to a 0-100 percentile within its OWN side, preserving order', () => {
    const out = normalizeMoves([
      play('ArmLow', 'pit', 5),
      play('ArmMid', 'pit', 10),
      play('ArmTop', 'pit', 20),
    ])
    const byKey = Object.fromEntries(out.map((p) => [p.playerKey, p.score]))
    expect(byKey.ArmLow).toBe(0)
    expect(byKey.ArmTop).toBe(100)
    expect(byKey.ArmMid).toBeGreaterThan(0)
    expect(byKey.ArmMid).toBeLessThan(100)
  })

  it('lets a top bat outrank a mid arm across types (the hero fix)', () => {
    const out = normalizeMoves([
      play('ArmTop', 'pit', 100),
      play('ArmMid', 'pit', 40),
      play('ArmLow', 'pit', 5),
      play('BatTop', 'hit', 3),
      play('BatLow', 'hit', 1),
    ])
    const byKey = Object.fromEntries(out.map((p) => [p.playerKey, p.score]))
    expect(byKey.BatTop).toBeGreaterThan(byKey.ArmMid) // top bat (100) beats mid arm (50)
  })

  it('single-element side pool → 100; ties share a percentile', () => {
    const out = normalizeMoves([
      play('OnlyArm', 'pit', 7),
      play('TieA', 'hit', 5),
      play('TieB', 'hit', 5),
      play('BatTop', 'hit', 9),
    ])
    const byKey = Object.fromEntries(out.map((p) => [p.playerKey, p.score]))
    expect(byKey.OnlyArm).toBe(100)
    expect(byKey.TieA).toBe(byKey.TieB)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/today/__tests__/normalizeValue.test.ts`
Expected: FAIL — `Cannot find module '../normalizeValue'`.

- [ ] **Step 3: Implement `src/today/normalizeValue.ts`**

```ts
import type { ScoredPlay } from './todayBoard'

/**
 * Assign each play a 0–100 `score` = its percentile within its OWN side's pool (bats vs bats,
 * arms vs arms), so a top bat and a top arm both approach 100 and cross-type ranking stops
 * favouring pitchers purely by raw magnitude. Percentile = (# same-side plays with a strictly
 * lower value) / (poolSize - 1) × 100; a single-element side pool scores 100; equal values share
 * a percentile. Pure — returns new objects, does not mutate the input.
 */
export function normalizeMoves(plays: ScoredPlay[]): ScoredPlay[] {
  const bySide: Record<'hit' | 'pit', ScoredPlay[]> = { hit: [], pit: [] }
  for (const p of plays) bySide[p.side].push(p)

  const scoreByKey = new Map<string, number>()
  for (const side of ['hit', 'pit'] as const) {
    const pool = bySide[side]
    const n = pool.length
    for (const p of pool) {
      if (n === 1) {
        scoreByKey.set(p.playerKey, 100)
        continue
      }
      const lower = pool.filter((x) => x.value < p.value).length
      scoreByKey.set(p.playerKey, Math.round((lower / (n - 1)) * 100))
    }
  }
  return plays.map((p) => ({ ...p, score: scoreByKey.get(p.playerKey) ?? 0 }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/today/__tests__/normalizeValue.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/today/normalizeValue.ts src/today/__tests__/normalizeValue.test.ts
git commit -m "feat: Today normalizeValue — 0-100 within-side percentile scoring"
```

---

## Task 4: `useToday.ts` — value the pools, derive drops, normalize

**Files:**
- Modify: `src/composables/useToday.ts`

This wires the pure pieces into the composable and restores a clean full `type-check`. It reuses the value model exactly as `useWire.ts` does — read `src/composables/useWire.ts` lines ~180–215 for the canonical `useValueBaseline` + `computeRosterValue` pattern before starting.

- [ ] **Step 1: Add imports.** After the existing imports at the top of `useToday.ts`, add:

```ts
import { useValueBaseline } from '@/composables/useValueBaseline'
import { computeRosterValue, type ValuePoolPlayer } from '@/myteam/value'
import { pickSafeDrop, type DroppableBody, type SafeDrop } from '@/today/safeDrop'
import { normalizeMoves } from '@/today/normalizeValue'
import { lookupStarts } from '@/services/mlbSchedule'
```

(`sideOf` and `injuryTier` are already imported. `catSpecs`, `categories`, `rosterPlayers`, `freeAgents`, `playsToday`, `schedule`, `isPointsLeague`, `outFaKeys` already exist in this file. `ScoredPlay` is already imported from `@/today/todayBoard`.)

- [ ] **Step 2: Build the value baseline + per-player rest-of-season value + droppable set.** Insert this block after `catSpecs` is defined (search for `const catSpecs = computed<CatSpec[]>` and place after its closing `})`):

```ts
  // ── rest-of-season value for the rostered + free-agent pools (same model as Wire/My Team,
  // so the drop's "vs all" value matches the rest of the app) ─────────────────────────────
  const valueBaselineSvc = useValueBaseline()
  valueBaselineSvc.load()
  const valueBaseline = computed(() =>
    valueBaselineSvc.ready.value
      ? valueBaselineSvc.build(catSpecs.value, (id) => categories.value.find((c) => c.statId === id)?.label || id)
      : null,
  )
  const valueOpts = computed(() => ({ baseline: valueBaseline.value ?? undefined, zClamp: 8 }))

  // roleValue (0-100 within role, over the COMBINED roster+FA pool) keyed by playerKey.
  const roleValueByKey = computed<Map<string, number>>(() => {
    const m = new Map<string, number>()
    if (!valueBaseline.value) return m // gated below: board doesn't render until the baseline is ready
    const pool: ValuePoolPlayer[] = [
      ...rosterPlayers.value.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: p.stats })),
      ...freeAgents.value.map((p) => ({ playerKey: p.playerKey, position: p.position ?? '', stats: p.stats })),
    ]
    for (const c of computeRosterValue(pool, pool.map((p) => p.playerKey), catSpecs.value, valueOpts.value)) {
      m.set(c.playerKey, c.roleValue)
    }
    return m
  })

  // This league's wire replacement level per side = the best available FA's roleValue on that side.
  // Empty wire for a side → -Infinity, so no body of that side is ever a clean drop (conservative).
  const replacementBySide = computed<Record<'hit' | 'pit', number>>(() => {
    const rv = roleValueByKey.value
    const out: Record<'hit' | 'pit', number> = { hit: -Infinity, pit: -Infinity }
    for (const fa of freeAgents.value) {
      const v = rv.get(fa.playerKey)
      if (v == null) continue
      const side = sideOf(fa.position ?? '')
      if (v > out[side]) out[side] = v
    }
    return out
  })

  // Rostered bodies not contributing to today's active lineup (cutting them loses zero today):
  // IL, anyone whose MLB team is off today, and bench pitchers with no start today. A bench
  // HITTER whose team plays today is excluded (a plausible near-term start).
  const droppableToday = computed<DroppableBody[]>(() => {
    const rv = roleValueByKey.value
    const out: DroppableBody[] = []
    for (const p of rosterPlayers.value) {
      const side = sideOf(p.position || '')
      let reason: 'off-day' | 'IL' | 'benched' | null = null
      if (injuryTier(p.status) === 'il') reason = 'IL'
      else if (!playsToday(p.team)) reason = 'off-day'
      else if (!p.started && side === 'pit' && lookupStarts(schedule.value, p.name).length === 0) reason = 'benched'
      if (!reason) continue
      const v = rv.get(p.playerKey)
      if (v == null) continue
      out.push({ playerKey: p.playerKey, name: p.name, side, rosValue: v, reason })
    }
    return out
  })
```

- [ ] **Step 3: Set `side`, `score`, and `helpsCats` on each scored play.** In `scoreCandidate`, replace the returned object (search for `return {` inside `function scoreCandidate`) with:

```ts
    return {
      kind: candidate.kind,
      playerKey: candidate.player.key,
      name: candidate.player.name,
      team: candidate.player.team,
      position: candidate.player.position,
      side: candidate.side,
      value,
      score: 0, // assigned by normalizeMoves
      bucket,
      detail: candidate.detail,
      oneDay: candidate.kind === 'stream',
      fillsSlot: findFillsSlot(candidate.player.position, candidate.side, openSlots.value),
      helpsCats: Object.entries(candidate.addDelta)
        .filter(([, v]) => Number.isFinite(v) && v > 0)
        .map(([statId]) => categories.value.find((c) => c.statId === statId)?.label || statId),
    }
```

- [ ] **Step 4: Normalize + attach drops in the `scoredPlays` pipeline.** Replace the existing `scoredPlays` computed with:

```ts
  const scoredPlays = computed<ScoredPlay[]>(() => {
    const scored = candidates.value.map(scoreCandidate)
    const filtered = !isPointsLeague.value
      ? scored
      : scored.filter((p) => p.value > 0 && !outFaKeys.value.has(p.playerKey))
    const normalized = normalizeMoves(filtered)
    return attachDrops(normalized)
  })

  // Pair each free-agent add/stream with a safe drop, best moves first so they claim the cheapest
  // expendable body; a startSit (bench move) needs no drop. Bodies are claimed once per build.
  function attachDrops(plays: ScoredPlay[]): ScoredPlay[] {
    const claimed = new Set<string>()
    const replFor = (side: 'hit' | 'pit') => replacementBySide.value[side]
    const patch = new Map<string, { drop?: SafeDrop; noCleanDrop?: boolean }>()
    for (const p of [...plays].sort((a, b) => b.score - a.score)) {
      if (p.kind !== 'stream' && p.kind !== 'add') continue
      const drop = pickSafeDrop(droppableToday.value, replFor, claimed)
      if (drop) {
        claimed.add(drop.playerKey)
        patch.set(p.playerKey, { drop })
      } else {
        patch.set(p.playerKey, { noCleanDrop: true })
      }
    }
    return plays.map((p) => ({ ...p, ...(patch.get(p.playerKey) ?? {}) }))
  }
```

(`attachDrops` is a `function` declaration, so hoisting lets `scoredPlays` reference it regardless of source order.)

- [ ] **Step 5: Gate the board on the value baseline** so a move never flashes drop-less. Find `boardInputsReady` (added by the loading fix) and replace it with:

```ts
  const boardInputsReady = computed(() => {
    if (isEspnCategoryLeague.value) return espn.loaded.value && valueBaselineSvc.ready.value
    if (isYahooCategoryLeague.value)
      return yahooRosterLoaded.value && yahooFaLoaded.value && valueBaselineSvc.ready.value
    return true
  })
```

- [ ] **Step 6: Type-check clean (full).**

Run: `npm run type-check 2>&1 | grep -iE "useToday|today/"`
Expected: no output (the transient errors from Tasks 2–3 are now resolved).

- [ ] **Step 7: Run the Today unit tests (pure modules — should be unaffected).**

Run: `npx vitest run src/today`
Expected: PASS (all).

- [ ] **Step 8: Commit**

```bash
git add src/composables/useToday.ts
git commit -m "feat: useToday — value pools, safe drops, normalized scores; gate on value baseline"
```

---

## Task 5: `TodayView.vue` — render drop line, 0–100, chips

**Files:**
- Modify: `src/views/TodayView.vue`

Read the current template (hero, open-slots, streaming, upgrade sections) first. The value shown was `board.hero.value` / `p.value`; it becomes `p.score`, the bar is driven by `score`, and each free-agent row gains a drop line + chips.

- [ ] **Step 1: Add view helpers.** In `<script setup>`, after the existing `bar` function, add:

```ts
const scoreBar = (score: number) => bar(Math.round((Math.max(0, Math.min(100, score)) / 100) * 6))

function dropLabel(play: ScoredPlay): string | null {
  if (play.noCleanDrop) return 'no clean drop — you’d be cutting into value'
  if (play.drop) return `drop ${play.drop.name} (${play.drop.reason})`
  return null
}
```

- [ ] **Step 2: Hero — score, score-bar, chips, drop line.** In the hero `<section v-if="board.hero">`: replace the bar block `<div class="mt-2 flex items-center gap-2 font-mono text-sm text-primary"> <span>{{ bar(board.hero.bucket) }}</span> </div>` and the following one-day `<p>` with:

```html
              <div class="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm text-primary">
                <span>{{ scoreBar(board.hero.score) }}</span>
                <span v-for="c in board.hero.helpsCats" :key="c"
                  class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">{{ c }}</span>
              </div>
              <p v-if="dropLabel(board.hero)" class="mt-2 font-mono text-[11px] text-dark-textMuted">
                → add {{ board.hero.name }} · {{ dropLabel(board.hero) }}
              </p>
              <p v-else-if="board.hero.oneDay" class="mt-2 font-mono text-[10px] text-dark-textMuted">
                one-day stream · drop tomorrow
              </p>
```

And change the big number from value to score:

```html
              <div class="font-display text-2xl font-bold text-primary tabular-nums">{{ board.hero.score }}</div>
```

- [ ] **Step 3: Streaming rows — score + chips + drop line.** In the streaming `<section>`, replace the row block (`<div v-for="p in board.streamers" ...>` through its closing `</div>`) with:

```html
          <div v-for="p in board.streamers" :key="p.playerKey" class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-dark-text">{{ p.name }}</span>
                  <span class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
                    {{ p.team }} · {{ p.position }}
                  </span>
                  <span v-for="c in p.helpsCats" :key="c"
                    class="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">{{ c }}</span>
                </div>
                <div class="mt-0.5 font-mono text-[10px] text-dark-textMuted">{{ p.detail }}</div>
              </div>
              <span class="shrink-0 font-mono text-sm text-primary">{{ scoreBar(p.score) }}</span>
              <span class="shrink-0 font-mono text-sm font-bold text-primary tabular-nums">{{ p.score }}</span>
              <router-link to="/players"
                class="shrink-0 font-mono text-[10px] text-dark-textMuted underline-offset-2 hover:text-dark-text hover:underline">→ Wire</router-link>
            </div>
            <p v-if="dropLabel(p)" class="mt-1.5 font-mono text-[11px] text-dark-textMuted">
              → add {{ p.name }} · {{ dropLabel(p) }}
            </p>
          </div>
```

- [ ] **Step 4: Upgrade rows — score + chips + drop line.** In the "Upgrade today" `<section>`, in the `<div v-for="p in board.upgrades" ...>` block: change `{{ bar(p.bucket) }}` → `{{ scoreBar(p.score) }}` and `{{ p.value }}` → `{{ p.score }}`; add the `helpsCats` chips right after the `{{ p.team }} · {{ p.position }}` span using the same chip markup as Step 3; and add a drop line as the last child of the row's outer `<div>`:

```html
            <p v-if="dropLabel(p)" class="mt-1.5 font-mono text-[11px] text-dark-textMuted">
              → add {{ p.name }} · {{ dropLabel(p) }}
            </p>
```

(Leave the `sitAlerts` rows unchanged — they're bench-your-guy alerts, not adds, so no drop line and they keep their red styling.)

- [ ] **Step 5: Open-slot fill rows — score bar + drop line.** In the "Your open slots" section, change the fill's `{{ bar(slot.fill.bucket) }}` to `{{ scoreBar(slot.fill.score) }}`, and add a drop line under the fill when it's a free-agent add:

```html
              <p v-if="slot.fill.kind !== 'startSit' && dropLabel(slot.fill)" class="mt-1 pl-[4.5rem] font-mono text-[11px] text-dark-textMuted">
                · {{ dropLabel(slot.fill) }}
              </p>
```

- [ ] **Step 6: Type-check + build.**

Run: `npm run type-check 2>&1 | grep -iE "TodayView"` → expected: no output.
Run: `npm run build 2>&1 | tail -3` → expected: `✓ built`.

- [ ] **Step 7: Commit**

```bash
git add src/views/TodayView.vue
git commit -m "feat: Today view — render add/drop moves, 0-100 score, cat chips"
```

---

## Task 6: Full verification

- [ ] **Step 1: Full test suite.**

Run: `npm test`
Expected: all pass (existing Today tests + new `safeDrop` (5) + `normalizeValue` (3) + the extended `todayBoard` test).

- [ ] **Step 2: Type-check + build clean.**

Run: `npm run type-check && npm run build 2>&1 | tail -3`
Expected: no type errors; `✓ built`.

- [ ] **Step 3: Manual smoke (user — the two category leagues).**
  - **ESPN category + Yahoo category:** each free-agent stream/upgrade now reads `→ add <FA> · drop <Body> (off today | IL | benched)`, or `→ add <FA> · no clean drop — you'd be cutting into value` when the roster has no expendable body.
  - The number on every play is now **0–100** with a proportional bar and `helps <CAT>` chips; the hero is the highest-scored move and a strong bat can top a mid arm (no longer always a pitcher).
  - The dropped body is never someone in today's active lineup, and never a bench hitter whose team plays today.
  - No "you're set" flash and no drop-less flash (the value-baseline gate holds the loading state).
  - **Points leagues** unchanged (still resolve to loading→empty; out of scope).
- [ ] **Step 4:** commit any smoke fix.

## Self-Review

- **Spec coverage:** safe drop (Task 1) + wire-relative replacement + droppable-today set + exclusions (Task 4 Step 2) + honest "no clean drop"; normalized 0–100 + chips (Tasks 2–3, 4 Step 3, 5); minimal 4-section view (Task 5); value-baseline loading gate (Task 4 Step 5); deferred items untouched. All spec sections map to a task.
- **Type consistency:** `SafeDrop`/`DroppableBody` defined in `safeDrop.ts` (Task 1), imported by `todayBoard.ts` (Task 2) and `useToday.ts` (Task 4); `ScoredPlay` gains `side/score/helpsCats/drop/noCleanDrop` in Task 2, and every producer (Task 4 Step 3) and consumer (Task 5) uses those names; `normalizeMoves`/`pickSafeDrop` signatures match their call sites.
- **Ordering:** safeDrop → todayBoard type → normalizeValue → useToday → view; Tasks 2–3 leave a transient `useToday` type error (flagged), resolved in Task 4.
- **Empty-wire correction:** implemented conservatively (-Infinity → no clean drop), overriding the spec's contradictory prose; spec prose corrected alongside.
- **YAGNI:** no constraints, points path, board reorg, or slot-feasibility — all deferred and called out as guardrails.
