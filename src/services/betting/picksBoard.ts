// services/betting/picksBoard.ts
//
// Assembling the ranked board of pick'em recommendations.
//
// The shape of the problem: stored quotes contain two very different kinds of
// row mixed together. Sharp sportsbooks price both sides of a line and give us a
// reference distribution. Pick'em apps post a single number with no price worth
// reading. This file separates them, uses the first to judge the second, and
// returns a list sorted by how likely each pick is to land.

import { rankPick } from './pickem'
import { DFS_BOOKS } from './constants'
import type { RankedPick } from './pickem'
import type { DevigMethod, Market } from './types'
import { SHARP_BOOKS } from './types'

export interface DfsOffer {
  player: string
  marketKey: string
  eventId: string
  book: string
  point: number
  observedAt: string
  /** True when a person typed this in rather than a feed delivering it. */
  manual?: boolean
}

/** Pull every line a pick'em app is posting out of the stored markets. */
export function extractDfsOffers(markets: Market[]): DfsOffer[] {
  const seen = new Set<string>()
  const offers: DfsOffer[] = []

  for (const m of markets) {
    if (!m.player || m.point == null) continue
    for (const q of m.quotes) {
      if (!DFS_BOOKS.includes(q.book)) continue
      // One offer per app per player per stat. Both sides of a pick'em line are
      // the same offer, so the Under row is a duplicate of the Over row.
      const key = `${q.book}|${m.player}|${m.marketKey}|${m.point}`
      if (seen.has(key)) continue
      seen.add(key)
      offers.push({
        player: m.player,
        marketKey: m.marketKey,
        eventId: m.eventId,
        book: q.book,
        point: m.point,
        observedAt: q.observedAt,
      })
    }
  }
  return offers
}

/**
 * Markets a sharp book actually priced, indexed by player and stat.
 * These are the yardstick. Nothing gets ranked without one.
 */
function anchorIndex(markets: Market[]): Map<string, Market[]> {
  const index = new Map<string, Market[]>()
  for (const m of markets) {
    if (!m.player) continue
    if (!m.quotes.some(q => SHARP_BOOKS.includes(q.book))) continue
    const key = `${m.player}|${m.marketKey}`
    if (!index.has(key)) index.set(key, [])
    index.get(key)!.push(m)
  }
  return index
}

export interface BoardOptions {
  method?: DevigMethod
  /** Drop picks under this win probability. 0.5 is a coin flip. */
  minProbability?: number
  /** Hide picks whose probability came from a model rather than a real price. */
  requireRealPrices?: boolean
  /** Ignore lines older than this. */
  maxAgeSeconds?: number
}

export interface BoardPick extends RankedPick {
  manual: boolean
}

/**
 * The board.
 *
 * Sorted by win probability rather than by how far the line has moved, because
 * probability is what an entry's payout actually depends on. A six-yard gap on a
 * high-variance receiving line is worth less than a two-yard gap on a passing
 * line, and sorting by the gap would put them the wrong way round. The gap is
 * still shown, because it is the human-readable reason the pick is on the list.
 */
export function buildBoard(
  markets: Market[],
  manualOffers: DfsOffer[] = [],
  options: BoardOptions = {}
): BoardPick[] {
  const {
    method = 'worstCase',
    minProbability = 0.52,
    requireRealPrices = false,
    maxAgeSeconds = 6 * 3600,
  } = options

  const anchors = anchorIndex(markets)
  const offers = [
    ...extractDfsOffers(markets),
    ...manualOffers.map(o => ({ ...o, manual: true })),
  ]

  const cutoff = Date.now() - maxAgeSeconds * 1000
  const out: BoardPick[] = []

  for (const offer of offers) {
    if (new Date(offer.observedAt).getTime() < cutoff) continue

    const anchorMarkets = anchors.get(`${offer.player}|${offer.marketKey}`)
    // No sharp book priced this player's stat, so there is nothing to judge the
    // app's number against. Silently dropping it is correct: a pick with no
    // reference is a guess, and showing it next to real ones implies otherwise.
    if (!anchorMarkets?.length) continue

    const ranked = rankPick({
      player: offer.player,
      marketKey: offer.marketKey,
      eventId: offer.eventId,
      book: offer.book,
      offeredPoint: offer.point,
      observedAt: offer.observedAt,
      anchorMarkets,
      method,
    })
    if (!ranked) continue
    if (ranked.probability < minProbability) continue
    if (requireRealPrices && ranked.confidence === 'modeled') continue

    out.push({ ...ranked, manual: !!offer.manual })
  }

  return out.sort((a, b) => b.probability - a.probability)
}

/**
 * How far apart the pick'em apps are on the same player and stat.
 *
 * This is the number that decides whether paying for a Sleeper feed is worth
 * anything. If PrizePicks and Underdog sit within half a point of each other
 * week after week, a hand-typed Sleeper line will too, and the proxy is fine.
 * If they scatter, the apps are pricing independently and using one to stand in
 * for another is guesswork.
 */
export function dfsLineSpread(markets: Market[]): Array<{
  player: string
  marketKey: string
  lines: Array<{ book: string; point: number }>
  spread: number
}> {
  const grouped = new Map<string, Array<{ book: string; point: number }>>()

  for (const offer of extractDfsOffers(markets)) {
    const key = `${offer.player}|${offer.marketKey}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push({ book: offer.book, point: offer.point })
  }

  return [...grouped.entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([key, lines]) => {
      const [player, marketKey] = key.split('|')
      const pts = lines.map(l => l.point)
      return { player, marketKey, lines, spread: Math.max(...pts) - Math.min(...pts) }
    })
    .sort((a, b) => b.spread - a.spread)
}
