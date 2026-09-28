/**
 * Goals blended with expected goals. MEASURED, AND NOT SHIPPED.
 *
 * Kept, wired to nothing, because the question "shouldn't we use expected goals?" is a good one
 * that will be asked again — by a reader, by an analyst, by whoever next opens the rate model —
 * and the answer took a day to establish. Deleting it would mean paying for that day twice.
 * Nothing imports this outside its own test and scripts/hockey-xg-sweep.ts.
 *
 * WHAT xG IS. MoneyPuck models every unblocked shot — where it was taken from, what kind, what
 * preceded it — and reports the goals a league-average finisher would have scored on that exact
 * set of chances. It is genuinely new information: not another projection to average against
 * ours, but a count of what a player generated rather than what went in. It joins on the NHL's
 * own playerId, so there is no name matching to go wrong. On the face of it, the best available
 * addition to this model.
 *
 * WHAT IT LOOKED LIKE. Predicting next season's goals per game from one prior season:
 *
 *     goals             r = 0.821, 0.809     mean 0.815
 *     expected goals    r = 0.826, 0.797     mean 0.812
 *     half of each      r = 0.843, 0.825     mean 0.834
 *
 * Neither better than the other, the average better than both, in both season pairs — the
 * signature of two noisy readings of one quantity whose errors differ. A clean +0.019.
 *
 * WHAT IT IS WORTH TO THE BOARD WE ACTUALLY SHIP: +0.001, which is nothing.
 *
 *     ablation                              G at 0   G at 0.5    gain
 *     shipped (3 seasons + regression)       0.848     0.848     +0.001
 *     one season, regression on              0.833     0.840     +0.007
 *     3 seasons, no regression               0.835     0.845     +0.010
 *     one season, no regression              0.808     0.830     +0.022
 *
 * The bottom row is the original measurement, reproduced. The blend works exactly as well as it
 * first appeared to — on a model we do not ship. Reading up the table: the three-season prior
 * takes half of the gain, the shooting regression takes most of it, and together they take all
 * of it. Both are already doing the job xG does, because all three answer one question — how
 * much of this man's shooting percentage was real? — and once any of them has answered it there
 * is nothing left for the next one to correct.
 *
 * AND THE PRINCIPLED VERSION IS WORSE. The obvious objection to the above is that the blend is
 * the crude way to use xG. shootingRegression.ts pulls a shooter toward his POSITION's mean;
 * xG can pull him toward HIS OWN chance quality, which is strictly more information — two
 * forwards who both shot 18% deserve different haircuts when one of them was shooting from the
 * slot. Swapping the shrinkage target and re-sweeping the persistence:
 *
 *     own xG as the target, best case   G = 0.844   (persistence 0.64)
 *     the positional mean we ship       G = 0.848
 *
 * Worse, at every persistence tried. A single player's expected goals per shot is itself a
 * noisy estimate, and the pooled positional rate — thousands of shots, and no estimation error
 * worth speaking of — turns out to be the better thing to aim at even though it knows less
 * about him.
 *
 * THE GENERAL LESSON, which is the reason this file is worth its bytes: a gain measured against
 * a simpler model than the one you ship is not a gain. This is the fourth constant this month
 * whose honest value came in far below its first measurement — the aging curve, the plus-minus
 * persistence and the save-percentage persistence all needed recalibrating for the same reason,
 * and all three were measured season-to-season and then applied to a multi-season blend. Measure
 * the change where it will actually run.
 */

/** One MoneyPuck season row, reduced to what the blend uses. See api/moneypuck.js. */
export interface ExpectedGoals {
  xGoals: number
  gamesPlayed: number
}

/** A season row this can blend: totals plus the games they were accumulated over. */
export interface HasGoals {
  playerId: number
  gamesPlayed: number
  goals: number
  points: number
}

/**
 * How much of the goal total comes from expected goals: none.
 *
 * Zero is a result, not a placeholder. The sweep through the shipped pipeline puts the optimum
 * at 0.2-0.3 and the gain there at +0.002 on goals and +0.001 on points — smaller than the
 * disagreement between the two seasons measured, which is the definition of noise. Shipping it
 * would buy four HTTP requests per page load and nothing else.
 *
 * Re-run scripts/hockey-xg-sweep.ts before changing this. If the rate model ever drops the
 * three-season prior or the shooting regression, the table above says xG becomes worth +0.007
 * to +0.022 again, and this is where to come back to.
 */
export const XG_WEIGHT = 0

/**
 * Blend expected goals into a pool of season rows.
 *
 * Returns new objects. These rows are the shared input to every hockey surface, and a blend
 * that wrote through them would change another board's numbers from across the app.
 */
export function blendExpectedGoals<T extends HasGoals>(
  rows: T[],
  xg: Map<number, ExpectedGoals>,
  weight = XG_WEIGHT,
): T[] {
  if (!weight || !xg.size) return rows

  return rows.map((r) => {
    const mp = xg.get(r.playerId)
    /* No xG for him, or nothing to scale by. His goals stand as counted — half a blend is
       worse than none, because it would mix a real total with a fabricated one. */
    if (!mp || !(mp.gamesPlayed > 0) || !(r.gamesPlayed > 0)) return r

    /*
     * Expected goals per game, times the games THIS row reports. The two feeds count games
     * independently — a player can be credited 81 by one and 80 by the other after a
     * mid-season trade — and using MoneyPuck's total against the NHL's games would silently
     * turn a rate disagreement into a goal-total error.
     */
    const expected = (mp.xGoals / mp.gamesPlayed) * r.gamesPlayed
    const blended = Math.max(0, r.goals * (1 - weight) + expected * weight)

    /*
     * Points moves by the same delta, because a goal IS a point. Left alone, a shooter whose
     * goals came down would keep every point he scored with them, and the board would rank him
     * on a total his own goal column contradicts. Assists are untouched — nothing here
     * measures them.
     */
    return { ...r, goals: blended, points: r.points + (blended - r.goals) }
  })
}
