/**
 * A player's prior, built from several seasons instead of one.
 *
 * WHY. Before a puck is dropped the board has no current games, so a player's rate IS his
 * prior — and that prior was a single season. One season makes a down year a player's new true
 * talent: Auston Matthews rated at 0.88 P/GP off an injured 60-game season instead of the 1.03
 * his last two say, ranked 123rd against a consensus 17th. Brayden Point 0.79 against a 0.94
 * two-year. Those are not small misses and they are not random — they are what a one-year
 * lookback does to anyone who missed time.
 *
 * MEASURED, NOT ASSUMED. Swept against the DailyFaceoff Consensus Top 250
 * (scripts/hockey-prior-sweep.ts), weighted mean rank error / Spearman:
 *
 *     1yr (was)      35.4   0.699        3yr 5/4/3      33.9   0.708
 *     2yr 6/4        33.1   0.722        3yr 6/3/1      32.7   0.728   <- best
 *     2yr 7/3        33.4   0.722        3yr 7/2/1      33.4   0.723
 *     2yr 8/2        34.1   0.715        3yr 5/3/2      33.2   0.718
 *
 * Every multi-year weighting beat one year on every measure. That unanimity is the result;
 * the gaps BETWEEN the multi-year options are small enough not to be over-fitted to, so the
 * weights below are the best measured one and also an ordinary shape — recent season heaviest,
 * a long tail that only nudges.
 *
 * WHAT THIS DOES NOT FIX, AND MUST NOT BE MISTAKEN FOR FIXING. It helps veterans and hurts
 * young risers, because any backward-looking prior regresses a breakout. Measured end to end
 * on the shipped path:
 *
 *     Matthews  123 -> 41    (consensus 17)      Bedard    142 -> 263  (consensus 54)
 *     Miller    208 -> 108   (consensus 105)     Hughes    120 -> 163  (consensus 24)
 *     Point     188 -> 154   (consensus 58)      Fantilli  191 -> 213  (consensus 85)
 *
 * The aggregate is better and the tails are traded, not removed. Dropping to two seasons does
 * not rescue it either (Bedard 252, Hughes 165), which rules out the rookie year as the cause:
 * it is the previous full season pulling a breakout back. The real repair is a trajectory
 * term — weight recent seasons harder for a player whose rate is climbing and who has few
 * seasons behind him — and until that exists this is an improvement with a known cost.
 *
 * WHY NOT A FLAT AVERAGE. It fixes veterans by breaking risers, harder than this does. Over the same two seasons a
 * flat mean moves Connor Bedard from 1.09 to 0.94 P/GP and Matthew Knies from 0.84 to 0.79 —
 * both wrong, both in the direction of erasing a player who is getting better. Decaying
 * weights keep the most recent season dominant, which is what stops that.
 *
 * TOTALS OVER GAMES, NEVER A MEAN OF RATES. Each season contributes weighted counting stats
 * AND weighted games, and the rate is the ratio of the sums. A 20-game season and an 82-game
 * season must not count equally toward a per-game rate, and averaging ratios would make them.
 */

/** Most recent season first. */
export const PRIOR_WEIGHTS = [6, 3, 1]

/**
 * How hard a climbing player leans on his most recent season.
 *
 * WHY A PLAYER'S DIRECTION MATTERS AND A VETERAN'S DOES NOT, MUCH. Regression to a prior
 * assumes the thing being measured is stable and the sample is noisy. For an established
 * player that is right: a down year is mostly variance around a level that has not moved. For
 * a developing one it is wrong in a specific way — his level IS moving, so his older seasons
 * are not a better estimate of him, they are an estimate of a different, younger player.
 *
 * Blending without this repaired veterans and broke risers: Bedard 142 -> 263 against a
 * consensus 54. The boost lets a rising player keep more of his most recent season, in
 * proportion to how much he rose, and does nothing at all to a flat or declining one.
 *
 * GATED ON A REAL SAMPLE. A hot twenty-game run is exactly the thing regression exists to
 * discount, so a season under MIN_TREND_GAMES earns no boost whatsoever — otherwise this
 * becomes a machine for chasing small-sample luck upward.
 */
/*
 * MEASURED AND NOT ENABLED. The idea is sound and the data declined it: swept against the same
 * consensus, the boost moved weighted rank error from 32.6 to 32.8 — no gain — and barely
 * touched the players it was built for (Bedard 263 -> 250 against a consensus 54, Hughes
 * 163 -> 169). The risers are not being broken by the weighting; something else is ranking
 * them, and a trajectory term is not it.
 *
 * Kept, off, with its tests, because the negative result is worth more than the code: the next
 * person to reach for this can see it was tried and what it did.
 */
export const TREND_BOOST = 1.5
export const TREND_CAP = 1.6
export const MIN_TREND_GAMES = 40

/** The counting stats a rate is built from. `gamesPlayed` is the denominator, weighted alike. */
const COUNTING = [
  'goals', 'assists', 'points', 'plusMinus', 'penaltyMinutes', 'ppPoints',
  'shots', 'hits', 'blockedShots', 'ppGoals', 'shGoals', 'shPoints',
] as const

export interface SeasonRow {
  playerId: number
  skaterFullName?: string
  positionCode?: string
  gamesPlayed: number
  [stat: string]: any
}

/**
 * Blend seasons into one row per player.
 *
 * A player absent from a season contributes nothing to either the numerator or the denominator
 * of his own rate rather than contributing a zero — so a rookie with one season is rated on
 * that season, not diluted toward zero by two he could not have played in.
 *
 * Identity (name, position) comes from the most recent season he appears in, because that is
 * the one that knows where he plays now.
 */
/**
 * How much more the most recent season counts for THIS player.
 *
 * 1.0 for anybody flat or declining, rising to TREND_CAP for a player whose recent points rate
 * clearly exceeds what he did before. Points per game is the trend statistic because it is the
 * least noisy thing a skater produces; the boost it earns is then applied to every category,
 * since a player who developed did not develop only in assists.
 */
export function trendMultiplier(recent: SeasonRow | undefined, older: SeasonRow[]): number {
  if (!recent || (recent.gamesPlayed ?? 0) < MIN_TREND_GAMES) return 1
  const olderGames = older.reduce((s, r) => s + (Number(r?.gamesPlayed) || 0), 0)
  const olderPoints = older.reduce((s, r) => s + (Number(r?.points) || 0), 0)
  if (olderGames < MIN_TREND_GAMES) return 1        // nothing credible to rise FROM
  const now = (Number(recent.points) || 0) / recent.gamesPlayed
  const before = olderPoints / olderGames
  if (before <= 0 || now <= before) return 1        // flat or falling: ordinary regression
  return Math.min(TREND_CAP, 1 + TREND_BOOST * (now / before - 1))
}

export function blendSeasons(
  seasons: SeasonRow[][],
  weights: number[] = PRIOR_WEIGHTS,
  { trend = false }: { trend?: boolean } = {},
): SeasonRow[] {
  const acc = new Map<number, SeasonRow>()
  const seen = new Set<number>()

  /* Per-player index, so a trend can be read before anything is accumulated. */
  const bySeason = seasons.map((rows) => new Map(rows.map((r) => [r.playerId, r])))
  const boost = new Map<number, number>()
  if (trend) {
    for (const [id, recent] of bySeason[0] ?? []) {
      const older = bySeason.slice(1).map((m) => m.get(id)).filter(Boolean) as SeasonRow[]
      boost.set(id, trendMultiplier(recent, older))
    }
  }

  seasons.forEach((rows, i) => {
    const w = weights[i] ?? 0
    if (w <= 0) return
    for (const row of rows) {
      const id = row.playerId
      /* Only the most recent season is boosted. Scaling the others would just renormalise. */
      const weight = i === 0 ? w * (boost.get(id) ?? 1) : w
      const cur = acc.get(id) ?? ({ playerId: id, gamesPlayed: 0 } as SeasonRow)
      for (const cat of COUNTING) cur[cat] = (cur[cat] ?? 0) + (Number(row[cat]) || 0) * weight
      cur.gamesPlayed = (cur.gamesPlayed ?? 0) + (Number(row.gamesPlayed) || 0) * weight
      /* First season that names him wins, and seasons arrive newest-first. */
      if (!seen.has(id)) {
        cur.skaterFullName = row.skaterFullName
        cur.positionCode = row.positionCode
        seen.add(id)
      }
      acc.set(id, cur)
    }
  })

  return [...acc.values()]
}
