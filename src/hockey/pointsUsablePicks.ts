/** Points-league streamers: per-game scoring rate times the games he can actually be started. */
export interface PointsUsableInput {
  key: string
  name: string
  position: string
  perGame: number
  usable: number | null
}

export function pointsUsablePicks(fas: PointsUsableInput[], n = 5) {
  return fas
    .filter((f) => f.usable != null && f.usable > 0)
    .map((f) => ({ key: f.key, name: f.name, position: f.position, usable: f.usable as number, points: f.perGame * (f.usable as number) }))
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, n)
}
