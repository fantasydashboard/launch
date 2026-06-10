import type { PlayerContribution } from './types'

export interface DropCandidate {
  playerKey: string
  strength: 'strong' | 'mild'
  reason: string
}

export interface DropAnalysis {
  candidates: DropCandidate[]
  weakLink: string | null // my-player with the lowest valueScore (even if not droppable)
}

const DROP_THRESHOLD = 0 // valueScore below this (below replacement) can be a drop candidate
const STUD_FLOOR = 0.5 // valueScore at/above this is never a drop candidate
const STRONG_THRESHOLD = -2 // valueScore below this is a strong (not mild) candidate
const MAX_CANDIDATES = 3

/**
 * Flags the lowest-valueScore players, protecting positive-value players.
 *  - Sort my players by valueScore ascending.
 *  - Drop candidate only if valueScore < 0 (below replacement); never if valueScore >= 0.5.
 *  - Cap at the 3 lowest qualifiers.
 *  - Severity: valueScore < -2 -> 'strong' ("below replacement"), else 'mild' ("low value").
 *  - weakLink = the single player with the lowest valueScore (null if none).
 */
export function computeDropCandidates(contributions: PlayerContribution[]): DropAnalysis {
  const sorted = [...contributions].sort((a, b) => a.valueScore - b.valueScore)

  const candidates: DropCandidate[] = []
  for (const c of sorted) {
    if (candidates.length >= MAX_CANDIDATES) break
    if (c.valueScore >= STUD_FLOOR) continue
    if (c.valueScore >= DROP_THRESHOLD) continue
    candidates.push({
      playerKey: c.playerKey,
      strength: c.valueScore < STRONG_THRESHOLD ? 'strong' : 'mild',
      reason: c.valueScore < STRONG_THRESHOLD ? 'below replacement' : 'low value',
    })
  }

  const weakLink = sorted.length > 0 ? sorted[0].playerKey : null
  return { candidates, weakLink }
}
