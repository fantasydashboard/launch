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

/** Pitcher slot eligibility from a position string ('P' fills either bucket). */
function pitcherSlots(position: string): { sp: boolean; rp: boolean } {
  const toks = (position || '').split(/[,/|]/).map((t) => t.trim().toUpperCase())
  return { sp: toks.includes('SP') || toks.includes('P'), rp: toks.includes('RP') || toks.includes('P') }
}

/**
 * Pick who a move replaces:
 * - add / stream: the weakest droppable same-side roster player (lowest roleValue
 *   below the keeper floor) — a roster drop, so any same-side player is fair game.
 * - startSit: the weakest *started* same-side player you'd SIT. For pitchers this is a
 *   lineup-slot swap, so the sit must be slot-compatible — an SP candidate sits an SP,
 *   an RP candidate sits an RP (never sit a closer to start a starter). `candidatePosition`
 *   enables that check; without it the slot filter is skipped (back-compat).
 * Returns null when there's no acceptable counterparty (don't churn a strong roster).
 */
export function pickCounterparty(
  roster: RosterSlotPlayer[],
  side: Side,
  kind: ActionKind,
  exclude?: Set<string>,
  candidatePosition?: string,
): RosterSlotPlayer | null {
  const cand = side === 'pit' && candidatePosition ? pitcherSlots(candidatePosition) : null
  const slotOk = (p: RosterSlotPlayer): boolean => {
    // Only constrain start/sit of pitchers; roster drops and hitter slots are fungible.
    if (kind !== 'startSit' || !cand) return true
    const cp = pitcherSlots(p.position)
    return (cand.sp && cp.sp) || (cand.rp && cp.rp)
  }
  const pool = roster
    .filter((p) => p.side === side)
    .filter((p) => (kind === 'startSit' ? p.started : true))
    .filter((p) => p.roleValue < KEEPER_FLOOR)
    .filter((p) => !exclude?.has(p.playerKey))
    .filter(slotOk)
    .sort((a, b) => a.roleValue - b.roleValue)
  return pool[0] ?? null
}
