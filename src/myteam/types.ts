export type ContribTier = 'plus' | 'neutral' | 'minus'

export interface PlayerCategoryContrib {
  statId: string
  tier: ContribTier
  value: number
  percentile: number
}

export interface PlayerContribution {
  playerKey: string
  contribs: PlayerCategoryContrib[]
  plusCount: number
  minusCount: number
}

export interface CategoryGap {
  statId: string
  rank: number
  numTeams: number
  tier: 'strong' | 'winnable' | 'safe' | 'lost' // strong=top third; winnable=close behind team above; lost=bottom + far; safe=otherwise
  gapUp: number | null // category-wins needed to pass the team ranked above (null if 1st)
  gapDown: number | null // category-wins cushion over the team below (null if last)
}
