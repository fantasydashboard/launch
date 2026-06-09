import type { CategoryDef, MyTeamCategoryProfile, Recommendation } from './types'
import { computeCategoryWeaknesses, computeCategoryStrengths } from './categorySignals'

const KIND_ORDER: Record<Recommendation['kind'], number> = {
  'category-weakness': 0,
  'category-strength': 1,
}

export function buildActionFeed(
  profile: MyTeamCategoryProfile,
  cats: CategoryDef[],
  limit = 5,
): Recommendation[] {
  const all = [...computeCategoryWeaknesses(profile, cats), ...computeCategoryStrengths(profile, cats)]
  all.sort((a, b) => {
    const k = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    if (k !== 0) return k
    return b.leverage - a.leverage
  })
  return all.slice(0, limit)
}
