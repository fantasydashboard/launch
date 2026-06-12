import type { Landscape } from './landscape'

export interface PartnerScore {
  teamId: string
  score: number // complementarity — higher = better mirror (you each hold the other's need)
}

/**
 * Rank potential trade partners by complementarity: a team is a good partner when it has
 * surplus where you have need AND needs what you have surplus in.
 *
 *   complementarity(you, T) = Σ_c [ surplus(you,c)·need(T,c) + need(you,c)·surplus(T,c) ]
 *
 * The first term = your dead value they want; the second = their dead value you want.
 * High score = a mirror team where mutually-beneficial trades exist. Sorted best first.
 */
export function rankPartners(landscape: Landscape, myTeamId: string, statIds: string[]): PartnerScore[] {
  const mine = landscape.get(myTeamId)
  if (!mine) return []
  const out: PartnerScore[] = []
  for (const [teamId, theirs] of landscape) {
    if (teamId === myTeamId) continue
    let score = 0
    for (const c of statIds) {
      const m = mine.get(c)
      const t = theirs.get(c)
      if (!m || !t) continue
      score += m.surplus * t.need + m.need * t.surplus
    }
    out.push({ teamId, score })
  }
  return out.sort((a, b) => b.score - a.score)
}
