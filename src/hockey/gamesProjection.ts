/**
 * Expected games, as a projection rather than a best case.
 *
 * WHAT WAS WRONG. Games came from ESPN, which answers "if healthy": 32% of our skaters were
 * projected at a full 82 and the clamp made it worse, since everyone ESPN puts at 82 or more
 * lands on exactly 82. Against that, the population a preseason board actually carries — the
 * top 450 skaters by the prior season's production — played:
 *
 *     top-450 of 2023-24, actual 2024-25:  mean 70.6  median 77  82+ 21%
 *     top-450 of 2024-25, actual 2025-26:  mean 69.1  median 75  82+ 19%
 *
 * So we were about seven games high on the average and had half again as many iron men as the
 * league produces.
 *
 * AND A PROJECTION SHOULD BE NARROWER THAN REALITY, which is the part that gets missed. Games
 * played persists at r = 0.53 and 0.47 year over year, so an expectation belongs at roughly
 * half the spread of the season behind it: nobody is KNOWN to play 82, and a column where a
 * third of the league is certain to is not an expectation at all. An outside analyst baseline
 * puts 2% at 82 for the same reason.
 *
 * WHY IT MATTERS EVEN THOUGH IT BARELY MOVES A RANKING. A roughly uniform inflation in games
 * cancels out of an ordering — everyone gains together — and an earlier attempt to fix this
 * was rejected on exactly that measurement. What it does not cancel out of is the NUMBER ON
 * THE SCREEN: every projected season total was overstated for the durable, which is the half
 * of the product a reader checks against their own eyes.
 */

/** How much of a player's games carry to next season. Measured: r = 0.529, 0.468. */
export const GAMES_PERSISTENCE = 0.5

/**
 * Where the projected column should centre, for a draftable pool.
 *
 * Measured at 70.6 and 69.1 over the last two transitions. Not the whole league's 64, which is
 * dragged down by call-ups nobody drafts and would under-project every player on a board.
 */
export const EXPECTED_GAMES_MEAN = 70

/** A season, and the hard ceiling on any projection of it. */
export const FULL_SEASON = 82

export interface GamesInput {
  /** The feed's number — carries current role, which history cannot know. */
  feedGames?: number
  /** His own weighted games per season, from the multi-season blend. */
  historyGames?: number
}

/**
 * Project games for a whole pool.
 *
 * Whole-pool because the centring is defined by the pool: a column is shifted so its mean
 * lands where the measurement says a draftable pool lands, and scaled so its spread is what a
 * projection of a stat this persistent can support. A function handed one player could do
 * neither.
 *
 * The feed and the player's own record are averaged first, because each knows something the
 * other does not — the feed has this year's role, the record has his durability — and the
 * earlier version of this used only one of them at a time and was worse for it.
 */
export function projectGames(
  rows: GamesInput[],
  { persistence = GAMES_PERSISTENCE, mean = EXPECTED_GAMES_MEAN, fullSeason = FULL_SEASON } = {},
): number[] {
  if (!rows.length) return []

  const base = rows.map((r) => {
    const feed = Number(r.feedGames)
    const hist = Number(r.historyGames)
    const parts = [feed, hist].filter((v) => Number.isFinite(v) && v > 0)
    if (!parts.length) return mean
    return parts.reduce((s, v) => s + v, 0) / parts.length
  })

  const own = base.reduce((s, v) => s + v, 0) / base.length
  /* Centre on the measured mean, shrink the spread by what games actually persist, and only
     then clamp — clamping before scaling is what produced the spike at exactly 82. */
  return base.map((v) => {
    const projected = mean + (v - own) * persistence
    return Math.max(1, Math.min(fullSeason, projected))
  })
}
