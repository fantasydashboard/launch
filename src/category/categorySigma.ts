/**
 * How much a column can still move in a day — derived from the projection, not guessed.
 *
 * WHAT THIS REPLACES. services/categoryWinProbability carries a volatility table keyed by
 * BASEBALL stat ids on two platforms. Every hockey and basketball column falls through its
 * `|| 5` default, so a goal is modelled as being as noisy as a strikeout: five goals of daily
 * swing, which is more than most rosters score in a week. That makes every column a coin flip
 * and is why both category boards print a win chance they cannot justify.
 *
 * THE COUNTING COLUMNS DERIVE THEMSELVES. A player-day in goals, assists, shots, hits, blocks
 * or penalty minutes is a count of discrete events, so to a good approximation its variance is
 * its mean. A roster-day is the sum of independent player-days, so:
 *
 *     var(team-day) = sum of player means = the team's expected total that day
 *     sigma(team-day) = sqrt(expected total that day)
 *
 * That is better than any constant could be, because it moves with the slate. Ten skaters
 * playing tonight carry more noise than three, and a fixed number cannot express that — which
 * matters most in exactly the leagues this is for, where one roster draws twenty-eight games in
 * a week and its opponent twenty-two.
 *
 * It also makes the units right, which the old table never was for hockey: a goals column gets
 * a spread measured in goals.
 *
 * DISPERSION IS THE ONE JUDGED NUMBER, and it is small and named. Pure counts sit at one.
 * Shots, hits and blocks cluster by role and ice time — a fourth-liner and a first-pair
 * defenceman are not draws from the same distribution — so they spread wider. These are
 * DERIVED FROM THE SHAPE OF THE STAT rather than measured from game logs, which we do not
 * fetch; they are the honest first cut, not a measurement, and they are isolated here so a
 * later measurement replaces a table rather than a model.
 *
 * WHAT IS NOT POISSON gets its own branch rather than a fudged constant: plus/minus is a
 * difference of counts and ratios are not counts at all.
 */

/** Overdispersion against a pure count. One means "a count behaves like a count". */
export const DISPERSION: Record<string, number> = {
  /* Goals and assists are close to pure counts — a shot either goes in or it does not. */
  G: 1, A: 1, PTS: 1, PPG: 1, PPA: 1, PPP: 1, SHG: 1, SHP: 1,
  /* Role-driven volume: how many you get is mostly how much you are on the ice for. */
  SOG: 1.6, HITS: 2.0, BLK: 1.8, PIM: 2.5,
  /* Goalie counting columns. A win is one event per start; shutouts are rarer still. */
  W: 1, SHO: 1, SV: 1.4,
}

/** A column with no entry is treated as a pure count, which is the safe reading of a count. */
export function dispersionFor(key: string): number {
  const d = DISPERSION[String(key || '').toUpperCase()]
  return Number.isFinite(d) && d! > 0 ? d! : 1
}

/**
 * Per-skater daily spread of plus/minus.
 *
 * Not a count: it is goals-for minus goals-against while he is on the ice, centred near zero,
 * and routinely negative. Its spread has nothing to do with its mean — a team hovering at zero
 * would get a spread of zero from the Poisson rule and have the column declared decided.
 * Roughly a goal and a half per skater-game, which is the scale of on-ice events he is party to.
 */
const PLUSMINUS_PER_SKATER = 1.5

/**
 * The daily standard deviation of a roster's total in one column.
 *
 * `expectedPerDay` is what this roster is projected to produce today. `bodies` is how many
 * players are actually playing, needed only by the columns whose spread does not come from
 * their mean.
 *
 * Feeds straight into catWinProb and catLeverage, which apply sqrt(days) themselves — so a
 * daily sigma here becomes sqrt(dispersion * expected total remaining) over the week, which is
 * the quantity that actually governs the column.
 */
export function dailySigma(expectedPerDay: number, key: string, bodies = 1): number {
  const k = String(key || '').toUpperCase()

  if (k === 'PLUSMINUS' || k === 'PLUS/MINUS' || k === '+/-') {
    const n = Number.isFinite(bodies) && bodies > 0 ? bodies : 1
    /* Independent skaters, so the team's variance is the sum of theirs. */
    return PLUSMINUS_PER_SKATER * Math.sqrt(n)
  }

  const mean = Number(expectedPerDay)
  if (!Number.isFinite(mean) || mean <= 0) return 0
  return Math.sqrt(dispersionFor(k) * mean)
}

/**
 * The spread of a RATIO column, which comes from the volume underneath it.
 *
 * A save percentage over four hundred shots is far steadier than the same number over forty,
 * and a model that cannot tell them apart will call a column safe that is one bad start from
 * being lost.
 *
 *   'proportion' — SV%, FG%, AVG: a share of attempts.
 *   'rate'       — GAA, ERA, WHIP: events per unit of exposure.
 *
 * WHAT IS ALREADY IN THE BOOK CANNOT MOVE. The final value is
 * (locked + future) / (locked + future), and only the future half is uncertain — the locked
 * half DILUTES it. Four hundred shots already faced means tonight's thirty can barely shift
 * the number; on Monday with nothing banked, those same thirty are the whole column. So:
 *
 *     sigma(final) = sqrt(var of the future half) / total volume
 *
 * Reading the remaining volume as if it were the whole season overstates the swing, and on a
 * save-percentage column that means calling a banked column live and streaming a goalie at it
 * all week. With nothing banked this reduces to the familiar sqrt(p(1-p)/n).
 *
 * `remaining` is the exposure still to come; `locked` is what the week has already recorded.
 */
export function ratioSigma(
  ratio: number,
  remaining: number,
  kind: 'proportion' | 'rate' = 'proportion',
  locked = 0,
): number {
  const r = Number(ratio)
  const future = Number(remaining)
  const banked = Number.isFinite(locked) && locked > 0 ? locked : 0
  if (!Number.isFinite(r) || !Number.isFinite(future) || future <= 0) return 0

  const total = banked + future
  if (total <= 0) return 0

  if (kind === 'rate') {
    if (r <= 0) return 0
    /* Events over the remaining exposure are about Poisson with mean rate*exposure. */
    return Math.sqrt(r * future) / total
  }
  const p = Math.min(1, Math.max(0, r))
  return Math.sqrt(p * (1 - p) * future) / total
}
