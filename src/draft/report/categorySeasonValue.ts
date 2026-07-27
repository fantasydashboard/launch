export interface CatValuePlayer {
  playerId: string | number
  position: string
  stats: Record<string, number> // season per-category stats, keyed by league statId
}

export interface CatValueCat {
  statId: string
  lowerIsBetter: boolean // ERA/WHIP/OBA → true
}

/**
 * Summed per-category z-score of each player within the given pool (the drafted players).
 * A missing/non-finite stat is treated as 0 (counted as no production) and included in the
 * pool, so a player who accrued nothing sorts to the bottom — the correct grading outcome. A
 * category whose pool has zero variance contributes 0 to everyone (can't differentiate).
 * lowerIsBetter cats are negated so "better" is always more-positive.
 */
export function categorySeasonValue(
  players: CatValuePlayer[],
  cats: CatValueCat[],
): Map<string | number, number> {
  const value = new Map<string | number, number>()
  for (const p of players) value.set(p.playerId, 0)
  if (players.length === 0 || cats.length === 0) return value

  for (const cat of cats) {
    const vals = players.map((p) => {
      const v = p.stats[cat.statId]
      return Number.isFinite(v) ? (v as number) : 0
    })
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const variance = vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length
    const std = Math.sqrt(variance)
    if (std === 0) continue // cat can't differentiate — contributes 0 to everyone
    const sign = cat.lowerIsBetter ? -1 : 1
    players.forEach((p, i) => {
      const z = ((vals[i] - mean) / std) * sign
      value.set(p.playerId, (value.get(p.playerId) ?? 0) + z)
    })
  }
  return value
}
