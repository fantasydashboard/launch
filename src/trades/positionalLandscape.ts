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
  need: number // 0..1 — unmet/injured slots
}
export type PositionalLandscape = Map<string, Map<string, PosStanding>>

/** A player below this cross-role value isn't a startable body — depth filler, not surplus. */
export const STARTABLE_BAR = 45
/** surplus saturates at this many giveable extras; need saturates at this many unmet slots. */
const SAT = 2

const isInjured = (s?: string): boolean => {
  const u = (s ?? '').toUpperCase()
  return u !== '' && u !== 'ACTIVE' && u !== 'HEALTHY'
}

/** Which concrete sub-positions a slot accepts (flex slots expand; concrete slots are themselves). */
function slotAccepts(slot: string): string[] {
  return FLEX_ELIGIBILITY[slot] ?? [slot]
}
function eligibleForSlot(player: DepthPlayer, slot: string): boolean {
  const accepted = slotAccepts(slot)
  return player.eligiblePositions.some((p) => accepted.includes(p) || p === slot)
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
      const accepted = slotAccepts(pos)
      const eligibleStartable = players.filter(
        (p) => p.value >= bar && p.eligiblePositions.some((e) => accepted.includes(e) || e === pos),
      )
      const startableCount = eligibleStartable.length
      const unmet = a.unfilled.filter((u) => u.position === pos).length
      // bench-bound startable bodies eligible here = surplus supply at this position.
      const surplusBodies = a.benchStartable.filter(
        (p) => p.eligiblePositions.some((e) => accepted.includes(e) || e === pos),
      ).length
      const surplus = Math.min(1, surplusBodies / SAT)
      const need = Math.min(1, unmet / SAT)
      m.set(pos, { slots: slots[pos], startableCount, depthRank: 0, surplus, need })
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
