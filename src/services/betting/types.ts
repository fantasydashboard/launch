// services/betting/types.ts
//
// Shared types for the betting edge engine.
//
// Design note: nothing in this module predicts an outcome. It reads prices off
// sportsbooks, strips the margin out of them to recover what the market actually
// believes, and reports where one book is offering better than that. That is the
// only claim this code makes and the only claim the UI is allowed to make.

/** A sportsbook key as returned by whichever odds provider is active. */
export type BookKey = string

/**
 * Books we treat as a "sharp anchor" — low margin, high limits, prices that move
 * on money rather than on public sentiment. Fair value is derived from these and
 * every other book is measured against it. Without at least one of these in the
 * feed the EV numbers are meaningless, because you are only comparing bad prices
 * to other bad prices.
 */
export const SHARP_BOOKS: BookKey[] = [
  'pinnacle',      // the reference price, but 'eu' region only on The Odds API
  'circasports',
  'betonlineag',   // 'us' region, so reachable at 1x credit cost
  'lowvig',        // reduced juice by design; a usable anchor when Pinnacle is out of budget
  'bookmaker',
]

export type DevigMethod =
  | 'multiplicative'  // split the margin proportionally — the standard baseline
  | 'additive'        // split it evenly — corrects favorite/longshot bias, can go negative
  | 'power'           // raise probabilities to a constant power — always stays in 0..1
  | 'shin'            // iterative, models insider money — generally most accurate
  | 'worstCase'       // the least flattering result across the above

/** One side of one market at one book. */
export interface Quote {
  book: BookKey
  /** Which side of the market this price is for, e.g. 'Over', 'Under', 'Chiefs'. */
  outcome: string
  /** American odds as offered, e.g. -110 or +145. */
  american: number
  /** Handicap or total where the market has one (spread -3.5, prop over 68.5). */
  point?: number | null
  /** When this price was observed. Every number derived from it inherits this age. */
  observedAt: string
}

/**
 * A market is a set of mutually exclusive outcomes at one book: over/under,
 * home/away, yes/no. Devigging only makes sense across a complete set, so a
 * one-sided quote can never produce a fair price.
 */
export interface Market {
  /** Provider event id. */
  eventId: string
  /** e.g. 'player_rush_yds', 'h2h', 'spreads', 'totals'. */
  marketKey: string
  /** Player name for props, null for game lines. */
  player?: string | null
  /** The complete set of mutually exclusive outcome labels, e.g. ['Over','Under']. */
  outcomes: string[]
  /** The line this market is priced at. Quotes on different points are different markets. */
  point?: number | null
  /** Every price seen for this market, across all books and both sides. */
  quotes: Quote[]
}

export interface FairPrice {
  /**
   * Devigged probability per outcome, in the same order as `outcomes`.
   * Sums to 1 for every method except 'worstCase', which returns a per-outcome
   * floor that sums to less than 1 on purpose. See devigWorstCase for why.
   */
  probabilities: number[]
  /** Fair American odds per outcome. */
  american: number[]
  /** Sum of raw implied probabilities minus one. 0.0476 means a 4.76% overround. */
  overround: number
  /** The book's cut of total handle at these prices. Always less than overround. */
  hold: number
  method: DevigMethod
}

export interface EdgeRow {
  eventId: string
  marketKey: string
  player?: string | null
  outcome: string
  point?: number | null
  /** Book offering the price we are flagging. */
  book: BookKey
  offeredAmerican: number
  /** What the sharp anchor says this outcome is really worth. */
  fairAmerican: number
  fairProbability: number
  /** p * decimalOdds - 1. Positive means the offered price beats fair value. */
  ev: number
  /** Fraction of bankroll at the configured Kelly fraction. */
  suggestedStake: number
  /** Margin in the anchor market these numbers came out of. */
  anchorHold: number
  anchorBooks: BookKey[]
  method: DevigMethod
  /** Age of the underlying quote. The UI must show this. A stale edge is not an edge. */
  observedAt: string
}

export interface EngineConfig {
  /** Which devig result to headline. Default is the conservative one on purpose. */
  method: DevigMethod
  /** Fraction of full Kelly. Full Kelly is optimal in theory and ruinous in practice. */
  kellyFraction: number
  /** Rows below this EV are noise, not signal. */
  minEv: number
  /** Ignore anchor markets wider than this — a fat market is a guess, not a price. */
  maxAnchorHold: number
  /** Quotes older than this are not shown at all. */
  maxQuoteAgeSeconds: number
}

export const DEFAULT_CONFIG: EngineConfig = {
  method: 'worstCase',
  kellyFraction: 0.25,
  minEv: 0.01,
  maxAnchorHold: 0.06,
  maxQuoteAgeSeconds: 900,
}
