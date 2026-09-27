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
export function blendSeasons(seasons: SeasonRow[][], weights: number[] = PRIOR_WEIGHTS): SeasonRow[] {
  const acc = new Map<number, SeasonRow>()
  const seen = new Set<number>()

  seasons.forEach((rows, i) => {
    const w = weights[i] ?? 0
    if (w <= 0) return
    for (const row of rows) {
      const id = row.playerId
      const cur = acc.get(id) ?? ({ playerId: id, gamesPlayed: 0 } as SeasonRow)
      for (const cat of COUNTING) cur[cat] = (cur[cat] ?? 0) + (Number(row[cat]) || 0) * w
      cur.gamesPlayed = (cur.gamesPlayed ?? 0) + (Number(row.gamesPlayed) || 0) * w
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
