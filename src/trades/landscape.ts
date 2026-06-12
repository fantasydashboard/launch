import type { CatSpec } from '@/myteam/value'

/**
 * The league category landscape — the foundation of trade leverage. For every team in
 * every category we compute, on a 0..1 scale:
 *
 *  - surplus: dead value. How far you're ahead of the team below you (direction-aware),
 *    i.e. how much category strength you could SHED before dropping a standings place.
 *    Highest when you're dominant; ~0 when you're last. This is your trade currency.
 *  - need: marginal value of improving — HUMP-SHAPED, not monotonic. Driven by the gap
 *    to the team ABOVE you: a small gap means a few units flip a place (high need); a
 *    huge gap means you can't catch them (low need); being 1st means nothing to gain
 *    (need 0). So 1st place and a hopelessly-behind team both read ~0; contested middles
 *    peak. This is what humans misjudge — reinforcing a locked or lost category.
 *
 * Gaps are normalized by the category's spread (stdev of team scores) so the scale is
 * comparable across categories. v1 ranks teams on their full-roster aggregate totals
 * (the bench over-count is ~uniform across teams, so relative ranks hold).
 */
export interface CatStanding {
  rank: number // 1 = best in this category
  surplus: number // 0..1 — dead value you can trade away
  need: number // 0..1 — hump-shaped marginal value of improving
}

// teamId -> statId -> standing
export type Landscape = Map<string, Map<string, CatStanding>>

export interface CatScarcity {
  statId: string
  suppliers: number // teams with real surplus to give
  demanders: number // teams with real need
  scarcity: number // demanders / (suppliers + 1) — high = thin supply, your pricing power
}

export interface TeamTotals {
  teamId: string
  totals: Record<string, number>
}

// A team counts as a supplier/demander in a category once its surplus/need clears this.
export const SUPPLY_THRESHOLD = 0.5
export const DEMAND_THRESHOLD = 0.5

function stdev(xs: number[]): number {
  if (xs.length === 0) return 0
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length
  return Math.sqrt(v)
}

export function buildLandscape(
  teamTotals: TeamTotals[],
  cats: CatSpec[],
): { landscape: Landscape; scarcity: CatScarcity[] } {
  const landscape: Landscape = new Map()
  for (const t of teamTotals) landscape.set(t.teamId, new Map())
  const scarcity: CatScarcity[] = []

  for (const cat of cats) {
    const dir = cat.lowerIsBetter ? -1 : 1 // direction-normalize so higher score = better
    const rows = teamTotals
      .map((t) => ({ teamId: t.teamId, score: (t.totals[cat.statId] ?? 0) * dir }))
      .sort((a, b) => b.score - a.score)
    const spread = stdev(rows.map((r) => r.score)) || 1

    let suppliers = 0
    let demanders = 0
    for (let i = 0; i < rows.length; i++) {
      // need: gap to the team ABOVE (small gap = flippable). 0 if 1st (nothing above).
      const need = i === 0 ? 0 : Math.max(0, 1 - (rows[i - 1].score - rows[i].score) / spread)
      // surplus: gap to the team BELOW (more ahead = more dead value). 0 if last.
      const surplus = i === rows.length - 1 ? 0 : Math.min(1, (rows[i].score - rows[i + 1].score) / spread)
      landscape.get(rows[i].teamId)!.set(cat.statId, { rank: i + 1, surplus, need })
      if (surplus >= SUPPLY_THRESHOLD) suppliers++
      if (need >= DEMAND_THRESHOLD) demanders++
    }
    scarcity.push({ statId: cat.statId, suppliers, demanders, scarcity: demanders / (suppliers + 1) })
  }
  return { landscape, scarcity }
}
