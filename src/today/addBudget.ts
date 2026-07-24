import type { ScoredPlay } from './todayBoard'

/** The active league's add constraint. `budget: null` on FAAB = total unknown (Yahoo). */
export type AddBudget =
  | { kind: 'count'; limit: number; used: number; remaining: number }
  | { kind: 'faab'; budget: number | null; remaining: number }
  | { kind: 'unlimited' }

/**
 * Tag each free-agent add-move with whether it's worth spending a scarce add / FAAB bid. Runs on
 * the flat scored-play list so the top-N ranking is global across the board. Pure — new objects.
 * Bench start-sits cost no add and are never tagged. Unlimited → no tags (board unchanged).
 */
export function annotateAddBudget(plays: ScoredPlay[], budget: AddBudget): ScoredPlay[] {
  if (budget.kind === 'unlimited') return plays
  const isAddMove = (p: ScoredPlay) => p.kind === 'stream' || p.kind === 'add'

  if (budget.kind === 'faab') {
    const tag: ScoredPlay['budgetTag'] = budget.remaining > 0 ? 'worth-bid' : 'save-add'
    return plays.map((p) => (isAddMove(p) ? { ...p, budgetTag: tag } : p))
  }

  const worth = new Set(
    plays.filter(isAddMove).sort((a, b) => b.score - a.score).slice(0, Math.max(0, budget.remaining)).map((p) => p.playerKey),
  )
  return plays.map((p) =>
    isAddMove(p) ? { ...p, budgetTag: worth.has(p.playerKey) ? 'worth-add' : 'save-add' } : p,
  )
}
