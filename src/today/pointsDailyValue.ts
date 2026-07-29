import type { PlayerValue } from '@/myteam/playerValue'

/**
 * A daily play's points-league base value = the player's projected per-game fantasy points.
 * Resolution is owned by the shared `valueOf` (PlayerValue) resolver the Wire also consumes.
 * Returns 0 when the player can't be projected (no MLB team / no FanGraphs match → valueOf
 * null, or zero projected games) — those players sink out of the board (mirrors the Wire).
 */
export function pointsDailyValue(
  name: string,
  team: string | undefined,
  position: string | undefined,
  valueOf: (p: { name?: string; position?: string; team?: string }) => PlayerValue | null,
): number {
  const v = valueOf({ name, team, position })
  return v && v.games > 0 ? v.total / v.games : 0
}
