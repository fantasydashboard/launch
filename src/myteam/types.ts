export type ContribTier = 'plus' | 'neutral' | 'minus'

export interface PlayerCategoryContrib {
  statId: string
  tier: ContribTier
  value: number
  percentile: number
  /** Volume-weighted, direction-normalized z-score for this category (higher = better
   *  contribution; ratio cats weight by IP/AB so a low-volume reliever can't dominate ERA).
   *  0 if the player doesn't participate. This is the strength vector the trade scorer uses. */
  z: number
}

export interface CatSpec {
  statId: string
  lowerIsBetter: boolean
  side: 'hit' | 'pit'
  isRatio: boolean
  volumeStatId?: string // statId of the volume stat for a ratio cat (IP / AB / PA)
}

export interface ValuePoolPlayer {
  playerKey: string
  position: string
  stats: Record<string, number> // effective (projected full-season) stats
}

export interface PlayerContribution {
  playerKey: string
  contribs: PlayerCategoryContrib[]
  plusCount: number
  minusCount: number
  /** Mean of this player's per-category percentiles across only the categories they contribute to (0..1). */
  overallValue: number
  /** Sum of clamped per-category z-scores across the categories the player participates in (role-aware VOR). */
  valueScore: number
  /** 'hitter' | 'pitcher', from position (two-way assigned by majority participated cats). */
  role: 'hitter' | 'pitcher'
  /** Percentile (0-100) of valueScore among rostered POOL players of the same role. */
  roleValue: number
  /** Cross-role trade value: value-over-replacement scaled by a hitting/pitching budget
   *  split, so a hitter's and a pitcher's number are DIRECTLY comparable (equal = equal
   *  trade value). Replacement-level players ≈ 0. This is the single trade currency. */
  crossValue: number
  /** Percentile (0-100) of crossValue across ALL rostered players (both roles). The 0-100
   *  the UI meter shows — comparable across hitters and pitchers. */
  crossPercentile: number
  /** statId of the player's highest-percentile contributed category (null if none). */
  topStatId: string | null
}

export interface CategoryGap {
  statId: string
  rank: number
  numTeams: number
  tier: 'strong' | 'winnable' | 'safe' | 'lost' // strong=top third; winnable=close behind team above; lost=bottom + far; safe=otherwise
  gapUp: number | null // category-wins needed to pass the team ranked above (null if 1st)
  gapDown: number | null // category-wins cushion over the team below (null if last)
}
