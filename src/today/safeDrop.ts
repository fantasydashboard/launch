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
  // Cross-comparable rest-of-season value used ONLY to rank eligible bodies against each other
  // (lowest first) — a hitter's and a pitcher's number must be on the SAME scale here (category:
  // crossPercentile; points: projected ROS points, already one currency). NOT within-role/side.
  rosValue: number
  // True when this body sits in the bottom tier of the MANAGER'S OWN roster (category:
  // valueTier(roleValue) === 'fringe'; points: bottom-third by points within its own side of the
  // manager's roster). This — not "worse than the best free agent" — is what makes a body a
  // genuinely safe cut: a deep wire must never make a core/solid body look expendable.
  bottomTier: boolean
  reason: 'off-day' | 'IL' | 'benched'
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
