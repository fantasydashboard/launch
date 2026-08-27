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
  /**
   * The seat the user confirmed at setup. NOTHING READS IT — every consumer,
   * the local strip's `localOnClock` included, goes through
   * `useDraftRoom.mySlot`, which scans `slot_to_roster_id` for `myTeamKey` so
   * there is exactly one route to "which seat is mine" (two routes drifted
   * apart twice; see the comment on `localMySlot` in DraftRoomView).
   *
   * Kept anyway, deliberately, along with its bounds check in
   * `useLocalDraft.read`. Dropping the field means dropping the validation,
   * and dropping the validation means every local draft written by the
   * deployed build carries a field this module no longer describes while the
   * test that pins the check has to be deleted to make it pass. A dead field
   * that round-trips is cheaper than a stored draft that stops loading.
   */
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
    /* No user ids exist in a local draft, so draft_order has nothing to key on.
       Deliberately empty: useDraftRoom.mySlot falls through to
       slot_to_roster_id, which is the seating above and the ONE route to the
       user's seat. Not `d.mySlot` — see the comment on that field. */
    draft_order: {},
    metadata: {},
  }
}
