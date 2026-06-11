import type { CatSpec } from '@/myteam/value'

/** A player reduced to what within-position evaluation needs: the positions they're
 * eligible at, and their (ROS-projected) category stats. */
export interface EligiblePlayer {
  playerKey: string
  name: string
  team: string
  eligiblePositions: string[] // e.g. ['1B','OF']
  stats: Record<string, number>
  status?: string // injury/IL status ('' / 'ACTIVE' = available)
}

/** Per-category team need weight: categories you're losing / can still flip get
 * weight, punted or safely-banked categories get ~0. */
export type NeedWeights = Record<string, number>

/**
 * Build need weights from the this-week snapshot categories. A positional upgrade
 * only matters in categories the team is contesting — coin-flips and losses still in
 * reach. Safely-won or hopeless categories get zero weight, so we never flag a player
 * for a category the manager has banked or is punting.
 */
export function needWeightsFromSnapshot(
  categories: { statId: string; status: 'safe' | 'tossup' | 'loss'; myWinPct: number }[],
): NeedWeights {
  const out: NeedWeights = {}
  for (const c of categories) {
    out[c.statId] = c.status === 'tossup' || (c.status === 'loss' && c.myWinPct >= 25) ? 1 : 0
  }
  return out
}

/**
 * Need-weighted value of a player WITHIN a position group. For each contested
 * category, z-score the player (direction-aware) against the pool of players
 * eligible at that position, then weight by team need and sum. Higher = a better
 * fit AT THIS POSITION for what the team actually needs — so a light-hitting,
 * SB-source SS scores well for a team that needs SB but poorly for one that doesn't.
 *
 * (v1 baselines against the eligible-pool mean; replacement-cutoff composite is a
 * later refinement.)
 */
export function positionalValue(
  player: EligiblePlayer,
  position: string,
  pool: EligiblePlayer[],
  cats: CatSpec[],
  needWeights: NeedWeights,
): number {
  const group = pool.filter((p) => p.eligiblePositions.includes(position))
  if (group.length === 0) return 0
  let score = 0
  for (const cat of cats) {
    const w = needWeights[cat.statId] ?? 0
    if (w === 0) continue
    const dir = cat.lowerIsBetter ? -1 : 1
    const qs = group.map((p) => (p.stats[cat.statId] ?? 0) * dir).filter((q) => Number.isFinite(q))
    if (qs.length === 0) continue
    const mean = qs.reduce((s, q) => s + q, 0) / qs.length
    const variance = qs.reduce((s, q) => s + (q - mean) ** 2, 0) / qs.length
    const std = Math.sqrt(variance)
    const playerQ = (player.stats[cat.statId] ?? 0) * dir
    const z = std > 0 && Number.isFinite(playerQ) ? (playerQ - mean) / std : 0
    score += z * w
  }
  return score
}
