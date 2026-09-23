# Rankings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the rest-of-season board off The Wire into its own free, publicly reachable Rankings page, leaving the Wire to answer only "what can I do today".

**Architecture:** The board assembly already exists inside `buildFootballWire`. Task 1 lifts it into a pure `buildRankingsBoard` both surfaces call, so they cannot drift. Task 2 unpins `useFootballVor` from the league store so a league-less caller can reuse the whole projection pipeline unchanged. Tasks 3–4 build the public data path and the shared board component. Tasks 5–7 stand up the page, narrow the Wire, and fix the nav.

**Tech Stack:** Vue 3 (`<script setup>`, no auto-import), TypeScript, Pinia, Vitest, Tailwind (dark-* / primary design tokens).

**Spec:** `docs/superpowers/specs/2026-09-23-rankings-page-design.md`

## Global Constraints

- **Test command:** `npx vitest run <path>` for one file, `npm test` for all. Baseline before this plan: **1941 passing, 210 files**. Never finish a task with fewer passing.
- **Type errors are NOT zero.** `npx vue-tsc --noEmit` reports a **1451-error baseline** from pre-existing code. The rule is that your change must not RAISE that count. Use the repo's existing escape hatch `(import.meta as any).env?.DEV` rather than `import.meta.env.DEV`.
- **Vue has no auto-import here.** Every `ref`, `computed`, `watch`, component and helper used in a template or script MUST have an explicit `import`. A green `npm run build` does NOT catch a missing one — it crashes at runtime. Verify imports by eye before committing any `.vue` file.
- **`bg-primary/NN` renders as invalid CSS** in this repo — the `--primary` CSS var has no alpha slot. Existing board markup uses `bg-primary/20`; leave those exactly as they are when moving markup (behaviour-preserving move), and do not introduce new ones.
- **Scoring for the public board:** `defaultWeights('football')` from `@/myteam/pointsScoring` — the engine's existing default, which is **full PPR** (`rec: 1`). Do not add a new half-PPR constant.
- **Public board league shape:** `DEFAULT_NFL_SLOTS` from `@/trades/rosterSlots` and `teams: 12`.
- **zsh:** write any throwaway script to the scratchpad directory, not inline, if it contains `!`.
- **Commit after every task.** Commit messages end with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: Extract `buildRankingsBoard`

The board assembly (group by position → sort by VOR → tier → build the cross-position ALL column) is currently inline in `buildFootballWire`. The Rankings page needs exactly this and none of the waiver machinery around it. Lifting it out is what keeps the two boards from disagreeing.

**Files:**
- Modify: `src/football/footballWire.ts`
- Test: `src/football/__tests__/footballWire.test.ts`

**Interfaces:**
- Consumes: `BoardRow`, `indifferenceTiers`, `OVERALL_POSITIONS`, `normPos` (all already in `footballWire.ts`).
- Produces:
  ```ts
  export interface BoardEntryInput {
    playerKey: string
    name: string
    position: string
    team?: string
    headshot?: string
    vorRos: number
    owned: boolean
    free: boolean
    unprojected?: boolean
    ownerName?: string
    bye?: boolean
  }
  export function buildRankingsBoard(input: {
    entries: BoardEntryInput[]
    positions: string[]
    weeksLeft: number
  }): Record<string, BoardRow[]>
  ```

- [ ] **Step 1: Write the failing test**

Append the `describe` block below to `src/football/__tests__/footballWire.test.ts`, and add
`buildRankingsBoard` to that file's EXISTING import from `'../footballWire'` at the top rather
than adding a second import statement at the end.

```ts
// add buildRankingsBoard to the existing top-of-file import from '../footballWire'

/*
 * The board assembly is the thing both surfaces share, so it is tested as its own
 * unit rather than only through the Wire that used to own it.
 */
describe('buildRankingsBoard', () => {
  const entry = (playerKey: string, position: string, vorRos: number) => ({
    playerKey, name: playerKey, position, vorRos, owned: false, free: true,
  })

  it('groups by position and ranks each column by rest-of-season value', () => {
    const board = buildRankingsBoard({
      entries: [entry('rb2', 'RB', 10), entry('wr1', 'WR', 50), entry('rb1', 'RB', 40)],
      positions: ['RB', 'WR'],
      weeksLeft: 10,
    })
    expect(board.RB.map((r) => r.playerKey)).toEqual(['rb1', 'rb2'])
    expect(board.WR.map((r) => r.playerKey)).toEqual(['wr1'])
  })

  it('omits a position with nobody in it rather than emitting an empty column', () => {
    const board = buildRankingsBoard({
      entries: [entry('rb1', 'RB', 40)],
      positions: ['RB', 'TE'],
      weeksLeft: 10,
    })
    expect(board.TE).toBeUndefined()
  })

  /* A defence's position arrives spelled "D/ST" on ESPN, and this used to split on the
     slash for multi-eligible players — turning every defence into "D". */
  it('folds a slash-spelled defence into DEF', () => {
    const board = buildRankingsBoard({
      entries: [entry('sf', 'D/ST', 5)],
      positions: ['DEF'],
      weeksLeft: 10,
    })
    expect(board.DEF.map((r) => r.playerKey)).toEqual(['sf'])
  })

  /* Kickers and defences are deliberately absent from the overall list: every kicker
     projects to about replacement level, which on a VOR axis is dead centre. */
  it('builds one cross-position board of skill positions only', () => {
    const board = buildRankingsBoard({
      entries: [entry('qb1', 'QB', 30), entry('k1', 'K', 31), entry('rb1', 'RB', 40)],
      positions: ['QB', 'RB', 'K'],
      weeksLeft: 10,
    })
    expect(board.ALL.map((r) => r.playerKey)).toEqual(['rb1', 'qb1'])
  })

  /* A player's tier among every startable body is a different fact from his tier among
     receivers, and the rows are shared objects — so ALL must re-tier rather than inherit. */
  it('re-tiers the overall board instead of inheriting positional tiers', () => {
    const board = buildRankingsBoard({
      entries: [entry('qb1', 'QB', 100), entry('rb1', 'RB', 100), entry('rb2', 'RB', 50)],
      positions: ['QB', 'RB'],
      weeksLeft: 10,
    })
    // rb1 leads RB at tier 1; in ALL it shares tier 1 with qb1 and rb2 still falls away.
    expect(board.RB.find((r) => r.playerKey === 'rb2')!.tier).toBe(2)
    expect(board.ALL.find((r) => r.playerKey === 'qb1')!.tier).toBe(1)
    expect(board.ALL.find((r) => r.playerKey === 'rb2')!.tier).toBe(2)
  })

  it('marks the first row of each new tier with the size of the drop', () => {
    const board = buildRankingsBoard({
      entries: [entry('rb1', 'RB', 100), entry('rb2', 'RB', 50)],
      positions: ['RB'],
      weeksLeft: 10,
    })
    const [first, second] = board.RB
    expect(first.tierBreak).toBeUndefined()
    expect(second.tierBreak).toBe(true)
    expect(second.tierDrop).toBe(50)
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/football/__tests__/footballWire.test.ts`
Expected: FAIL — `buildRankingsBoard is not a function` / no matching export.

- [ ] **Step 3: Add the function**

In `src/football/footballWire.ts`, directly **after** the `tierInPlace` function and **before** `buildFootballWire`, add:

```ts
/**
 * A player and his rest-of-season value, before anything is grouped or tiered.
 *
 * Deliberately says nothing about where the player came from. The Wire joins a league roster
 * to its free-agent pool; the public Rankings page has neither and joins the whole NFL. Both
 * arrive here as the same row, which is the only reason the two boards can be trusted to agree.
 */
export interface BoardEntryInput {
  playerKey: string
  name: string
  position: string
  team?: string
  headshot?: string
  vorRos: number
  owned: boolean
  free: boolean
  unprojected?: boolean
  ownerName?: string
  bye?: boolean
}

/**
 * Group, rank and tier a set of players into the per-position columns and the overall board.
 *
 * This is the whole ranked list, and it is the ONLY copy of it. It used to live inside
 * buildFootballWire, where a second surface wanting the same board would have had to
 * reimplement the tier rule, the cross-position fold and the K/DEF exclusion — three chances
 * for two pages to tell a reader different things about the same player.
 */
export function buildRankingsBoard(input: {
  entries: BoardEntryInput[]
  positions: string[]
  weeksLeft: number
}): Record<string, BoardRow[]> {
  const { entries, positions, weeksLeft } = input
  const board: Record<string, BoardRow[]> = {}
  for (const pos of positions) {
    const rows: BoardRow[] = entries
      .filter((e) => normPos(e.position) === pos)
      .map((e) => ({ ...e, position: pos, tier: 0 }))
    if (!rows.length) continue
    rows.sort((a, b) => b.vorRos - a.vorRos)
    tierInPlace(rows, weeksLeft)
    board[pos] = rows
  }

  const all: BoardRow[] = Object.entries(board)
    .filter(([pos]) => OVERALL_POSITIONS.has(pos))
    .flatMap(([, rows]) => rows)
    .sort((a, b) => b.vorRos - a.vorRos)
  if (all.length) {
    /* Re-tiered on its own, never inherited. A player's tier among ALL startable bodies is a
       different fact from his tier among receivers, and the rows above are shared objects. */
    const rows: BoardRow[] = all.map((r) => ({ ...r, tier: 0, tierBreak: undefined, tierDrop: undefined }))
    tierInPlace(rows, weeksLeft)
    board.ALL = rows
  }
  return board
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/football/__tests__/footballWire.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Make `buildFootballWire` call it**

In `src/football/footballWire.ts`, replace the whole block that begins with the comment `// Full board: rostered + FA per position, VOR-ranked, owned/free flagged, tiered.` and ends with `board.ALL = rows\n  }` — everything from `const board: Record<string, BoardRow[]> = {}` down to the closing brace before `return { bestAvailable, upgrades, thisWeek, board }` — with:

```ts
  const boardEntries: BoardEntryInput[] = []
  for (const p of pool) {
    const pv = vorByKey[p.playerKey]
    boardEntries.push({ playerKey: p.playerKey, name: p.name, position: p.position, team: p.proTeam, headshot: p.headshot, vorRos: pv?.vorRos ?? 0, owned: p.teamKey === myTeamKey, unprojected: !pv, free: false, bye: onBye(p.proTeam), ownerName: p.teamKey === myTeamKey ? '' : (teamNames?.[p.teamKey] ?? '') })
  }
  for (const fa of freeAgents) {
    const v = vorByKey[faKey(fa)]
    if (!v) continue
    boardEntries.push({ playerKey: faKey(fa), name: fa.name, position: fa.position, team: fa.team, headshot: fa.headshot, vorRos: v.vorRos, owned: false, free: true, bye: onBye(fa.team) })
  }
  const board = buildRankingsBoard({
    entries: boardEntries,
    positions: BOARD_POSITIONS.filter((p) => startable.has(p)),
    weeksLeft,
  })
```

Note the two behaviour-preserving details: pool rows pass `p.position` (raw) rather than the loop's already-normalised `pos`, because `buildRankingsBoard` normalises internally; and the `if (!entries.length) continue` guard is now the `if (!rows.length) continue` inside `buildRankingsBoard`.

- [ ] **Step 6: Run the whole football suite**

Run: `npx vitest run src/football src/composables/__tests__/useFootballWire.test.ts`
Expected: PASS. If `footballWire.test.ts` had board assertions, they must still pass untouched — that is the proof this was a move and not a rewrite.

- [ ] **Step 7: Commit**

```bash
git add src/football/footballWire.ts src/football/__tests__/footballWire.test.ts
git commit -m "$(cat <<'EOF'
wire: lift the board assembly out into buildRankingsBoard

The ranked list, its tier cuts and the cross-position fold were inline
in buildFootballWire. A second surface wanting the same board would
have reimplemented all three, which is three chances for two pages to
disagree about one player.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Let `useFootballVor` run without a league

`useFootballVor` decides whether player keys are Sleeper ids by reading `leagueStore.activePlatform === 'sleeper'`. The public board has no active league but its keys ARE Sleeper ids, and the distinction matters: Sleeper files team defences with no `full_name`, so name matching silently drops all 32.

**Files:**
- Modify: `src/composables/useFootballVor.ts:36-51` (the `inputs` signature and `keysAreSleeperIds`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `useFootballVor` gains an optional input `keysAreSleeperIds?: Ref<boolean>`. Absent, it behaves exactly as before.

- [ ] **Step 1: Add the optional override**

In `src/composables/useFootballVor.ts`, add to the `inputs` object type (after `weeklyHorizon?: number`):

```ts
  /**
   * Whether `playerKey` is already a Sleeper player id.
   *
   * Normally answered by the active league's platform. The public rankings board has no
   * active league and builds its pool straight from Sleeper's player map, so it says so
   * outright rather than being told "no" by a store that has nothing to say.
   */
  keysAreSleeperIds?: Ref<boolean>
```

Then replace the `keysAreSleeperIds` computed:

```ts
  const keysAreSleeperIds = computed(
    () => inputs.keysAreSleeperIds?.value ?? leagueStore.activePlatform === 'sleeper',
  )
```

- [ ] **Step 2: Verify nothing regressed**

Run: `npm test`
Expected: 1941 passing, 210 files — unchanged. This is an additive optional input with a default that reproduces the old expression exactly.

- [ ] **Step 3: Verify the type count did not rise**

Run: `npx vue-tsc --noEmit 2>&1 | tail -3`
Expected: still 1451 errors.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useFootballVor.ts
git commit -m "$(cat <<'EOF'
vor: let a caller state that its keys are Sleeper ids

The public board has no active league, so the store cannot answer the
question — and answering "no" drops all 32 defences, which Sleeper
files with no full_name to match on.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The league-free player pool

The public board ranks the whole NFL rather than one league's roster plus its wire. This is the pure function that turns Sleeper's player map into a pool.

**Files:**
- Create: `src/football/publicPool.ts`
- Test: `src/football/__tests__/publicPool.test.ts`

**Interfaces:**
- Consumes: `PointsPoolPlayer` from `@/myteam/pointsTeam`.
- Produces:
  ```ts
  export const PUBLIC_POSITIONS: readonly string[] // ['QB','RB','WR','TE']
  export function publicNflPool(players: Record<string, any>): PointsPoolPlayer[]
  ```

- [ ] **Step 1: Write the failing test**

Create `src/football/__tests__/publicPool.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { publicNflPool } from '../publicPool'

const player = (over: Record<string, any> = {}) => ({
  full_name: 'Some Body', position: 'RB', team: 'SF', active: true, ...over,
})

describe('publicNflPool', () => {
  it('keys each player by his Sleeper id', () => {
    const pool = publicNflPool({ '4034': player({ full_name: 'Christian McCaffrey' }) })
    expect(pool).toHaveLength(1)
    expect(pool[0].playerKey).toBe('4034')
    expect(pool[0].name).toBe('Christian McCaffrey')
  })

  /* Sleeper's player map is the whole universe — retired players, practice-squad bodies and
     every position in the sport. A rankings board of 11,000 rows is not a rankings board. */
  it('keeps only the four skill positions', () => {
    const pool = publicNflPool({
      a: player({ position: 'QB' }), b: player({ position: 'RB' }),
      c: player({ position: 'WR' }), d: player({ position: 'TE' }),
      e: player({ position: 'K' }), f: player({ position: 'DEF' }),
      g: player({ position: 'LB' }),
    })
    expect(pool.map((p) => p.position).sort()).toEqual(['QB', 'RB', 'TE', 'WR'])
  })

  it('drops inactive players', () => {
    const pool = publicNflPool({ a: player({ active: false }) })
    expect(pool).toHaveLength(0)
  })

  /* A free agent with no NFL team has no schedule, so no bye and no games remaining —
     every downstream number about him would be a guess dressed as a projection. */
  it('drops players with no NFL team', () => {
    const pool = publicNflPool({ a: player({ team: null }) })
    expect(pool).toHaveLength(0)
  })

  it('drops a player with no name to show', () => {
    const pool = publicNflPool({ a: player({ full_name: '' }) })
    expect(pool).toHaveLength(0)
  })

  it('upper-cases the pro team so the schedule join matches', () => {
    const pool = publicNflPool({ a: player({ team: 'sf' }) })
    expect(pool[0].proTeam).toBe('SF')
  })

  /* Nobody owns anybody on a public board. teamKey must not collide with a real roster id. */
  it('gives every player the same empty owner', () => {
    const pool = publicNflPool({ a: player(), b: player() })
    expect(pool.every((p) => p.teamKey === '')).toBe(true)
  })

  it('points at the Sleeper thumbnail for the id', () => {
    const pool = publicNflPool({ '4034': player() })
    expect(pool[0].headshot).toBe('https://sleepercdn.com/content/nfl/players/thumb/4034.jpg')
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/football/__tests__/publicPool.test.ts`
Expected: FAIL — cannot find module `../publicPool`.

- [ ] **Step 3: Write the implementation**

Create `src/football/publicPool.ts`:

```ts
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'

/**
 * What a public board ranks.
 *
 * Kickers and team defences are absent for the same reason they are absent from the overall
 * Wire board: every kicker projects within a point or two of every other, so the position
 * lands at replacement level and sorts into the middle of a value-ranked list above real
 * players carrying negative value. A reader with no league has no kicker slot to fill either.
 */
export const PUBLIC_POSITIONS: readonly string[] = ['QB', 'RB', 'WR', 'TE']

const POSITIONS = new Set(PUBLIC_POSITIONS)

/**
 * Every rankable NFL player, from Sleeper's player map, owned by nobody.
 *
 * The league-backed boards build their pool from a roster and a free-agent list, both of which
 * describe one league. A public board has neither, so it starts from the league the players
 * actually play in. Ownership is the thing it cannot know and does not claim: `teamKey` is
 * empty for everyone, which reads downstream as "held by no team in this league" — true, since
 * there is no league.
 */
export function publicNflPool(players: Record<string, any>): PointsPoolPlayer[] {
  const out: PointsPoolPlayer[] = []
  for (const [pid, p] of Object.entries(players)) {
    if (!p || p.active === false) continue
    const position = String(p.position ?? p.fantasy_positions?.[0] ?? '').toUpperCase()
    if (!POSITIONS.has(position)) continue
    /* No NFL team means no schedule: no bye, no games remaining, and every rest-of-season
       number about him would be a guess wearing a projection's clothes. */
    const proTeam = String(p.team ?? '').toUpperCase()
    if (!proTeam) continue
    const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    if (!name) continue
    out.push({
      playerKey: pid,
      name,
      position,
      eligiblePositions: p.fantasy_positions?.length ? p.fantasy_positions : [position],
      teamKey: '',
      proTeam,
      headshot: `https://sleepercdn.com/content/nfl/players/thumb/${pid}.jpg`,
      status: p.injury_status ?? '',
    })
  }
  return out
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/football/__tests__/publicPool.test.ts`
Expected: PASS, all eight cases.

- [ ] **Step 5: Commit**

```bash
git add src/football/publicPool.ts src/football/__tests__/publicPool.test.ts
git commit -m "$(cat <<'EOF'
rankings: the player pool for a board with no league

Starts from the league the players actually play in rather than from
one fantasy roster. Ownership is the thing it cannot know and does not
claim.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The public rankings composable

Wires Task 3's pool through the existing VOR pipeline and Task 1's board builder. No new projection maths — that is the point.

**Files:**
- Create: `src/composables/usePublicRankings.ts`
- Test: `src/composables/__tests__/usePublicRankings.test.ts`

**Interfaces:**
- Consumes: `publicNflPool`, `PUBLIC_POSITIONS` (Task 3); `useFootballVor` with `keysAreSleeperIds` (Task 2); `buildRankingsBoard`, `BoardEntryInput`, `BoardRow` (Task 1).
- Produces:
  ```ts
  export const PUBLIC_TEAMS = 12
  export function publicWeeksLeft(currentWeek: number): number
  export function usePublicRankings(): {
    board: ComputedRef<Record<string, BoardRow[]>>
    positions: ComputedRef<string[]>
    loading: ComputedRef<boolean>
    ready: ComputedRef<boolean>
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/usePublicRankings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { publicWeeksLeft } from '../usePublicRankings'

/*
 * Tier width is stated in points per WEEK, so the horizon converts a rest-of-season value
 * into it. A wrong horizon silently produces plausible, wrong tiers — which is why this is a
 * named function with its own tests rather than an expression inside a component.
 */
describe('publicWeeksLeft', () => {
  it('counts the current week as still to play', () => {
    expect(publicWeeksLeft(1)).toBe(17)
    expect(publicWeeksLeft(3)).toBe(15)
  })

  it('is one on the last week of the regular season', () => {
    expect(publicWeeksLeft(17)).toBe(1)
  })

  /* Past the regular season the horizon floors at one rather than going to zero or negative
     — a zero would divide the tier rule by nothing and a negative would invert it. */
  it('never drops below one', () => {
    expect(publicWeeksLeft(18)).toBe(1)
    expect(publicWeeksLeft(30)).toBe(1)
  })

  /* Sleeper reports week 0 in the offseason. The whole season is still ahead then, so that
     is what the horizon says — not "one week left", which would draw tiers seventeen times
     too narrow and call half the league interchangeable. Garbage input reads the same way. */
  it('reads the offseason as a whole season ahead', () => {
    expect(publicWeeksLeft(0)).toBe(17)
    expect(publicWeeksLeft(-4)).toBe(17)
    expect(publicWeeksLeft(NaN)).toBe(17)
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/composables/__tests__/usePublicRankings.test.ts`
Expected: FAIL — cannot find module `../usePublicRankings`.

- [ ] **Step 3: Write the composable**

Create `src/composables/usePublicRankings.ts`:

```ts
import { computed, ref, type ComputedRef } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { useFootballVor } from './useFootballVor'
import { publicNflPool, PUBLIC_POSITIONS } from '@/football/publicPool'
import { buildRankingsBoard, type BoardEntryInput, type BoardRow } from '@/football/footballWire'
import { DEFAULT_NFL_SLOTS } from '@/trades/rosterSlots'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

/** A twelve-team league, which is what replacement level is calibrated against by default. */
export const PUBLIC_TEAMS = 12

/** The last week of the NFL regular season. Mirrors PointsWireView's NFL_LAST_WEEK. */
const NFL_LAST_WEEK = 17

/**
 * Weeks still to play.
 *
 * The tier rule measures indifference in points per WEEK, so this is what converts a
 * rest-of-season value into it — which makes a wrong answer here invisible rather than loud:
 * it produces plausible tiers that are the wrong width.
 *
 * Both ends are clamped, and they clamp to opposite answers. Past the regular season there is
 * one week left rather than zero, because zero divides the tier rule by nothing. Before it —
 * the offseason, where Sleeper reports week 0 — the whole season is still ahead, and saying
 * "one week left" there would draw every tier seventeen times too narrow and call half the
 * league interchangeable.
 */
export function publicWeeksLeft(currentWeek: number): number {
  const wk = Number(currentWeek)
  if (!Number.isFinite(wk) || wk < 1) return NFL_LAST_WEEK
  return Math.max(1, NFL_LAST_WEEK - wk + 1)
}

/**
 * The rest-of-season board for somebody with no league.
 *
 * Every number on it comes from the same pipeline the Wire runs — the same projections, the
 * same rest-of-season blend, the same replacement levels, the same tier rule. What differs is
 * only the inputs: the whole NFL instead of one roster plus one wire, and a default league
 * shape instead of a real one. Nothing about the ranking is a second, simpler version of the
 * real thing, because a public board that disagreed with the signed-in one would be worse than
 * no public board at all.
 */
export function usePublicRankings(): {
  board: ComputedRef<Record<string, BoardRow[]>>
  positions: ComputedRef<string[]>
  loading: ComputedRef<boolean>
  ready: ComputedRef<boolean>
} {
  const pool = ref<PointsPoolPlayer[]>([])
  const freeAgents = ref<AvailablePlayer[]>([])
  const season = ref('')
  const currentWeek = ref(1)
  const enabled = ref(false)
  const slots = ref<Record<string, number>>({ ...DEFAULT_NFL_SLOTS })
  const teams = ref(PUBLIC_TEAMS)
  const keysAreSleeperIds = ref(true)
  const loadingPool = ref(true)

  const { vorByKey, loading: loadingVor } = useFootballVor({
    pool, freeAgents, slots, teams, season, enabled, keysAreSleeperIds,
  })

  async function loadPool() {
    loadingPool.value = true
    try {
      const [state, players] = await Promise.all([
        sleeperService.getNflState(),
        sleeperService.getPlayers(),
      ])
      season.value = String(state.season ?? '')
      currentWeek.value = Number(state.week) || 1
      pool.value = publicNflPool(players as Record<string, any>)
      enabled.value = pool.value.length > 0
    } catch (e) {
      console.error('[usePublicRankings] pool load failed', e)
      pool.value = []
      enabled.value = false
    } finally {
      loadingPool.value = false
    }
  }
  void loadPool()

  const board = computed<Record<string, BoardRow[]>>(() => {
    if (!Object.keys(vorByKey.value).length) return {}
    const entries: BoardEntryInput[] = []
    for (const p of pool.value) {
      const v = vorByKey.value[p.playerKey]
      /* No projection, no row. On the Wire an unprojected player is still shown, because he
         is on somebody's roster and his absence from the board would be its own lie. Nobody
         rosters anybody here, so a player we cannot price simply has nothing to say. */
      if (!v) continue
      entries.push({
        playerKey: p.playerKey,
        name: p.name,
        position: p.position,
        team: p.proTeam,
        headshot: p.headshot,
        vorRos: v.vorRos,
        owned: false,
        free: false,
      })
    }
    return buildRankingsBoard({
      entries,
      positions: [...PUBLIC_POSITIONS],
      weeksLeft: publicWeeksLeft(currentWeek.value),
    })
  })

  const positions = computed(() => {
    const withRows = PUBLIC_POSITIONS.filter((p) => board.value[p]?.length)
    return board.value.ALL?.length ? ['ALL', ...withRows] : [...withRows]
  })

  const loading = computed(() => loadingPool.value || loadingVor.value)
  const ready = computed(() => !!board.value.ALL?.length)

  return { board, positions, loading, ready }
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/composables/__tests__/usePublicRankings.test.ts`
Expected: PASS, three cases.

- [ ] **Step 5: Check imports by eye**

This repo has no Vue auto-import and a green build will not catch a missing one. Confirm every identifier used in `usePublicRankings.ts` appears in an `import` at the top: `computed`, `ref`, `ComputedRef`, `sleeperService`, `useFootballVor`, `publicNflPool`, `PUBLIC_POSITIONS`, `buildRankingsBoard`, `BoardEntryInput`, `BoardRow`, `DEFAULT_NFL_SLOTS`, `PointsPoolPlayer`, `AvailablePlayer`. There must be no `watch` import — the composable does not use one.

- [ ] **Step 6: Commit**

```bash
git add src/composables/usePublicRankings.ts src/composables/__tests__/usePublicRankings.test.ts
git commit -m "$(cat <<'EOF'
rankings: the board for somebody with no league

Same projections, same blend, same replacement levels, same tier rule
as the Wire — only the inputs differ. A public board that disagreed
with the signed-in one would be worse than no public board.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The Rankings page

**Files:**
- Create: `src/views/RankingsView.vue`
- Modify: `src/router/index.ts` (add the route after the `/players` route at line 151-155)

**Interfaces:**
- Consumes: `usePublicRankings` (Task 4), `BoardRow` (Task 1).
- Produces: route `/rankings`, name `rankings`, `meta: { public: true, publicLayout: 'marketing' }`.

- [ ] **Step 1: Write the view**

Create `src/views/RankingsView.vue`:

```vue
<!--
  Rest-of-season rankings, free and open.

  WHY THIS IS NOT BEHIND THE PASS. A ranked list tells you who is good. It does not tell you
  who you can HAVE, what an add costs, or who to cut — and that is the entire waiver call,
  which is what the Season Pass sells. Strip ownership out of the board and it stops being a
  transaction tool. Availability, add cost and this week's projections stay on The Wire.

  The other half of the argument is that rankings are a commodity: every competitor publishes
  them, so almost nothing was protected by hiding ours, while every social post we publish was
  landing on a page that asked for a signup before showing anything.
-->
<template>
  <div class="min-h-screen bg-dark-bg px-4 py-8">
    <div class="mx-auto max-w-3xl">
      <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Rest of season</div>
      <h1 class="mt-2 font-display text-3xl font-extrabold tracking-tight text-dark-text">
        Football rankings
      </h1>
      <p class="mt-2 max-w-xl text-sm leading-relaxed text-dark-textSecondary">
        Every player ranked by what he is worth above a replacement body at his own position,
        for the rest of the season. Players inside a tier are within about a point a week of
        each other — close enough to be interchangeable.
      </p>

      <div v-if="loading" class="mt-8 font-mono text-xs text-dark-textMuted">Loading the board…</div>

      <div v-else-if="!ready" class="mt-8 rounded-xl border border-dark-border bg-dark-card p-4">
        <p class="text-sm text-dark-textSecondary">
          The projections feed is not answering right now, so there is no board to show. This is
          our end, not yours — try again shortly.
        </p>
      </div>

      <div v-else class="mt-6">
        <div class="mb-3 flex flex-wrap gap-1.5">
          <button
            v-for="pos in positions"
            :key="pos"
            class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
            :class="active === pos ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-dark-textMuted hover:text-dark-text'"
            @click="active = pos"
          >{{ pos }}</button>
        </div>

        <div class="rounded-xl border border-dark-border bg-dark-card p-4">
          <template v-for="row in visible" :key="'rk-' + row.playerKey">
            <div v-if="row.tierBreak" class="flex items-center gap-2 py-1.5">
              <span class="h-px flex-1 bg-dark-border"></span>
              <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">
                tier {{ row.tier }} &middot; &minus;{{ Math.round(row.tierDrop ?? 0) }} pts
              </span>
              <span class="h-px flex-1 bg-dark-border"></span>
            </div>
            <div class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm text-dark-text last:border-0">
              <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onImgErr"
                   class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
              <span class="min-w-0 flex-1 truncate">
                {{ row.name }}
                <span v-if="active === 'ALL'" class="ml-1 font-mono text-[10px] text-dark-textMuted/70">{{ row.position }}</span>
              </span>
              <span class="shrink-0 font-mono text-[10px] text-dark-textMuted/70">{{ row.team }}</span>
              <span class="w-10 shrink-0 text-right font-mono text-xs" :class="row.vorRos >= 0 ? '' : 'text-dark-textMuted'">
                {{ row.vorRos >= 0 ? '+' : '' }}{{ Math.round(row.vorRos) }}
              </span>
            </div>
          </template>

          <button
            v-if="!expanded && rows.length > visible.length"
            class="mt-3 w-full rounded-lg border border-dark-border bg-dark-bg/60 py-2 font-mono text-[11px] text-dark-textSecondary transition-colors hover:text-dark-text"
            @click="expanded = true"
          >Show all {{ rows.length }} {{ active }}</button>
        </div>

        <!--
          The signed-in board is the same board, rescoped to your league and with your roster
          marked — still free. What the pass buys is what you can DO about it, which is why the
          pitch names those three things instead of promising "more rankings".
        -->
        <div class="mt-4 rounded-xl border border-dark-border bg-dark-card p-4">
          <p class="text-sm text-dark-textSecondary">
            Connect a league and this board is rescoped to your scoring with your roster marked —
            free, no expiry.
            <RouterLink to="/connect" class="text-primary underline underline-offset-2">Connect a league</RouterLink>.
          </p>
          <p class="mt-2 text-xs text-dark-textMuted">
            Who's actually available, what an add costs you and this week's start/sit calls live
            on <RouterLink to="/players" class="underline underline-offset-2">The Wire</RouterLink>.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { usePublicRankings } from '@/composables/usePublicRankings'

const { board, positions, loading, ready } = usePublicRankings()

const active = ref('ALL')
const expanded = ref(false)

/* A new position starts at the top again — carrying an expanded state across positions means
   landing halfway down a list you just opened. */
watch(active, () => { expanded.value = false })

/* Whatever this board can show, in case ALL is empty because every skill position is. */
watch(positions, (available) => {
  if (available.length && !available.includes(active.value)) active.value = available[0]
})

const rows = computed(() => board.value[active.value] ?? [])
const DEPTH = 50
const visible = computed(() => (expanded.value ? rows.value : rows.value.slice(0, DEPTH)))

function onImgErr(e: Event) {
  const el = e.target as HTMLImageElement
  el.style.visibility = 'hidden'
}
</script>
```

- [ ] **Step 2: Add the route**

In `src/router/index.ts`, immediately after the `/players` route object (which ends at line 155 with `},`), insert:

```ts
    /* Rankings is PUBLIC. It is the page every tier card and movers post we publish should
       land on, and it was landing on a signup wall instead. What it shows — the ranked list
       and its tier cliffs — is a commodity every competitor publishes; what the pass sells is
       what you can do about it, which lives on The Wire. */
    {
      path: '/rankings',
      name: 'rankings',
      component: () => import('@/views/RankingsView.vue'),
      meta: { public: true, publicLayout: 'marketing' }
    },
```

- [ ] **Step 3: Verify imports by eye**

Confirm `RankingsView.vue`'s `<script setup>` imports everything its template and script use: `computed`, `ref`, `watch` from `vue`; `RouterLink` from `vue-router`; `usePublicRankings`. The template uses `RouterLink` twice — this repo does not auto-register it, so the import is load-bearing.

- [ ] **Step 4: Run the build and the suite**

Run: `npm run build && npm test`
Expected: build succeeds; 1941 + the new tests passing.

- [ ] **Step 5: Smoke it in the browser, signed out**

Run: `npm run dev`, then open `http://localhost:5173/rankings` in a private window (no session).
Verify, and report what you actually see: the board renders without a login prompt; the ALL column is skill positions only (no K, no DEF); tier lines appear between groups with a point drop; switching to RB re-renders from the top; "Show all" expands.

- [ ] **Step 6: Commit**

```bash
git add src/views/RankingsView.vue src/router/index.ts
git commit -m "$(cat <<'EOF'
rankings: a public page for the rest-of-season board

Every tier card and movers post we publish was landing on a signup
wall. The ranked list is a commodity; what the pass sells is what you
can do about it, and that stays on The Wire.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Narrow The Wire

The board leaves. What remains is four blocks answering one question: what can I do today.

**Files:**
- Modify: `src/views/PointsWireView.vue` (the `<!-- 4. FULL BOARD ... -->` section, roughly lines 864–1080, and the script that only served it)

- [ ] **Step 1: Replace the board section with a pointer**

In `src/views/PointsWireView.vue`, replace the entire `<section>` opened by `<!-- 4. FULL BOARD — every player by position, VOR-ranked, yours highlighted -->` — through its closing `</section>` — with:

```html
          <!--
            4. THE FULL BOARD MOVED TO /rankings.

            It was a reference work living on a transaction page. Every other block here is a
            player you can act on today — yours to drop, or a free agent to add — and the board
            was a league-wide ranked list including players nobody can have, which is a
            different job. It is free there, and open to people without an account.
          -->
          <section class="rounded-xl border border-dark-border bg-dark-card p-4">
            <RouterLink to="/rankings" class="flex w-full items-center justify-between">
              <span class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
                Full board
                <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
                  &middot; every player, ranked and tiered
                </span>
              </span>
              <span class="font-mono text-[11px] text-primary">Rankings &rarr;</span>
            </RouterLink>
          </section>
```

- [ ] **Step 2: Add the RouterLink import**

In `PointsWireView.vue`'s `<script setup>`, add `RouterLink` to the `vue-router` import (or add `import { RouterLink } from 'vue-router'` if there is none). Without it the section renders nothing and no build error is raised.

- [ ] **Step 3: Remove the script that only served the board**

Delete these, checking each for other uses with `grep -n '<name>' src/views/PointsWireView.vue` FIRST and keeping anything still referenced: `boardOpen`, `boardPos`, `boardExpanded`, `boardPositions`, `boardPositionsWithRows`, `sortedBoard`, `visibleBoard`, `FULL_DEPTH`, and the `BOARD_DEPTH` import from `@/football/footballWire`, plus the two `watch` calls on `boardPos` and `boardPositionsWithRows`.

Keep anything the remaining blocks still use — `difficulty`, `ppgByKey`, `dynasty`, `wireSort`, `seasonRankByKey`, `rankGap` and `lastRankedIndex` may all have other callers. Grep before deleting each one; leaving a used symbol deleted is a runtime crash a green build will not catch.

- [ ] **Step 4: Verify nothing dangles**

Run: `npx vue-tsc --noEmit 2>&1 | grep PointsWireView | head -20`
Expected: no NEW errors naming a symbol you deleted. Compare against the 1451 baseline with `npx vue-tsc --noEmit 2>&1 | tail -3`.

- [ ] **Step 5: Run the suite and smoke the page**

Run: `npm test`
Expected: 1941 + new tests passing.

Then `npm run dev`, open `http://localhost:5173/players` on a football Sleeper league, and verify: the four remaining blocks render, the "Rankings →" card navigates, and nothing on the page throws in the console. Report what the console actually says.

- [ ] **Step 6: Commit**

```bash
git add src/views/PointsWireView.vue
git commit -m "$(cat <<'EOF'
wire: the full board moves to Rankings

It was a reference work on a transaction page — a league-wide list
including players nobody can have, next to four blocks about what you
can do today. What remains is one question asked four ways.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Nav — Rankings in, Draft Room only while it matters

The nav is already sport- and platform-aware but not draft-state aware, so Draft Room sits second in week 3 for every Sleeper football league, a month after anyone drafted. Making it state-aware is also what keeps the bar from growing when Rankings arrives.

**Files:**
- Create: `src/lib/navTabs.ts`
- Test: `src/lib/__tests__/navTabs.test.ts`
- Modify: `src/App.vue:1361-1376` (the `tabs` computed) and its import block

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export function showsDraftTab(input: {
    sport?: string | null
    platform?: string | null
    leagueStatus?: string | null
  }): boolean
  ```

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/navTabs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { showsDraftTab } from '../navTabs'

/*
 * The nav was sport- and platform-aware but not time-aware, so Draft Room sat second in the
 * bar in week three for every Sleeper football league — a month after anybody drafted. There
 * is precedent for the fix in the same file: My Team and Matchup came off the tab bar with
 * their routes left live, and the post-draft retrospective already has a home in History.
 */
describe('showsDraftTab', () => {
  const sleeper = { sport: 'football', platform: 'sleeper' }

  it('shows the tab before the draft', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'pre_draft' })).toBe(true)
  })

  it('shows the tab while the draft is running', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'drafting' })).toBe(true)
  })

  it('takes the tab down once the season is under way', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'in_season' })).toBe(false)
  })

  it('takes the tab down for a finished season', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: 'complete' })).toBe(false)
  })

  /* The room reads live picks from Sleeper, so it only ever appeared where it works. That
     does not change. */
  it('never shows for another platform', () => {
    expect(showsDraftTab({ sport: 'football', platform: 'espn', leagueStatus: 'pre_draft' })).toBe(false)
  })

  it('never shows for another sport', () => {
    expect(showsDraftTab({ sport: 'hockey', platform: 'sleeper', leagueStatus: 'pre_draft' })).toBe(false)
  })

  /*
   * The status is missing for a beat while the league loads, and on any league whose status we
   * never learned. Showing the tab is the safe default: a needless tab during a draft week is
   * a smaller failure than a missing one, because somebody mid-draft cannot reach the room at
   * all — and the route stays live either way, so a bookmark still works.
   */
  it('shows the tab when the status is not known yet', () => {
    expect(showsDraftTab({ ...sleeper, leagueStatus: null })).toBe(true)
    expect(showsDraftTab({ ...sleeper, leagueStatus: '' })).toBe(true)
    expect(showsDraftTab(sleeper)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/lib/__tests__/navTabs.test.ts`
Expected: FAIL — cannot find module `../navTabs`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/navTabs.ts`:

```ts
/**
 * Whether the Draft Room belongs in the tab bar.
 *
 * The nav was already sport- and platform-aware — the room reads live picks from Sleeper, so
 * it only ever appeared where it works — but it had no sense of WHEN. That put it second in
 * the bar in week three of the season, above the pages a reader actually opens, for every
 * Sleeper football league.
 *
 * Draft state is per-sport, not global: a hockey draft happens in September and a basketball
 * one in October, so "the draft is over" can only be asked of one league at a time. The route
 * stays live regardless — this is the same move My Team and Matchup got, off the bar and still
 * reachable — and the post-draft retrospective already lives in History.
 */
const DRAFT_LIVE = new Set(['pre_draft', 'drafting'])

export function showsDraftTab(input: {
  sport?: string | null
  platform?: string | null
  leagueStatus?: string | null
}): boolean {
  if (input.sport !== 'football' || input.platform !== 'sleeper') return false
  const status = String(input.leagueStatus ?? '')
  /* Unknown reads as "show it". A needless tab in a draft week is a smaller failure than a
     missing one: somebody mid-draft would have no way into the room at all. */
  if (!status) return true
  return DRAFT_LIVE.has(status)
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/lib/__tests__/navTabs.test.ts`
Expected: PASS, eight cases.

- [ ] **Step 5: Wire it into the nav**

In `src/App.vue`, add to the import block:

```ts
import { showsDraftTab } from '@/lib/navTabs'
```

Then in the `tabs` computed at line 1361, replace:

```ts
  // Draft Room reads live picks from Sleeper, so it only appears where it works.
  ...(leagueStore.activeSport === 'football' && leagueStore.activePlatform === 'sleeper'
    ? [{ name: 'Draft Room', path: '/draft-room' }]
    : []),
```

with:

```ts
  /* Draft Room reads live picks from Sleeper, so it only appears where it works — and only
     while there is a draft to follow. See showsDraftTab for why it comes down afterwards. */
  ...(showsDraftTab({
    sport: leagueStore.activeSport,
    platform: leagueStore.activePlatform,
    leagueStatus: leagueStore.currentLeague?.status,
  })
    ? [{ name: 'Draft Room', path: '/draft-room' }]
    : []),
```

- [ ] **Step 6: Add Rankings to the bar**

In the same computed, replace the line `{ name: 'The Wire', path: '/players' },` with:

```ts
  /* Rankings sits beside the Wire because they are the two halves of one split: what is true,
     and what you can do about it. It takes the slot the Draft Room vacates in season, so the
     bar does not grow. */
  { name: 'Rankings', path: '/rankings' },
  { name: 'The Wire', path: '/players' },
```

- [ ] **Step 7: Verify**

Run: `npm test && npm run build`
Expected: all passing, build green.

Run: `npx vue-tsc --noEmit 2>&1 | tail -3` — expected still 1451.

Then `npm run dev` and check, reporting what you actually observe:
- A football Sleeper league mid-season: no Draft Room tab, Rankings present between This Week and The Wire.
- An ESPN or Yahoo football league: no Draft Room tab (unchanged), Rankings present.
- `http://localhost:5173/draft-room` typed directly still loads the room — the route is live, it is only off the bar.

- [ ] **Step 8: Commit**

```bash
git add src/lib/navTabs.ts src/lib/__tests__/navTabs.test.ts src/App.vue
git commit -m "$(cat <<'EOF'
nav: Draft Room only while there is a draft; Rankings in the bar

The nav knew the sport and the platform but not the time, so the room
sat second in week three for every Sleeper league. Draft state is
per-sport — hockey drafts in September, basketball in October — so it
is read per league. The route stays live, as My Team's and Matchup's
did, and the retrospective already lives in History.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## What this plan does NOT do

Recorded so the next reader does not mistake absence for oversight.

- **Availability badges on Rankings.** The spec puts FREE / ROSTERED behind the pass. The public board has no league, so there is nothing to badge; the signed-in rescoped board (below) is where that gate is written, and it is not built here.
- **The signed-in rescoped board.** Task 5's page always renders the public default (full PPR, `DEFAULT_NFL_SLOTS`, 12 teams) even for a signed-in user with a league. Rescoping it to the active league's scoring and marking the user's roster is a follow-up — it needs the league-backed VOR the Wire already computes, and folding both paths into one view is its own task.
- **Sports other than football.** `/rankings` is football-only. Basketball, baseball and hockey have no equivalent board built.
- **The D/ST projection join.** All 32 defences still read "no proj" on the Wire's DEF column. Unrelated to this split and still open.
- **Half-PPR.** The spec's open question asked half-PPR or full. This plan uses `defaultWeights('football')`, which is full PPR — the engine's existing default, so the public board and a signed-in default-scoring league agree. Our rest-of-season social cards are half-PPR, which now differs from the page they link to; that is a content decision, not a code one.
