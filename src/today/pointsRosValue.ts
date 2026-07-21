import { projectPlayerPoints } from '@/myteam/pointsValue'
import type { FGProjection } from '@/services/projectionService'

/**
 * Projected rest-of-season fantasy points per player — the Today board's points-league drop
 * currency (the category value model needs categories a points league doesn't have). Reuses the
 * FG-match → projectPlayerPoints path used by pointsDailyValue and the Wire. Players with no MLB
 * team ('FA'/blank) or no FanGraphs match carry no projectable value and are omitted from the map.
 */
export function pointsRosValue(
  players: { playerKey: string; name: string; team?: string }[],
  matchFG: (p: { full_name?: string; mlb_team?: string }) => FGProjection | null,
  weights: Record<string, number>,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of players) {
    const hasTeam = !!p.team && p.team.toUpperCase() !== 'FA'
    const fg = hasTeam ? matchFG({ full_name: p.name, mlb_team: p.team }) : null
    if (!fg) continue
    out.set(p.playerKey, projectPlayerPoints(fg, weights).total)
  }
  return out
}
