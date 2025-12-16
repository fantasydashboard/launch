/**
 * Projection Utilities
 * Helper functions for calculating optimal lineups and projections
 */

export interface PlayerProjection {
  player_id: string
  stats: {
    pts_ppr?: number
    pts_half_ppr?: number
    pts_std?: number
    [key: string]: number | undefined
  }
}

/**
 * Get optimal lineup projection for a roster
 */
export function getOptimalLineupProjection(
  roster: string[],
  projections: Map<string, PlayerProjection>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): number {
  // Group players by position with their projections
  const playersByPosition = new Map<string, Array<{ playerId: string; projection: number }>>()

  roster.forEach(playerId => {
    const projection = projections.get(playerId)
    const player = players[playerId]
    
    if (!projection?.stats || !player) return

    const points = projection.stats[scoringType] || 0
    const position = player.position || 'UNKNOWN'

    if (!playersByPosition.has(position)) {
      playersByPosition.set(position, [])
    }
    playersByPosition.get(position)!.push({ playerId, projection: points })
  })

  // Sort each position by projection (highest first)
  playersByPosition.forEach(players => {
    players.sort((a, b) => b.projection - a.projection)
  })

  const usedPlayers = new Set<string>()
  let totalProjection = 0

  // Count required starters by position
  const positionCounts = new Map<string, number>()
  rosterPositions.forEach(pos => {
    if (pos === 'BN' || pos === 'IR') return
    positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1)
  })

  // Fill specific positions first
  const specificPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  specificPositions.forEach(position => {
    const needed = positionCounts.get(position) || 0
    const available = playersByPosition.get(position) || []

    for (let i = 0; i < needed && i < available.length; i++) {
      const player = available[i]
      if (!usedPlayers.has(player.playerId)) {
        totalProjection += player.projection
        usedPlayers.add(player.playerId)
      }
    }
  })

  // Fill FLEX positions
  const flexCount = positionCounts.get('FLEX') || 0
  const flexEligible: Array<{ playerId: string; projection: number }> = []

  ;['RB', 'WR', 'TE'].forEach(position => {
    const players = playersByPosition.get(position) || []
    players.forEach(player => {
      if (!usedPlayers.has(player.playerId)) {
        flexEligible.push(player)
      }
    })
  })

  flexEligible.sort((a, b) => b.projection - a.projection)

  for (let i = 0; i < flexCount && i < flexEligible.length; i++) {
    const player = flexEligible[i]
    totalProjection += player.projection
    usedPlayers.add(player.playerId)
  }

  // Fill SUPER_FLEX if exists
  const superFlexCount = positionCounts.get('SUPER_FLEX') || 0
  if (superFlexCount > 0) {
    const superFlexEligible: Array<{ playerId: string; projection: number }> = []

    ;['QB', 'RB', 'WR', 'TE'].forEach(position => {
      const players = playersByPosition.get(position) || []
      players.forEach(player => {
        if (!usedPlayers.has(player.playerId)) {
          superFlexEligible.push(player)
        }
      })
    })

    superFlexEligible.sort((a, b) => b.projection - a.projection)

    for (let i = 0; i < superFlexCount && i < superFlexEligible.length; i++) {
      const player = superFlexEligible[i]
      totalProjection += player.projection
    }
  }

  return totalProjection
}

/**
 * Calculate average projected points across multiple weeks
 */
export function calculateAverageProjection(
  roster: string[],
  weekProjections: Map<number, Map<string, PlayerProjection>>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): number {
  const weeks = Array.from(weekProjections.keys())
  if (weeks.length === 0) return 0

  let totalProjection = 0
  weeks.forEach(week => {
    const projections = weekProjections.get(week)!
    const weekProjection = getOptimalLineupProjection(
      roster,
      projections,
      players,
      rosterPositions,
      scoringType
    )
    totalProjection += weekProjection
  })

  return totalProjection / weeks.length
}

/**
 * Get position-specific projections for rest of season
 */
export function getPositionProjections(
  roster: string[],
  weekProjections: Map<number, Map<string, PlayerProjection>>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): Record<string, number> {
  const positionTotals: Record<string, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    FLEX: 0
  }

  const weeks = Array.from(weekProjections.keys())
  if (weeks.length === 0) return positionTotals

  weeks.forEach(week => {
    const projections = weekProjections.get(week)!
    const weekPositions = calculateWeekPositionProjections(
      roster,
      projections,
      players,
      rosterPositions,
      scoringType
    )

    Object.keys(weekPositions).forEach(position => {
      if (positionTotals[position] !== undefined) {
        positionTotals[position] += weekPositions[position]
      }
    })
  })

  return positionTotals
}

/**
 * Calculate position projections for a single week
 */
function calculateWeekPositionProjections(
  roster: string[],
  projections: Map<string, PlayerProjection>,
  players: Record<string, any>,
  rosterPositions: string[],
  scoringType: 'pts_ppr' | 'pts_half_ppr' | 'pts_std' = 'pts_ppr'
): Record<string, number> {
  const positionTotals: Record<string, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    FLEX: 0
  }

  // Group players by position with their projections
  const playersByPosition = new Map<string, Array<{ playerId: string; projection: number }>>()

  roster.forEach(playerId => {
    const projection = projections.get(playerId)
    const player = players[playerId]
    
    if (!projection?.stats || !player) return

    const points = projection.stats[scoringType] || 0
    const position = player.position || 'UNKNOWN'

    if (!playersByPosition.has(position)) {
      playersByPosition.set(position, [])
    }
    playersByPosition.get(position)!.push({ playerId, projection: points })
  })

  // Sort each position by projection
  playersByPosition.forEach(players => {
    players.sort((a, b) => b.projection - a.projection)
  })

  const usedPlayers = new Set<string>()

  // Count required starters
  const positionCounts = new Map<string, number>()
  rosterPositions.forEach(pos => {
    if (pos === 'BN' || pos === 'IR') return
    positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1)
  })

  // Fill specific positions
  const specificPositions = ['QB', 'RB', 'WR', 'TE']
  specificPositions.forEach(position => {
    const needed = positionCounts.get(position) || 0
    const available = playersByPosition.get(position) || []

    for (let i = 0; i < needed && i < available.length; i++) {
      const player = available[i]
      if (!usedPlayers.has(player.playerId)) {
        positionTotals[position] += player.projection
        usedPlayers.add(player.playerId)
      }
    }
  })

  // Fill FLEX
  const flexCount = positionCounts.get('FLEX') || 0
  const flexEligible: Array<{ playerId: string; projection: number; position: string }> = []

  ;['RB', 'WR', 'TE'].forEach(position => {
    const players = playersByPosition.get(position) || []
    players.forEach(player => {
      if (!usedPlayers.has(player.playerId)) {
        flexEligible.push({ ...player, position })
      }
    })
  })

  flexEligible.sort((a, b) => b.projection - a.projection)

  for (let i = 0; i < flexCount && i < flexEligible.length; i++) {
    const player = flexEligible[i]
    positionTotals.FLEX += player.projection
    usedPlayers.add(player.playerId)
  }

  return positionTotals
}
