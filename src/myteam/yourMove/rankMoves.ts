import type { CandidateAction } from './types'

export interface RankOptions {
  maxMoves?: number // size of the short stack (hero + next-best)
  liftFloor?: number // discard moves below this win-prob lift (pp)
}

/**
 * Given all candidate actions across generators, keep the meaningful ones and
 * return the ranked short stack (highest lift first). Dedupes by player so the
 * same player can't appear twice via different generators.
 */
export function rankMoves(candidates: CandidateAction[], opts: RankOptions = {}): CandidateAction[] {
  const maxMoves = opts.maxMoves ?? 4
  const liftFloor = opts.liftFloor ?? 1
  const seen = new Set<string>()
  return candidates
    .filter((c) => c.winProbLift >= liftFloor)
    .sort((a, b) => b.winProbLift - a.winProbLift)
    .filter((c) => {
      if (seen.has(c.player.key)) return false
      seen.add(c.player.key)
      return true
    })
    .slice(0, maxMoves)
}
