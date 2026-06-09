export type CatSide = 'hit' | 'pit'

/** A scoring category in the league (e.g. Saves). */
export interface CategoryDef {
  statId: string
  label: string // short, e.g. "SV"
  name: string // long, e.g. "Saves"
  side: CatSide
  higherIsBetter: boolean // false for ERA/WHIP
}

/** One team's record in a single category. */
export interface TeamCategoryRecord {
  statId: string
  wins: number
  losses: number
  ties: number
  rank: number // 1 = best in league for this category
}

/** The logged-in user's per-category profile, league-contextualized. */
export interface MyTeamCategoryProfile {
  teamId: string
  teamName: string
  numTeams: number
  categories: TeamCategoryRecord[]
}

export type RecommendationKind = 'category-weakness' | 'category-strength'
export type Severity = 'high' | 'medium' | 'low'

export interface Recommendation {
  id: string
  kind: RecommendationKind
  severity: Severity
  statId: string
  headline: string // templated label, never prose
  detail: string
  evidenceRoute: string
  leverage: number // ranking weight; higher = surfaced first
}
