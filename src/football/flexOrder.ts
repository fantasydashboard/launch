/**
 * FOOTBALL ONLY: the order you seat an already-decided lineup in.
 *
 * Which players start is a points question and this module does not touch it. Which SEAT each
 * of them takes is a different question with a real answer, and the optimiser was answering it
 * by accident — it fills the scarcest slots first with the highest value left, so whoever
 * happened to rank lowest fell into the flex regardless of when he plays.
 *
 * THE COST OF GETTING IT WRONG. Football locks each player at his own kickoff. Whichever
 * starter is ruled out, you replace him IN HIS OWN SEAT, so the seat still open when the news
 * lands decides what you are allowed to do about it. A Thursday back in the flex spends the
 * widest seat on the board before the week has started: come Sunday morning your live seats are
 * all rigid, and a scratched RB2 can only be answered with another running back. Seat that same
 * Thursday back at RB2 and the live seat is the flex, which any back, receiver or tight end on
 * your bench can fill.
 *
 * So: EARLY KICKOFFS GO IN RIGID SEATS, AND THE WIDEST SEAT HOLDS THE LATEST KICKOFF. The
 * lineup is identical, the projection is identical to the decimal, and the week stays open.
 *
 * Nothing here is a start/sit recommendation and it must never be presented as one — a manager
 * told to "move Jones to the flex" when his points do not change will stop reading the ones
 * where they do.
 */
import { coversSlot, slotAccepts } from '@/trades/positionalLandscape'

/** A seat change that costs nothing: same player, same week, different chair. */
export interface SeatMove {
  playerKey: string
  fromSlot: string
  toSlot: string
}

export interface SeatOrderResult {
  /** slot -> playerKeys, the same bodies the optimiser chose, re-seated. */
  assigned: Record<string, string[]>
  /** Only the players whose seat actually changed. Empty means the lineup was already right. */
  moved: SeatMove[]
}

/**
 * How many positions a seat accepts. 1 for QB/RB/K/DEF, 2 for a receiver flex, 3 for FLEX,
 * 4 for SUPER_FLEX — which is exactly the order we want to fill them in.
 */
export function seatWidth(slot: string): number {
  return slotAccepts(slot, 'football').length
}

/**
 * Can every remaining opening still be filled from the remaining players?
 *
 * Kuhn's algorithm. This exists because greedy alone can strand a seat: with an RB, a WR and a
 * FLEX to fill and a dual-eligible RB/WR among the three bodies, handing the RB seat to whoever
 * kicks off earliest can leave the WR seat with nobody, and a lineup with an empty seat scores
 * zero there. Rosters are a dozen players, so checking is free and guessing is not.
 */
function canFillAll(openings: string[], players: string[], eligible: (p: string, slot: string) => boolean): boolean {
  const matchOpening: (string | null)[] = openings.map(() => null)
  const seenFor = (p: string, visited: Set<number>): boolean => {
    for (let i = 0; i < openings.length; i++) {
      if (visited.has(i) || !eligible(p, openings[i])) continue
      visited.add(i)
      const held = matchOpening[i]
      if (held === null || seenFor(held, visited)) {
        matchOpening[i] = p
        return true
      }
    }
    return false
  }
  let matched = 0
  for (const p of players) if (seenFor(p, new Set())) matched++
  return matched >= openings.length
}

/**
 * Re-seat an assignment so early kickoffs hold the rigid seats and the widest seat holds the
 * latest kickoff. Pure; the set of starters is unchanged by construction.
 *
 * `kickoffOf` is milliseconds. A player whose team has no game this week never locks at all, so
 * he is the latest thing on the roster rather than the earliest — `Infinity` is the honest
 * value and it lands him in the flex, which is where a seat that stays changeable belongs.
 *
 * When every kickoff ties (or none is known) candidates fall back to their current seat, so the
 * function is a no-op rather than a reshuffle on no information.
 */
export function orderSeatsByKickoff(input: {
  assigned: Record<string, string[]>
  eligibleOf: (playerKey: string) => string[]
  kickoffOf: (playerKey: string) => number
}): SeatOrderResult {
  const { assigned, eligibleOf, kickoffOf } = input

  const openings: string[] = []
  const starters: string[] = []
  const slotWas = new Map<string, string>()
  for (const [slot, keys] of Object.entries(assigned)) {
    for (const key of keys) {
      openings.push(slot)
      starters.push(key)
      slotWas.set(key, slot)
    }
  }
  if (openings.length < 2) return { assigned, moved: [] }

  const eligible = (p: string, slot: string) => coversSlot(eligibleOf(p), slot, 'football')

  /* Narrowest seat first. The wide seats are filled last on purpose: that is what leaves the
     latest kickoff sitting in the flex. */
  const order = openings
    .map((slot, i) => ({ slot, i }))
    .sort((a, b) => seatWidth(a.slot) - seatWidth(b.slot) || a.slot.localeCompare(b.slot) || a.i - b.i)

  const taken = new Set<string>()
  const out: Record<string, string[]> = {}
  const filled: string[] = []

  for (let n = 0; n < order.length; n++) {
    const slot = order[n].slot
    const rest = order.slice(n + 1).map((o) => o.slot)
    const candidates = starters
      .filter((k) => !taken.has(k) && eligible(k, slot))
      .sort((a, b) =>
        kickoffOf(a) - kickoffOf(b) ||
        /* Ties keep people where they already are, so an unreadable scoreboard changes nothing. */
        Number(slotWas.get(b) === slot) - Number(slotWas.get(a) === slot) ||
        a.localeCompare(b),
      )

    let pick: string | null = null
    for (const c of candidates) {
      const remaining = starters.filter((k) => !taken.has(k) && k !== c)
      if (canFillAll(rest, remaining, eligible)) { pick = c; break }
    }
    /* Every candidate strands a later seat — only reachable if the input was already
       unfillable. Take the earliest and let the caller's own unfilled count speak. */
    if (!pick) pick = candidates[0] ?? null
    if (!pick) continue

    taken.add(pick)
    ;(out[slot] ??= []).push(pick)
    filled.push(pick)
  }

  /* Anyone the walk could not seat keeps the seat the optimiser gave him. Dropping a starter
     to tidy a seating chart would turn a cosmetic pass into a lineup change. */
  for (const k of starters) {
    if (taken.has(k)) continue
    const slot = slotWas.get(k)!
    ;(out[slot] ??= []).push(k)
  }

  const moved: SeatMove[] = []
  for (const [slot, keys] of Object.entries(out)) {
    for (const k of keys) {
      const was = slotWas.get(k)!
      if (was !== slot) moved.push({ playerKey: k, fromSlot: was, toSlot: slot })
    }
  }
  return { assigned: out, moved }
}
