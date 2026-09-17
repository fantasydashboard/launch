import type { SeasonLine } from '@/services/playerUsage'

/**
 * Rest-of-season points that respond to what has actually happened.
 *
 * WHAT WAS WRONG. `pointsRos` was Sleeper's full-season projection passed through untouched.
 * That number is a preseason forecast and it does not converge — the same figure in week
 * fourteen as in week one, whatever the player has done since. So our rest-of-season board
 * could not learn. Measured against a trusted analyst's week-2 rest-of-season list, their
 * ranking tracked points-per-game far harder than ours at every position (QB -0.67 to our
 * -0.34, WR -0.43 to our -0.21) and at tight end ours came out at +0.23 — POSITIVELY
 * correlated, meaning we ranked the better-producing tight ends worse.
 *
 * It was also a FULL-season number used as a REST-of-season one, so games already played were
 * still being counted as points you could still win.
 *
 * THE FIX IS NOT "USE PPG". Two games of production is mostly noise, and a board that chased
 * it would swing wildly every Monday and be wrong in the opposite direction. The projection is
 * a genuine prior built on a whole offseason, and the right move is to update it rather than
 * replace it: treat the forecast as PRIOR_GAMES games of evidence and let observed games
 * accumulate against it. Early on the prior dominates; by midseason what he has actually done
 * dominates; nothing lurches.
 *
 * This is the standard shrink-toward-a-prior treatment and it is the honest answer to a small
 * sample — not a coefficient fitted to any analyst's board.
 */

/**
 * How many games of evidence the preseason projection is worth.
 *
 * At five, one game played moves a player a sixth of the way from forecast to observed and
 * four games move him nearly half. Deliberately on the sticky side: the failure that costs a
 * manager real points is a board that reacts to one good afternoon, not one that takes a month
 * to notice a genuine change.
 */
export const PRIOR_GAMES = 5

/** Regular season length, for turning a per-game rate back into a remaining total. */
export const SEASON_GAMES = 17

export interface RosInput {
  /** Preseason full-season projected points, by player key. */
  seasonProjection: Record<string, number>
  /** Every scoring line so far this season — the same feed the defence table reads. */
  lines: SeasonLine[]
  /** The week about to be played. Week 3 means two are in the books. */
  currentWeek: number
}

export interface RosRow {
  /** Points we now expect over the games that REMAIN. */
  pointsRos: number
  /** The blended per-game rate behind it. */
  perGame: number
  /** How many games he has actually played — the honesty column for a small sample. */
  gamesPlayed: number
}

/** Observed points and games per player, from the season's scoring lines. */
export function observedFromLines(lines: SeasonLine[]): Record<string, { points: number; games: number }> {
  const out: Record<string, { points: number; games: number }> = {}
  for (const l of lines) {
    if (!l.playerKey) continue
    const e = (out[l.playerKey] ??= { points: 0, games: 0 })
    e.points += l.points
    e.games += 1
  }
  return out
}

/**
 * Blend the forecast with the season so far.
 *
 * A player absent from the lines has played nothing we can see, so he keeps the prior outright
 * — absent is not a zero-point game, and treating it as one would bury anyone the stats feed
 * simply has not filed.
 */
export function buildRosPoints(input: RosInput): Record<string, RosRow> {
  const { seasonProjection, lines, currentWeek } = input
  const observed = observedFromLines(lines)
  /* Weeks still to play. Clamped at one so a late-season board never multiplies by zero and
     reports every player as worthless. */
  const remaining = Math.max(1, SEASON_GAMES - Math.max(0, currentWeek - 1))

  const out: Record<string, RosRow> = {}
  for (const [key, projected] of Object.entries(seasonProjection)) {
    const priorRate = projected / SEASON_GAMES
    const seen = observed[key]
    if (!seen || seen.games <= 0) {
      out[key] = { pointsRos: priorRate * remaining, perGame: priorRate, gamesPlayed: 0 }
      continue
    }
    const perGame =
      (priorRate * PRIOR_GAMES + seen.points) / (PRIOR_GAMES + seen.games)
    out[key] = { pointsRos: perGame * remaining, perGame, gamesPlayed: seen.games }
  }
  return out
}
