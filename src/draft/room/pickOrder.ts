/**
 * Draft slot arithmetic — who picks when.
 *
 * Every number the draft room produces depends on this being exactly right: the
 * survival simulation walks the slots between now and your next turn, and VONA is
 * measured at that next turn. A snake off-by-one silently poisons the whole board,
 * so this lives alone and is tested hard.
 */

export interface DraftShape {
  type: 'snake' | 'linear'
  teams: number
  rounds: number
}

const roundOf = (shape: DraftShape, overallPick: number) =>
  Math.ceil(overallPick / shape.teams)

/** 1-indexed draft slot picking at a given overall pick. */
export function slotAtPick(shape: DraftShape, overallPick: number): number {
  const teams = Math.max(1, shape.teams)
  const indexInRound = ((overallPick - 1) % teams) + 1
  if (shape.type === 'linear') return indexInRound
  // Snake: even rounds run backwards, which is what puts the same slot on
  // consecutive picks at the turn.
  const round = roundOf(shape, overallPick)
  return round % 2 === 0 ? teams - indexInRound + 1 : indexInRound
}

/** Total picks in the draft. */
const totalPicks = (shape: DraftShape) => Math.max(0, shape.teams * shape.rounds)

/**
 * My next overall pick strictly after `afterOverallPick`, or null if the draft is
 * exhausted. Pass 0 to get my first pick.
 */
export function nextPickFor(
  shape: DraftShape,
  mySlot: number,
  afterOverallPick: number,
): number | null {
  const end = totalPicks(shape)
  for (let p = afterOverallPick + 1; p <= end; p++) {
    if (slotAtPick(shape, p) === mySlot) return p
  }
  return null
}

/**
 * Slots picking strictly between two overall picks, in pick order. This is the
 * sequence the survival simulation plays out. Empty when the picks are adjacent
 * (the turn) or the range is degenerate.
 */
export function slotsBetween(
  shape: DraftShape,
  fromOverallPick: number,
  toOverallPick: number,
): number[] {
  const out: number[] = []
  if (!(toOverallPick > fromOverallPick + 1)) return out
  const end = Math.min(toOverallPick - 1, totalPicks(shape))
  for (let p = fromOverallPick + 1; p <= end; p++) out.push(slotAtPick(shape, p))
  return out
}
