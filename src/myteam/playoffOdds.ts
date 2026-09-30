/**
 * Playoff odds, and the honest limits of them.
 *
 * A trade's verdict elsewhere on this page is "where you finish in the power order". That is a
 * statement about strength. It is not the question a manager in October is actually asking,
 * which is whether he makes the bracket — and those come apart exactly when it matters: the
 * best roster in the league at 2-5 and the fourth-best at 5-2 are opposite decisions, and a
 * power-order verdict calls them the same way round.
 *
 * WHAT THIS MODELS. Each remaining week every team draws a score from its own projected mean
 * with a shared spread, the teams are paired, the winners bank a win, and after the last week
 * the table is sorted and the top N are in. Repeated a few thousand times, the share of runs a
 * team makes the cut is its odds.
 *
 * WHAT IT DOES NOT MODEL, stated here rather than discovered later:
 *
 * - THE ACTUAL REMAINING SCHEDULE. We do not hold it — the platforms give matchups a week at a
 *   time and fetching ten weeks for four platforms is a different piece of work. Opponents are
 *   drawn at random instead, which over a full round-robin is close to right on average and
 *   wrong for any one team with an unusually hard or soft run home. This is the single biggest
 *   approximation here and the first thing to fix if these numbers are ever load-bearing.
 * - Divisions, seeding rules and tiebreakers beyond points. A league that breaks ties on
 *   head-to-head will disagree with us in the rare case it is decided that way.
 * - Injuries, waivers and trades between now and then, which is to say the season.
 *
 * WHICH IS WHY THE DELTA IS THE PRODUCT, not the level. What the trade panel shows is the
 * change, and the change is far more robust than either number in it: the schedule we guessed
 * wrong, the spread we assumed and the tiebreaks we skipped are all very nearly the same in the
 * before run and the after run, so they cancel. `oddsShift` exists to make that the natural
 * thing to reach for. See the test that holds the delta steady while the spread moves.
 */

export interface OddsTeam {
  teamKey: string
  wins: number
  losses: number
  ties: number
  /** Points this team's optimal lineup is projected to score in ONE week from here. */
  weeklyMean: number
}

export interface OddsInput {
  teams: OddsTeam[]
  /** Weeks of regular season still to play. Zero means the table is already final. */
  weeksLeft: number
  playoffSpots: number
  /** Runs. 4,000 puts the standard error on a single team's odds under a point. */
  sims?: number
  seed?: number
  /** Spread of a team's weekly score about its own mean. See WEEKLY_SD. */
  weeklySd?: number
}

/**
 * How far a fantasy team's weekly score wanders from its own projection, in points.
 *
 * A judgement, and deliberately a visible one. Twenty-five points is the conventional figure
 * for a nine-starter football lineup and it is the right ORDER — a team projected for 120
 * putting up 95 or 145 is an ordinary week, and one that never left 115-125 would be a
 * different sport. It is not measured from our own leagues, and it does not need to be for what
 * this is used for: the panel shows a difference between two runs that share it.
 *
 * Raise it and everybody's odds crowd toward the middle; lower it and the table sets harder.
 * Neither moves the trade's delta much, which is the claim the tests pin down.
 */
export const WEEKLY_SD = 25

/** Deterministic PRNG — odds that shuffle on every render read as instability, not uncertainty. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller, one normal per call. */
function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

/**
 * Odds each team reaches the bracket, as a fraction in [0, 1].
 *
 * Returns an empty map for an empty league. With no weeks left it is not a simulation at all —
 * the table is the answer, and every team is in or out with certainty.
 */
export function playoffOdds(input: OddsInput): Record<string, number> {
  const { teams, weeksLeft, playoffSpots } = input
  const out: Record<string, number> = {}
  if (!teams.length) return out

  const spots = Math.max(1, Math.min(playoffSpots, teams.length))
  const sd = input.weeklySd ?? WEEKLY_SD
  const sims = Math.max(1, input.sims ?? 4000)

  if (weeksLeft <= 0) {
    /* Already decided. Sorting by record then by projected strength is a stand-in for points
       for, which is the usual tiebreak and which we do not carry here. */
    const order = [...teams].sort(
      (a, b) => (b.wins + b.ties * 0.5) - (a.wins + a.ties * 0.5) || b.weeklyMean - a.weeklyMean,
    )
    order.forEach((t, i) => { out[t.teamKey] = i < spots ? 1 : 0 })
    return out
  }

  const rand = rng(input.seed ?? 20260930)
  const made = new Map(teams.map((t) => [t.teamKey, 0]))
  const n = teams.length

  for (let s = 0; s < sims; s++) {
    const wins = teams.map((t) => t.wins + t.ties * 0.5)
    const points = teams.map(() => 0)
    const order = teams.map((_, i) => i)

    for (let w = 0; w < weeksLeft; w++) {
      const week = teams.map((t, i) => {
        const pts = t.weeklyMean + normal(rand) * sd
        points[i] += pts
        return pts
      })
      /* A fresh pairing every week, because we do not hold the real schedule. Fisher-Yates so
         the pairing is uniform rather than merely shuffled-looking. */
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      for (let i = 0; i + 1 < n; i += 2) {
        const a = order[i]
        const b = order[i + 1]
        if (week[a] > week[b]) wins[a] += 1
        else if (week[b] > week[a]) wins[b] += 1
        else { wins[a] += 0.5; wins[b] += 0.5 }
      }
      /* An odd league leaves one team without an opponent; it takes neither a win nor a loss,
         which is what a bye is. Silently handing it half a win would inflate whoever happened
         to be left over. */
    }

    const finish = teams.map((t, i) => ({ key: t.teamKey, w: wins[i], p: points[i] }))
    finish.sort((a, b) => b.w - a.w || b.p - a.p)
    for (let i = 0; i < spots; i++) made.set(finish[i].key, (made.get(finish[i].key) ?? 0) + 1)
  }

  for (const t of teams) out[t.teamKey] = (made.get(t.teamKey) ?? 0) / sims
  return out
}

/**
 * The before-and-after for one team, which is the only form this should be shown in.
 *
 * Both runs use the same seed, so the pairings and the draws are identical and the difference
 * between them is the trade rather than the dice. Without that the noise between two runs of a
 * few thousand sims is comparable to the effect being measured, and the panel would report a
 * shift on a trade that changed nothing.
 */
export function oddsShift(
  before: OddsInput,
  afterTeams: OddsTeam[],
  teamKey: string,
): { before: number; after: number } {
  const seed = before.seed ?? 20260930
  const b = playoffOdds({ ...before, seed })
  const a = playoffOdds({ ...before, teams: afterTeams, seed })
  return { before: b[teamKey] ?? 0, after: a[teamKey] ?? 0 }
}

/**
 * For display. Rounded to whole points, because the tenth is not ours to give: it is inside the
 * simulation's own sampling error, under the schedule we guessed at, and a reader shown "96.1"
 * will reasonably believe we can tell it from "96.0".
 */
export const pct = (p: number): number => Math.round(p * 100)
