import type { AvailablePlayer } from '@/players/types'
import type { CatSpec } from '@/myteam/value'
import type { MoveCandidate } from '../types'
import { projectRemainingWeek } from '../projectRemainingWeek'
import { sideOf } from '../helpedCats'

/**
 * Propose waiver-add candidates: project each free agent's contribution over the
 * horizon. Scoring, the drop pairing, and the flipped-cat filter happen later in
 * buildMoves.
 */
export function addGenerator(
  freeAgents: AvailablePlayer[],
  cats: CatSpec[],
  days: number,
  seasonFraction = 0.6,
): MoveCandidate[] {
  return freeAgents.map((fa) => ({
    kind: 'add' as const,
    player: { key: fa.playerKey, name: fa.name, team: fa.team ?? '', position: fa.position ?? '' },
    side: sideOf(fa.position ?? ''),
    addDelta: projectRemainingWeek(fa.stats, null, cats, days, seasonFraction),
    detail: fa.percentOwned > 0 ? `Rostered in ${Math.round(fa.percentOwned)}% of leagues` : 'Free agent',
  }))
}
