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
 *
 * MEASURED, NOT ASSUMED. `scripts/ros-backtest.ts` rebuilds the board at each week of 2025 and
 * scores it against what those players went on to actually do. Five is the peak at receiver and
 * quarterback, and within noise of the peak at back (8 is better by 0.001) and tight end (3 is
 * better by 0.006). Sweeping 0 to 40 moves the answer very little in the middle and clearly
 * hurts at both extremes. See docs/ros-backtest-2025.md.
 *
 * It is also NOT what a trusted analyst does. His week-3 2026 board implied a prior weight
 * around 18 at quarterback and 20 at tight end — far stickier than ours. Backtested, those
 * settings are worse: 0.430 against our 0.446 at quarterback, 0.285 against 0.319 at tight end.
 * Position-dependent weights were tried and abandoned for the same reason; there is no evidence
 * for them, and a per-position constant fitted to one season is how you ship an artifact.
 */
export const PRIOR_GAMES = 5

/**
 * How much of the rate comes from the upcoming week's projection rather than from the
 * forecast-plus-results blend.
 *
 * Measured, on 2025, with no lookahead: the pure forward rate gained +0.067 Spearman at
 * receiver (winning 12 weeks of 13) and +0.039 at tight end, but was noise at quarterback and
 * running back. An even blend was positive at all four. See docs/ros-backtest-2025.md.
 *
 * An earlier version of that test summed the projections for EVERY remaining week and reported
 * a gain of +0.33. It was wrong: Sleeper maintains those files through the season and drops
 * players whose seasons have ended, so summing them in a backtest tells the model who is still
 * playing in December. Every 2025 season-ender was simply absent from week 14. Only the
 * upcoming week can be used to measure, because only it was filed before the decision.
 */
export const FORWARD_WEIGHT = 0.5

/** Regular season length, for turning a per-game rate back into a remaining total. */
export const SEASON_GAMES = 17

export interface RosInput {
  /** Preseason full-season projected points, by player key. */
  seasonProjection: Record<string, number>
  /** Every scoring line so far this season — the same feed the defence table reads. */
  lines: SeasonLine[]
  /** The week about to be played. Week 3 means two are in the books. */
  currentWeek: number
  /**
   * Each player's bye week, by the same key as `seasonProjection`. Absent, null, or a player
   * missing from the map all mean "we do not know", and an unknown bye is never invented — a
   * free agent with no pro team on file must not be quietly docked a game.
   */
  byeWeekByKey?: Record<string, number | null>
  /**
   * Per-player override of how many games the forecast is worth, for callers that vary it by
   * position. Zero is a real setting — trust only what he has done — and is honoured; a player
   * absent from the map, or carrying a negative weight, uses `PRIOR_GAMES`. rosBlend knows
   * nothing about positions and does not need to: the caller that does builds this map.
   */
  priorGamesByKey?: Record<string, number>
  /**
   * The upcoming week's projected points for this player, used as a per-game RATE.
   *
   * A second opinion that updates. Everything else here descends from a preseason forecast
   * that was frozen in August, so the only thing able to move a player was his own last two
   * box scores — which is why the board over-reacted to small samples. Sleeper maintains a
   * per-week projection that already reflects the depth chart, the injury and the role, and
   * blending its rate in lets the board learn something that is not a box score.
   *
   * Omit a player, or pass zero, to leave him exactly as he was. Zero means BYE or unprojected,
   * never "worthless".
   */
  forwardRateByKey?: Record<string, number>
}

export interface RosRow {
  /** Points we now expect over the games that REMAIN. */
  pointsRos: number
  /** The blended per-game rate behind it. */
  perGame: number
  /** How many games he has actually played — the honesty column for a small sample. */
  gamesPlayed: number
  /** Games he still PLAYS: the weeks that remain, less his bye if it is still to come. */
  gamesRemaining: number
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
  const { seasonProjection, lines, currentWeek, byeWeekByKey, priorGamesByKey, forwardRateByKey } = input
  const observed = observedFromLines(lines)
  /* Weeks still to play. Clamped at one so a late-season board never multiplies by zero and
     reports every player as worthless. */
  const remaining = Math.max(1, SEASON_GAMES - Math.max(0, currentWeek - 1))

  /*
   * Weeks remaining is not games remaining. A player whose bye is still ahead plays one fewer
   * of them, and pretending otherwise credits everyone with an afternoon they spend off. The
   * bye in the CURRENT week counts as still to come — it has not been played yet. Clamped at
   * one for the same reason `remaining` is.
   */
  const gamesFor = (key: string): number => {
    const bye = byeWeekByKey?.[key]
    const ahead = typeof bye === 'number' && Number.isFinite(bye) && bye >= currentWeek
    return Math.max(1, remaining - (ahead ? 1 : 0))
  }

  const priorFor = (key: string): number => {
    const pg = priorGamesByKey?.[key]
    return typeof pg === 'number' && Number.isFinite(pg) && pg >= 0 ? pg : PRIOR_GAMES
  }

  /*
   * Half and half. The pure forward rate scored better at receiver on its own, but one week of
   * projection is a thin thing to hang a season on; an even blend was positive at ALL FOUR
   * positions in the 2025 backtest where the pure version was noise at quarterback and back.
   * The two sources know different things, so averaging beats picking.
   */
  const withForward = (key: string, perGame: number): number => {
    const fwd = forwardRateByKey?.[key]
    if (typeof fwd !== 'number' || !Number.isFinite(fwd) || fwd <= 0) return perGame
    return perGame * (1 - FORWARD_WEIGHT) + fwd * FORWARD_WEIGHT
  }

  const out: Record<string, RosRow> = {}
  for (const [key, projected] of Object.entries(seasonProjection)) {
    const priorRate = projected / SEASON_GAMES
    const games = gamesFor(key)
    const seen = observed[key]
    if (!seen || seen.games <= 0) {
      const rate = withForward(key, priorRate)
      out[key] = { pointsRos: rate * games, perGame: rate, gamesPlayed: 0, gamesRemaining: games }
      continue
    }
    const pg = priorFor(key)
    const perGame = withForward(key, (priorRate * pg + seen.points) / (pg + seen.games))
    out[key] = { pointsRos: perGame * games, perGame, gamesPlayed: seen.games, gamesRemaining: games }
  }
  return out
}
