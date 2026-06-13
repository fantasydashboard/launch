// Buy-low / sell-high TIMING signal: the gap between what a player looks like RIGHT NOW
// (season-to-date pace — what a naive manager sees) and their true rest-of-season value
// (regressed projection). Expected stats (Statcast xwOBA/xERA luck) confirm or independently
// trigger the signal.
//
//   overperforming (perceived ≫ ros, and/or "lucky" xStats) → SELL HIGH (regression down)
//   underperforming (perceived ≪ ros, and/or "unlucky" xStats) → BUY LOW (rebound coming)
//
// Unmatched players (no projection) have perceived == ros and no luck → no signal, by design.

export type TimingDir = 'sell' | 'buy' | null
export type LuckDir = 'over' | 'under' | null

export interface PlayerTiming {
  dir: TimingDir
  score: number // magnitude of the edge (>= 0); 0 when dir is null
  luckConfirmed: boolean // xStats agree with the value-divergence direction
  perceived: number // 0-100, for display
  ros: number // 0-100, for display
}

// A perceived-vs-ROS percentile gap this large (or a confirming luck push) flags a signal.
export const DIVERGENCE_MIN = 8
// How much an xStats luck reading counts, in pseudo-percentile points (×2 when severity strong).
export const LUCK_WEIGHT = 6

/**
 * @param perceivedPct cross-role value percentile from SEASON-TO-DATE pace stats
 * @param rosPct       cross-role value percentile from REST-OF-SEASON projection stats
 * @param luck         dominant Statcast luck direction ('over' lucky / 'under' unlucky / null)
 * @param luckStrong   whether that luck reading is the 'strong' (vs 'mild') severity
 */
export function computeTiming(
  perceivedPct: number,
  rosPct: number,
  luck: LuckDir,
  luckStrong: boolean,
): PlayerTiming {
  const divergence = perceivedPct - rosPct // + overperforming (sell) / − underperforming (buy)
  const luckPush = luck ? (luckStrong ? 2 : 1) * LUCK_WEIGHT : 0
  const sell = Math.max(0, divergence) + (luck === 'over' ? luckPush : 0)
  const buy = Math.max(0, -divergence) + (luck === 'under' ? luckPush : 0)

  let dir: TimingDir = null
  let score = 0
  if (sell >= DIVERGENCE_MIN && sell >= buy) {
    dir = 'sell'
    score = sell
  } else if (buy >= DIVERGENCE_MIN) {
    dir = 'buy'
    score = buy
  }
  const luckConfirmed = (dir === 'sell' && luck === 'over') || (dir === 'buy' && luck === 'under')
  return { dir, score, luckConfirmed, perceived: perceivedPct, ros: rosPct }
}
