import type { CatSpec } from '@/myteam/value'
import type { ScoredContext, Side } from './types'
import { catWinProbClosed } from '@/services/categoryWinProbability'

// A move must shift a category's win probability by at least this much (3 points)
// to count as "flipping" it — otherwise it's a negligible, misleading credit.
const MARGIN_FLOOR = 0.03

/** Hitter vs pitcher from a position string (SP/RP/P -> pitcher). */
export function sideOf(position: string): Side {
  const tokens = (position || '').split(/[,/|]/).map((t) => t.trim().toUpperCase())
  return tokens.some((t) => t === 'SP' || t === 'RP' || t === 'P') ? 'pit' : 'hit'
}

/**
 * The flippable cats a move honestly swings: the player's side can accrue the cat
 * AND the delta moves that cat's win probability by at least MARGIN_FLOOR. Kills
 * both the wrong-side credit (hitter "flips" SVHD) and the negligible credit
 * (a contact hitter "flips" HR).
 */
export function helpedCats(
  delta: Record<string, number>,
  flippableCatIds: string[],
  cats: CatSpec[],
  side: Side,
  ctx: ScoredContext,
): string[] {
  const flippable = new Set(flippableCatIds)
  const out: string[] = []
  for (const cat of cats) {
    if (cat.side !== side) continue
    if (!flippable.has(cat.statId)) continue
    const d = delta[cat.statId]
    if (d === undefined || !Number.isFinite(d) || d === 0) continue
    const my = ctx.myStats[cat.statId] ?? 0
    const opp = ctx.oppStats[cat.statId] ?? 0
    const before = catWinProbClosed(my, opp, cat.statId, ctx.days, ctx.platform)
    // Ratio cats blend toward the new contributor; counting cats add (matches the scorer).
    const adjusted = cat.isRatio ? (my + d) / 2 : my + d
    const after = catWinProbClosed(adjusted, opp, cat.statId, ctx.days, ctx.platform)
    if (after - before >= MARGIN_FLOOR) out.push(cat.statId)
  }
  return out
}
