/**
 * Remaining strength-of-schedule for every team: average opponent talent across the
 * games each team still has to play, ranked easiest → hardest. The actionable signal is
 * a team whose schedule luck contradicts its current standing — a strong team facing a
 * gauntlet (likely to fade) or a struggling team with a soft road (likely to surge).
 *
 * Pure + deterministic.
 */
export interface SosTeam {
  teamKey: string
  teamName: string
  strength: number // higher = stronger opponent
  standingRank: number // 1 = first in the standings
}

export interface SosScheduleWeek {
  matchups: [string, string][] // remaining (undecided) games
}

export interface SosRow {
  teamKey: string
  teamName: string
  standingRank: number
  sosRank: number // 1 = easiest remaining road
  total: number // teams with remaining games (the ranking pool)
  avgOppStrength: number
  games: number
  trend: 'fade' | 'surge' | null // schedule luck vs standing
}

export function buildStrengthOfSchedule(teams: SosTeam[], schedule: SosScheduleWeek[]): SosRow[] {
  const leagueSize = teams.length
  const sOf = new Map(teams.map((t) => [t.teamKey, t.strength]))
  const opps = new Map<string, number[]>()
  for (const t of teams) opps.set(t.teamKey, [])
  for (const wk of schedule)
    for (const [a, b] of wk.matchups) {
      if (opps.has(a)) opps.get(a)!.push(sOf.get(b) ?? 0)
      if (opps.has(b)) opps.get(b)!.push(sOf.get(a) ?? 0)
    }

  const withGames = teams
    .map((t) => {
      const arr = opps.get(t.teamKey) ?? []
      return { t, n: arr.length, avg: arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0 }
    })
    .filter((x) => x.n > 0)

  // Ascending average opponent strength → easiest road first.
  const sorted = [...withGames].sort((a, b) => a.avg - b.avg || (a.t.teamKey < b.t.teamKey ? -1 : 1))
  const total = sorted.length
  const easyThird = Math.max(1, Math.ceil(total / 3))
  const hardThird = total - Math.max(1, Math.floor(total / 3)) + 1

  return sorted.map((x, i) => {
    const sosRank = i + 1
    const upperHalf = x.t.standingRank <= leagueSize / 2
    let trend: 'fade' | 'surge' | null = null
    if (sosRank >= hardThird && upperHalf) trend = 'fade' // good team, hard finish
    else if (sosRank <= easyThird && !upperHalf) trend = 'surge' // struggling team, soft finish
    return {
      teamKey: x.t.teamKey,
      teamName: x.t.teamName,
      standingRank: x.t.standingRank,
      sosRank,
      total,
      avgOppStrength: x.avg,
      games: x.n,
      trend,
    }
  })
}
