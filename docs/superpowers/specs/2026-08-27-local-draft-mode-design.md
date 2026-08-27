# Local Draft Mode — Design

**Date:** 2026-08-27
**Status:** Approved for planning (design decisions delegated; see "Decisions made")

## Goal

Run a full draft inside the Draft Room against your real league — no Sleeper draft
involved. You confirm who is sitting where, then tap players to make picks. Every
existing surface (board, survival, opponent tendencies, grid, roster, recap,
replay, history) works exactly as it does on a live draft.

The point is rehearsal: today the opponent model can only be exercised during the
one draft a year that cannot be repeated, or against a Sleeper mock that has to be
created, sized correctly and started first.

## The seam

Everything in the room derives from **two refs**:

- `picks: ref<any[]>` — Sleeper pick objects
- `draftMeta: ref<any>` — of which exactly twelve fields are ever read:
  `status`, `type`, `settings`, `settings.teams`, `settings.rounds`, `draft_id`,
  `slot_to_roster_id`, `draft_order`, `season`, `metadata`, `league_id`

  `type` is read through a local alias (`const m = draftMeta.value; m.type` in the
  `shape` computed), so a grep for `draftMeta.value?.` misses it. It drives
  snake-vs-linear and an omitted `type` would silently make every draft a snake.

Nothing else touches the network. So local mode does not need a parallel room: it
supplies those two refs from a locally-owned pick log, and the rest of the code
cannot tell the difference. No consumer changes.

This is the whole architectural bet, and it is why this is a contained feature
rather than a second draft room.

## Data model

A local draft belongs to one league and one season.

```ts
interface LocalPick {
  overall: number          // 1-based
  playerKey: string        // Sleeper player id
  name: string
  position: string
  proTeam: string
}

interface LocalDraft {
  leagueId: string
  season: string
  teams: number
  rounds: number
  type: 'snake' | 'linear'
  /** slot (1-based) -> league roster id. The seating the user confirmed. */
  slotToRosterId: Record<number, string>
  mySlot: number
  picks: LocalPick[]
  startedAt: string        // ISO
  updatedAt: string        // ISO
}
```

`picks` is an append-only log; `overall` is always `picks.length + 1` at the time
of writing. Undo pops the last entry. There is no partial or out-of-order pick
entry — a draft is a sequence, and allowing holes would put the seat ring and the
pick log out of step, which is the failure this design most wants to avoid.

## Architecture

### New pure module — `src/draft/room/localDraft.ts`

No Vue, no I/O, fully unit-testable. This is where the correctness lives.

- `blankLocalDraft(input): LocalDraft`
- `addLocalPick(d, player): LocalDraft` — appends; refuses past `teams * rounds`
- `undoLocalPick(d): LocalDraft` — pops; no-op when empty
- `localDraftMeta(d): any` — the synthetic `draftMeta`, supplying all eleven
  fields, `type` included. `status` is derived: `'pre_draft'` with no picks, `'complete'` when
  `picks.length >= teams * rounds`, otherwise `'drafting'`.
- `localSleeperPicks(d): any[]` — the pick log rendered in Sleeper's own shape:
  `{ pick_no, player_id, draft_slot, roster_id, metadata: { first_name, last_name, position, team } }`

Seat for an overall pick comes from the existing `slotAtPick(shape, overall)` in
`pickOrder.ts` — the snake logic is already written, tested, and was corrected
once already. It is not reimplemented here.

The name split for `metadata.first_name` / `last_name` mirrors what Sleeper sends,
because `useDraftRoom` rebuilds display names by joining those two fields. A
single-token name puts everything in `first_name` and leaves `last_name` empty.

### New composable — `src/composables/useLocalDraft.ts`

Owns persistence and nothing else. localStorage, keyed per league
(`ufd:localDraft:<leagueId>`), following the `useCustomRankings` /
`useDraftHistory` precedent. A draft in progress must survive a refresh — that is
the single most important thing this composable does.

Exposes: `draft`, `start(config)`, `pick(player)`, `undo()`, `discard()`,
`isActive`.

### Modified — `src/composables/useDraftRoom.ts`

The two refs become computed pass-throughs:

- `localMode` — true when a local draft exists for the active league
- `draftMeta` — the Sleeper meta, or `localDraftMeta(localDraft)` in local mode
- `picks` — the Sleeper feed, or `localSleeperPicks(localDraft)` in local mode

Polling is suspended in local mode; there is nothing to poll. `connectDraft` /
`overrideDraftId` are untouched and continue to own the Sleeper path.

`opponentIdentity` and `opponentModel` resolve to `'real'`/`'league'` in local
mode without going through practice mode: the seats *are* the league's rosters,
so there is no seat map, no ring alignment, and no possibility of the mismatch
practice mode exists to prevent.

### Modified — `src/views/DraftRoomView.vue`

- A **Start a local draft** entry point when no Sleeper draft is connected
- A setup panel: teams, rounds, snake/linear, and the seat list — prefilled from
  the league's published `draft_order` when known (already fetched for practice
  mode), otherwise roster order, reorderable, with the user's own seat marked
- In local mode, tapping a board row **records a pick for whoever is on the
  clock** rather than only flagging the player gone
- An on-the-clock strip: whose pick, round and pick number, and **Undo**
- A persistent banner naming the mode, for the same reason practice mode has one

## Decisions made

These were delegated. Recording them so they are arguable later.

**A local draft is its own kind in History, not a mock.** `DraftRecord['kind']`
gains `'local'`. Filing a solo rehearsal as a mock would mix it into grade
averages alongside drafts against nine live opponents, and the History tab already
exists to keep populations apart. Adding a value is backward compatible: existing
records keep the kind they were written with.

**Not admin-gated.** Practice mode is not, and this is the same class of feature —
core product capability rather than an internal tool. Easy to gate later with the
existing `useFeatureAccess().isAdmin` if that changes.

**One local draft per league at a time.** Starting a new one discards the old,
behind a confirm. Multiple concurrent rehearsals per league is speculative, and
the key can gain a suffix if it is ever wanted.

**No autopick, no bots, no timer.** You enter every pick, including opponents'.
That is what makes it a rehearsal of *reading the room* rather than a simulator,
and it is what the existing tendency model is for. A timer would imply pressure
this mode does not have.

**Local mode wins when both exist.** If a Sleeper draft is connected and a local
draft exists for the league, local mode takes precedence and the banner says so,
with a one-click discard. Silently preferring the Sleeper feed would leave a
half-finished rehearsal invisible.

## Error handling

| Case | Behaviour |
|---|---|
| Corrupt or unparseable stored draft | Ignored, treated as no local draft; never throws during setup |
| Stored draft belongs to another league | Ignored — the key is per league, so this means tampering |
| `teams`/`rounds` non-positive | Setup refuses to start, with the reason shown |
| Seat list incomplete or duplicated | Setup refuses to start; every seat must hold exactly one roster |
| Pick attempted when the draft is complete | No-op |
| Undo on an empty log | No-op |
| Player already picked | Not offered — the board already excludes drafted players |
| localStorage unavailable (private mode) | Mode still runs for the session; a warning says it will not survive a refresh |

## Testing

`localDraft.ts` carries the test weight, because a wrong seat or a wrong pick
number is silent and confident:

- `localSleeperPicks` emits the exact shape `useDraftRoom` consumes, including the
  `first_name`/`last_name` split and a single-token name
- `draft_slot` follows the snake correctly, verified against `slotAtPick` for both
  parities and for a linear draft
- `roster_id` for a pick is the roster the user seated in that slot
- `status` transitions pre_draft → drafting → complete at the right boundaries
- `addLocalPick` refuses past `teams * rounds`; `undoLocalPick` is a no-op on empty
- Round-trip: append N picks, undo N, and the draft equals the blank one
- `localDraftMeta` supplies every one of the twelve fields the room reads,
  `type` among them, and a linear draft stays linear rather than defaulting to snake

`useLocalDraft` gets tests for persistence, corrupt-payload tolerance, and
per-league keying.

## Out of scope

- Autopick, bots, a draft clock
- Editing a pick in place (undo and re-enter instead)
- Sharing a local draft between devices or people
- Importing a finished local draft into Sleeper
