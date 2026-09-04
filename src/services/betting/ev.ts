// services/betting/ev.ts
//
// Turning a set of sportsbook prices into an edge list.
//
// The whole method in one paragraph: take the sharpest books in the feed, strip
// the margin out of each one separately, average what is left to get a fair
// probability, then walk every other book and flag anything priced better than
// that. No projection, no model of the game, no opinion about the player. The
// only assertion is that Pinnacle's price is closer to true than DraftKings',
// which is the one assertion in sports betting that has actually held up.

import { americanToDecimal, holdPercentage, probabilityToAmerican } from './odds'
import { fairPriceFromAmericans } from './devig'
import { SHARP_BOOKS, DEFAULT_CONFIG } from './types'
import type { BookKey, EdgeRow, EngineConfig, Market, Quote } from './types'

/**
 * Expected value per unit staked. p * decimal - 1. At fair value this is exactly
 * zero, which is the property that makes it the right number to sort on.
 */
export function expectedValue(fairProbability: number, offeredAmerican: number): number {
  const d = americanToDecimal(offeredAmerican)
  if (!Number.isFinite(d) || !(fairProbability > 0)) return NaN
  return fairProbability * d - 1
}

/**
 * Kelly stake as a fraction of bankroll, scaled down. Full Kelly assumes the
 * probability estimate is exact; ours is an average of devigged sportsbook
 * prices, which it is not. A quarter gives up a little growth for a very large
 * reduction in the chance of a drawdown that ends the experiment.
 */
export function kellyStake(
  fairProbability: number,
  offeredAmerican: number,
  fraction = DEFAULT_CONFIG.kellyFraction
): number {
  const d = americanToDecimal(offeredAmerican)
  if (!Number.isFinite(d) || d <= 1) return 0
  const full = (fairProbability * d - 1) / (d - 1)
  return full > 0 ? full * fraction : 0
}

function quotesByBook(market: Market): Map<BookKey, Map<string, Quote>> {
  const byBook = new Map<BookKey, Map<string, Quote>>()
  for (const q of market.quotes) {
    if (!byBook.has(q.book)) byBook.set(q.book, new Map())
    byBook.get(q.book)!.set(q.outcome, q)
  }
  return byBook
}

export interface AnchorResult {
  /** Fair probability per outcome, indexed by outcome label. */
  probabilities: Map<string, number>
  /** Average hold across the anchor books used. Wide means low confidence. */
  hold: number
  books: BookKey[]
  /** True when no sharp book was available and we fell back to a consensus. */
  isFallback: boolean
}

/**
 * Build the fair-value anchor for one market.
 *
 * Each anchor book is devigged on its own and the resulting probabilities are
 * averaged. Devigging book by book rather than pooling raw prices matters: books
 * carry different margins, and pooling first lets a wide book's vig leak into
 * the fair number.
 */
export function buildAnchor(
  market: Market,
  config: EngineConfig = DEFAULT_CONFIG,
  sharpBooks: BookKey[] = SHARP_BOOKS
): AnchorResult | null {
  const byBook = quotesByBook(market)
  const complete = (m: Map<string, Quote>) => market.outcomes.every(o => m.has(o))

  let books = [...byBook.keys()].filter(b => sharpBooks.includes(b) && complete(byBook.get(b)!))
  let isFallback = false

  if (books.length === 0) {
    // No sharp book in the feed. A consensus of soft books is a much weaker
    // anchor and the UI has to say so, but it beats showing the user nothing
    // on a market where all the retail books happen to disagree.
    books = [...byBook.keys()].filter(b => complete(byBook.get(b)!))
    isFallback = true
    if (books.length < 3) return null
  }

  const sums = new Map<string, number>(market.outcomes.map(o => [o, 0]))
  const holds: number[] = []
  let used = 0

  for (const book of books) {
    const sideMap = byBook.get(book)!
    const americans = market.outcomes.map(o => sideMap.get(o)!.american)
    const hold = holdPercentage(americans)
    // A market wider than the cap is the book saying it does not have a real
    // opinion. Including it drags the average toward noise.
    if (!Number.isFinite(hold) || hold > config.maxAnchorHold) continue

    const fair = fairPriceFromAmericans(americans, config.method)
    if (!fair) continue

    market.outcomes.forEach((o, i) => sums.set(o, sums.get(o)! + fair.probabilities[i]))
    holds.push(hold)
    used++
  }

  if (used === 0) return null

  const probabilities = new Map<string, number>()
  for (const [o, sum] of sums) probabilities.set(o, sum / used)

  return {
    probabilities,
    hold: holds.reduce((a, b) => a + b, 0) / holds.length,
    books: books.slice(0, used),
    isFallback,
  }
}

/**
 * Every priced-better-than-fair opportunity in one market.
 *
 * Anchor books are excluded from the output on purpose. A sharp book is never
 * "beating" a fair value derived from itself, and showing it as an edge is how
 * these tools end up telling users to bet into the very price they used as truth.
 */
export function findEdges(
  market: Market,
  config: EngineConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): EdgeRow[] {
  const anchor = buildAnchor(market, config)
  if (!anchor) return []

  const rows: EdgeRow[] = []
  const cutoff = now.getTime() - config.maxQuoteAgeSeconds * 1000

  for (const q of market.quotes) {
    if (anchor.books.includes(q.book)) continue
    if (new Date(q.observedAt).getTime() < cutoff) continue

    const p = anchor.probabilities.get(q.outcome)
    if (!(p! > 0)) continue

    const ev = expectedValue(p!, q.american)
    if (!Number.isFinite(ev) || ev < config.minEv) continue

    rows.push({
      eventId: market.eventId,
      marketKey: market.marketKey,
      player: market.player ?? null,
      outcome: q.outcome,
      point: q.point ?? market.point ?? null,
      book: q.book,
      offeredAmerican: q.american,
      fairAmerican: probabilityToAmerican(p!),
      fairProbability: p!,
      ev,
      suggestedStake: kellyStake(p!, q.american, config.kellyFraction),
      anchorHold: anchor.hold,
      anchorBooks: anchor.books,
      method: config.method,
      observedAt: q.observedAt,
    })
  }

  return rows.sort((a, b) => b.ev - a.ev)
}

/** Run the screener across many markets at once. */
export function screen(
  markets: Market[],
  config: EngineConfig = DEFAULT_CONFIG,
  now: Date = new Date()
): EdgeRow[] {
  return markets
    .flatMap(m => findEdges(m, config, now))
    .sort((a, b) => b.ev - a.ev)
}

/**
 * Best available price for one outcome across every book. This is line shopping,
 * and it is worth saying plainly that it is the largest and most durable edge in
 * the entire product. It needs no model and no sharp anchor: it is the same bet
 * at a better number.
 */
export function bestPrice(market: Market, outcome: string): Quote | null {
  const candidates = market.quotes.filter(q => q.outcome === outcome)
  if (candidates.length === 0) return null
  return candidates.reduce((best, q) =>
    americanToDecimal(q.american) > americanToDecimal(best.american) ? q : best
  )
}
