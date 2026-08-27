# Local Draft Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a full draft inside the Draft Room against your real league, with no Sleeper draft — you confirm the seating, then tap players to make picks.

**Architecture:** Everything in the room derives from two refs, `picks` and `draftMeta`. Local mode supplies both from a locally-owned pick log rendered in Sleeper's own shape, so no downstream consumer — board, survival, tendencies, grid, roster, recap, replay, history — changes at all.

**Tech Stack:** Vue 3, TypeScript, Vitest. One file: `npx vitest run <path>`. Everything: `npx vitest run`. Build: `npm run build` (plain `vite build`, **no typecheck**); `npx vue-tsc --noEmit` is the separate typecheck and has pre-existing errors elsewhere in the tree.

## Global Constraints

- **No consumer of `picks` or `draftMeta` may change.** If a task finds itself editing the board, survival, tendencies, grid, roster, recap or replay to accommodate local mode, the synthetic shape is wrong — fix the shape, not the consumer.
- **`localDraftMeta` must supply all twelve fields the room reads**: `status`, `type`, `settings`, `settings.teams`, `settings.rounds`, `draft_id`, `slot_to_roster_id`, `draft_order`, `season`, `metadata`, `league_id`. `type` is read through a local alias in the `shape` computed, so a grep for `draftMeta.value?.` misses it — omitting it would silently make every draft a snake.
- **Seat arithmetic is not reimplemented.** `slotAtPick(shape, overall)` in `pickOrder.ts` already exists, is tested hard, and was corrected once. Call it.
- **A draft in progress must survive a page refresh.** That is the single most important property of the persistence layer.
- **With no local draft, behaviour is identical to today.** Every change is gated.
- Comment style in this codebase: explain WHY, and cite the concrete failure the rule prevents.

---

### Task 1: `localDraft` — the pure model

**Files:**
- Create: `src/draft/room/localDraft.ts`
- Test: `src/draft/room/__tests__/localDraft.test.ts`

**Interfaces:**
- Consumes: `slotAtPick(shape: DraftShape, overallPick: number): number` and `type DraftShape = { type: 'snake' | 'linear'; teams: number; rounds: number }` from `./pickOrder`.
- Produces:
  - `interface LocalPick { overall: number; playerKey: string; name: string; position: string; proTeam: string }`
  - `interface LocalDraft { leagueId: string; season: string; teams: number; rounds: number; type: 'snake' | 'linear'; slotToRosterId: Record<number, string>; mySlot: number; picks: LocalPick[]; startedAt: string; updatedAt: string }`
  - `blankLocalDraft(input: Omit<LocalDraft, 'picks' | 'startedAt' | 'updatedAt'>, now: string): LocalDraft`
  - `addLocalPick(d: LocalDraft, player: { playerKey: string; name: string; position: string; proTeam: string }, now: string): LocalDraft`
  - `undoLocalPick(d: LocalDraft, now: string): LocalDraft`
  - `localDraftMeta(d: LocalDraft): any`
  - `localSleeperPicks(d: LocalDraft): any[]`
  - `totalLocalPicks(d: LocalDraft): number`

Note on `now`: time is passed in rather than read, so the module stays pure and the tests do not depend on the clock.

- [ ] **Step 1: Write the failing test**

Create `src/draft/room/__tests__/localDraft.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  blankLocalDraft, addLocalPick, undoLocalPick, localDraftMeta, localSleeperPicks,
  totalLocalPicks, type LocalDraft,
} from '../localDraft'
import { slotAtPick } from '../pickOrder'

const NOW = '2026-08-27T12:00:00.000Z'

/** A 4-team, 3-round snake, seats 1..4 held by rosters r1..r4, me at seat 2. */
const base = () => blankLocalDraft({
  leagueId: 'L1', season: '2026', teams: 4, rounds: 3, type: 'snake',
  slotToRosterId: { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }, mySlot: 2,
}, NOW)

const player = (n: string) => ({ playerKey: `p${n}`, name: `First${n} Last${n}`, position: 'RB', proTeam: 'KC' })

/** Fill n picks in order. */
const withPicks = (n: number): LocalDraft => {
  let d = base()
  for (let i = 1; i <= n; i++) d = addLocalPick(d, player(String(i)), NOW)
  return d
}

describe('blankLocalDraft', () => {
  it('starts empty and stamped', () => {
    const d = base()
    expect(d.picks).toEqual([])
    expect(d.startedAt).toBe(NOW)
    expect(d.updatedAt).toBe(NOW)
    expect(totalLocalPicks(d)).toBe(12)
  })
})

describe('addLocalPick', () => {
  it('appends with the next overall number', () => {
    const d = withPicks(3)
    expect(d.picks.map((p) => p.overall)).toEqual([1, 2, 3])
  })

  it('does not mutate the draft it was given', () => {
    const before = base()
    addLocalPick(before, player('x'), NOW)
    expect(before.picks).toHaveLength(0)
  })

  it('refuses to run past the end of the draft', () => {
    const full = withPicks(12)
    const after = addLocalPick(full, player('13'), NOW)
    expect(after.picks).toHaveLength(12)
    expect(after).toBe(full) // unchanged reference: nothing happened
  })
})

describe('undoLocalPick', () => {
  it('pops the last pick', () => {
    const d = undoLocalPick(withPicks(3), NOW)
    expect(d.picks.map((p) => p.overall)).toEqual([1, 2])
  })

  it('is a no-op on an empty draft', () => {
    const d = base()
    expect(undoLocalPick(d, NOW)).toBe(d)
  })

  it('round-trips: N appends then N undos is the blank draft again', () => {
    let d = withPicks(5)
    for (let i = 0; i < 5; i++) d = undoLocalPick(d, NOW)
    expect(d.picks).toEqual([])
  })
})

describe('localSleeperPicks', () => {
  it('emits the exact shape useDraftRoom consumes', () => {
    const rows = localSleeperPicks(withPicks(1))
    expect(rows[0]).toEqual({
      pick_no: 1,
      player_id: 'p1',
      draft_slot: 1,
      roster_id: 'r1',
      metadata: { first_name: 'First1', last_name: 'Last1', position: 'RB', team: 'KC' },
    })
  })

  it('splits the name the way the room rejoins it', () => {
    // useDraftRoom rebuilds display names with
    //   [first_name, last_name].filter(Boolean).join(' ')
    // so the split has to survive that round trip exactly.
    let d = base()
    d = addLocalPick(d, { playerKey: 'x', name: 'Amon-Ra St. Brown', position: 'WR', proTeam: 'DET' }, NOW)
    const m = localSleeperPicks(d)[0].metadata
    expect([m.first_name, m.last_name].filter(Boolean).join(' ')).toBe('Amon-Ra St. Brown')
  })

  it('handles a single-token name without inventing an empty surname', () => {
    let d = base()
    d = addLocalPick(d, { playerKey: 'def', name: 'HOU', position: 'DEF', proTeam: 'HOU' }, NOW)
    const m = localSleeperPicks(d)[0].metadata
    expect(m.first_name).toBe('HOU')
    expect(m.last_name).toBe('')
    expect([m.first_name, m.last_name].filter(Boolean).join(' ')).toBe('HOU')
  })

  it('follows the snake, checked against slotAtPick itself', () => {
    const d = withPicks(12)
    const shape = { type: 'snake' as const, teams: 4, rounds: 3 }
    for (const row of localSleeperPicks(d)) {
      expect(row.draft_slot).toBe(slotAtPick(shape, row.pick_no))
    }
    // and concretely: round 2 runs backwards
    const slots = localSleeperPicks(d).map((r) => r.draft_slot)
    expect(slots.slice(0, 4)).toEqual([1, 2, 3, 4])
    expect(slots.slice(4, 8)).toEqual([4, 3, 2, 1])
    expect(slots.slice(8, 12)).toEqual([1, 2, 3, 4])
  })

  it('keeps a linear draft linear', () => {
    let d = blankLocalDraft({
      leagueId: 'L1', season: '2026', teams: 4, rounds: 2, type: 'linear',
      slotToRosterId: { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }, mySlot: 1,
    }, NOW)
    for (let i = 1; i <= 8; i++) d = addLocalPick(d, player(String(i)), NOW)
    expect(localSleeperPicks(d).map((r) => r.draft_slot)).toEqual([1, 2, 3, 4, 1, 2, 3, 4])
  })

  it('gives each pick the roster seated in that slot', () => {
    const rows = localSleeperPicks(withPicks(5))
    expect(rows.map((r) => r.roster_id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r4'])
  })
})

describe('localDraftMeta', () => {
  it('supplies every field the room reads', () => {
    const m = localDraftMeta(withPicks(1))
    for (const k of ['status', 'type', 'settings', 'draft_id', 'slot_to_roster_id',
                     'draft_order', 'season', 'metadata', 'league_id']) {
      expect(m[k], `missing ${k}`).toBeDefined()
    }
    expect(m.settings.teams).toBe(4)
    expect(m.settings.rounds).toBe(3)
  })

  it('carries the draft type, which decides snake vs linear', () => {
    // Read through an alias in the shape computed, so easy to omit and silent
    // when omitted: everything would become a snake.
    expect(localDraftMeta(base()).type).toBe('snake')
  })

  it('moves through the three statuses at the right boundaries', () => {
    expect(localDraftMeta(base()).status).toBe('pre_draft')
    expect(localDraftMeta(withPicks(1)).status).toBe('drafting')
    expect(localDraftMeta(withPicks(11)).status).toBe('drafting')
    expect(localDraftMeta(withPicks(12)).status).toBe('complete')
  })

  it('maps slots to rosters as strings, the way Sleeper does', () => {
    const m = localDraftMeta(base())
    expect(m.slot_to_roster_id['2']).toBe('r2')
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/draft/room/__tests__/localDraft.test.ts`
Expected: FAIL — `Failed to resolve import "../localDraft"`.

- [ ] **Step 3: Write the implementation**

Create `src/draft/room/localDraft.ts`:

```ts
/**
 * A draft you run yourself, with no Sleeper draft behind it.
 *
 * The room's opponent model — who picks before you, and what they have done in
 * past drafts — could only ever be exercised during the one real draft a year,
 * or against a Sleeper mock that has to be created, sized right and started
 * first. This lets you rehearse it whenever you like, against your own league.
 *
 * The trick is that nothing downstream knows. Every surface in the room reads
 * two things, `picks` and `draftMeta`, so this module renders a local pick log
 * into exactly those two shapes and the board, survival simulation, tendencies,
 * grid, roster, recap and replay all carry on unchanged.
 *
 * Pure by construction: `now` is passed in rather than read, so the module has
 * no clock and the tests have no timing.
 */

import { slotAtPick, type DraftShape } from './pickOrder'

export interface LocalPick {
  overall: number
  playerKey: string
  name: string
  position: string
  proTeam: string
}

export interface LocalDraft {
  leagueId: string
  season: string
  teams: number
  rounds: number
  type: 'snake' | 'linear'
  /** slot (1-based) -> league roster id: the seating the user confirmed. */
  slotToRosterId: Record<number, string>
  mySlot: number
  picks: LocalPick[]
  startedAt: string
  updatedAt: string
}

export function totalLocalPicks(d: LocalDraft): number {
  return Math.max(0, (d?.teams ?? 0) * (d?.rounds ?? 0))
}

const shapeOf = (d: LocalDraft): DraftShape => ({
  type: d.type, teams: d.teams, rounds: d.rounds,
})

export function blankLocalDraft(
  input: Omit<LocalDraft, 'picks' | 'startedAt' | 'updatedAt'>,
  now: string,
): LocalDraft {
  return { ...input, picks: [], startedAt: now, updatedAt: now }
}

/**
 * Append a pick. Returns the SAME reference when the draft is already full, so a
 * caller that persists on change does not write a no-op, and a double tap at the
 * end of a draft cannot produce a pick that does not exist.
 */
export function addLocalPick(
  d: LocalDraft,
  player: { playerKey: string; name: string; position: string; proTeam: string },
  now: string,
): LocalDraft {
  if (d.picks.length >= totalLocalPicks(d)) return d
  const pick: LocalPick = {
    overall: d.picks.length + 1,
    playerKey: player.playerKey,
    name: player.name,
    position: player.position,
    proTeam: player.proTeam,
  }
  return { ...d, picks: [...d.picks, pick], updatedAt: now }
}

/** Pop the last pick. Same-reference no-op on an empty draft, for the same reason. */
export function undoLocalPick(d: LocalDraft, now: string): LocalDraft {
  if (!d.picks.length) return d
  return { ...d, picks: d.picks.slice(0, -1), updatedAt: now }
}

/**
 * Sleeper splits a player's name across two metadata fields and the room rejoins
 * them with `[first_name, last_name].filter(Boolean).join(' ')`. Splitting on the
 * FIRST space and leaving the remainder whole is what survives that round trip
 * for "Amon-Ra St. Brown" and for a one-word name like a team defense.
 */
function splitName(name: string): { first: string; last: string } {
  const n = String(name ?? '').trim()
  const i = n.indexOf(' ')
  return i === -1 ? { first: n, last: '' } : { first: n.slice(0, i), last: n.slice(i + 1) }
}

/** The pick log in Sleeper's own shape, so every consumer reads it unchanged. */
export function localSleeperPicks(d: LocalDraft): any[] {
  const shape = shapeOf(d)
  return d.picks.map((p) => {
    const slot = slotAtPick(shape, p.overall)
    const { first, last } = splitName(p.name)
    return {
      pick_no: p.overall,
      player_id: p.playerKey,
      draft_slot: slot,
      roster_id: d.slotToRosterId[slot] ?? '',
      metadata: { first_name: first, last_name: last, position: p.position, team: p.proTeam },
    }
  })
}

/**
 * The synthetic draft meta. Every field the room reads must be here — `type`
 * especially, which is read through a local alias in the `shape` computed and so
 * is easy to miss and silent when missed: without it every draft becomes a snake.
 */
export function localDraftMeta(d: LocalDraft): any {
  const total = totalLocalPicks(d)
  const n = d.picks.length
  const status = n === 0 ? 'pre_draft' : n >= total ? 'complete' : 'drafting'

  const slotToRoster: Record<string, string> = {}
  for (const [slot, roster] of Object.entries(d.slotToRosterId ?? {})) {
    slotToRoster[String(slot)] = String(roster)
  }

  return {
    draft_id: `local:${d.leagueId}:${d.startedAt}`,
    league_id: d.leagueId,
    season: d.season,
    status,
    type: d.type,
    settings: { teams: d.teams, rounds: d.rounds },
    slot_to_roster_id: slotToRoster,
    /* No user ids exist in a local draft; the seat is known directly from mySlot,
       and useDraftRoom falls back to slot_to_roster_id when draft_order misses. */
    draft_order: {},
    metadata: {},
  }
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/draft/room/__tests__/localDraft.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: PASS. Nothing imports this module yet.

- [ ] **Step 6: Commit**

```bash
git add src/draft/room/localDraft.ts src/draft/room/__tests__/localDraft.test.ts
git commit -m "feat(draft): a local pick log that renders as a Sleeper draft"
```

---

### Task 2: `useLocalDraft` — persistence

**Files:**
- Create: `src/composables/useLocalDraft.ts`
- Test: `src/composables/__tests__/useLocalDraft.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces: `useLocalDraft(leagueId: Ref<string | null> | ComputedRef<string | null>)` returning
  `{ draft: ComputedRef<LocalDraft | null>; isActive: ComputedRef<boolean>; start(config): void; pick(player): void; undo(): void; discard(): void }`
  where `config` is `Omit<LocalDraft, 'picks' | 'startedAt' | 'updatedAt'>` and `player` is `{ playerKey, name, position, proTeam }`.

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useLocalDraft.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useLocalDraft, localDraftKey } from '../useLocalDraft'

const config = {
  leagueId: 'L1', season: '2026', teams: 4, rounds: 2, type: 'snake' as const,
  slotToRosterId: { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }, mySlot: 2,
}
const player = { playerKey: 'p1', name: 'Bijan Robinson', position: 'RB', proTeam: 'ATL' }

beforeEach(() => localStorage.clear())

describe('useLocalDraft', () => {
  it('has nothing until a draft is started', () => {
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
    expect(d.isActive.value).toBe(false)
  })

  it('starts, picks and undoes', () => {
    const d = useLocalDraft(ref('L1'))
    d.start(config)
    expect(d.isActive.value).toBe(true)
    d.pick(player)
    expect(d.draft.value!.picks).toHaveLength(1)
    d.undo()
    expect(d.draft.value!.picks).toHaveLength(0)
  })

  it('survives a refresh — the whole point of persisting', () => {
    const a = useLocalDraft(ref('L1'))
    a.start(config)
    a.pick(player)

    const b = useLocalDraft(ref('L1'))          // a fresh mount, as after reload
    expect(b.draft.value!.picks).toHaveLength(1)
    expect(b.draft.value!.picks[0].name).toBe('Bijan Robinson')
  })

  it('keeps leagues apart', () => {
    const a = useLocalDraft(ref('L1'))
    a.start(config)
    const b = useLocalDraft(ref('L2'))
    expect(b.draft.value).toBeNull()
  })

  it('discards', () => {
    const d = useLocalDraft(ref('L1'))
    d.start(config)
    d.discard()
    expect(d.draft.value).toBeNull()
    expect(localStorage.getItem(localDraftKey('L1'))).toBeNull()
  })

  it('ignores a corrupt payload rather than throwing', () => {
    localStorage.setItem(localDraftKey('L1'), '{not json')
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('ignores a stored draft belonging to another league', () => {
    // The key is per league, so a mismatch means tampering. Refuse it rather
    // than seat one league's rosters in another league's draft.
    localStorage.setItem(localDraftKey('L1'), JSON.stringify({ ...config, leagueId: 'L9', picks: [], startedAt: 'x', updatedAt: 'x' }))
    const d = useLocalDraft(ref('L1'))
    expect(d.draft.value).toBeNull()
  })

  it('does nothing when there is no active league', () => {
    const d = useLocalDraft(ref(null))
    d.start(config)
    expect(d.draft.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/composables/__tests__/useLocalDraft.test.ts`
Expected: FAIL — `Failed to resolve import "../useLocalDraft"`.

- [ ] **Step 3: Write the implementation**

Create `src/composables/useLocalDraft.ts`:

```ts
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  blankLocalDraft, addLocalPick, undoLocalPick, type LocalDraft,
} from '@/draft/room/localDraft'

/**
 * Where a local draft lives.
 *
 * Keyed per league, and on the device, next to the custom rankings and the draft
 * history. The one property that matters more than any other: a draft in progress
 * must survive a refresh. Somebody mid-rehearsal who reloads the page and loses
 * nine rounds of picks will not start a tenth.
 */
export const localDraftKey = (leagueId: string) => `ufd:localDraft:${leagueId}`

type StartConfig = Omit<LocalDraft, 'picks' | 'startedAt' | 'updatedAt'>

function read(leagueId: string | null): LocalDraft | null {
  if (!leagueId) return null
  try {
    const raw = localStorage.getItem(localDraftKey(leagueId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalDraft
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.picks)) return null
    /* The key is already per league, so a mismatch here means the payload was
       tampered with or hand-edited. Seating one league's rosters in another
       league's draft is exactly the confident-wrong-person failure this room
       has been burned by; refuse it instead. */
    if (String(parsed.leagueId) !== String(leagueId)) return null
    return parsed
  } catch {
    return null   /* corrupt storage must never take the draft room down */
  }
}

function write(leagueId: string | null, d: LocalDraft | null) {
  if (!leagueId) return
  try {
    if (d) localStorage.setItem(localDraftKey(leagueId), JSON.stringify(d))
    else localStorage.removeItem(localDraftKey(leagueId))
  } catch {
    /* private mode: the session still works, it just will not survive a reload */
  }
}

export function useLocalDraft(leagueId: Ref<string | null> | ComputedRef<string | null>) {
  const current = ref<LocalDraft | null>(read(leagueId.value))

  watch(leagueId, (id) => { current.value = read(id) })

  const commit = (d: LocalDraft | null) => {
    current.value = d
    write(leagueId.value, d)
  }

  return {
    draft: computed(() => current.value),
    isActive: computed(() => current.value !== null),

    start(config: StartConfig) {
      if (!leagueId.value) return
      commit(blankLocalDraft({ ...config, leagueId: String(leagueId.value) }, new Date().toISOString()))
    },

    pick(player: { playerKey: string; name: string; position: string; proTeam: string }) {
      if (!current.value) return
      commit(addLocalPick(current.value, player, new Date().toISOString()))
    },

    undo() {
      if (!current.value) return
      commit(undoLocalPick(current.value, new Date().toISOString()))
    },

    discard() { commit(null) },
  }
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/composables/__tests__/useLocalDraft.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useLocalDraft.ts src/composables/__tests__/useLocalDraft.test.ts
git commit -m "feat(draft): persist a local draft per league so a refresh cannot lose it"
```

---

### Task 3: Feed the room from the local log

**Files:**
- Modify: `src/composables/useDraftRoom.ts`

**Interfaces:**
- Consumes: `useLocalDraft` from Task 2; `localDraftMeta`, `localSleeperPicks` from Task 1.
- Produces, on the composable's return object: `localDraft` (the whole `useLocalDraft` object), `localMode: ComputedRef<boolean>`.

- [ ] **Step 1: Rename the Sleeper-owned refs**

In `src/composables/useDraftRoom.ts`, the two refs currently named `draftMeta` and `picks` become the Sleeper feed specifically, and the old names become computeds that choose a source. Rename **the declarations and every assignment site only** — do not touch the read sites:

```ts
  const sleeperMeta = ref<any | null>(null)
  const sleeperPicks = ref<any[]>([])
```

Then update every place that ASSIGNS to them. There are exactly **seven assignments across six lines** — two of them share line 147, and three are inline inside an `if`, so a line-anchored search finds only four. This is the exact command that finds all of them:

```bash
grep -nE "(draftMeta|picks)\.value\s*=[^=]" src/composables/useDraftRoom.ts
```

It must print these six lines, and after the rename it must print nothing:

| Line | Assignment |
|---|---|
| 147 | `if (!id) { draftMeta.value = null; picks.value = []; return }` — **two** on one line |
| 156 | `draftMeta.value = null` |
| 157 | `picks.value = []` |
| 160 | `draftMeta.value = meta` |
| 161 | `picks.value = p` |
| 181 | `if (Array.isArray(p)) { picks.value = p; pollFailures.value = 0 }` |
| 193 | `if (meta) draftMeta.value = meta` |

Every one becomes `sleeperMeta` / `sleeperPicks`. Do NOT touch any read site — `picks.value.length` inside `pollPicks`'s completion check should go on reading the new computed, which is correct: a local draft's completeness is decided by its own pick count.

Place the two computeds from Step 2 immediately after these two refs, so every later reference inside the composable resolves.

- [ ] **Step 2: Add the source switch**

Immediately after those two refs, add:

```ts
  /**
   * A draft you are running yourself, with no Sleeper draft behind it.
   *
   * The whole feature lives in these two computeds. Every surface in this room —
   * board, survival, tendencies, grid, roster, recap, replay — reads `draftMeta`
   * and `picks` and nothing else, so rendering a local pick log into those two
   * shapes is the entire integration. If a consumer ever needs to know which
   * source it is reading, the synthetic shape is wrong and the shape is what
   * should be fixed.
   */
  const localDraft = useLocalDraft(computed(() => leagueStore.activeLeagueId))
  const localMode = computed(() => localDraft.draft.value !== null)

  const draftMeta = computed<any | null>(() =>
    localMode.value ? localDraftMeta(localDraft.draft.value!) : sleeperMeta.value,
  )
  const picks = computed<any[]>(() =>
    localMode.value ? localSleeperPicks(localDraft.draft.value!) : sleeperPicks.value,
  )
```

Add the imports at the top of the file:

```ts
import { useLocalDraft } from '@/composables/useLocalDraft'
import { localDraftMeta, localSleeperPicks } from '@/draft/room/localDraft'
```

- [ ] **Step 3: Stop polling in local mode**

There is nothing to poll when the picks are local. In `startPolling`, make the first line:

```ts
  function startPolling() {
    if (localMode.value) return   /* nothing to poll: the picks are ours */
    stopPolling()
```

And in `loadDraft`, immediately after `if (!enabled.value) return`, add:

```ts
    if (localMode.value) return   /* a local draft is the source; do not fetch one */
```

- [ ] **Step 4: Identity and model follow the league in local mode**

In local mode the seats ARE the league's rosters, so there is no seat map and no possibility of the mismatch practice mode guards against. Change the two computeds:

```ts
  const opponentIdentity = computed<'real' | 'anonymous'>(() =>
    draftIsThisLeague.value || localMode.value || practiceEngaged.value ? 'real' : 'anonymous',
  )
  const opponentModel = computed<'league' | 'market'>(() =>
    draftIsThisLeague.value || localMode.value || practiceEngaged.value ? 'league' : 'market',
  )
```

- [ ] **Step 5: Return the new state**

Add to the return object, beside `practiceMode`:

```ts
    localDraft,
    localMode,
```

- [ ] **Step 6: Verify nothing changed with no local draft**

Run: `npx vitest run`
Expected: PASS, whole suite, **no test edited**. With no local draft stored, `localMode` is false and both computeds return the Sleeper refs — identical to before. If a test fails, the rename missed an assignment site; report BLOCKED rather than editing tests.

Run: `npm run build 2>&1 | grep -E "error|built"` → `✓ built`
Run: `npx vue-tsc --noEmit` → no new errors in `useDraftRoom.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/composables/useDraftRoom.ts
git commit -m "feat(draft): let a local pick log stand in for the Sleeper feed"
```

---

### Task 4: History records a local draft as its own kind

**Files:**
- Modify: `src/draft/room/draftHistory.ts`
- Modify: `src/composables/useDraftRoom.ts` (the auto-save watcher's `kind`)
- Modify: `src/views/DraftRoomView.vue` (the History filter chips)
- Test: `src/draft/room/__tests__/draftHistory.test.ts`

**Interfaces:**
- Consumes: `localMode` from Task 3.
- Produces: `DraftRecord['kind']` becomes `'league' | 'mock' | 'local'`.

- [ ] **Step 1: Write the failing test**

Append to `src/draft/room/__tests__/draftHistory.test.ts`:

```ts
describe('summarizeHistory — local drafts are their own population', () => {
  it('keeps a local rehearsal out of the mock averages', () => {
    // A solo rehearsal is not a draft against nine live opponents. Mixing them
    // would make the grade average describe neither.
    const rows = [
      rec({ draftId: 'a', kind: 'mock', rank: 1, of: 10 }),
      rec({ draftId: 'b', kind: 'local', rank: 10, of: 10 }),
    ]
    const mocks = summarizeHistory(rows.filter((r) => r.kind === 'mock'))
    const locals = summarizeHistory(rows.filter((r) => r.kind === 'local'))
    expect(mocks.count).toBe(1)
    expect(locals.count).toBe(1)
    expect(mocks.averageGrade).not.toBe(locals.averageGrade)
  })

  it('still summarises them all together when nothing is filtered', () => {
    const s = summarizeHistory([
      rec({ draftId: 'a', kind: 'mock', rank: 1, of: 10 }),
      rec({ draftId: 'b', kind: 'local', rank: 10, of: 10 }),
    ])
    expect(s.count).toBe(2)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/draft/room/__tests__/draftHistory.test.ts`
Expected: FAIL — TypeScript rejects `kind: 'local'`, or the test fixture will not accept it.

- [ ] **Step 3: Widen the type**

In `src/draft/room/draftHistory.ts`, change:

```ts
  /** A mock is not the same population as your league's draft night. */
  kind: 'league' | 'mock'
```

to:

```ts
  /**
   * Three different populations, deliberately kept apart. A mock against bots is
   * not your league's draft night, and a local rehearsal you entered by hand is
   * neither — averaging across them produces a grade that describes none of them.
   */
  kind: 'league' | 'mock' | 'local'
```

- [ ] **Step 4: File local drafts under the new kind**

In `src/composables/useDraftRoom.ts`, in the auto-save watcher, change:

```ts
        kind: draftIsThisLeague.value ? 'league' : 'mock',
```

to:

```ts
        kind: localMode.value ? 'local' : draftIsThisLeague.value ? 'league' : 'mock',
```

- [ ] **Step 5: Add the filter chip**

In `src/views/DraftRoomView.vue`, change:

```ts
const historyKind = ref<'all' | 'league' | 'mock'>('all')
```

to:

```ts
const historyKind = ref<'all' | 'league' | 'mock' | 'local'>('all')
```

and in the template change:

```html
          <button v-for="k in (['all', 'league', 'mock'] as const)" :key="k" @click="historyKind = k"
```

to:

```html
          <button v-for="k in (['all', 'league', 'mock', 'local'] as const)" :key="k" @click="historyKind = k"
```

- [ ] **Step 6: Verify**

Run: `npx vitest run` → PASS.
Run: `npm run build 2>&1 | grep -E "error|built"` → `✓ built`.
Run: `npx vue-tsc --noEmit` → no new errors in the three touched files.

- [ ] **Step 7: Commit**

```bash
git add src/draft/room/draftHistory.ts src/composables/useDraftRoom.ts src/views/DraftRoomView.vue src/draft/room/__tests__/draftHistory.test.ts
git commit -m "feat(draft): file a local rehearsal as its own kind, not as a mock"
```

---

### Task 5: Setup panel — seat the league

**Files:**
- Modify: `src/views/DraftRoomView.vue`

**Interfaces:**
- Consumes: `localDraft` and `localMode` from Task 3; `leagueOrderKnown`, `realSlotToRosterId` and `mySlotInLeague` (already on the composable, added for practice mode); `effectiveSlots`, `shape`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Destructure what the panel needs**

In the `useDraftRoom()` destructure at the top of `<script setup>`, add:

```ts
  localDraft, localMode,
```

- [ ] **Step 2: Add the setup state and the seat list**

In `<script setup>`, after the existing practice-mode state, add:

```ts
/**
 * Starting a local draft. The seats are prefilled from the league's published
 * order when there is one — that is the arrangement the user is actually
 * rehearsing — and from roster order otherwise, with the user free to rearrange.
 */
const showLocalSetup = ref(false)
const localTeams = ref(10)
const localRounds = ref(15)
const localType = ref<'snake' | 'linear'>('snake')
const localSeats = ref<string[]>([])          /* index 0 = slot 1 */
const localMySlot = ref(1)

const leagueTeamName = (rosterId: string) => teamNameForSlotByRoster(rosterId)

function openLocalSetup() {
  const ids = Object.keys(leagueTeamNames.value ?? {}).sort((a, b) => Number(a) - Number(b))
  const published = realSlotToRosterId.value
  const havePublished = Object.keys(published).length === ids.length && ids.length > 0

  localSeats.value = havePublished
    ? Array.from({ length: ids.length }, (_, i) => String(published[i + 1]))
    : ids
  localTeams.value = localSeats.value.length || 10
  localRounds.value = Number(shape.value?.rounds) || 15
  localType.value = (shape.value?.type as 'snake' | 'linear') || 'snake'
  localMySlot.value = havePublished && mySlotInLeague.value > 0 ? mySlotInLeague.value : 1
  showLocalSetup.value = true
}

function moveSeat(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= localSeats.value.length) return
  const next = [...localSeats.value]
  ;[next[i], next[j]] = [next[j], next[i]]
  localSeats.value = next
}

/** Every seat must hold exactly one roster, or the ring and the log go out of step. */
const localSetupError = computed(() => {
  const seats = localSeats.value
  if (!seats.length) return 'This league has no teams loaded yet.'
  if (localRounds.value < 1) return 'A draft needs at least one round.'
  if (new Set(seats).size !== seats.length) return 'Two seats hold the same team.'
  if (seats.some((s) => !s)) return 'Every seat needs a team.'
  if (localMySlot.value < 1 || localMySlot.value > seats.length) return 'Pick which seat is yours.'
  return ''
})

function startLocalDraft() {
  if (localSetupError.value) return
  const slotToRosterId: Record<number, string> = {}
  localSeats.value.forEach((rosterId, i) => { slotToRosterId[i + 1] = rosterId })
  localDraft.start({
    leagueId: '',                 /* filled in by the composable from the active league */
    season: String(new Date().getFullYear()),
    teams: localSeats.value.length,
    rounds: localRounds.value,
    type: localType.value,
    slotToRosterId,
    mySlot: localMySlot.value,
  })
  showLocalSetup.value = false
}
```

Add `leagueTeamNames` and `teamNameForSlotByRoster` to the destructure — they do not exist yet, so instead expose the league's team names directly. In `src/composables/useDraftRoom.ts`, add to the return object:

```ts
    leagueTeamNames: src.teamNames,
```

and in the view use `leagueTeamNames.value[rosterId]` for the label, replacing the `leagueTeamName` helper above with:

```ts
const leagueTeamName = (rosterId: string) => leagueTeamNames.value?.[rosterId] ?? `Team ${rosterId}`
```

- [ ] **Step 3: Render the entry point and the panel**

In the template, immediately after the practice-mode block added previously (the `<template v-if="practiceMode">…</template>`), insert:

```html
      <!-- Run a draft yourself, with no Sleeper draft behind it. -->
      <button v-if="!localMode && !showLocalSetup" @click="openLocalSetup"
              class="mb-3 rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-text">
        start a local draft
      </button>

      <section v-if="showLocalSetup" class="mb-3 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Start a local draft</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          you enter every pick, including your opponents' · seats are prefilled from your league's
          published order when there is one
        </p>

        <div class="mb-3 flex flex-wrap items-center gap-3 font-mono text-[11px] text-dark-textMuted">
          <label class="flex items-center gap-1.5">rounds
            <input type="number" v-model.number="localRounds" min="1" max="30"
                   class="w-14 rounded border border-dark-border bg-dark-bg px-1.5 py-0.5 text-dark-text" />
          </label>
          <label class="flex items-center gap-1.5">order
            <select v-model="localType" class="rounded border border-dark-border bg-dark-bg px-1.5 py-0.5 text-dark-text">
              <option value="snake">snake</option>
              <option value="linear">linear</option>
            </select>
          </label>
        </div>

        <div v-for="(rosterId, i) in localSeats" :key="rosterId"
             class="flex items-center gap-2 border-b border-dark-border/40 py-1.5 last:border-0">
          <span class="w-6 shrink-0 font-mono text-[10px] text-dark-textMuted">{{ i + 1 }}</span>
          <span class="min-w-0 flex-1 truncate text-sm"
                :class="localMySlot === i + 1 ? 'font-semibold text-primary' : 'text-dark-text'">
            {{ leagueTeamName(rosterId) }}
          </span>
          <button @click="localMySlot = i + 1"
                  class="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] transition-colors"
                  :class="localMySlot === i + 1 ? 'border-primary text-primary' : 'border-dark-border text-dark-textMuted hover:text-dark-text'">
            {{ localMySlot === i + 1 ? 'you' : 'this is me' }}
          </button>
          <button @click="moveSeat(i, -1)" :disabled="i === 0"
                  class="shrink-0 px-1 font-mono text-[11px] text-dark-textMuted disabled:opacity-30">↑</button>
          <button @click="moveSeat(i, 1)" :disabled="i === localSeats.length - 1"
                  class="shrink-0 px-1 font-mono text-[11px] text-dark-textMuted disabled:opacity-30">↓</button>
        </div>

        <p v-if="localSetupError" class="mt-3 font-mono text-[11px] text-[#FF5C5C]">{{ localSetupError }}</p>

        <div class="mt-3 flex gap-2">
          <button @click="startLocalDraft" :disabled="!!localSetupError"
                  class="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 font-mono text-[11px] text-primary disabled:opacity-40">
            start drafting
          </button>
          <button @click="showLocalSetup = false"
                  class="rounded-lg border border-dark-border px-3 py-1.5 font-mono text-[11px] text-dark-textMuted hover:text-dark-text">
            cancel
          </button>
        </div>
      </section>
```

- [ ] **Step 4: Verify**

Run: `npm run build 2>&1 | grep -E "error|built"` → `✓ built`.
Run: `npx vue-tsc --noEmit` → no new errors in `DraftRoomView.vue` or `useDraftRoom.ts`.
Run: `npx vitest run` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/DraftRoomView.vue src/composables/useDraftRoom.ts
git commit -m "feat(draft): seat your league and start a draft with no Sleeper draft behind it"
```

---

### Task 6: Making picks

**Files:**
- Modify: `src/views/DraftRoomView.vue`

**Interfaces:**
- Consumes: `localDraft`, `localMode` from Task 3; `shape`, `currentOverallPick`, `teamNameForSlot`, `markDrafted` (existing).
- Produces: nothing consumed downstream.

- [ ] **Step 1: Add the on-the-clock strip and the pick handler**

In `<script setup>`, after the local setup state, add:

```ts
/** Whose turn it is in a local draft, for the strip above the board. */
const localOnClock = computed(() => {
  if (!localMode.value || !shape.value) return null
  const d = localDraft.draft.value!
  const overall = d.picks.length + 1
  if (overall > d.teams * d.rounds) return null
  const slot = slotAtPick(shape.value, overall)
  return {
    overall,
    slot,
    round: Math.ceil(overall / d.teams),
    inRound: ((overall - 1) % d.teams) + 1,
    name: teamNameForSlot(slot),
    isMine: slot === d.mySlot,
  }
})

/**
 * A tap on the board is a pick in local mode. Outside local mode it keeps its old
 * meaning — flag the player gone — because that is the manual fallback for when
 * Sleeper sync dies mid-draft and it must not change.
 */
function takePlayer(row: { playerKey: string; name: string; position: string; proTeam?: string }) {
  if (!localMode.value) { markDrafted(row.playerKey); return }
  localDraft.pick({
    playerKey: row.playerKey,
    name: row.name,
    position: row.position,
    proTeam: row.proTeam ?? '',
  })
}
```

Add the import at the top of `<script setup>`:

```ts
import { slotAtPick } from '@/draft/room/pickOrder'
```

- [ ] **Step 2: Route the board's tap through it**

In the template, the board row button currently reads:

```html
            @click="!(r as any).takenAt && markDrafted(r.playerKey)"
```

Change it to:

```html
            @click="!(r as any).takenAt && takePlayer(r)"
```

And change the hint line above the board from:

```html
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">tap a row to mark drafted · tier cliffs show on a position tab</p>
```

to:

```html
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          {{ localMode ? 'tap a row to make the pick' : 'tap a row to mark drafted' }} · tier cliffs show on a position tab
        </p>
```

- [ ] **Step 3: Render the strip and the banner**

In the template, immediately before the tab bar, insert:

```html
      <!--
        Local mode puts real league names on a draft nobody else can see. The
        banner is not decoration: a room that looks like a live draft and is not
        one has to say so, for the same reason practice mode does.
      -->
      <template v-if="localMode">
        <div class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-[11px]">
          <span class="font-semibold uppercase tracking-wide text-primary">Local draft</span>
          <span v-if="localOnClock" class="text-dark-textMuted">
            <b class="text-dark-text">{{ localOnClock.round }}.{{ String(localOnClock.inRound).padStart(2, '0') }}</b>
            ·
            <b :class="localOnClock.isMine ? 'text-primary' : 'text-dark-text'">
              {{ localOnClock.isMine ? 'your pick' : localOnClock.name }}
            </b>
          </span>
          <span v-else class="text-dark-textMuted">every pick is in</span>
          <button @click="localDraft.undo()" :disabled="!localDraft.draft.value?.picks.length"
                  class="ml-auto rounded border border-dark-border px-2 py-0.5 text-dark-textMuted transition-colors hover:text-dark-text disabled:opacity-30">
            undo
          </button>
          <button @click="confirmDiscardLocal"
                  class="rounded border border-dark-border px-2 py-0.5 text-dark-textMuted transition-colors hover:text-[#FF5C5C]">
            discard
          </button>
        </div>
      </template>
```

And add the discard confirm to `<script setup>`:

```ts
/** Discarding throws away every pick, so it asks first. */
function confirmDiscardLocal() {
  const n = localDraft.draft.value?.picks.length ?? 0
  if (n && !window.confirm(`Discard this local draft? ${n} pick${n === 1 ? '' : 's'} will be lost.`)) return
  localDraft.discard()
}
```

- [ ] **Step 4: Verify**

Run: `npm run build 2>&1 | grep -E "error|built"` → `✓ built`.
Run: `npx vue-tsc --noEmit` → no new errors in `DraftRoomView.vue`.
Run: `npx vitest run` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/DraftRoomView.vue
git commit -m "feat(draft): tap the board to make a pick in a local draft"
```

---

### Task 7: Deploy and verify live

**Files:** none modified.

- [ ] **Step 1: Full verification**

```bash
npx vitest run
npm run build 2>&1 | grep -E "error|built"
npx vue-tsc --noEmit
```

- [ ] **Step 2: Push**

```bash
git push origin redesign/my-team-first
```

This project deploys from `redesign/my-team-first`, not `main`. `main` is hundreds of commits behind and pushing it does nothing.

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 4: Verify the live bundle matches the local build**

```bash
L=$(grep -o 'index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1)
curl -sL https://www.ultimatefantasydashboard.com/ | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1
```

Expected: the two hashes match. Vercel's auto-deploy from GitHub is unreliable on this project, so the explicit `--prod` is what ships and the hash comparison is what proves it.

---

## Self-Review

**Spec coverage.** The seam → Task 3. Data model and pure functions → Task 1. Persistence and refresh survival → Task 2. History kind → Task 4. Setup panel and seating → Task 5. Pick entry, on-the-clock strip, undo, discard, banner → Task 6. Polling suspended → Task 3 Step 3. Identity/model in local mode → Task 3 Step 4. Every row of the spec's error-handling table maps to a guard: corrupt payload and league mismatch in Task 2's `read`; non-positive rounds, duplicate and empty seats in Task 5's `localSetupError`; pick-past-the-end and undo-on-empty in Task 1's same-reference no-ops; already-picked players excluded by the existing board filter; localStorage unavailable swallowed in Task 2's `write`.

**Placeholder scan.** None. Every code step carries literal code. The one judgement call left open is Task 3 Step 1's rename, which names all six assignment sites explicitly rather than saying "update the assignments".

**Type consistency.** `LocalDraft` and `LocalPick` are defined in Task 1 and consumed by name in Tasks 2, 3 and 5. `blankLocalDraft` takes `Omit<LocalDraft, 'picks' | 'startedAt' | 'updatedAt'>` and Task 5's `startLocalDraft` passes exactly those fields. `localDraft.start/pick/undo/discard` match Task 2's return object. `localMode` is a `ComputedRef<boolean>` in Task 3 and read as a boolean in Tasks 4, 5 and 6. `historyKind`'s union in Task 4 Step 5 matches `DraftRecord['kind']` plus `'all'`.

**One risk worth naming.** Task 3's rename is the whole feature's blast radius: `draftMeta` and `picks` are read in roughly twenty places, and the rename touches only the six assignment sites. If one assignment is missed, the Sleeper path silently stops updating while the suite stays green, because no test drives the Sleeper feed. Task 3 Step 6 is therefore explicit that a failing test means a missed site — and the reviewer for that task should count the assignment sites independently rather than trust the diff.
