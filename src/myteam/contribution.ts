import type { PlayerCategoryContrib, PlayerContribution } from './types'

interface PoolPlayer {
  playerKey: string
  stats: Record<string, number>
}

interface CatSpec {
  statId: string
  lowerIsBetter: boolean
}

const PLUS_THRESHOLD = 0.66
const MINUS_THRESHOLD = 0.33

/** A player "has" a stat for distribution purposes when it is a number and non-zero. */
function hasStat(player: PoolPlayer, statId: string): boolean {
  const v = player.stats[statId]
  return typeof v === 'number' && v !== 0
}

/**
 * Per-category contribution of my players vs the league's rostered pool (season-to-date).
 * Percentile is 0..1 (1 = best), direction-aware: for lowerIsBetter a smaller value
 * maps to a higher percentile.
 *
 * Tier rules:
 *  - plus if percentile >= 0.66 (top third)
 *  - minus ONLY for lowerIsBetter (ratio/rate) cats when percentile <= 0.33 (a bad rate hurts)
 *  - counting cats (higherIsBetter) bottom third → neutral, never minus
 *  - missing stat (or value 0) → neutral, excluded from plus/minus counts
 */
export function computePlayerContributions(
  pool: PoolPlayer[],
  myPlayerKeys: string[],
  cats: CatSpec[],
): PlayerContribution[] {
  // Build a percentile lookup per category across the pool (excluding missing/zero).
  const pctByCat = new Map<string, Map<string, number>>()
  for (const cat of cats) {
    const withStat = pool.filter((pl) => hasStat(pl, cat.statId))
    const sorted = [...withStat].sort((a, b) => {
      const av = a.stats[cat.statId]
      const bv = b.stats[cat.statId]
      return cat.lowerIsBetter ? av - bv : bv - av // best first
    })
    const n = sorted.length
    const map = new Map<string, number>()
    sorted.forEach((pl, idx) => {
      map.set(pl.playerKey, n === 0 ? 0 : (n - idx) / n)
    })
    pctByCat.set(cat.statId, map)
  }

  const myKeys = new Set(myPlayerKeys)
  const mine = pool.filter((pl) => myKeys.has(pl.playerKey))

  return mine.map((player) => {
    const contribs: PlayerCategoryContrib[] = []
    let plusCount = 0
    let minusCount = 0

    for (const cat of cats) {
      const hasIt = hasStat(player, cat.statId)
      const value = typeof player.stats[cat.statId] === 'number' ? player.stats[cat.statId] : 0
      if (!hasIt) {
        contribs.push({ statId: cat.statId, tier: 'neutral', value, percentile: 0 })
        continue
      }
      const percentile = pctByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      let tier: PlayerCategoryContrib['tier'] = 'neutral'
      if (percentile >= PLUS_THRESHOLD) {
        tier = 'plus'
        plusCount++
      } else if (cat.lowerIsBetter && percentile <= MINUS_THRESHOLD) {
        tier = 'minus'
        minusCount++
      }
      contribs.push({ statId: cat.statId, tier, value, percentile })
    }

    return { playerKey: player.playerKey, contribs, plusCount, minusCount }
  })
}
