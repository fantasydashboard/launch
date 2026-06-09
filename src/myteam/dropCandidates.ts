import type { PlayerContribution } from './types'

export interface DropCandidate {
  playerKey: string
  strength: 'strong' | 'mild'
  reason: string
}

export interface DropAnalysis {
  candidates: DropCandidate[]
  weakLink: string | null // my-player with the lowest overallValue (even if not droppable)
}

const DROP_THRESHOLD = 0.35 // overallValue below this can be a drop candidate
const STUD_FLOOR = 0.5 // overallValue at/above this is never a drop candidate
const STRONG_THRESHOLD = 0.2 // overallValue below this is a strong (not mild) candidate
const MAX_CANDIDATES = 3 // cap the flagged list at the lowest-value qualifiers

/**
 * Flags the lowest-overall-value players on my roster, protecting studs.
 *  - Sort my players by overallValue ascending.
 *  - Drop candidate only if overallValue < 0.35; never if overallValue >= 0.5 (stud protection).
 *  - Cap the candidate list at the 3 lowest-value qualifiers.
 *  - Severity: overallValue < 0.2 → 'strong' ("weak across categories"), else 'mild' ("low overall value").
 *  - weakLink = the single player with the lowest overallValue (null if none), independent of the threshold.
 */
export function computeDropCandidates(contributions: PlayerContribution[]): DropAnalysis {
  const sorted = [...contributions].sort((a, b) => a.overallValue - b.overallValue)

  const candidates: DropCandidate[] = []
  for (const c of sorted) {
    if (candidates.length >= MAX_CANDIDATES) break
    if (c.overallValue >= STUD_FLOOR) continue // stud protection
    if (c.overallValue >= DROP_THRESHOLD) continue // not low enough
    if (c.overallValue < STRONG_THRESHOLD) {
      candidates.push({
        playerKey: c.playerKey,
        strength: 'strong',
        reason: 'weak across categories',
      })
    } else {
      candidates.push({
        playerKey: c.playerKey,
        strength: 'mild',
        reason: 'low overall value',
      })
    }
  }

  const weakLink = sorted.length > 0 ? sorted[0].playerKey : null

  return { candidates, weakLink }
}
