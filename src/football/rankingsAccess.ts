/**
 * Who sees what on the rankings board.
 *
 * Extracted as a rule rather than written inline because the same line is stated three times —
 * in what the board renders, in the upsell strip that names what is missing, and in the copy
 * above it. Three prose copies of a paywall drift, and the direction they drift is always
 * toward promising something the page does not do.
 *
 * The line itself: rankings are a commodity and decisions are not. Personalisation is free
 * because the signup is the harder ask than the payment — a stranger who cannot see their own
 * team never becomes an account, and an account can be sold to later. So free buys the right
 * numbers; the pass buys the move.
 */
export interface RankingsAccess {
  /** The league's scoring, and your roster marked. Free, once a league exists. */
  scopedToLeague: boolean
  /**
   * The columns that answer "what should I do about it" rather than "who is good": who holds
   * him and whether you can claim him, what an add costs, how hard his remaining schedule is,
   * and what he has actually scored. The Season Pass.
   */
  showsPaidColumns: boolean
}

export function rankingsAccess(input: { hasLeague: boolean; hasPass: boolean }): RankingsAccess {
  /* Availability is a fact ABOUT a league — who holds him, whether you can claim him. Without
     one there is no answer to show, and a pass cannot buy an answer that does not exist. */
  const scopedToLeague = input.hasLeague
  return { scopedToLeague, showsPaidColumns: scopedToLeague && input.hasPass }
}
