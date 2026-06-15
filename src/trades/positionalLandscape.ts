import { FLEX_ELIGIBILITY } from './rosterSlots'

/** A pool player reduced to what positional depth needs. value = cross-role 0..100. */
export interface DepthPlayer {
  playerKey: string
  teamKey: string
  eligiblePositions: string[]
  value: number
  status?: string // injury/IL ('' / 'ACTIVE' = available). Only my roster carries this.
}

export interface PosStanding {
  slots: number
  startableCount: number
  depthRank: number // cross-team rank of startableCount (1 = deepest). 0 if slot not required.
  surplus: number // 0..1 — giveable extra bodies beyond the slots
  surplusBodies: number // raw count of giveable extras at this concrete position
  need: number // 0..1 — unmet/injured slots
}
export type PositionalLandscape = Map<string, Map<string, PosStanding>>

/**
 * Flex/utility slots are "best-leftover" slots, not scarce positions — a UTIL or MI slot is filled
 * by whichever spare body you have, so it never DEFINES surplus at a concrete position. Surplus is
 * measured only at concrete positions; flex slots can still register NEED (you couldn't field one).
 * Without this, deep-lineup formats (ESPN: MI + CI + 2×UTIL) absorb every spare hitter into a
 * "starting" slot and a loaded roster reads as having surplus nowhere.
 */
export const SURPLUS_FLEX = new Set(['UTIL', 'DH', 'IF', 'MI', 'CI', '2B/SS', '1B/3B', 'P'])

/** A player below this cross-role value isn't a startable body — depth filler, not surplus. */
export const STARTABLE_BAR = 45
/** surplus saturates at this many giveable extras; need saturates at this many unmet slots. */
const SAT = 2

const isInjured = (s?: string): boolean => {
  const u = (s ?? '').toUpperCase()
  return u !== '' && u !== 'ACTIVE' && u !== 'HEALTHY'
}

/** Which concrete sub-positions a slot accepts (flex slots expand; concrete slots are themselves). */
export function slotAccepts(slot: string): string[] {
  return FLEX_ELIGIBILITY[slot] ?? [slot]
}
/** Whether a player's eligible positions can fill the given slot. Shared so the landscape and the
 *  generator judge eligibility identically (no drift between "who's a hole" and "who can fill it"). */
export function coversSlot(eligiblePositions: string[], slot: string): boolean {
  const accepted = slotAccepts(slot)
  return eligiblePositions.some((p) => accepted.includes(p) || p === slot)
}
function eligibleForSlot(player: DepthPlayer, slot: string): boolean {
  return coversSlot(player.eligiblePositions, slot)
}

export interface SlotAssignment {
  filledSlots: number
  unfilled: { position: string }[] // a required slot left empty (or vacated by injury)
  benchStartable: DepthPlayer[] // startable bodies that didn't land a starting slot
}

/**
 * Greedy, scarcity-aware assignment. Expand slot counts into individual openings, order them by
 * how few eligible startable bodies each has (scarcest first), and fill each from the
 * highest-value eligible, still-unassigned, healthy startable player. Injured players never fill a
 * slot (so their would-be slot reads as a hole). Leftover startable bodies are surplus.
 */
export function assignSlots(
  players: DepthPlayer[],
  slots: Record<string, number>,
  bar: number = STARTABLE_BAR,
): SlotAssignment {
  const startable = players.filter((p) => p.value >= bar)
  const healthy = startable.filter((p) => !isInjured(p.status))

  // Expand to individual openings.
  const openings: string[] = []
  for (const [pos, count] of Object.entries(slots)) for (let i = 0; i < count; i++) openings.push(pos)

  // Scarcity of an opening = how many healthy bodies are eligible for it (fewer = fill first).
  const eligCount = (pos: string) => healthy.filter((p) => eligibleForSlot(p, pos)).length
  openings.sort((a, b) => eligCount(a) - eligCount(b))

  const used = new Set<string>()
  const unfilled: { position: string }[] = []
  let filledSlots = 0
  for (const pos of openings) {
    const pick = healthy
      .filter((p) => !used.has(p.playerKey) && eligibleForSlot(p, pos))
      .sort((a, b) => b.value - a.value)[0]
    if (pick) { used.add(pick.playerKey); filledSlots++ }
    else unfilled.push({ position: pos })
  }
  const benchStartable = startable.filter((p) => !used.has(p.playerKey) && !isInjured(p.status))
  return { filledSlots, unfilled, benchStartable }
}

/**
 * Per team × required position: startable depth, surplus (giveable extras), need (unmet/injured
 * slots), and cross-team depthRank. Built per team via assignSlots, then ranked across teams.
 */
export function buildPositionalLandscape(
  pool: DepthPlayer[],
  slots: Record<string, number>,
  bar: number = STARTABLE_BAR,
): PositionalLandscape {
  const byTeam = new Map<string, DepthPlayer[]>()
  for (const p of pool) (byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push(p)

  const positions = Object.keys(slots)
  const out: PositionalLandscape = new Map()
  // startableCount per team per position, for depthRank.
  const countByPos = new Map<string, { teamKey: string; count: number }[]>()

  for (const [teamKey, players] of byTeam) {
    const a = assignSlots(players, slots, bar)
    const m = new Map<string, PosStanding>()
    for (const pos of positions) {
      const eligibleStartable = players.filter(
        (p) => p.value >= bar && coversSlot(p.eligiblePositions, pos),
      )
      const startableCount = eligibleStartable.length
      const unmet = a.unfilled.filter((u) => u.position === pos).length
      // Surplus = concrete-position redundancy: healthy startable bodies eligible here beyond this
      // position's own slot count, regardless of whether flex slots elsewhere absorbed them. Flex
      // slots themselves never define surplus (see SURPLUS_FLEX).
      const surplusBodies = SURPLUS_FLEX.has(pos)
        ? 0
        : Math.max(0, eligibleStartable.filter((p) => !isInjured(p.status)).length - slots[pos])
      const surplus = Math.min(1, surplusBodies / SAT)
      const need = Math.min(1, unmet / SAT)
      m.set(pos, { slots: slots[pos], startableCount, depthRank: 0, surplus, surplusBodies, need })
      ;(countByPos.get(pos) ?? countByPos.set(pos, []).get(pos)!).push({ teamKey, count: startableCount })
    }
    out.set(teamKey, m)
  }

  // depthRank: 1 = deepest startableCount at the position (ties share the better rank).
  for (const [pos, rows] of countByPos) {
    const sorted = [...rows].sort((a, b) => b.count - a.count)
    let rank = 0, prev = Infinity
    sorted.forEach((r, i) => {
      if (r.count < prev) { rank = i + 1; prev = r.count }
      out.get(r.teamKey)!.get(pos)!.depthRank = rank
    })
  }
  return out
}
