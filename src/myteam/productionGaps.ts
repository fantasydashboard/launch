import { rankInCategory, type TeamCategoryTotals } from '@/trades/standings'
import type { CatSpec } from '@/myteam/value'
import type { CategoryGap } from './types'

const MAX_WINNABLE = 3

/**
 * Category tiers by rest-of-season PRODUCTION rank vs the league (1 = most production,
 * direction-aware via the cat's `lowerIsBetter`). Unlike `computeCategoryGaps`, which
 * ranks by season category-WIN record (where you SIT), this is forward-looking talent —
 * how much you PRODUCE vs the league, which is what adds/trades actually move. My Team's
 * category profile uses this; the playoff race stays on the record (it's the seeding).
 *
 * Tiers: strong (top third) · winnable/"battleground" (the few non-strong cats closest
 * to climbing) · lost (bottom third) · safe (the comfortable middle). gapUp/gapDown are
 * null — production gaps aren't "wins", so the profile shows no "Nw from" note.
 */
export function computeProductionGaps(
  totals: TeamCategoryTotals[],
  cats: CatSpec[],
  myTeamId: string,
): CategoryGap[] {
  const numTeams = totals.length
  if (!numTeams) return []
  const topThird = numTeams / 3
  const bottomThird = (numTeams * 2) / 3

  const base = cats.map((cat) => {
    const rank = rankInCategory(totals, cat).get(myTeamId) ?? numTeams
    return { statId: cat.statId, rank, strong: rank <= topThird }
  })

  // Battleground = the few non-strong cats closest to climbing (just outside the top
  // third), so it stays a tight, actionable set rather than every mid-pack category.
  const winnableSet = new Set(
    base
      .filter((b) => !b.strong && b.rank > 1 && b.rank <= bottomThird)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_WINNABLE)
      .map((b) => b.statId),
  )

  return base.map((b) => {
    const tier: CategoryGap['tier'] = b.strong
      ? 'strong'
      : winnableSet.has(b.statId)
        ? 'winnable'
        : b.rank > bottomThird
          ? 'lost'
          : 'safe'
    return { statId: b.statId, rank: b.rank, numTeams, tier, gapUp: null, gapDown: null }
  })
}
