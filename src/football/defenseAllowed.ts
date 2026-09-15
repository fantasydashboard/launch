/**
 * How many fantasy points each defence gives up, by position.
 *
 * WHY PER POSITION. A single "strength of schedule" number is close to useless, because
 * defences are not uniformly good. Detroit can be the second-easiest schedule in the league
 * for running backs and near the hardest for tight ends — same opponents, opposite answer.
 * One number per team would average those into a shrug.
 *
 * WHY ADJUSTED. Raw points allowed is mostly a measure of who a defence has played. A unit
 * that has faced two elite offences looks worse than it is, and one that has faced two bad
 * ones looks better. Each game is therefore divided by what that offence usually produces, so
 * the figure answers "how much more or less than normal did they give up" rather than "who
 * was on their schedule".
 *
 * WHAT THIS IS NOT. It is not predictive on its own early in a season. Two games is two
 * games, and the surface has to say so rather than print a confident 1-to-32 rank over noise.
 * `games` is carried on every row for exactly that reason.
 */

export interface AllowedRow {
  /** Points allowed to this position per game, adjusted for the offences faced. */
  perGame: number
  /** How many games this is averaged over — the honesty column. */
  games: number
}

/** team -> position -> what they give up. */
export type AllowedByTeam = Record<string, Record<string, AllowedRow>>

/** One player's scoring line from one game, as the stats feed gives it. */
export interface GameLine {
  team: string
  opponent: string
  position: string
  points: number
}

/**
 * Aggregate scoring lines into adjusted points allowed.
 *
 * The adjustment is deliberately simple: each offence's own per-game average at a position is
 * the baseline, and a defence is credited with the ratio. A more elaborate model is not
 * justified by the sample any of this runs on.
 */
export function buildAllowed(lines: GameLine[]): AllowedByTeam {
  // What each offence normally produces at each position — the baseline to adjust against.
  const offense = new Map<string, { total: number; games: Set<string> }>()
  for (const l of lines) {
    if (!l.team || !l.position) continue
    const key = `${l.team}|${l.position}`
    const e = offense.get(key) ?? { total: 0, games: new Set<string>() }
    e.total += l.points
    e.games.add(l.opponent)
    offense.set(key, e)
  }
  const offenseAvg = new Map<string, number>()
  for (const [key, e] of offense) {
    if (e.games.size) offenseAvg.set(key, e.total / e.games.size)
  }

  // League average per position, the yardstick a ratio is measured against.
  const leagueTotals = new Map<string, { total: number; n: number }>()
  for (const [key, avg] of offenseAvg) {
    const pos = key.split('|')[1]
    const e = leagueTotals.get(pos) ?? { total: 0, n: 0 }
    e.total += avg
    e.n += 1
    leagueTotals.set(pos, e)
  }
  const leagueAvg = new Map<string, number>()
  for (const [pos, e] of leagueTotals) if (e.n) leagueAvg.set(pos, e.total / e.n)

  const acc = new Map<string, { total: number; games: Set<string> }>()
  for (const l of lines) {
    if (!l.opponent || !l.position) continue
    const expected = offenseAvg.get(`${l.team}|${l.position}`)
    const league = leagueAvg.get(l.position) ?? 0
    /*
     * Scale the game to what an average offence would have produced. A defence that held an
     * elite unit to its normal output has done nothing special; one that held it well below
     * has. Falls back to the raw figure when there is no baseline yet.
     */
    const adjusted = expected && expected > 0 && league > 0
      ? l.points * (league / expected)
      : l.points
    const key = `${l.opponent}|${l.position}`
    const e = acc.get(key) ?? { total: 0, games: new Set<string>() }
    e.total += adjusted
    e.games.add(l.team)
    acc.set(key, e)
  }

  const out: AllowedByTeam = {}
  for (const [key, e] of acc) {
    const [team, pos] = key.split('|')
    if (!e.games.size) continue
    ;(out[team] ??= {})[pos] = {
      perGame: e.total / e.games.size,
      games: e.games.size,
    }
  }
  return out
}

/**
 * Rank all 32 defences at one position, 1 = gives up the most (the easiest matchup).
 *
 * Teams with no data are absent rather than ranked last — an unplayed defence is unknown, and
 * ranking it 32nd would read as "hardest matchup in the league" on no evidence at all.
 */
export function rankAllowed(allowed: AllowedByTeam, position: string): Record<string, number> {
  const rows = Object.entries(allowed)
    .map(([team, byPos]) => ({ team, row: byPos[position] }))
    .filter((r) => r.row && r.row.games > 0)
    .sort((a, b) => b.row!.perGame - a.row!.perGame)
  const out: Record<string, number> = {}
  rows.forEach((r, i) => { out[r.team] = i + 1 })
  return out
}
