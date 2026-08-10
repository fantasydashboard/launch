/**
 * Whether another player at this position could actually start for you.
 *
 * VONA is measured per position and is blind to what you already own: it will
 * happily rate a fifth running back on how he compares to the next back
 * available, never noticing you cannot play him. Early that is harmless, because
 * flex slots absorb the overflow. By the middle rounds it is not.
 *
 * So value is discounted once a position can no longer reach your starting
 * lineup. It is a discount and not a zero: a bench back still carries real
 * injury insurance and trade value, just far less than a starter.
 */

/** Which positions each flex slot will accept. */
const FLEX_ELIGIBILITY: Record<string, string[]> = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  REC_FLEX: ['WR', 'TE'],
  WR_RB: ['RB', 'WR'],
  WR_TE: ['WR', 'TE'],
}
const DEDICATED = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
/** What a player is worth when he cannot crack your lineup. */
export const BENCH_FACTOR = 0.35

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

export interface RosterNeedInput {
  /** Starting slots from the league settings, e.g. { QB: 1, RB: 2, FLEX: 3 }. */
  slots: Record<string, number>
  /** How many players you already hold at each position. */
  filledByPosition: Record<string, number>
}

/**
 * How many more players at each position could still start. Dedicated openings
 * first, then whatever flex capacity remains and accepts that position.
 */
export function startableRemaining(input: RosterNeedInput): Record<string, number> {
  const slots = input?.slots ?? {}
  const filled = input?.filledByPosition ?? {}

  const dedicatedLeft: Record<string, number> = {}
  let spill = 0
  for (const pos of DEDICATED) {
    const cap = Number(slots[pos] ?? 0)
    const have = Number(filled[pos] ?? 0)
    dedicatedLeft[pos] = Math.max(0, cap - have)
    // Anything beyond a position's own slots is already sitting in a flex spot.
    spill += Math.max(0, have - cap)
  }

  let flexCap = 0
  const flexAccepts = new Set<string>()
  for (const [slot, n] of Object.entries(slots)) {
    const elig = FLEX_ELIGIBILITY[slot.toUpperCase()]
    if (!elig) continue
    flexCap += Number(n) || 0
    for (const p of elig) flexAccepts.add(p)
  }
  const flexLeft = Math.max(0, flexCap - spill)

  const out: Record<string, number> = {}
  for (const pos of DEDICATED) {
    out[pos] = dedicatedLeft[pos] + (flexAccepts.has(pos) ? flexLeft : 0)
  }
  return out
}

/**
 * Positions this league actually starts.
 *
 * A league with no kicker or defense slot cannot use either, so recommending one
 * is not a weak suggestion — it is a wrong one. They were reaching the board
 * because an unstartable position was merely DISCOUNTED to bench value, and in
 * the late rounds, when every real player is discounted too, a defense can win
 * that comparison outright.
 *
 * An empty settings object means we don't know the lineup yet; everything counts
 * rather than nothing.
 */
export function startablePositions(slots: Record<string, number>): Set<string> {
  const entries = Object.entries(slots ?? {}).filter(
    ([k, n]) => Number(n) > 0 && !['BN', 'IR', 'TAXI'].includes(k.toUpperCase()),
  )
  if (!entries.length) return new Set(DEDICATED)

  const out = new Set<string>()
  for (const [slot] of entries) {
    const key = slot.toUpperCase()
    const flex = FLEX_ELIGIBILITY[key]
    if (flex) for (const p of flex) out.add(p)
    else if (DEDICATED.includes(key)) out.add(key)
  }
  return out
}

/** Whether a player at this position could ever start in this league. */
export function isStartablePosition(position: string, slots: Record<string, number>): boolean {
  return startablePositions(slots).has(normPos(position))
}

/**
 * Multiplier applied to a player's score. 1 while he could still start for you,
 * BENCH_FACTOR once his position is spoken for.
 */
export function needFactorByPosition(input: RosterNeedInput): Record<string, number> {
  const left = startableRemaining(input)
  const out: Record<string, number> = {}
  for (const [pos, n] of Object.entries(left)) out[pos] = n > 0 ? 1 : BENCH_FACTOR
  return out
}

/** Convenience for a single player. Unknown positions are never discounted. */
export function needFactorFor(position: string, input: RosterNeedInput): number {
  const pos = normPos(position)
  const map = needFactorByPosition(input)
  return map[pos] ?? 1
}
