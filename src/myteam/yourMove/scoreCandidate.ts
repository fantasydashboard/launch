import { calcOverallWinProb } from '@/services/categoryWinProbability'
import type { ScoredContext } from './types'

/**
 * Win-probability lift (percentage points) of applying `delta` to my team's
 * this-week totals. `delta` is the candidate's projected remaining-week contribution
 * (positive to add, negative to remove). Counting stats add; ratio stats are blended
 * halfway toward the candidate's rate as a conservative one-contributor proxy
 * (Phase 2 volume-weights precisely).
 */
export function scoreCandidate(delta: Record<string, number>, ctx: ScoredContext): number {
  const base = calcOverallWinProb(ctx.myStats, ctx.oppStats, ctx.categoryIds, ctx.days, ctx.platform)
  const adjusted: Record<string, number> = { ...ctx.myStats }
  for (const cat of ctx.cats) {
    const d = delta[cat.statId]
    if (d === undefined || !Number.isFinite(d)) continue
    if (cat.isRatio) {
      adjusted[cat.statId] = ((ctx.myStats[cat.statId] ?? 0) + d) / 2
    } else {
      adjusted[cat.statId] = (ctx.myStats[cat.statId] ?? 0) + d
    }
  }
  const next = calcOverallWinProb(adjusted, ctx.oppStats, ctx.categoryIds, ctx.days, ctx.platform)
  return next.team1 - base.team1
}
