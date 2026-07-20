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
