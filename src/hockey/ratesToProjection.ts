import type { SkaterRate } from './nhlRates'
import type { HockeyProjection } from './hockeyValue'

/**
 * Measured rates, turned into the rest-of-season projection the category model already eats.
 *
 * `buildHockeyCategoryValue` wants season totals per unified stat key and does the hard part
 * from there — z-scores, a startable pool rather than all 900 skaters, goalies kept out of the
 * skater distribution. None of that needs rewriting for a rate-based feed. This is the join,
 * not a second implementation.
 *
 * The multiplication is the whole conversion: a per-game rate times the games a player has
 * left is his rest-of-season total. That is the same shape football's board uses, and it is
 * why the rates had to be shrunk upstream — multiplying an unshrunk two-game sample by sixty
 * remaining games is how a hot start becomes a projection nobody should act on.
 */

/** `nhlRates` category -> the unified stat key `HOCKEY_STAT_BY_ID` uses. */
const KEY_BY_CATEGORY: Record<string, string> = {
  goals: 'G',
  assists: 'A',
  points: 'PTS',
  plusMinus: 'PLUSMINUS',
  penaltyMinutes: 'PIM',
  shots: 'SOG',
}

/**
 * Categories a league may score that this feed cannot supply, and why.
 *
 * Named rather than silently omitted. A category that arrives absent is read by the value
 * model as a player contributing nothing to it, which in a z-scored world is not "unknown" —
 * it is BELOW AVERAGE, and it would bury every hit-heavy forward in a league that counts hits
 * while looking like a considered ranking.
 *
 * - HITS, BLK: live on `skater/realtime`, which this feed does not read.
 * - PPG, PPA: the NHL reports power-play POINTS and power-play GOALS; splitting assists out
 *   is possible but `nhlRates` does not currently carry ppGoals, so neither half is emitted
 *   rather than emitting one and letting the other read as zero.
 */
export const UNSUPPLIED_KEYS = ['HITS', 'BLK', 'PPG', 'PPA'] as const

export interface RatesProjectionResult {
  projections: Record<string, HockeyProjection>
  /** League categories this feed could not fill. Empty when the league scores none of them. */
  missing: string[]
}

/**
 * @param rates      per-game rates from `rateSkaters`
 * @param gamesLeft  games each player still has — a scalar applies to everyone
 * @param leagueKeys the unified stat keys this league actually scores, so `missing` can be
 *                   about THIS league rather than a generic complaint
 */
export function ratesToProjection(
  rates: SkaterRate[],
  gamesLeft: number,
  leagueKeys: string[] = [],
): RatesProjectionResult {
  const games = Math.max(0, gamesLeft)
  const projections: Record<string, HockeyProjection> = {}

  for (const r of rates) {
    const stats: Record<string, number> = { GP: games }
    for (const [cat, key] of Object.entries(KEY_BY_CATEGORY)) {
      const perGame = r.perGame[cat]
      if (typeof perGame === 'number' && Number.isFinite(perGame)) stats[key] = perGame * games
    }
    /* Ice time is carried as a rate, not a total, because that is how it is read: a player on
       the first power-play unit is a buy before his points arrive, and per-game is the form
       that comparison takes. */
    if (r.ppSecondsPerGame > 0) stats.PPTOIG = r.ppSecondsPerGame

    projections[String(r.playerId)] = {
      playerKey: String(r.playerId),
      position: r.position,
      stats,
    }
  }

  const supplied = new Set([...Object.values(KEY_BY_CATEGORY), 'GP'])
  const missing = leagueKeys.filter((k) => !supplied.has(k))

  return { projections, missing }
}
