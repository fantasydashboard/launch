import type { PlayerContribution } from './types'

export interface DropCandidate {
  playerKey: string
  strength: 'strong' | 'mild'
  reason: string
}

export interface DropAnalysis {
  candidates: DropCandidate[]
  weakLink: string | null // my-player with the lowest (plusCount - minusCount)
}

/**
 * Flags players who contribute no category strengths.
 *  - plusCount === 0 && minusCount >= 1 → strong drop candidate (helps nothing, hurts a rate)
 *  - plusCount === 0                     → mild drop candidate (helps nothing)
 *  - any plus                            → not a candidate
 *
 * weakLink = the my-player with the lowest net (plusCount - minusCount).
 */
export function computeDropCandidates(contributions: PlayerContribution[]): DropAnalysis {
  const candidates: DropCandidate[] = []
  for (const c of contributions) {
    if (c.plusCount > 0) continue
    if (c.minusCount >= 1) {
      candidates.push({
        playerKey: c.playerKey,
        strength: 'strong',
        reason: 'no category strengths',
      })
    } else {
      candidates.push({
        playerKey: c.playerKey,
        strength: 'mild',
        reason: 'no category strengths',
      })
    }
  }

  let weakLink: string | null = null
  let worstNet = Infinity
  for (const c of contributions) {
    const net = c.plusCount - c.minusCount
    if (net < worstNet) {
      worstNet = net
      weakLink = c.playerKey
    }
  }

  return { candidates, weakLink }
}
