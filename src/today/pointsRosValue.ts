import type { PlayerValue } from '@/myteam/playerValue'

/**
 * Projected rest-of-season fantasy points per player — the Today board's points-league drop
 * currency (the category value model needs categories a points league doesn't have). Resolution
 * is owned by the shared `valueOf` (PlayerValue) resolver, the same one the Wire consumes. Players
 * with no projectable value (no MLB team / no FanGraphs match → valueOf null) are omitted.
 */
export function pointsRosValue(
  players: { playerKey: string; name: string; team?: string; position?: string }[],
  valueOf: (p: { name?: string; position?: string; team?: string }) => PlayerValue | null,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of players) {
    const v = valueOf({ name: p.name, team: p.team, position: p.position })
    if (v) out.set(p.playerKey, v.total)
  }
  return out
}
