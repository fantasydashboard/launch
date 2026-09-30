/**
 * Whether a seat can be scored at all, and by how much.
 *
 * A SEAT WITH NO NUMBER ON ONE SIDE IS NOT A SEAT SOMEBODY IS WINNING. The matchup computed
 * `edge` as mine minus theirs and treated an absent projection as a zero, so a man who is
 * playing tonight but whom we cannot price handed the whole seat to his opposite number — and
 * the header counted it as a seat won. That is the same fabrication `oppLineupKnown` was added
 * to stop, one level down: there it was a whole lineup we had not read, here it is one player.
 *
 * The distinction that matters is between a real zero and an absent one. A man with no game
 * scores nothing and we know it — that seat is scorable, and its edge is honest. A man who is
 * out on the ice and has no projection is a hole in our knowledge, and the only true thing to
 * say about his seat is that we cannot call it.
 */

export interface SeatSide {
  playsToday: boolean
  /** True when a projection was found. False is "we have no number", never "his number is 0". */
  priced: boolean
  today: number
}

/** A side we could not price is unknown only while he is actually playing. */
export function sideUnknown(side: SeatSide | null): boolean {
  return !!side && side.playsToday && !side.priced
}

/**
 * The seat's edge, and whether it means anything.
 *
 * `known` false leaves the edge at zero rather than at a number nobody should read: a seat we
 * cannot call must not tilt the tally in either direction.
 */
export function seatEdge(
  mine: SeatSide | null,
  theirs: SeatSide | null,
): { edge: number; known: boolean } {
  if (sideUnknown(mine) || sideUnknown(theirs)) return { edge: 0, known: false }
  return { edge: (mine?.today ?? 0) - (theirs?.today ?? 0), known: true }
}
