/**
 * Where the tiers actually break, and by how much.
 *
 * `assignTiers` already cuts at the largest gaps in the board and has never said
 * where. That is the most useful line in a hand-made draft guide — "337.9 and
 * 334.7, then 298.9 for the next back" — and it is a number we hold rather than
 * one anybody has to research.
 *
 * Measured in PROJECTED POINTS. When a ranking list is active `value` carries
 * that list's order instead of our points, and a drop measured there cannot be
 * checked against the points column sitting beside it.
 */

export interface Cliff {
  /** Index of the LAST row above the break, whether or not it is adjacent to the break. Names the player above. */
  afterIndex: number
  /**
   * Index of the FIRST row of the tier below the break. This, not `afterIndex + 1`,
   * is where the view must render the cliff: rows a ranking list omits (or a
   * "show drafted" splice reinserts) sit untiered between `afterIndex` and here,
   * and `afterIndex + 1` would land the banner on one of THEM — detached from the
   * tier header, which fires at the first tiered row exactly like this one does.
   */
  beforeIndex: number
  aboveName: string
  abovePoints: number
  belowPoints: number
  /** Never negative: the list can be ordered by an opinion that disagrees with our points. */
  drop: number
}

export function tierCliffs<T>(
  rows: T[],
  tierOf: (row: T) => number | undefined,
  read: (row: T) => { name: string; projected: number },
): Cliff[] {
  const out: Cliff[] = []
  if (!rows?.length) return out

  // Walk the last row that HAD a tier, so a player the ranking list omits does
  // not manufacture a boundary on either side of himself.
  let lastIndex = -1
  let lastTier: number | undefined
  for (let i = 0; i < rows.length; i++) {
    const tier = tierOf(rows[i])
    if (tier === undefined) continue
    if (lastTier !== undefined && tier !== lastTier) {
      const above = read(rows[lastIndex])
      const below = read(rows[i])
      out.push({
        afterIndex: lastIndex,
        beforeIndex: i,
        aboveName: above.name,
        abovePoints: above.projected,
        belowPoints: below.projected,
        drop: Math.max(0, above.projected - below.projected),
      })
    }
    lastIndex = i
    lastTier = tier
  }
  return out
}

/** Ceiling on tiers per group — beyond this, "tier" stops meaning anything. */
const MAX_TIERS = 8
/** Roughly how many players belong in a tier. Drives how many tiers we cut. */
const TARGET_TIER_SIZE = 5

/**
 * Tiers = the biggest cliffs, not "every gap above a threshold".
 *
 * A threshold-based rule fragments badly on a deep position: with two hundred
 * receivers the median gap is near zero, so nearly every gap clears the bar and
 * you get "WR tier 57", which tells the user nothing. Instead, decide how many
 * tiers a group should have and cut at exactly the largest gaps — which is what
 * a person means by a tier: the drop-offs everyone can see.
 *
 * Deterministic, needs no tuning constant, and cannot fragment.
 */
export function assignTiers(rows: { playerKey: string; value: number }[]): Record<string, number> {
  const out: Record<string, number> = {}
  if (!rows.length) return out
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  if (sorted.length === 1) {
    out[sorted[0].playerKey] = 1
    return out
  }

  // Always allow at least one cut: a three-man group with an obvious cliff still
  // has two tiers, even though it is smaller than one nominal tier.
  const cuts = Math.min(
    MAX_TIERS - 1,
    Math.max(1, Math.ceil(sorted.length / TARGET_TIER_SIZE) - 1),
  )

  // Gap i sits between sorted[i] and sorted[i+1].
  const gaps = sorted.slice(0, -1).map((p, i) => ({ i, gap: p.value - sorted[i + 1].value }))
  const boundaries = new Set(
    gaps
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, cuts)
      .map((g) => g.i),
  )

  let tier = 1
  for (let i = 0; i < sorted.length; i++) {
    out[sorted[i].playerKey] = tier
    if (boundaries.has(i)) tier++
  }
  return out
}
