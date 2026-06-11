import type { AvailablePlayer } from '@/players/types'
import type { CandidateAction, ScoredContext } from '../types'
import { projectStarts } from '../projectRemainingWeek'
import { scoreCandidate } from '../scoreCandidate'
import { normalizePitcherName, type ProbableStart } from '@/services/mlbSchedule'

const isPitcher = (pos: string): boolean =>
  (pos || '')
    .split(/[,/|]/)
    .some((t) => ['SP', 'RP', 'P'].includes(t.trim().toUpperCase()))

/**
 * Propose streaming-pitcher candidates: for each available pitcher with confirmed
 * probable start(s) this week, project their per-start line, score the win-prob lift
 * on flippable pitching cats, and tag two-start weeks. Confirmed probables only, so
 * we never recommend a start that may not happen.
 */
export function streamGenerator(
  freeAgents: AvailablePlayer[],
  startsByPitcher: Record<string, ProbableStart[]>,
  flippableCatIds: string[],
  ctx: ScoredContext,
  seasonFraction = 0.6,
): CandidateAction[] {
  if (flippableCatIds.length === 0) return []
  const flippable = new Set(flippableCatIds)
  const out: CandidateAction[] = []
  for (const fa of freeAgents) {
    if (!isPitcher(fa.position)) continue
    const starts = startsByPitcher[normalizePitcherName(fa.name)] ?? []
    if (starts.length === 0) continue
    const delta = projectStarts(fa.stats, null, ctx.cats, starts.length, seasonFraction)
    const helps = ctx.cats
      .filter((c) => flippable.has(c.statId))
      .filter((c) => (c.lowerIsBetter ? (delta[c.statId] ?? 0) < 0 : (delta[c.statId] ?? 0) > 0))
      .map((c) => c.statId)
    if (helps.length === 0) continue
    const winProbLift = scoreCandidate(delta, ctx)
    const twoStart = starts.length >= 2
    const opp = starts.map((s) => s.opponentAbbr).filter(Boolean).join(', ')
    out.push({
      kind: 'stream',
      player: { key: fa.playerKey, name: fa.name, team: fa.team ?? '', position: fa.position ?? '' },
      categories: helps,
      winProbLift,
      rationale: twoStart
        ? `Two-start week${opp ? ` (vs ${opp})` : ''} -> ${helps.join(', ')}`
        : `Spot start${opp ? ` vs ${opp}` : ''} -> ${helps.join(', ')}`,
    })
  }
  return out
}
