import { HOCKEY_SLOT_ACCEPTS } from './hockeyPositions'
import { slotAtPick, nextPickFor, slotsBetween, type DraftShape } from '@/draft/room/pickOrder'

/**
 * A draft you run yourself, with the clock and the roster derived from the picks you mark.
 *
 * WHY THIS EXISTS RATHER THAN FOLLOWING ESPN. ESPN's read API does not publish an
 * in-progress draft. Measured against a live one: `mDraftDetail` returned `inProgress: true`
 * alongside all 220 picks EMPTY, every team roster came back with zero players, transactions
 * were zero, and the draft-room feed that does carry live picks answered 401 — it belongs to
 * a league member's session, not to a public read. So a board that waits for ESPN to tell it
 * what happened waits until the draft is over.
 *
 * Everything here is therefore derived from one input: the ordered list of players taken.
 * That list is the only thing a human has to supply, and from it come the pick number, whose
 * turn it is, how long until yours, which of the picks were yours, and what your roster still
 * needs. No network, no feed, nothing that can silently go stale mid-draft.
 *
 * SNAKE IS ASSUMED because it is ESPN's default and what nearly every league runs. It is a
 * parameter rather than a constant so a linear league is a value and not a rewrite.
 *
 * THE SLOT ARITHMETIC IS NOT LOCAL. It was — this file grew its own snake maths before
 * anybody checked, and the football draft room already had `pickOrder`, sport-agnostic and
 * with a header saying it "lives alone and is tested hard" precisely because an off-by-one
 * there silently poisons every number downstream. Two implementations of the same snake is
 * one more than anybody should maintain, so this delegates.
 *
 * SLOTS ARE ONE-BASED, matching pickOrder and the draft grid. They were zero-based here,
 * which is how a "seat 9" in one module met a "seat 9" in another and meant a different
 * chair.
 */

export type DraftKind = 'snake' | 'linear'

const shapeOf = (teams: number, rounds: number, kind: DraftKind): DraftShape =>
  ({ type: kind, teams, rounds })

/**
 * Which team owns each pick, as a one-based slot number.
 *
 * Snake reverses every other round: in a ten-team league slot 1 picks 1st and 20th, and the
 * two-pick turn at the wrap is the whole reason a drafter needs this computed rather than
 * guessed. Returns one entry per pick in the draft.
 */
export function pickOwners(teams: number, rounds: number, kind: DraftKind = 'snake'): number[] {
  if (teams <= 0 || rounds <= 0) return []
  const shape = shapeOf(teams, rounds, kind)
  return Array.from({ length: teams * rounds }, (_, i) => slotAtPick(shape, i + 1))
}

export interface DraftPosition {
  /** One-based overall pick currently on the clock. */
  pick: number
  round: number
  /** One-based slot on the clock, or null once the draft is done. */
  onTheClockSlot: number | null
  /** Picks that must happen before yours. Zero means you are up. Null when you have none left. */
  picksUntilMine: number | null
  /** One-based overall numbers of your next two picks. */
  myNextPick: number | null
  myFollowingPick: number | null
  /** One-based overall numbers of every pick you own, past and future. */
  myPicks: number[]
  complete: boolean
}

/**
 * Where the draft stands after `takenCount` picks.
 *
 * `picksUntilMine` is the number a drafter actually plans against — how many players can come
 * off the board before their turn, and therefore how far down their own list they should be
 * willing to look. A snake swings it between one and nineteen in a ten-team league.
 */
export function draftPosition(
  takenCount: number,
  teams: number,
  mySlot: number | null,
  rounds: number,
  kind: DraftKind = 'snake',
): DraftPosition {
  const empty: DraftPosition = {
    pick: takenCount + 1, round: 0, onTheClockSlot: null, picksUntilMine: null,
    myNextPick: null, myFollowingPick: null, myPicks: [], complete: false,
  }
  if (teams <= 0 || rounds <= 0) return empty

  const shape = shapeOf(teams, rounds, kind)
  const total = teams * rounds
  const complete = takenCount >= total
  const current = Math.min(takenCount + 1, total)

  /* Every pick this slot owns, so a drafter can see the whole shape of their draft rather
     than only the next turn. */
  const myPicks: number[] = []
  if (mySlot !== null) {
    let p = nextPickFor(shape, mySlot, 0)
    while (p !== null) { myPicks.push(p); p = nextPickFor(shape, mySlot, p) }
  }
  const upcoming = myPicks.filter((p) => p > takenCount)

  return {
    pick: current,
    round: Math.ceil(current / teams),
    onTheClockSlot: complete ? null : slotAtPick(shape, takenCount + 1),
    /* Counted from the current pick, so "0" means the pick on the clock is yours. */
    picksUntilMine: upcoming.length ? upcoming[0] - takenCount - 1 : null,
    myNextPick: upcoming[0] ?? null,
    myFollowingPick: upcoming[1] ?? null,
    myPicks,
    complete,
  }
}

/**
 * The seats picking between the clock and your next turn, in order.
 *
 * This is the sequence the survival simulation walks, and it was being sliced out of a
 * materialised owners array at the call site. Delegated for the same reason as the rest: one
 * snake, tested once.
 */
export function slotsBeforeMyPick(
  takenCount: number,
  teams: number,
  mySlot: number | null,
  rounds: number,
  kind: DraftKind = 'snake',
): number[] {
  if (mySlot === null || teams <= 0 || rounds <= 0) return []
  const shape = shapeOf(teams, rounds, kind)
  const next = nextPickFor(shape, mySlot, takenCount)
  if (next === null) return []
  /* From the pick on the clock up to but excluding mine. slotsBetween is exclusive at both
     ends, so it is anchored one before the current pick. */
  return slotsBetween(shape, takenCount, next)
}

export interface RosterSlotFill {
  slot: string
  /** Player keys sitting in this slot. */
  filled: string[]
  /** Openings still unfilled. */
  open: number
}

/**
 * Lay a set of drafted players into the league's starting slots.
 *
 * STRICT SLOTS BEFORE SHARED ONES, which is the whole difficulty. A centre can fill a C
 * opening, a forward opening or a utility opening; a defenceman can fill D or utility. Seating
 * him in utility first would leave a C opening that only a centre can fill and no centre left
 * to fill it, so the roster would report a need the drafter does not have. Filling the
 * narrowest eligible slot first avoids that without a full assignment solve.
 *
 * Anything that fits nowhere is bench, which is a real answer rather than an error: a roster
 * carries more players than it starts.
 */
export function fillRoster(
  players: Array<{ playerKey: string; position: string }>,
  slots: Record<string, number>,
): { slots: RosterSlotFill[]; bench: string[] } {
  const openings: RosterSlotFill[] = Object.entries(slots)
    .filter(([, n]) => n > 0)
    .map(([slot, n]) => ({ slot, filled: [], open: Math.round(n) }))

  /* Narrowest first: a slot that accepts one position is scarcer than one that accepts four. */
  const width = (slot: string) => (HOCKEY_SLOT_ACCEPTS[slot] ?? [slot]).length
  const bench: string[] = []

  for (const p of players) {
    const pos = String(p.position || '').toUpperCase()
    const candidates = openings
      .filter((o) => o.open > 0 && (HOCKEY_SLOT_ACCEPTS[o.slot] ?? [o.slot]).includes(pos))
      .sort((a, b) => width(a.slot) - width(b.slot))
    const seat = candidates[0]
    if (seat) { seat.filled.push(p.playerKey); seat.open -= 1 }
    else bench.push(p.playerKey)
  }
  return { slots: openings, bench }
}

/**
 * Which positions would actually help, given what is already on the roster.
 *
 * Returns the positions that can still fill an OPEN starting slot. A drafter with every
 * forward seat full and two defence seats open should not be shown a forward at the top of
 * the board without knowing that, and "best available" alone will not tell them.
 *
 * Empty means every starting slot is full — at which point best-available is correct again,
 * and saying nothing is the right amount to say.
 */
export function positionsStillNeeded(
  players: Array<{ playerKey: string; position: string }>,
  slots: Record<string, number>,
): string[] {
  const { slots: filled } = fillRoster(players, slots)
  const needed = new Set<string>()
  for (const o of filled) {
    if (o.open <= 0) continue
    for (const pos of HOCKEY_SLOT_ACCEPTS[o.slot] ?? [o.slot]) needed.add(pos)
  }
  return [...needed]
}
