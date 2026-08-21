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
  /** Index of the LAST row above the break. Render the cliff before the next row. */
  afterIndex: number
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
