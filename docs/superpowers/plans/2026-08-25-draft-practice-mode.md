# Draft Practice Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a manager run a Sleeper mock draft while the room models opponents on their real league mates' draft history, seated to match their real draft order.

**Architecture:** One overloaded boolean (`draftIsThisLeague`) is split into `opponentIdentity` and `opponentModel`, which it always conflated. A new pure module aligns the mock's seat ring to the league's at the manager's own seat, producing a mock-slot → league-roster-id map that both the survival simulation and the displayed reasons read from.

**Tech Stack:** Vue 3, TypeScript, Vitest. One test file: `npx vitest run <path>`. Whole suite: `npx vitest run`. Build: `npm run build` (this is plain `vite build` and does **not** typecheck; `npx vue-tsc --noEmit` is the separate typecheck and has pre-existing errors elsewhere in the tree).

## Global Constraints

- **Practice mode off ⇒ behaviour byte-identical to today.** Every change is gated.
- **Never seat approximately.** If the mock and the league differ in size, or either seat anchor is unknown, practice mode is unavailable and says why. A wrong seat produces a confident, specific, wrong read — worse than no read.
- **`recap.kind` stays `'mock'` for a practice draft.** It must never file itself in History as a league draft, or the grade averages mix populations.
- **Practice mode never invents a tendency.** A seat whose manager has no history falls back to the market model, exactly as today.
- **No change to scoring, the board, VONA, or survival mathematics.** Exporting `mulberry32` is a visibility change only.
- Comment style in this codebase: explain WHY, and cite the concrete failure the rule prevents.

---

### Task 1: `practiceSeating` — align the two seat rings

**Files:**
- Create: `src/draft/room/practiceSeating.ts`
- Modify: `src/draft/room/survival.ts:54` (export `mulberry32`)
- Test: `src/draft/room/__tests__/practiceSeating.test.ts`

**Interfaces:**
- Consumes: `mulberry32(seed: number): () => number` from `./survival` (must be exported as part of this task).
- Produces:
  - `buildSeatMap(input: { mockTeams: number; leagueTeams: number; mySlotInMock: number; mySlotInLeague: number; realSlotToRosterId: Record<number, string> }): Record<number, string> | null` — mock slot → league roster id, or `null` when seating is impossible.
  - `shuffledSeating(rosterIds: string[], seed: number): Record<number, string>` — mock slot → league roster id, a seeded permutation.

- [ ] **Step 1: Export the PRNG**

In `src/draft/room/survival.ts`, change line 54 from:

```ts
function mulberry32(seed: number): () => number {
```

to:

```ts
export function mulberry32(seed: number): () => number {
```

Leave everything else in that file untouched. This is a visibility change so practice seating can reuse the PRNG the survival model already uses, rather than introducing a second one.

- [ ] **Step 2: Write the failing test**

Create `src/draft/room/__tests__/practiceSeating.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSeatMap, shuffledSeating } from '../practiceSeating'

/** A 10-team league: slot 1 -> roster 'r1', slot 2 -> 'r2', and so on. */
const realOrder: Record<number, string> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [i + 1, `r${i + 1}`]),
)

const base = {
  mockTeams: 10,
  leagueTeams: 10,
  mySlotInMock: 3,
  mySlotInLeague: 7,
  realSlotToRosterId: realOrder,
}

describe('buildSeatMap', () => {
  it('puts me in my own mock seat', () => {
    const map = buildSeatMap(base)!
    expect(map[3]).toBe('r7')
  })

  it('seats the league mate who picks after me immediately after me', () => {
    // This is the entire point: "who picks between my picks" has to be the
    // same people in the mock as on draft night.
    const map = buildSeatMap(base)!
    expect(map[4]).toBe('r8')
    expect(map[5]).toBe('r9')
  })

  it('seats the league mate who picks before me immediately before me', () => {
    const map = buildSeatMap(base)!
    expect(map[2]).toBe('r6')
    expect(map[1]).toBe('r5')
  })

  it('wraps around the end of the ring', () => {
    const map = buildSeatMap(base)!
    // My league seat is 7, so seats 8,9,10 land at mock 4,5,6 and the ring
    // wraps: mock 7 must be league slot 1.
    expect(map[6]).toBe('r10')
    expect(map[7]).toBe('r1')
    expect(map[10]).toBe('r4')
  })

  it('is the identity map when my seat is the same in both', () => {
    const map = buildSeatMap({ ...base, mySlotInMock: 7, mySlotInLeague: 7 })!
    for (let slot = 1; slot <= 10; slot++) expect(map[slot]).toBe(`r${slot}`)
  })

  it('rotates the other way when my mock seat is later than my league seat', () => {
    const map = buildSeatMap({ ...base, mySlotInMock: 9, mySlotInLeague: 2 })!
    expect(map[9]).toBe('r2')
    expect(map[10]).toBe('r3')
    expect(map[1]).toBe('r4')
  })

  it('uses every league roster exactly once', () => {
    const map = buildSeatMap(base)!
    const seated = Object.values(map)
    expect(seated).toHaveLength(10)
    expect(new Set(seated).size).toBe(10)
    expect([...seated].sort()).toEqual([...Object.values(realOrder)].sort())
  })

  it('refuses to seat when the mock and the league are different sizes', () => {
    // Approximate seating gives a confident, specific, wrong read.
    expect(buildSeatMap({ ...base, mockTeams: 12 })).toBeNull()
  })

  it('refuses to seat without an anchor in either draft', () => {
    expect(buildSeatMap({ ...base, mySlotInMock: 0 })).toBeNull()
    expect(buildSeatMap({ ...base, mySlotInLeague: 0 })).toBeNull()
  })

  it('refuses to seat when the real order is incomplete', () => {
    const { 5: _dropped, ...missingOne } = realOrder
    expect(buildSeatMap({ ...base, realSlotToRosterId: missingOne })).toBeNull()
  })

  it('refuses to seat an empty league', () => {
    expect(buildSeatMap({ ...base, mockTeams: 0, leagueTeams: 0, realSlotToRosterId: {} })).toBeNull()
  })
})

describe('shuffledSeating', () => {
  const rosters = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']

  it('seats every roster exactly once', () => {
    const map = shuffledSeating(rosters, 42)
    expect(Object.keys(map)).toHaveLength(6)
    expect([...Object.values(map)].sort()).toEqual([...rosters].sort())
  })

  it('numbers seats from 1', () => {
    const map = shuffledSeating(rosters, 42)
    expect(map[1]).toBeDefined()
    expect(map[0]).toBeUndefined()
  })

  it('is identical for the same seed', () => {
    // A room that re-seats itself on refresh is not a room you can practise in.
    expect(shuffledSeating(rosters, 42)).toEqual(shuffledSeating(rosters, 42))
  })

  it('differs across seeds', () => {
    const a = shuffledSeating(rosters, 1)
    const b = shuffledSeating(rosters, 2)
    expect(a).not.toEqual(b)
  })

  it('handles an empty list', () => {
    expect(shuffledSeating([], 1)).toEqual({})
  })
})
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `npx vitest run src/draft/room/__tests__/practiceSeating.test.ts`
Expected: FAIL — `Failed to resolve import "../practiceSeating"`.

- [ ] **Step 4: Write the implementation**

Create `src/draft/room/practiceSeating.ts`:

```ts
/**
 * Seating your league mates in a mock draft.
 *
 * The opponent model is the most useful thing this room does and it was
 * available only during the one draft a year that cannot be repeated: a mock has
 * no league mates in it, so there was nobody to model. Practice mode borrows the
 * real league's managers and sits them around a mock.
 *
 * The seats have to be right, and "right" means relative to YOU. Whoever picks
 * immediately after you on draft night must pick immediately after you here,
 * because "who picks between my picks, and what do they do" is the read being
 * practised. So the two seat rings are aligned at the manager's own seat and
 * rotated to match.
 *
 * When the rings cannot be aligned — different sizes, or no anchor — this
 * returns null and practice mode declines. It never seats approximately: a wrong
 * seat produces a specific, confident, wrong statement about a real person,
 * which is worse than saying nothing.
 */

import { mulberry32 } from './survival'

export interface SeatMapInput {
  mockTeams: number
  leagueTeams: number
  /** My seat in the mock, 1-based. */
  mySlotInMock: number
  /** My seat in the real league's draft, 1-based. */
  mySlotInLeague: number
  /** The real league's draft order: slot -> roster id. */
  realSlotToRosterId: Record<number, string>
}

/** Mock slot -> league roster id, or null when the rings cannot be aligned. */
export function buildSeatMap(input: SeatMapInput): Record<number, string> | null {
  const teams = Math.floor(Number(input?.mockTeams) || 0)
  const leagueTeams = Math.floor(Number(input?.leagueTeams) || 0)
  const mine = Math.floor(Number(input?.mySlotInMock) || 0)
  const theirs = Math.floor(Number(input?.mySlotInLeague) || 0)
  const order = input?.realSlotToRosterId ?? {}

  if (teams <= 0 || teams !== leagueTeams) return null
  if (mine < 1 || mine > teams) return null
  if (theirs < 1 || theirs > teams) return null
  // Every league seat must be known. A partial order would silently leave holes
  // that read as "no history" rather than as the missing data they are.
  for (let slot = 1; slot <= teams; slot++) {
    if (!order[slot]) return null
  }

  const out: Record<number, string> = {}
  for (let mockSlot = 1; mockSlot <= teams; mockSlot++) {
    // Distance from my seat, walked around the ring, then measured out from my
    // real seat. Two modulos because JavaScript's % keeps the sign.
    const fromMe = (((mockSlot - mine) % teams) + teams) % teams
    const realSlot = (((theirs - 1 + fromMe) % teams) + teams) % teams + 1
    out[mockSlot] = order[realSlot]
  }
  return out
}

/**
 * A stable arbitrary seating, for when the commissioner has not published the
 * draft order yet. Seeded so a room does not re-seat itself on every refresh —
 * a room that rearranges under you is not one you can practise in. Re-rolling
 * the seed rehearses drawing a different slot.
 */
export function shuffledSeating(rosterIds: string[], seed: number): Record<number, string> {
  const ids = [...(rosterIds ?? [])]
  if (!ids.length) return {}

  // Fisher-Yates, driven by the same PRNG the survival model uses.
  const rand = mulberry32(seed)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }

  const out: Record<number, string> = {}
  ids.forEach((id, i) => { out[i + 1] = id })
  return out
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx vitest run src/draft/room/__tests__/practiceSeating.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 6: Run the whole suite**

Run: `npx vitest run`
Expected: PASS. The `survival.ts` change is an export keyword; nothing else moves.

- [ ] **Step 7: Commit**

```bash
git add src/draft/room/practiceSeating.ts src/draft/room/__tests__/practiceSeating.test.ts src/draft/room/survival.ts
git commit -m "feat(draft): seat real league mates around a mock, aligned at your own seat"
```

---

### Task 2: Split the overloaded boolean

**Files:**
- Modify: `src/composables/useDraftRoom.ts` — the `draftIsThisLeague` computed (~line 325) and its six consumers

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: two computeds replacing one —
  - `opponentIdentity: ComputedRef<'real' | 'anonymous'>` — whether to show real names and avatars
  - `opponentModel: ComputedRef<'league' | 'market'>` — whether tendency priors come from league history
  Both are returned from the composable so the view can read them. `draftIsThisLeague` remains, used only by `recap.kind`.

- [ ] **Step 1: Add the two computeds**

In `src/composables/useDraftRoom.ts`, immediately after the existing `draftIsThisLeague` computed, add:

```ts
  /**
   * Identity and intelligence were one boolean, and they are not the same
   * question.
   *
   * The single gate existed because connecting a mock while a league was active
   * made bots inherit league mates' names AND years of their tendencies — a
   * manager who had not played in three seasons appeared to be "picking before
   * you". Suppressing both fixed it, and took the opponent model with it.
   *
   * Split, so a practice room can borrow the league's managers (real identity,
   * league model) while a plain mock keeps neither.
   */
  const practiceMode = ref(false)
  const opponentIdentity = computed<'real' | 'anonymous'>(() =>
    draftIsThisLeague.value || practiceMode.value ? 'real' : 'anonymous',
  )
  const opponentModel = computed<'league' | 'market'>(() =>
    draftIsThisLeague.value || practiceMode.value ? 'league' : 'market',
  )
```

- [ ] **Step 2: Move each consumer to the half it meant**

Four identity consumers. In `teamAvatarForSlot`:

```ts
  const teamAvatarForSlot = (slot: number): string | null =>
    (opponentIdentity.value === 'real' ? src.teamLogos.value?.[rosterIdForSlot(slot)] : null) ??
    draftUserAvatars.value[slot] ??
    null
```

In `teamNameForSlot` (near the end of the file):

```ts
  const teamNameForSlot = (slot: number) =>
    (opponentIdentity.value === 'real' ? src.teamNames.value?.[rosterIdForSlot(slot)] : null) ??
    draftUserNames.value[slot] ??
    `Team ${slot}`
```

In `upcoming`, the `teamName` line:

```ts
        teamName: (opponentIdentity.value === 'real' ? src.teamNames.value?.[teamKey] : null) ?? `Team ${slot}`,
```

One intelligence consumer. In `historicalPicks`, change the early return:

```ts
    if (opponentModel.value !== 'league') return out
```

Leave `recap.kind` on `draftIsThisLeague` unchanged:

```ts
        kind: draftIsThisLeague.value ? 'league' : 'mock',
```

Add a comment above that line:

```ts
        // Deliberately NOT opponentModel: a practice room is a mock, and filing
        // it as a league draft would mix two populations in the History averages.
```

- [ ] **Step 3: Return the new state**

Add to the composable's return object, beside `hasHistory`:

```ts
    practiceMode,
    opponentIdentity,
    opponentModel,
```

- [ ] **Step 4: Verify nothing changed**

Run: `npx vitest run`
Expected: PASS, whole suite. `practiceMode` is `false`, so both computeds evaluate exactly as `draftIsThisLeague` did.

Run: `npm run build 2>&1 | grep -E "error|built"`
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useDraftRoom.ts
git commit -m "refactor(draft): separate opponent identity from opponent model"
```

---

### Task 3: Fetch the league's own draft order

**Files:**
- Modify: `src/composables/useDraftRoom.ts`

**Interfaces:**
- Consumes: `opponentModel` / `practiceMode` from Task 2; `sleeperService.getLeagueDrafts(leagueId: string): Promise<any[]>`.
- Produces:
  - `leagueDraftMeta: Ref<any | null>` — the active league's own draft object
  - `realSlotToRosterId: ComputedRef<Record<number, string>>` — league slot → roster id, `{}` when unknown
  - `mySlotInLeague: ComputedRef<number>` — my seat in the league draft, `0` when unknown
  - `leagueOrderKnown: ComputedRef<boolean>`

- [ ] **Step 1: Fetch the league draft**

In `src/composables/useDraftRoom.ts`, after the `draftUserNames` watcher, add:

```ts
  /**
   * The active league's OWN draft, which is a different object from the one the
   * room is connected to. Sleeper returns it before the draft starts, including
   * `draft_order` once the commissioner has set the seats — which is what
   * practice mode aligns against.
   */
  const leagueDraftMeta = ref<any | null>(null)
  watch(
    () => leagueStore.activeLeagueId,
    async (id) => {
      leagueDraftMeta.value = null
      if (!id) return
      try {
        const drafts = await sleeperService.getLeagueDrafts(String(id))
        leagueDraftMeta.value = drafts?.[0] ?? null
      } catch (e) {
        // A missing league draft is not an error worth surfacing — it only means
        // practice mode cannot offer real seating.
        console.info('[useDraftRoom] league draft unavailable for practice seating', e)
      }
    },
    { immediate: true },
  )

  /** The league's published seating: slot -> roster id. Empty when unset. */
  const realSlotToRosterId = computed<Record<number, string>>(() => {
    const map = leagueDraftMeta.value?.slot_to_roster_id as Record<string, number> | undefined
    if (!map) return {}
    const out: Record<number, string> = {}
    for (const [slot, rosterId] of Object.entries(map)) {
      const n = Number(slot)
      if (n > 0 && rosterId != null) out[n] = String(rosterId)
    }
    return out
  })

  /** My seat in the LEAGUE's draft — the anchor the mock ring rotates to. */
  const mySlotInLeague = computed<number>(() => {
    const meta = leagueDraftMeta.value
    if (!meta) return 0
    const uid = (leagueStore as any).currentUserId
    const fromOrder = uid
      ? (meta.draft_order as Record<string, number> | undefined)?.[String(uid)]
      : undefined
    if (fromOrder) return Number(fromOrder)
    const mine = src.myTeamKey.value
    const map = meta.slot_to_roster_id as Record<string, number> | undefined
    if (map && mine) {
      for (const [slot, rosterId] of Object.entries(map)) {
        if (String(rosterId) === String(mine)) return Number(slot)
      }
    }
    return 0
  })

  const leagueOrderKnown = computed(
    () => mySlotInLeague.value > 0 && Object.keys(realSlotToRosterId.value).length > 0,
  )
```

- [ ] **Step 2: Return the new state**

Add to the return object:

```ts
    leagueOrderKnown,
```

- [ ] **Step 3: Verify**

Run: `npx vitest run`
Expected: PASS, whole suite — nothing consumes these yet.

Run: `npm run build 2>&1 | grep -E "error|built"`
Expected: `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useDraftRoom.ts
git commit -m "feat(draft): read the league's own draft order for practice seating"
```

---

### Task 4: Route the opponent model through the seat map

**Files:**
- Modify: `src/composables/useDraftRoom.ts`

**Interfaces:**
- Consumes: `buildSeatMap` and `shuffledSeating` from Task 1; `practiceMode` / `opponentModel` from Task 2; `realSlotToRosterId`, `mySlotInLeague`, `leagueOrderKnown` from Task 3.
- Produces:
  - `seatMap: ComputedRef<Record<number, string> | null>`
  - `practiceAvailable: ComputedRef<boolean>` and `practiceUnavailableReason: ComputedRef<string>`
  - `reshuffleSeats: () => void`
  - `teamKeyForSlot(slot: number): string` — the roster id whose history models a seat

- [ ] **Step 1: Build the seat map**

In `src/composables/useDraftRoom.ts`, after `rosterIdForSlot`, add:

```ts
  /**
   * Seat shuffle seed, persisted per league. A practice room that re-seats
   * itself on refresh is not one you can practise in.
   */
  const SEAT_SEED_KEY = 'ufd:draftRoom:seatSeed'
  const seatSeed = ref<number>(
    Number((typeof localStorage !== 'undefined' && localStorage.getItem(SEAT_SEED_KEY)) || 1) || 1,
  )
  function reshuffleSeats() {
    seatSeed.value = (seatSeed.value % 100000) + 1
    try { localStorage.setItem(SEAT_SEED_KEY, String(seatSeed.value)) } catch { /* private mode */ }
  }

  /** Every roster id in the active league, ascending — the fallback seating. */
  const leagueRosterIds = computed<string[]>(() =>
    Object.keys(src.teamNames.value ?? {}).sort((a, b) => Number(a) - Number(b)),
  )

  /** Mock slot -> league roster id. Null when practice seating is impossible. */
  const seatMap = computed<Record<number, string> | null>(() => {
    if (!practiceMode.value) return null
    const teams = effectiveTeams.value
    if (leagueOrderKnown.value) {
      return buildSeatMap({
        mockTeams: teams,
        leagueTeams: Object.keys(realSlotToRosterId.value).length,
        mySlotInMock: mySlot.value ?? 0,
        mySlotInLeague: mySlotInLeague.value,
        realSlotToRosterId: realSlotToRosterId.value,
      })
    }
    // No published order: a stable arbitrary seating the user can re-roll.
    const ids = leagueRosterIds.value
    if (ids.length !== teams || teams <= 0) return null
    return shuffledSeating(ids, seatSeed.value)
  })

  const practiceAvailable = computed(
    () => !draftIsThisLeague.value && hasHistory.value && leagueRosterIds.value.length > 0,
  )
  const practiceUnavailableReason = computed(() => {
    if (!practiceMode.value) return ''
    if (seatMap.value) return ''
    if ((mySlot.value ?? 0) < 1) return "Couldn't tell which seat is yours in this mock."
    if (leagueRosterIds.value.length !== effectiveTeams.value) {
      return `This mock has ${effectiveTeams.value} teams and your league has ${leagueRosterIds.value.length}. Practice seating needs them to match.`
    }
    return 'Your league’s draft order is unavailable.'
  })

  /**
   * Whose history models this seat. In a practice room that is a real league
   * mate; otherwise it is the seat's own roster in the connected draft.
   */
  const teamKeyForSlot = (slot: number): string =>
    seatMap.value?.[slot] ?? rosterIdForSlot(slot)
```

- [ ] **Step 2: Point the survival sim and the reasons at it**

Change the `priorForSlot` line inside `survivalResult`:

```ts
      priorForSlot: (slot) => priorFor(tendencies.value, teamKeyForSlot(slot), bucketForMyPick.value),
```

And in `upcoming`, change the first line of the map body:

```ts
      const teamKey = teamKeyForSlot(slot)
```

Both must use the same function, or the simulation and the sentence explaining it would describe different people.

- [ ] **Step 3: Name the seated manager**

Still in `upcoming`, the `teamName` must resolve through the league's names when a seat map is in play, because `teamKey` is now a league roster id rather than a mock one. Replace the `teamName` line with:

```ts
        teamName:
          (opponentIdentity.value === 'real' ? src.teamNames.value?.[teamKey] : null) ??
          `Team ${slot}`,
```

(That is the same text Task 2 introduced — `teamKey` now carries the league roster id, so it resolves.)

- [ ] **Step 4: Return the new state**

Add to the return object:

```ts
    seatMap,
    practiceAvailable,
    practiceUnavailableReason,
    reshuffleSeats,
```

- [ ] **Step 5: Verify**

Run: `npx vitest run`
Expected: PASS, whole suite. `practiceMode` is still `false` everywhere, so `seatMap` is `null` and `teamKeyForSlot` returns `rosterIdForSlot(slot)` — identical to before.

Run: `npm run build 2>&1 | grep -E "error|built"`
Expected: `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useDraftRoom.ts
git commit -m "feat(draft): model mock opponents on the league mate seated there"
```

---

### Task 5: The toggle and the banner

**Files:**
- Modify: `src/views/DraftRoomView.vue`

**Interfaces:**
- Consumes: `practiceMode`, `practiceAvailable`, `practiceUnavailableReason`, `leagueOrderKnown`, `reshuffleSeats` from Tasks 2–4.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Destructure the new state**

In the `useDraftRoom()` destructure at the top of `<script setup>`, add:

```ts
  practiceMode, practiceAvailable, practiceUnavailableReason, leagueOrderKnown, reshuffleSeats,
```

- [ ] **Step 2: Add the toggle and banner**

In the template, immediately BEFORE the existing `v-if="!hasHistory"` paragraph (around line 453), insert:

```html
      <!--
        Practice mode puts real league mates' names on a mock. That is the exact
        shape of a bug this room already had once — bots wearing league mates'
        names, with nothing on screen saying so. The banner is the fix, so it is
        not dismissible while the mode is on.
      -->
      <label v-if="practiceAvailable" class="mb-3 flex cursor-pointer items-center gap-2 font-mono text-[11px] text-dark-textMuted">
        <input type="checkbox" v-model="practiceMode" class="h-3 w-3 accent-primary" />
        practice against my league
      </label>

      <template v-if="practiceMode">
        <p v-if="practiceUnavailableReason" class="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-[11px] text-amber-300">
          Practice seating unavailable — {{ practiceUnavailableReason }} Opponents are modelled on the market instead.
        </p>
        <p v-else class="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-[11px] text-primary">
          <span class="font-semibold uppercase tracking-wide">Practice mode</span>
          <span class="text-dark-textMuted">
            real tendencies from your league, seated on a mock.
            <template v-if="leagueOrderKnown">Seats match your real draft order.</template>
            <template v-else>Seats are <strong class="text-amber-300">not</strong> your real draft order.</template>
          </span>
          <button v-if="!leagueOrderKnown" @click="reshuffleSeats"
                  class="rounded border border-dark-border px-2 py-0.5 text-dark-textMuted transition-colors hover:text-dark-text">
            shuffle seats
          </button>
        </p>
      </template>
```

- [ ] **Step 3: Suppress the no-history notice in practice mode**

The existing `!hasHistory` paragraph says opponents are modelled on the market. In practice mode that is either wrong or already said by the banner. Change its condition from:

```html
      <p v-if="!hasHistory" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
```

to:

```html
      <p v-if="!hasHistory && !practiceMode" class="mb-3 rounded-lg border border-dark-border bg-dark-card px-3 py-2 font-mono text-[11px] text-dark-textMuted">
```

- [ ] **Step 4: Verify**

Run: `npm run build 2>&1 | grep -E "error|built"`
Expected: `✓ built`.

Run: `npx vue-tsc --noEmit`
Expected: no errors in `DraftRoomView.vue` or `useDraftRoom.ts`. Pre-existing errors elsewhere (e.g. `src/services/yahoo-daily-stats-methods.ts`) are not yours.

Run: `npx vitest run`
Expected: PASS, whole suite.

- [ ] **Step 5: Commit**

```bash
git add src/views/DraftRoomView.vue
git commit -m "feat(draft): practice-mode toggle, with a banner that cannot be mistaken for a real draft"
```

---

### Task 6: Deploy and verify live

**Files:** none modified.

- [ ] **Step 1: Final verification**

```bash
npx vitest run
npm run build 2>&1 | grep -E "error|built"
npx vue-tsc --noEmit
```

- [ ] **Step 2: Push the working branch**

```bash
git push origin redesign/my-team-first
```

This project deploys from `redesign/my-team-first`, not `main`. `main` is hundreds of commits behind; pushing it does nothing useful.

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 4: Verify the live bundle matches the local build**

```bash
L=$(grep -o 'index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1)
curl -sL https://www.ultimatefantasydashboard.com/ | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1
```

Expected: the two hashes match. Vercel's auto-deploy from GitHub is unreliable on this project, so the explicit `--prod` is what ships; the hash comparison is what proves it.

---

## Self-Review

**Spec coverage.** Boolean split → Task 2. Ring alignment → Task 1. League draft order fetch → Task 3. Shuffle fallback and persisted seed → Tasks 1 and 4. Size mismatch declines → Task 1 (`buildSeatMap` returns null) and Task 4 (`practiceUnavailableReason`). Managers with no history fall back to market → unchanged `priorFor` behaviour, which returns a zero-sample prior. Banner → Task 5. `recap.kind` stays `'mock'` → Task 2 Step 2, with a comment. `mulberry32` export → Task 1 Step 1. Every error-handling row in the spec maps to a guard in Task 1 or a branch of `practiceUnavailableReason` in Task 4.

**Placeholder scan.** None. Every code step carries literal code.

**Type consistency.** `buildSeatMap` takes `SeatMapInput` and returns `Record<number, string> | null` in Task 1, consumed with those exact field names in Task 4. `shuffledSeating(rosterIds, seed)` matches. `teamKeyForSlot` is defined in Task 4 and used only there. `practiceMode` is a `ref<boolean>` in Task 2 and `v-model`-bound in Task 5, which requires it to be returned unwrapped — it is, via the return object in Task 2 Step 3.

**One risk worth naming.** Task 4's fallback seating derives league roster ids from `src.teamNames`, which is the connected league's team map. If that is empty at first paint, `practiceAvailable` is false and the toggle does not appear until the league loads. That is the correct failure direction — no toggle rather than a broken one — but it means the toggle can appear a beat after the room does.
