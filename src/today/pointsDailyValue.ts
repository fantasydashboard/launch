import { projectPlayerPoints } from '@/myteam/pointsValue'
import type { FGProjection } from '@/services/projectionService'

/**
 * A daily play's points-league base value = the player's projected per-game fantasy points.
 * Reuses the same FG-match → projectPlayerPoints path buildPointsWire uses for free agents.
 * Returns 0 when the player has no real MLB team ('FA'/blank) or no FanGraphs match — those
 * players can't be projected and must sink out of the board (mirrors the Wire's points>0 filter).
 */
export function pointsDailyValue(
  name: string,
  team: string | undefined,
  matchFG: (p: { full_name?: string; mlb_team?: string }) => FGProjection | null,
  weights: Record<string, number>,
): number {
  const hasTeam = !!team && team.toUpperCase() !== 'FA'
  const fg = hasTeam ? matchFG({ full_name: name, mlb_team: team }) : null
  if (!fg) return 0
  const pp = projectPlayerPoints(fg, weights)
  return pp.games > 0 ? pp.total / pp.games : 0
}
