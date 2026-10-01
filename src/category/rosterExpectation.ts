import { nhlAbbrVariants } from '@/services/nhlSchedule'

/**
 * What a roster is expected to PRODUCE over the rest of the matchup, column by column.
 *
 * This is what the spread model needs. categorySigma derives a column's noise from the roster's
 * expected total rather than from a constant, precisely so it can move with the slate — and
 * that only works if somebody computes the total. This is that somebody.
 *
 * GAMES, NOT NIGHTS. A daily league's dominant lever is how many fixtures each side has left,
 * not how good its players are per game: one roster draws twenty-eight skater games in a week
 * and its opponent twenty-two, and that gap outweighs any single start/sit call. So a man's
 * contribution is his rate times HIS club's remaining games, and a man whose club is finished
 * for the week contributes nothing however good he is.
 */

export interface ExpectationInput {
  /** The roster, with the club each man plays for. */
  players: Array<{ key: string; proTeam?: string }>
  /** Season projections, keyed the same way. `stats.GP` is the games the line was earned over. */
  projections: Record<string, { stats: Record<string, number> } | undefined>
  /** Games each club has left in the matchup window. */
  gamesByTeam: Record<string, number>
  /** Canonical category keys to total up. */
  categories: string[]
}

export interface Expectation {
  /** Expected units in each column across the rest of the matchup. */
  remaining: Record<string, number>
  /** How many men actually have a fixture left — the headcount plus/minus needs. */
  bodies: number
}

/** Games left for a club, reading whichever spelling the feeds used. */
function gamesFor(gamesByTeam: Record<string, number>, proTeam?: string): number {
  const abbr = String(proTeam ?? '').trim().toUpperCase()
  if (!abbr) return 0
  for (const variant of nhlAbbrVariants(abbr)) {
    const n = Number(gamesByTeam[variant])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

export function rosterExpectation(input: ExpectationInput): Expectation {
  const { players, projections, gamesByTeam, categories } = input
  const remaining: Record<string, number> = {}
  for (const c of categories) remaining[c] = 0

  let bodies = 0

  for (const p of players) {
    const games = gamesFor(gamesByTeam, p.proTeam)
    if (games <= 0) continue

    const stats = projections[p.key]?.stats
    if (!stats) continue
    /* No projected games is an unknown schedule, not a one-game season — dividing by it would
       hand the loudest rate on the board to the least information on it. */
    const gp = Number(stats.GP)
    if (!Number.isFinite(gp) || gp <= 0) continue

    bodies++
    for (const c of categories) {
      const total = Number(stats[c])
      if (!Number.isFinite(total)) continue
      remaining[c] += (total / gp) * games
    }
  }

  return { remaining, bodies }
}
