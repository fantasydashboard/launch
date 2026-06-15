import type { CatSpec } from '@/myteam/value'
import type { AggPlayer } from './aggregate'

/** One category's aggregate for a team. `num`/`den` retained for ratio cats so a swap can recompute. */
export interface CatAgg {
  value: number
  num?: number // ratio numerator (Σ rate·vol)
  den?: number // ratio denominator (Σ vol)
}
export interface TeamCategoryTotals {
  teamId: string
  cats: Record<string, CatAgg>
}

/**
 * Aggregate each team's ROS-projected players into per-category totals:
 *  - counting cats → sum.
 *  - ratio cats → volume-weighted blend (Σ rate·vol / Σ vol), RETAINING num/den so a previewed
 *    swap can add/remove a player's (rate·vol, vol) and recompute the ratio (you can't add ratios).
 */
export function aggregateTeamCatTotals(
  playersByTeam: { teamId: string; players: AggPlayer[] }[],
  cats: CatSpec[],
): TeamCategoryTotals[] {
  return playersByTeam.map(({ teamId, players }) => {
    const out: Record<string, CatAgg> = {}
    for (const cat of cats) {
      if (cat.isRatio && cat.volumeStatId) {
        let num = 0, den = 0
        for (const p of players) {
          const vol = p.stats[cat.volumeStatId] ?? 0
          const rate = p.stats[cat.statId]
          if (rate === undefined || !Number.isFinite(rate) || vol <= 0) continue
          num += rate * vol
          den += vol
        }
        out[cat.statId] = { value: den > 0 ? num / den : 0, num, den }
      } else {
        let sum = 0
        for (const p of players) {
          const v = p.stats[cat.statId]
          if (Number.isFinite(v)) sum += v
        }
        out[cat.statId] = { value: sum }
      }
    }
    return { teamId, cats: out }
  })
}

// Sort key for a team in a category. Zero-denominator ratio teams sort to the worst end so a team
// with no innings is not "1st in ERA". Direction handled by the caller's asc/desc.
function sortValue(agg: CatAgg | undefined, cat: CatSpec): number {
  if (!agg) return cat.lowerIsBetter ? Infinity : -Infinity
  if (cat.isRatio && (agg.den ?? 0) <= 0) return cat.lowerIsBetter ? Infinity : -Infinity
  return agg.value
}

/** teamId -> rank (1 = best). Ties share the average of the positions they span. */
export function rankInCategory(totals: TeamCategoryTotals[], cat: CatSpec): Map<string, number> {
  const dir = cat.lowerIsBetter ? 1 : -1 // asc for lower-is-better, desc otherwise
  const sorted = [...totals].sort((a, b) => dir * (sortValue(a.cats[cat.statId], cat) - sortValue(b.cats[cat.statId], cat)))
  const out = new Map<string, number>()
  let i = 0
  while (i < sorted.length) {
    let j = i
    const v = sortValue(sorted[i].cats[cat.statId], cat)
    while (j + 1 < sorted.length && sortValue(sorted[j + 1].cats[cat.statId], cat) === v) j++
    const avgRank = (i + j) / 2 + 1 // positions i..j (0-based) -> 1-based average
    for (let k = i; k <= j; k++) out.set(sorted[k].teamId, avgRank)
    i = j + 1
  }
  return out
}

/** Expected categories won per week vs an average opponent: Σ_c (N - rank_c)/(N - 1). */
export function expectedCatsWon(teamId: string, totals: TeamCategoryTotals[], cats: CatSpec[]): number {
  const n = totals.length
  if (n < 2) return 0.5 * cats.length
  let ecw = 0
  for (const cat of cats) {
    const rank = rankInCategory(totals, cat).get(teamId) ?? n
    ecw += (n - rank) / (n - 1)
  }
  return ecw
}
