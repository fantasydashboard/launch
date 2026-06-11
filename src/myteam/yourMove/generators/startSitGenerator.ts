import type { CatSpec } from '@/myteam/value'
import type { MoveCandidate } from '../types'
import { projectRemainingWeek } from '../projectRemainingWeek'
import { sideOf } from '../helpedCats'

/** Minimum shape needed to evaluate a benched roster player. */
export interface BenchPlayer {
  playerKey: string
  name: string
  team: string
  position: string
  stats: Record<string, number>
}

/**
 * Propose start/sit moves: each benched roster player, projected over the horizon.
 * buildMoves pairs the started player they'd replace and scores the net swap.
 */
export function startSitGenerator(
  benched: BenchPlayer[],
  cats: CatSpec[],
  days: number,
  seasonFraction = 0.6,
): MoveCandidate[] {
  return benched.map((p) => ({
    kind: 'startSit' as const,
    player: { key: p.playerKey, name: p.name, team: p.team, position: p.position },
    side: sideOf(p.position),
    addDelta: projectRemainingWeek(p.stats, null, cats, days, seasonFraction),
    detail: 'On your bench',
  }))
}
