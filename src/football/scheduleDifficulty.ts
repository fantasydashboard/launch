import { rankAllowed, type AllowedByTeam } from './defenseAllowed'

/**
 * How hard a team's remaining schedule is, per position.
 *
 * Reported as a 1-to-32 rank because that is the shape managers already read: 1 is the easiest
 * run of opponents in the league at that position, 32 the hardest. The underlying number —
 * average points the upcoming defences give up — is meaningless without a league to compare
 * it against, and a rank supplies that for free.
 *
 * TWO HORIZONS, NOT ONE. Rest-of-season answers "should I hold him", next-four answers "should
 * I start or trade him now", and they disagree constantly: a receiver with the league's easiest
 * remaining schedule can still have a brutal month in front of him. Averaging the two would
 * hide precisely the case a manager needs to see.
 *
 * A BYE IS NOT A HARD GAME. Weeks a team does not play are skipped rather than scored, because
 * counting one as difficulty would make a team's schedule look tougher for having a week off.
 * The bye is reported separately, where it belongs.
 */

export interface TeamSchedule {
  /** week -> opponent abbreviation. Weeks the team is on bye are simply absent. */
  [week: number]: string
}

export interface DifficultyRow {
  /** 1 = easiest remaining schedule at this position, 32 = hardest. */
  ros: number | null
  /** Same scale, over the next four games the team actually plays. */
  next4: number | null
  /** The week they are off, when the schedule reaches it. */
  bye: number | null
  /** Games of defensive data behind this — small numbers mean a noisy answer. */
  sampleGames: number
}

export const NEXT_N = 4

/** Which week each team has off, from a full-season schedule. Null when not yet knowable. */
export function byeWeeks(schedule: Record<string, TeamSchedule>, throughWeek: number): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [team, weeks] of Object.entries(schedule)) {
    let bye: number | null = null
    for (let w = 1; w <= throughWeek; w++) {
      if (!weeks[w]) { bye = w; break }
    }
    out[team] = bye
  }
  return out
}

/**
 * Difficulty for every team at one position.
 *
 * Ranks the AVERAGE difficulty of each team's upcoming opponents, then ranks those averages
 * 1-32 — so the output is comparable across positions, which raw points allowed is not.
 */
export function buildDifficulty(input: {
  schedule: Record<string, TeamSchedule>
  allowed: AllowedByTeam
  position: string
  fromWeek: number
  throughWeek: number
}): Record<string, DifficultyRow> {
  const { schedule, allowed, position, fromWeek, throughWeek } = input
  const oppRank = rankAllowed(allowed, position)
  const byes = byeWeeks(schedule, throughWeek)

  /* A team's difficulty is the mean rank of the defences it still has to play. Unknown
     opponents are skipped, not guessed — a missing defence must not drag an average. */
  const meanOf = (team: string, limit: number): number | null => {
    const weeks = schedule[team] ?? {}
    const ranks: number[] = []
    for (let w = fromWeek; w <= throughWeek && ranks.length < limit; w++) {
      const opp = weeks[w]
      if (!opp) continue              // bye, or a week the schedule does not cover
      const r = oppRank[opp]
      if (r === undefined) continue   // defence with no data yet
      ranks.push(r)
    }
    if (!ranks.length) return null
    return ranks.reduce((a, b) => a + b, 0) / ranks.length
  }

  const rosMean = new Map<string, number>()
  const n4Mean = new Map<string, number>()
  for (const team of Object.keys(schedule)) {
    const ros = meanOf(team, Number.MAX_SAFE_INTEGER)
    const n4 = meanOf(team, NEXT_N)
    if (ros !== null) rosMean.set(team, ros)
    if (n4 !== null) n4Mean.set(team, n4)
  }

  /*
   * LOWEST mean opponent-rank is the easiest schedule, and I had this backwards.
   *
   * rankAllowed gives rank 1 to the defence that gives up the MOST — the softest matchup. So
   * a team facing those repeatedly carries a low mean, and low is easy. Sorting descending
   * produced the exact inversion: the hardest schedules were being labelled 1.
   */
  const toRank = (m: Map<string, number>): Record<string, number> => {
    const out: Record<string, number> = {}
    ;[...m.entries()].sort((a, b) => a[1] - b[1]).forEach(([team], i) => { out[team] = i + 1 })
    return out
  }
  const rosRank = toRank(rosMean)
  const n4Rank = toRank(n4Mean)

  const sample = Math.max(0, ...Object.values(allowed).map((p) => p[position]?.games ?? 0))
  const out: Record<string, DifficultyRow> = {}
  for (const team of Object.keys(schedule)) {
    out[team] = {
      ros: rosRank[team] ?? null,
      next4: n4Rank[team] ?? null,
      bye: byes[team] ?? null,
      sampleGames: sample,
    }
  }
  return out
}
