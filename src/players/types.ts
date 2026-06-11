/** A free agent / available player, normalized from the Yahoo service shape. */
export interface AvailablePlayer {
  playerKey: string
  name: string
  position: string
  eligiblePositions?: string[] // every position this player qualifies for, e.g. ['1B','OF']
  team: string // MLB team abbr
  headshot?: string
  percentOwned: number
  status?: string // injury/IL status, '' if healthy
  stats: Record<string, number> // keyed by Yahoo stat_id (season totals)
}

/** A team's hole: a weak scoring category to target. */
export interface Hole {
  statId: string
  name: string // human label, e.g. "Saves"
  rank: number // team's league rank in this category (higher = weaker)
  lowerIsBetter: boolean
}

/** A suggested add for a specific hole category. */
export interface Add {
  player: AvailablePlayer
  statId: string
  statValue: number // the player's value in this category
  percentile: number // 0..1 within the FA pool for this category (direction-aware)
}

/** The top adds for one hole category. */
export interface HoleAdds {
  hole: Hole
  adds: Add[]
}
