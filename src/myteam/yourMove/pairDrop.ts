import type { ActionKind, Side } from './types'

// A player whose within-position value is at or above this is a keeper — we never
// drop or sit them for a swap. Below it, they're fair game.
export const KEEPER_FLOOR = 50

/** A roster player with the info needed to be a drop/sit counterparty (and to seed
 * the start/sit generator from the benched subset). */
export interface RosterSlotPlayer {
  playerKey: string
  name: string
  team: string
  position: string
  side: Side
  roleValue: number
  started: boolean
  stats: Record<string, number>
}

/**
 * Pick who a move replaces:
 * - add / stream: the weakest droppable same-side roster player (lowest roleValue
 *   below the keeper floor).
 * - startSit: the weakest *started* same-side player (the one you'd sit).
 * Returns null when there's no acceptable counterparty (don't churn a strong roster).
 */
export function pickCounterparty(
  roster: RosterSlotPlayer[],
  side: Side,
  kind: ActionKind,
  exclude?: Set<string>,
): RosterSlotPlayer | null {
  const pool = roster
    .filter((p) => p.side === side)
    .filter((p) => (kind === 'startSit' ? p.started : true))
    .filter((p) => p.roleValue < KEEPER_FLOOR)
    .filter((p) => !exclude?.has(p.playerKey))
    .sort((a, b) => a.roleValue - b.roleValue)
  return pool[0] ?? null
}
