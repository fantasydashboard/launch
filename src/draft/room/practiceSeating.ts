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
 * Is this seat map safe to seat real people with?
 *
 * Counting keys is not enough. `Object.keys(map).length` counts a key whose
 * value is `undefined` — a map built by assigning into every slot from a source
 * that ran short reports the full team count while some seats hold nothing. The
 * consumer then reads `map[slot]`, gets `undefined`, and falls through to
 * whatever its fallback is; in a practice room that fallback used to be the
 * MOCK's roster id, which collides with an unrelated LEAGUE roster id and puts
 * a real person's name and draft history on a seat that is not theirs.
 *
 * Since `teamKeyForSlot` no longer falls back at all when practice is engaged,
 * this is the whole safety net: every slot from 1..teams must carry a non-empty
 * string, or there is no seating and practice mode declines.
 */
export function isCompleteSeatMap(
  map: Record<number, string> | null | undefined,
  teams: number,
): boolean {
  if (!map || !Number.isFinite(teams) || teams <= 0) return false
  // Extra keys mean the map was not built from this ring; refuse rather than
  // seat from a map we do not understand.
  if (Object.keys(map).length !== teams) return false
  for (let slot = 1; slot <= teams; slot++) {
    const key = map[slot]
    if (typeof key !== 'string' || key === '') return false
  }
  return true
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
