import type { CandidateAction, ScoredContext } from '../types'
import { projectRemainingWeek } from '../projectRemainingWeek'
import { scoreCandidate } from '../scoreCandidate'

/** Minimum shape needed to evaluate a benched roster player. */
export interface BenchPlayer {
  playerKey: string
  name: string
  team: string
  position: string
  stats: Record<string, number>
}

/**
 * Propose start/sit moves: for each benched player on my roster who would help a
 * flippable cat if active, propose starting them. The win-prob lift is the value of
 * adding their projected remaining-week contribution to my active totals.
 */
export function startSitGenerator(
  benched: BenchPlayer[],
  flippableCatIds: string[],
  ctx: ScoredContext,
  seasonFraction = 0.6,
): CandidateAction[] {
  if (flippableCatIds.length === 0) return []
  const flippable = new Set(flippableCatIds)
  const out: CandidateAction[] = []
  for (const p of benched) {
    const delta = projectRemainingWeek(p.stats, null, ctx.cats, ctx.days, seasonFraction)
    const helps = ctx.cats
      .filter((c) => flippable.has(c.statId))
      .filter((c) => (c.lowerIsBetter ? (delta[c.statId] ?? 0) < 0 : (delta[c.statId] ?? 0) > 0))
      .map((c) => c.statId)
    if (helps.length === 0) continue
    const winProbLift = scoreCandidate(delta, ctx)
    out.push({
      kind: 'startSit',
      player: { key: p.playerKey, name: p.name, team: p.team, position: p.position },
      categories: helps,
      winProbLift,
      rationale: 'On your bench',
    })
  }
  return out
}
