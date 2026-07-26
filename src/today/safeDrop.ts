/**
 * Safe-drop selector for the Today board. A "complete move" (add a free agent) needs a body to
 * cut; this picks the safe one. Pure — no Vue, no fetching. The composable supplies the
 * droppable-today candidate set, the per-side wire replacement level, and a `claimed` set so two
 * moves in the same board build never drop the same body.
 */

export interface SafeDrop {
  playerKey: string
  name: string
  // Freeform: why this body is a safe cut (e.g. a dropCandidates reason like "bottom-tier pitcher",
  // or "lowest projected" for points) — no longer tied to today's schedule (see DroppableBody).
  reason: string
}

/** A rostered body in the Wire's drop-to-make-room set (computeDropCandidates ∩ expendable for
 * category leagues; bottom-tier-by-points for points leagues — see useToday.ts), with the
 * rest-of-season value used to rank eligible bodies against each other. */
export interface DroppableBody {
  playerKey: string
  name: string
  side: 'hit' | 'pit'
  // Cross-comparable rest-of-season value used ONLY to rank eligible bodies against each other
  // (lowest first) — a hitter's and a pitcher's number must be on the SAME scale here (category:
  // crossPercentile; points: projected ROS points, already one currency). NOT within-role/side.
  rosValue: number
  // True when this body is in the Wire's genuine drop-to-make-room set (category:
  // computeDropCandidates ∩ expendableKeys; points: FRINGE tier, non-IL). This — not "worse than
  // the best free agent" — is what makes a body a genuinely safe cut: a deep wire must never make
  // a core/solid body look expendable, and an IL body never frees an active spot.
  bottomTier: boolean
  reason: string
}

/**
 * The safe drop for one free-agent move: the lowest rest-of-season-value droppable-today body
 * that is in the bottom tier of the manager's own roster (genuinely expendable — never a core or
 * solid body, no matter how deep the wire is) and not already claimed. `null` when nothing
 * expendable is available — the caller renders "no clean drop".
 */
export function pickSafeDrop(candidates: DroppableBody[], claimed: Set<string>): SafeDrop | null {
  const eligible = candidates
    .filter((b) => !claimed.has(b.playerKey))
    .filter((b) => b.bottomTier)
    .sort((a, b) => a.rosValue - b.rosValue)
  const pick = eligible[0]
  return pick ? { playerKey: pick.playerKey, name: pick.name, reason: pick.reason } : null
}
