import type { AvailablePlayer, Hole, HoleAdds, Add } from './types'
import { percentileInPool } from './poolPercentiles'
import { sideOf } from '@/myteam/yourMove/helpedCats'

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
    // Side gate: a category accrues on one side of the ball, so only same-side
    // players are real adds. Without it the ranker maximizes the raw stat value and
    // surfaces a reliever for Runs scored or a hitter for Saves (the stat IDs carry a
    // stray value across sides). Skipped when the hole has no classified side.
    const eligible = hole.side
      ? players.filter((pl) => sideOf(pl.position ?? '') === hole.side)
      : players
    const pct = percentileInPool(eligible, hole.statId, hole.lowerIsBetter)
    const adds: Add[] = eligible
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
