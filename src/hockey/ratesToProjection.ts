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
  /* Power-play POINTS, which needs no splitting. An earlier version of this file listed PPP
     among the categories it could not supply, conflating it with the PPG/PPA split — those
     need power-play goals broken out, which the feed does not give. Power-play points it gives
     directly, and it is a standard column in nearly every league. */
  ppPoints: 'PPP',
  hits: 'HITS',
  blockedShots: 'BLK',
  ppGoals: 'PPG',
  shGoals: 'SHG',
}

/**
 * Categories a league may score that this feed cannot supply, and why.
 *
 * Named rather than silently omitted. A category that arrives absent is read by the value
 * model as a player contributing nothing to it, which in a z-scored world is not "unknown" —
 * it is BELOW AVERAGE, and it would bury every hit-heavy forward in a league that counts hits
 * while looking like a considered ranking.
 *
 * Currently EMPTY, which it was not: hits and blocks now come from `skater/realtime`, and the
 * power-play and short-handed assist columns are derived from the goals and points halves the
 * summary endpoint already carried. Every column a standard hockey league scores is filled.
 *
 * It stays as a concept rather than being deleted because the next league with an unusual
 * column will need it, and because an empty list is a claim worth being able to check.
 */
export const UNSUPPLIED_KEYS = [] as const

export interface RatesProjectionResult {
  projections: Record<string, HockeyProjection>
  /** League categories this feed could not fill. Empty when the league scores none of them. */
  missing: string[]
}

/**
 * @param rates      per-game rates from `rateSkaters`
 * @param gamesLeft  games each player still has. A scalar applies to everyone; a function is
 *                   asked per player, which is how an expected games-played gets in.
 *
 *                   EIGHTY-TWO FOR EVERYBODY IS A CLAIM, and a bad one. It says every player
 *                   on the board will be healthy and in the lineup all year, which is false
 *                   about a predictable fraction of them and most false about exactly the
 *                   players a manager is deciding between. The NHL's own data cannot answer
 *                   it — an expected games-played is a statement about health and role next
 *                   season, not a rate that can be measured from last one — so the horizon is
 *                   the one part of this projection worth taking from somewhere else.
 * @param leagueKeys the unified stat keys this league actually scores, so `missing` can be
 *                   about THIS league rather than a generic complaint
 */
export function ratesToProjection(
  rates: SkaterRate[],
  gamesLeft: number | ((rate: SkaterRate) => number),
  leagueKeys: string[] = [],
): RatesProjectionResult {
  const gamesFor = typeof gamesLeft === 'function'
    ? (r: SkaterRate) => Math.max(0, gamesLeft(r))
    : () => Math.max(0, gamesLeft)
  const projections: Record<string, HockeyProjection> = {}

  for (const r of rates) {
    const games = gamesFor(r)
    const stats: Record<string, number> = { GP: games }
    for (const [cat, key] of Object.entries(KEY_BY_CATEGORY)) {
      const perGame = r.perGame[cat]
      if (typeof perGame === 'number' && Number.isFinite(perGame)) stats[key] = perGame * games
    }
    /* The assist halves, derived rather than fetched. Power-play assists are power-play points
       minus power-play goals and short-handed assists are the same subtraction — which is why
       carrying the goals halves through the rate model was worth doing. Clamped at zero
       because shrinkage can pull the two terms past each other for a player with almost no
       special-teams record, and a negative assist count is not a thing. */
    const ppa = (stats.PPP ?? 0) - (stats.PPG ?? 0)
    if (Number.isFinite(ppa)) stats.PPA = Math.max(0, ppa)
    const shp = (r.perGame.shPoints ?? 0) * games
    const sha = shp - (stats.SHG ?? 0)
    if (Number.isFinite(sha)) stats.SHA = Math.max(0, sha)
    if (Number.isFinite(shp)) stats.SHP = Math.max(0, shp)
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

  const supplied = new Set([...Object.values(KEY_BY_CATEGORY), 'GP', 'PPA', 'SHA', 'SHP'])
  const missing = leagueKeys.filter((k) => !supplied.has(k))

  return { projections, missing }
}
