/** The set of NFL team codes playing in a week's schedule payload (bye = absent). */
export function playingTeams(games: any[]): Set<string> {
  const set = new Set<string>()
  for (const g of games ?? []) {
    const home = g?.home ?? g?.home_team ?? g?.metadata?.home_team
    const away = g?.away ?? g?.away_team ?? g?.metadata?.away_team
    if (home) set.add(String(home).toUpperCase())
    if (away) set.add(String(away).toUpperCase())
  }
  return set
}

/** Return a copy of weekly points with bye-week players (team not playing) zeroed. */
export function zeroByeWeek(
  points: Record<string, number>,
  proTeamByKey: Record<string, string>,
  playing: Set<string>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, pts] of Object.entries(points)) {
    const team = (proTeamByKey[key] ?? '').toUpperCase()
    out[key] = team && !playing.has(team) ? 0 : pts
  }
  return out
}

/** Per-team opponent + home/away for a week's schedule (a team absent = bye). */
export function opponentMap(games: any[]): Record<string, { opp: string; home: boolean }> {
  const out: Record<string, { opp: string; home: boolean }> = {}
  for (const g of games ?? []) {
    const home = String(g?.home ?? g?.home_team ?? g?.metadata?.home_team ?? '').toUpperCase()
    const away = String(g?.away ?? g?.away_team ?? g?.metadata?.away_team ?? '').toUpperCase()
    if (home && away) {
      out[home] = { opp: away, home: true }
      out[away] = { opp: home, home: false }
    }
  }
  return out
}
