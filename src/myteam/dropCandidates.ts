import type { PlayerContribution } from './types'

export interface DropCandidate {
  playerKey: string
  strength: 'strong' | 'mild'
  reason: string
}

export interface DropAnalysis {
  candidates: DropCandidate[]
  weakLink: string | null // my-player with the lowest roleValue (even if not droppable)
}

const DROP_THRESHOLD = 25 // roleValue below this (bottom of role) can be a drop candidate
const PROTECT_FLOOR = 50  // roleValue at/above this is never a drop candidate
const STRONG_THRESHOLD = 10 // roleValue below this is a strong (not mild) candidate
const MAX_CANDIDATES = 3

/**
 * Flags the lowest role-relative players. roleValue is a within-role percentile, so a
 * bottom pitcher and a bottom hitter are comparably droppable (each judged vs their role).
 */
export function computeDropCandidates(contributions: PlayerContribution[]): DropAnalysis {
  const sorted = [...contributions].sort((a, b) => a.roleValue - b.roleValue)
  const candidates: DropCandidate[] = []
  for (const c of sorted) {
    if (candidates.length >= MAX_CANDIDATES) break
    if (c.roleValue >= PROTECT_FLOOR) continue
    if (c.roleValue >= DROP_THRESHOLD) continue
    candidates.push({
      playerKey: c.playerKey,
      strength: c.roleValue < STRONG_THRESHOLD ? 'strong' : 'mild',
      reason: c.roleValue < STRONG_THRESHOLD ? `bottom-tier ${c.role}` : `low-value ${c.role}`,
    })
  }
  const weakLink = sorted.length > 0 ? sorted[0].playerKey : null
  return { candidates, weakLink }
}
