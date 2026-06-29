export interface OddsTeam {
  teamKey: string
  strength: number
  wins: number
  losses: number
  ties: number
  pointsFor: number // standings tiebreaker
}
export interface ScheduleWeek {
  week: number
  matchups: [string, string][] // [teamKeyA, teamKeyB] — remaining (undecided) games
}
export interface OddsResult {
  teamKey: string
  playoffPct: number // 0..1
  projWins: number
  projLosses: number
  projTies: number
  avgSeed: number
}
export interface OddsOutput {
  results: OddsResult[] // sorted by playoffPct desc
  sims: number
}

/** Logistic win probability for A vs B from the strength gap. */
export function matchupWinProb(sa: number, sb: number, scale: number): number {
  const s = scale > 0 ? scale : 1e-6
  return 1 / (1 + Math.exp(-(sa - sb) / s))
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
}

/**
 * Monte-Carlo playoff odds. Simulates the remaining schedule `sims` times: each game flips on
 * its strength-based win prob, then teams are seeded by win% (tiebreak points-for, then key) and
 * the top `playoffSpots` count as making the bracket. Self-calibrating scale = stdev of strengths
 * (so the model fits the league's spread) unless `opts.scale` is given.
 */
export function simulatePlayoffOdds(
  teams: OddsTeam[],
  schedule: ScheduleWeek[],
  opts: { playoffSpots: number; sims?: number; scale?: number; rng?: () => number },
): OddsOutput {
  const sims = opts.sims ?? 10000
  const rng = opts.rng ?? Math.random
  const spots = opts.playoffSpots
  const scale = opts.scale ?? Math.max(1e-6, std(teams.map((t) => t.strength)))
  const strengthOf = new Map(teams.map((t) => [t.teamKey, t.strength]))

  const made = new Map<string, number>()
  const winSum = new Map<string, number>()
  const lossSum = new Map<string, number>()
  const seedSum = new Map<string, number>()
  for (const t of teams) {
    made.set(t.teamKey, 0)
    winSum.set(t.teamKey, 0)
    lossSum.set(t.teamKey, 0)
    seedSum.set(t.teamKey, 0)
  }

  for (let s = 0; s < sims; s++) {
    const rec = new Map(teams.map((t) => [t.teamKey, { w: t.wins, l: t.losses, t: t.ties }]))
    for (const wk of schedule) {
      for (const [a, b] of wk.matchups) {
        const ra = rec.get(a),
          rb = rec.get(b)
        if (!ra || !rb) continue
        const pa = matchupWinProb(strengthOf.get(a) ?? 0, strengthOf.get(b) ?? 0, scale)
        if (rng() < pa) {
          ra.w++
          rb.l++
        } else {
          rb.w++
          ra.l++
        }
      }
    }
    const seeded = teams
      .map((t) => {
        const r = rec.get(t.teamKey)!
        const g = r.w + r.l + r.t
        return { k: t.teamKey, pct: g > 0 ? (r.w + 0.5 * r.t) / g : 0, pf: t.pointsFor, w: r.w, l: r.l }
      })
      .sort((x, y) => y.pct - x.pct || y.pf - x.pf || (x.k < y.k ? -1 : 1))
    seeded.forEach((row, i) => {
      seedSum.set(row.k, seedSum.get(row.k)! + (i + 1))
      winSum.set(row.k, winSum.get(row.k)! + row.w)
      lossSum.set(row.k, lossSum.get(row.k)! + row.l)
      if (i < spots) made.set(row.k, made.get(row.k)! + 1)
    })
  }

  const results: OddsResult[] = teams
    .map((t) => ({
      teamKey: t.teamKey,
      playoffPct: made.get(t.teamKey)! / sims,
      projWins: winSum.get(t.teamKey)! / sims,
      projLosses: lossSum.get(t.teamKey)! / sims,
      projTies: t.ties,
      avgSeed: seedSum.get(t.teamKey)! / sims,
    }))
    .sort((a, b) => b.playoffPct - a.playoffPct || a.avgSeed - b.avgSeed)
  return { results, sims }
}
