import type { AvailablePlayer, Hole, HoleAdds, Add } from './types'
import { percentileInPool } from './poolPercentiles'

export interface RankAddsOptions {
  perHole?: number // max adds per hole (default 5)
}

export function rankAddsForHoles(
  players: AvailablePlayer[],
  holes: Hole[],
  opts: RankAddsOptions = {},
): HoleAdds[] {
  const perHole = opts.perHole ?? 5
  return holes.map((hole) => {
    const pct = percentileInPool(players, hole.statId, hole.lowerIsBetter)
    const adds: Add[] = players
      .filter(
        (pl) =>
          (pct.get(pl.playerKey) ?? 0) > 0 &&
          (hole.lowerIsBetter || (pl.stats[hole.statId] ?? 0) > 0),
      )
      .map((pl) => ({
        player: pl,
        statId: hole.statId,
        statValue: pl.stats[hole.statId],
        percentile: pct.get(pl.playerKey) ?? 0,
      }))
      .sort((a, b) => b.percentile - a.percentile)
      .slice(0, perHole)
    return { hole, adds }
  })
}
