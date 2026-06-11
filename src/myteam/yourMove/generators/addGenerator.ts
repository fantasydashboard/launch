import type { AvailablePlayer } from '@/players/types'
import type { CandidateAction, ScoredContext } from '../types'
import { projectRemainingWeek } from '../projectRemainingWeek'
import { scoreCandidate } from '../scoreCandidate'

/**
 * Propose waiver-add candidates: for each free agent, project their rest-of-week
 * contribution, score the win-prob lift, and tag which flippable cats they help.
 * Ranking + the lift floor are applied later by rankMoves.
 *
 * @param flippableCatIds this-week cats worth chasing (tossup / loss-in-reach)
 * @param seasonFraction fraction of the season complete, to extrapolate FA counting stats
 */
export function addGenerator(
  freeAgents: AvailablePlayer[],
  flippableCatIds: string[],
  ctx: ScoredContext,
  seasonFraction = 0.6,
): CandidateAction[] {
  if (flippableCatIds.length === 0) return []
  const flippable = new Set(flippableCatIds)
  const out: CandidateAction[] = []
  for (const fa of freeAgents) {
    const delta = projectRemainingWeek(fa.stats, null, ctx.cats, ctx.days, seasonFraction)
    const helps = ctx.cats
      .filter((c) => flippable.has(c.statId))
      .filter((c) => (c.lowerIsBetter ? (delta[c.statId] ?? 0) < 0 : (delta[c.statId] ?? 0) > 0))
      .map((c) => c.statId)
    if (helps.length === 0) continue
    const winProbLift = scoreCandidate(delta, ctx)
    out.push({
      kind: 'add',
      player: { key: fa.playerKey, name: fa.name, team: fa.team ?? '', position: fa.position ?? '' },
      categories: helps,
      winProbLift,
      // Detail is the contextual bit only; the flipped cats render as labeled chips.
      rationale: fa.percentOwned > 0 ? `Rostered in ${Math.round(fa.percentOwned)}% of leagues` : 'Free agent',
    })
  }
  return out
}
