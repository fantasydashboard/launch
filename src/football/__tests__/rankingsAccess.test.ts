import { describe, it, expect } from 'vitest'
import { rankingsAccess } from '../rankingsAccess'

/*
 * The line, as a function, because it is stated in three places — the board, the upsell strip
 * and the marketing copy — and three prose copies of a paywall drift.
 *
 * Rankings are a commodity; the decision is not. So personalisation is free (it is what earns
 * the signup, which is the harder ask than the payment) and what you can DO about the board is
 * what the pass sells.
 */
describe('rankingsAccess', () => {
  it('gives a stranger the public board and nothing else', () => {
    expect(rankingsAccess({ hasLeague: false, hasPass: false }))
      .toEqual({ scopedToLeague: false, showsPaidColumns: false })
  })

  /* The whole bet: your own board, correctly scored, for free. */
  it('scopes to the league for a free account that has one', () => {
    expect(rankingsAccess({ hasLeague: true, hasPass: false }))
      .toEqual({ scopedToLeague: true, showsPaidColumns: false })
  })

  it('adds availability for a pass holder', () => {
    expect(rankingsAccess({ hasLeague: true, hasPass: true }))
      .toEqual({ scopedToLeague: true, showsPaidColumns: true })
  })

  /*
   * A pass with no league connected. Availability is a fact ABOUT a league — who holds him,
   * whether you can claim him — so there is nothing to show, and claiming otherwise on a
   * public board would be inventing an answer. The pass is not wasted; it is just not
   * answerable here until a league exists.
   */
  it('cannot show availability without a league, pass or not', () => {
    expect(rankingsAccess({ hasLeague: false, hasPass: true }))
      .toEqual({ scopedToLeague: false, showsPaidColumns: false })
  })
})
