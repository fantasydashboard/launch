/**
 * Expected games, as a projection rather than a best case.
 *
 * WHAT WAS WRONG ORIGINALLY. Games came from ESPN, which answers "if healthy": 32% of skaters
 * were projected at a full 82, and clamping made it worse, since everyone ESPN puts at 82 or
 * more lands on exactly 82. A drafter is not buying "if".
 *
 * WHAT WAS WRONG WITH THE FIRST FIX, which is the more instructive failure. It shifted the pool
 * so its mean landed on a constant measured over the top 450 skaters (70). But the pool this is
 * handed in production is every rated skater — 940 of them, mean 51, because most are call-ups
 * who played a dozen games. Centring that on 70 added 18.6 games to every player alive. Half
 * the draftable board came out at exactly 82 against a league that produces 20%, and every
 * projected season total was overstated by about 8%. The symptom was identical to the bug it
 * replaced, from a completely different cause.
 *
 * Every unit test passed throughout, because each built its own pool centred near 70. A test
 * that constructs its input around the target cannot detect a centring error.
 *
 * SO THIS NO LONGER CENTRES ANYTHING. It is a measured mapping from what a player has done to
 * what he does next, fitted on 2,795 season-to-season pairs across four seasons:
 *
 *     games in season N    mean games in N+1    this mapping
 *              1-20                 17.0              18.3
 *             21-40                 33.6              33.2
 *             41-55                 43.6              45.9
 *             56-65                 51.5              54.9
 *             66-72                 62.5              61.1
 *             73-77                 64.1              65.5
 *             78-80                 69.6              68.4
 *             81-82                 72.2              70.2
 *
 * VALIDATED ACROSS REFERENCE CLASSES, which is the check that matters after getting this wrong
 * twice. Refitting on narrower populations moves the slope enormously — 0.726 over every
 * skater, 0.623 over the top 600, 0.459 over the top 450, 0.302 over the top 300 — because a
 * narrower class has less spread and more of the shrinkage moves into the intercept. The
 * PREDICTIONS barely move: a base-80 player comes out at 69.1, 69.2, 70.4 and 72.1 across those
 * four fits. The whole-league fit is the one used because it is the only one valid across the
 * whole range — a top-450 fit would project a 20-game call-up at 43 games — and it agrees with
 * the draftable-class fit to within about a game where a board actually lives.
 *
 * A PLAYER WHO VANISHED COUNTS AS ZERO, not as missing. Dropping him is the survivor bias that
 * makes every availability model read high: the reason he has no row next season is that he did
 * not play. This is why the mapping is harsher than a naive year-over-year correlation suggests.
 *
 * AND NOBODY IS EXPECTED TO PLAY 82. The most durable season on record maps to 71, because a
 * fifth of men who played all 82 did not do it again and the ones who missed time missed a lot.
 * An expectation of a full season is not an expectation, it is a best case — which is where this
 * file started.
 *
 * WHY IT MATTERS EVEN THOUGH IT BARELY MOVES A RANKING. A roughly uniform inflation cancels out
 * of an ordering, and an early attempt at this was rejected on exactly that measurement. What it
 * does not cancel out of is the NUMBER ON THE SCREEN: every projected season total was overstated
 * for the durable, which is the half of the product a reader checks against their own eyes.
 */

/**
 * How much of a player's games carry forward, as the slope of the fit above.
 *
 * THE SLOPE, NOT THE CORRELATION. This was 0.5 because games-played correlates year over year at
 * r = 0.53 and 0.47, and r was used as if it were a shrinkage factor. It is not: the slope of a
 * regression is r x (sd of the outcome / sd of the predictor), and once a vanished player is
 * counted as zero games the outcome is far more spread out than the predictor. Measured
 * directly, the slope is 0.726 — so using r shrank about a third too hard, and that error was
 * hidden by the +18.6 shift pushing everything back up.
 */
export const GAMES_PERSISTENCE = 0.726

/**
 * Where a season of no games at all still projects from — the fit's intercept.
 *
 * Equivalent to regressing toward an anchor of 40.3 games, which is far below any draftable
 * player and is why the mapping is a shrink rather than a shift.
 */
export const GAMES_INTERCEPT = 11.0

/** For a player with no feed row and no record whatsoever. The pool's own centre if it has one. */
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
 * Project games for a pool.
 *
 * PER-PLAYER, DELIBERATELY. It still takes the whole pool, because a player with nothing known
 * about him is given the pool's centre, but every player who HAS a record is mapped
 * independently of who else is in the list. That is the property the previous two versions
 * lacked and the reason both of them failed: an answer that depends on pool composition is one
 * that changes when a caller passes a different slice, silently, with no test able to see it.
 *
 * The feed and the player's own record are averaged first, because each knows something the
 * other does not — the feed has this year's role, the record has his durability.
 */
export function projectGames(
  rows: GamesInput[],
  {
    persistence = GAMES_PERSISTENCE,
    intercept = GAMES_INTERCEPT,
    fallback = EXPECTED_GAMES_MEAN,
    fullSeason = FULL_SEASON,
  } = {},
): number[] {
  if (!rows.length) return []

  /* null, not a substituted average — a player we know nothing about must not be allowed to
     drag the centre that is about to be used for him. */
  const base = rows.map((r) => {
    const parts = [Number(r.feedGames), Number(r.historyGames)]
      .filter((v) => Number.isFinite(v) && v > 0)
    return parts.length ? parts.reduce((s, v) => s + v, 0) / parts.length : null
  })

  const known = base.filter((v): v is number => v !== null)
  const centre = known.length ? known.reduce((s, v) => s + v, 0) / known.length : fallback

  return base.map((v) => {
    const projected = intercept + (v ?? centre) * persistence
    return Math.max(1, Math.min(fullSeason, projected))
  })
}
