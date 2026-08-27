/**
 * Pure logic behind the local-draft setup panel (`DraftRoomView.vue`).
 *
 * Kept out of the SFC, like every other rule this room has been burned by
 * skipping, so it can be driven directly in a test instead of only being
 * reachable by mounting the whole draft room: a duplicate or a hole in the
 * seat list, an `Infinity` rounds count typed into a number field, and a
 * published order with a genuine gap all have to be caught before anything
 * reaches `useLocalDraft.start()`, which itself performs no validation on the
 * write path.
 */

/**
 * Seats prefilled from the league's published draft order, one per slot.
 *
 * `String(published[i + 1])` on a missing key would read back as the literal
 * string `"undefined"` — truthy, and invisible to a `!seat` hole check. A
 * published order that has a genuine gap (a slot Sleeper never assigned a
 * roster to) would otherwise seat that slot with a value that looks occupied
 * but isn't, and the ring and the pick log would go out of step exactly like
 * the duplicate/hole case `localSetupError` exists to catch. Missing entries
 * come back as `''` instead, so they fall through to that same check.
 */
export function seatsFromPublished(ids: string[], published: Record<number, string>): string[] {
  return Array.from({ length: ids.length }, (_, i) => (published[i + 1] ? String(published[i + 1]) : ''))
}

/** Which 1-based seat holds `teamKey`, or 0 if it isn't seated at all. */
export function seatIndexOf(seats: string[], teamKey: string): number {
  const i = seats.findIndex((id) => id === teamKey)
  return i === -1 ? 0 : i + 1
}

export interface LocalSetupState {
  seats: string[]
  rounds: number
  mySlot: number
}

/**
 * Every seat must hold exactly one roster, or the ring and the log go out of
 * step — the resulting draft looks completely normal while attributing every
 * pick to the wrong manager.
 *
 * The hole check runs BEFORE the duplicate check: two empty seats are two
 * holes, but `new Set(['', '', 'r3']).size` is 2, same as `seats.length - 1`
 * for one real duplicate — so checking duplicates first reported "Two seats
 * hold the same team" for a state that has no duplicate roster in it at all.
 *
 * `Number.isInteger`, not `rounds < 1` alone: `rounds` is typed into a free
 * number field, and `Number("1e400")` — reachable by typing, same failure as
 * `JSON.parse('1e400')` — is `Infinity`, which is NOT `< 1`. An `Infinity`
 * rounds count surviving a lower-bound-only check makes `totalLocalPicks`
 * (teams * rounds) and every `Math.max` built on it downstream behave
 * nonsensically instead of throwing. The upper bound of 30 matches the
 * input's own `max` (which `v-model.number` does not itself enforce) for a
 * second reason beyond sanity: `useLocalDraft`'s storage layer rejects
 * `rounds > 1000` on load, so a value this check accepted but storage refused
 * would write successfully and then vanish on the next refresh with no
 * message — and `buildDraftGrid` loops `rounds * teams` unconditionally, so a
 * merely large-but-under-1000 value (say, 500) would hang the Grid tab
 * rendering tens of thousands of cells before storage ever got a chance to
 * object.
 */
export function localSetupError({ seats, rounds, mySlot }: LocalSetupState): string {
  if (!seats.length) return 'This league has no teams loaded yet.'
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30) {
    return 'Rounds must be a whole number from 1 to 30.'
  }
  if (seats.some((s) => !s)) return 'Every seat needs a team.'
  if (new Set(seats).size !== seats.length) return 'Two seats hold the same team.'
  if (mySlot < 1 || mySlot > seats.length) return "Couldn't find your team in this league's seats."
  return ''
}
