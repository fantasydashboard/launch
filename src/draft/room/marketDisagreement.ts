/**
 * Where we and the market disagree about a player.
 *
 * A STANDING property, true at six in the morning on draft day. It is a
 * different statement from the board's other market signal, which says "he slid
 * past his ADP to the pick you are sitting on" and is only meaningful once a
 * draft is running.
 *
 * The threshold is one full round, for three reasons: it is the unit drafters
 * already think in, it scales itself to league size without a tuning constant,
 * and it keeps the badge rare. A badge on every row carries exactly as much
 * information as a badge on none — the same reasoning that gated the slot-rank
 * colours.
 */

export interface MarketRead {
  /** Rounds of disagreement. Positive: we rank him higher than the market. */
  rounds: number
  flag: 'value' | 'fade' | ''
}

const NONE: MarketRead = { rounds: 0, flag: '' }

export function marketDisagreement(input: {
  projRank?: number
  adpRank?: number
  teams: number
}): MarketRead {
  const { projRank, adpRank } = input ?? ({} as typeof input)
  const teams = Math.floor(Number(input?.teams) || 0)
  // No price means no disagreement, and no league size means no round to
  // measure one in. Both are absences, not zeros.
  if (teams <= 0) return NONE
  if (typeof projRank !== 'number' || typeof adpRank !== 'number') return NONE

  const rounds = (adpRank - projRank) / teams
  const flag: MarketRead['flag'] = rounds >= 1 ? 'value' : rounds <= -1 ? 'fade' : ''
  return { rounds, flag }
}
