import type { AvailablePlayer } from './types'

/**
 * Percentile (0..1, 1 = best) of each player for one stat within the given pool.
 * Direction-aware: when lowerIsBetter, smaller raw values map to higher percentile.
 * Players without the stat get 0.
 */
export function percentileInPool(
  players: AvailablePlayer[],
  statId: string,
  lowerIsBetter: boolean,
): Map<string, number> {
  const withStat = players.filter((pl) => typeof pl.stats[statId] === 'number')
  const result = new Map<string, number>()
  for (const pl of players) result.set(pl.playerKey, 0)
  if (withStat.length === 0) return result

  const sorted = [...withStat].sort((a, b) => {
    const av = a.stats[statId]
    const bv = b.stats[statId]
    return lowerIsBetter ? av - bv : bv - av // best first
  })
  const n = sorted.length
  sorted.forEach((pl, idx) => {
    // idx 0 (best) -> 1.0 ; last -> 1/n. Monotonic, ties resolved by sort order.
    result.set(pl.playerKey, (n - idx) / n)
  })
  return result
}
