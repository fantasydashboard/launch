import type { CategoryDef, MyTeamCategoryProfile, Recommendation } from './types'
import { rankLabel } from './ordinal'

function catName(statId: string, cats: CategoryDef[]): string {
  return cats.find((c) => c.statId === statId)?.name ?? statId
}

export function computeCategoryWeaknesses(
  profile: MyTeamCategoryProfile,
  cats: CategoryDef[],
): Recommendation[] {
  const threshold = (profile.numTeams * 2) / 3
  return profile.categories
    .filter((c) => c.rank > threshold)
    .map((c) => {
      const isBottomTwo = c.rank >= profile.numTeams - 1
      return {
        id: `weakness-${c.statId}`,
        kind: 'category-weakness' as const,
        severity: isBottomTwo ? ('high' as const) : ('medium' as const),
        statId: c.statId,
        headline: `${rankLabel(c.rank)} in ${catName(c.statId, cats)}`,
        detail: `You rank ${rankLabel(c.rank)} of ${profile.numTeams} in ${catName(c.statId, cats)}.`,
        evidenceRoute: '/',
        leverage: c.rank / profile.numTeams,
      }
    })
}

export function computeCategoryStrengths(
  profile: MyTeamCategoryProfile,
  cats: CategoryDef[],
): Recommendation[] {
  const threshold = profile.numTeams / 3
  return profile.categories
    .filter((c) => c.rank <= threshold)
    .map((c) => ({
      id: `strength-${c.statId}`,
      kind: 'category-strength' as const,
      severity: 'low' as const,
      statId: c.statId,
      headline: `${rankLabel(c.rank)} in ${catName(c.statId, cats)}`,
      detail: `You rank ${rankLabel(c.rank)} of ${profile.numTeams} in ${catName(c.statId, cats)}.`,
      evidenceRoute: '/',
      leverage: 1 - c.rank / profile.numTeams,
    }))
}
