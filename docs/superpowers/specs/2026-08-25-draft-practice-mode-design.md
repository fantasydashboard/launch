# Draft Practice Mode — Design

**Date:** 2026-08-25
**Status:** Approved for planning

## Goal

Let a manager run a Sleeper mock draft while the room models opponents on their
real league mates' draft history — so the opponent-reading intelligence can be
practised before draft night instead of being available only during the one
draft that cannot be repeated.

## The problem, precisely

`useDraftRoom.ts:325` defines a single boolean:

```ts
const draftIsThisLeague = computed(() => {
  const draftLeague = String(draftMeta.value?.league_id ?? '')
  const active = String(leagueStore.activeLeagueId ?? '')
  return !!draftLeague && draftLeague === active
})
```

It gates two unrelated things:

| Consumer | What it controls | Line |
|---|---|---|
| `teamAvatarForSlot` | identity | 367 |
| `draftUserNames` fetch | identity | 374 |
| `upcoming[].teamName` | identity | 418 |
| `teamNameForSlot` | identity | 1127 |
| `historicalPicks` | **intelligence** | 374 (early return) |
| `recap.kind` | classification | 1076 |

That boolean exists because of a real bug: connecting a mock while a league was
active made bots inherit league mates' names and years of their tendencies, so a
manager who had not played in three seasons appeared to be "picking before you".
Suppressing both halves fixed it and removed this capability as collateral.

The two halves are independent:

```
opponentIdentity:  real | anonymous   ->  names and avatars
opponentModel:     league | market    ->  whose tendencies the sim draws from
```

- Real league draft: `real + league` (unchanged)
- Plain mock: `anonymous + market` (unchanged)
- **Practice mode: `real + league` on a mock** — inexpressible today

## Seating

In a mock, seat 4 is not Mike. Practice mode needs a `seatMap`: mock slot → real
league roster id.

Built by aligning the two seat rings at the manager's own seat:

```
offset   = mySlotInMock - mySlotInLeague
realSlot = ((mockSlot - offset - 1) mod N + N) mod N + 1
rosterId = realSlotToRosterId[realSlot]
```

Whoever picks immediately after you in your league picks immediately after you in
the mock. That is what makes "who picks between my picks, and what do they do"
faithful, which is the whole point of the exercise.

`realSlotToRosterId` comes from the league's own draft, fetched with
`sleeperService.getLeagueDrafts(activeLeagueId)`. That endpoint returns the draft
object **before the draft starts**, including `draft_order` once the commissioner
has set it — verified against the live API.

### When the real order is not published

Seat by ascending roster id — stable across reloads — and expose a **shuffle**
that re-rolls the arrangement with a seeded permutation. Each shuffle rehearses
drawing a different slot. The seed is persisted per league so a room does not
silently re-seat itself on refresh.

### Size mismatch

Ring alignment requires the mock and the league to have the same number of teams.
If they differ, practice mode declines and says so. It does not seat people
approximately: a wrong seat produces a confident, specific, wrong read, which is
worse than no read.

### Managers with no history

Fall back to the market model for that seat, exactly as today. Practice mode
never invents a tendency for someone who has none.

## Identity and the banner

This deliberately reintroduces real names into a mock, which is the territory of
the bug that motivated the original gate. The distinction: **the bug was not
"names in a mock", it was names in a mock with nothing on screen saying they were
fabricated.** A manager had no way to know Scuttlebucs was not really picking.

So names return, and the room carries a banner that cannot be dismissed while
practice mode is on:

> **Practice mode** — real tendencies from your league, seated on a mock.
> Seats match your real draft order.

or, when the order is unknown:

> **Practice mode** — real tendencies from your league, seated on a mock.
> Seats are **not** your real draft order. [shuffle]

## Control

A practice-mode toggle appears in the Draft Room header only when both hold:

1. the connected draft is a mock (`!draftIsThisLeague`), and
2. the active league has draft history (`historicalDrafts` is non-empty)

Off by default. Off, behaviour is byte-identical to today.

## Architecture

**New pure module — `src/draft/room/practiceSeating.ts`**

No Vue, no I/O, fully unit-testable:

- `buildSeatMap(input: { mockTeams: number; leagueTeams: number; mySlotInMock: number; mySlotInLeague: number; realSlotToRosterId: Record<number, string> }): Record<number, string> | null`
  Returns null on size mismatch or missing inputs — the caller treats null as
  "practice mode unavailable".
- `shuffledSeating(rosterIds: string[], seed: number): Record<number, string>`
  A seeded permutation, deterministic for a seed, used when no real order exists.
  Reuse the existing `mulberry32` from `survival.ts` rather than adding a second
  PRNG to the codebase. It is currently module-private at `survival.ts:54` and
  must be exported — a one-word change, and the only edit this feature makes to
  that file. Its behaviour is unchanged and its existing tests still cover it.

**Modified — `src/composables/useDraftRoom.ts`**

- Split the boolean into `opponentIdentity` and `opponentModel` computeds.
  Every one of the six consumers above moves to whichever of the two it actually
  meant. `recap.kind` stays tied to the league check, not to practice mode: a
  practice room is still a mock and must be filed as one.
- Fetch the league's own draft meta to obtain `realSlotToRosterId`.
- Build `seatMap`, and route `priorForSlot` (line 547) and `upcoming` (line 415)
  through it when practice mode is on, so both the survival simulation and the
  displayed reason use the same seating.

**Modified — `src/views/DraftRoomView.vue`**

Toggle, banner, and shuffle control.

## What this must not touch

- Scoring, the board, VONA, survival mathematics. Exporting `mulberry32` is a
  visibility change only; no survival behaviour moves.
- The real-league draft path, which already works
- `recap.kind` — a practice draft is a mock in History, never a league draft

## Error handling

| Case | Behaviour |
|---|---|
| Mock and league sizes differ | Practice mode unavailable, with the reason shown |
| League has no draft history | Toggle not offered |
| League draft fetch fails | Toggle not offered; the room stays a normal mock |
| `mySlot` unknown in either draft | Practice mode unavailable — without an anchor there is no alignment |
| A seat maps to a manager with no history | That seat uses the market model |

## Testing

Unit tests for `practiceSeating.ts`:

- ring alignment places the league-mate who follows you in your league
  immediately after you in the mock
- alignment wraps correctly when your mock seat is near either end
- a differing offset in each direction produces the correct rotation
- size mismatch returns null rather than an approximate map
- `shuffledSeating` is deterministic for a seed and differs across seeds
- every seat in a returned map is a distinct roster id, and every league roster
  id appears exactly once

The seating is where a silent, confident, wrong answer is possible, so it carries
the test weight. The view work is a toggle and a banner.

## Out of scope

- Manual seat assignment (considered and rejected: ring alignment gives the
  practice value with no setup screen)
- Practising against another league's history
- Any change to how tendencies themselves are computed or shrunk
