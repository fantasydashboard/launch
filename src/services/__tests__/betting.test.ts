import { describe, it, expect } from 'vitest'
import {
  americanToDecimal, decimalToAmerican, impliedProbability,
  probabilityToAmerican, overround, holdPercentage,
} from '../betting/odds'
import {
  devigMultiplicative, devigAdditive, devigPower, devigShin,
  devigWorstCase, fairPriceFromAmericans,
} from '../betting/devig'
import { expectedValue, kellyStake, buildAnchor, findEdges, bestPrice } from '../betting/ev'
import type { Market, Quote } from '../betting/types'
import { DEFAULT_CONFIG } from '../betting/types'

const NOW = new Date('2026-09-07T18:00:00Z')
const FRESH = '2026-09-07T17:58:00Z'

function q(book: string, outcome: string, american: number, observedAt = FRESH): Quote {
  return { book, outcome, american, observedAt }
}

describe('odds conversions', () => {
  it('converts American to decimal both directions', () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.909091, 6)
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 6)
    expect(decimalToAmerican(2.5)).toBe(150)
    expect(decimalToAmerican(1.909091)).toBe(-110)
  })

  it('round trips a probability back to the same American price', () => {
    expect(probabilityToAmerican(0.5)).toBe(-100)
    expect(probabilityToAmerican(impliedProbability(-110))).toBe(-110)
    expect(probabilityToAmerican(impliedProbability(240))).toBe(240)
  })

  it('rejects nonsense rather than returning a plausible looking number', () => {
    expect(americanToDecimal(0)).toBeNaN()
    expect(probabilityToAmerican(0)).toBeNaN()
    expect(probabilityToAmerican(1)).toBeNaN()
  })

  it('separates overround from hold, which are not the same number', () => {
    // The classic -110/-110 market: 4.76% overround, 4.55% hold.
    expect(overround([-110, -110])).toBeCloseTo(0.047619, 6)
    expect(holdPercentage([-110, -110])).toBeCloseTo(0.045455, 6)
    expect(holdPercentage([-110, -110])).toBeLessThan(overround([-110, -110]))
  })
})

describe('devig methods', () => {
  const symmetric = [impliedProbability(-110), impliedProbability(-110)]
  const lopsided = [impliedProbability(150), impliedProbability(-180)]

  it('every real method returns a set summing to exactly one', () => {
    for (const fn of [devigMultiplicative, devigAdditive, devigPower, devigShin]) {
      for (const input of [symmetric, lopsided]) {
        const out = fn(input)
        expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
        out.forEach(p => { expect(p).toBeGreaterThan(0); expect(p).toBeLessThan(1) })
      }
    }
  })

  it('agrees on a symmetric market: everything is a coin flip', () => {
    for (const fn of [devigMultiplicative, devigAdditive, devigPower, devigShin]) {
      expect(fn(symmetric)[0]).toBeCloseTo(0.5, 6)
    }
  })

  it('additive prices the long shot lower than multiplicative', () => {
    // This is the favorite/longshot correction and the reason the methods matter.
    // +150 is the underdog: multiplicative says 38.4%, additive says 37.9%.
    expect(devigMultiplicative(lopsided)[0]).toBeCloseTo(0.383562, 5)
    expect(devigAdditive(lopsided)[0]).toBeCloseTo(0.378571, 5)
    expect(devigAdditive(lopsided)[0]).toBeLessThan(devigMultiplicative(lopsided)[0])
  })

  it('worst case is never more generous than any single method, on either side', () => {
    for (const input of [symmetric, lopsided, [impliedProbability(-450), impliedProbability(330)]]) {
      const worst = devigWorstCase(input)
      const others = [devigMultiplicative(input), devigAdditive(input), devigPower(input), devigShin(input)]
      input.forEach((_, i) => {
        expect(worst[i]).toBeLessThanOrEqual(Math.min(...others.map(o => o[i])) + 1e-12)
        expect(worst[i]).toBeGreaterThan(0)
      })
    }
  })

  it('worst case sums to less than one, and that is deliberate', () => {
    // Renormalizing would undo the whole point: it scales the minimums back up
    // above the floor they were chosen to be. Read these per outcome, not as a market.
    expect(devigWorstCase(lopsided).reduce((a, b) => a + b, 0)).toBeLessThan(1)
  })

  it('worst case always produces the lowest EV of any method', () => {
    // The property that actually matters downstream: whatever the screener shows,
    // no other devig method would have shown the user a smaller number.
    const raw = [impliedProbability(150), impliedProbability(-180)]
    const offered = 165
    const evs = [devigMultiplicative, devigAdditive, devigPower, devigShin]
      .map(fn => expectedValue(fn(raw)[0], offered))
    expect(expectedValue(devigWorstCase(raw)[0], offered)).toBeLessThanOrEqual(Math.min(...evs) + 1e-12)
  })

  it('survives a heavily lopsided prop without producing a negative probability', () => {
    const extreme = [impliedProbability(-2000), impliedProbability(900)]
    for (const fn of [devigMultiplicative, devigAdditive, devigPower, devigShin, devigWorstCase]) {
      fn(extreme).forEach(p => expect(p).toBeGreaterThan(0))
    }
  })

  it('refuses to price an incomplete market instead of guessing the other side', () => {
    expect(fairPriceFromAmericans([-110])).toBeNull()
    expect(fairPriceFromAmericans([-110, 0])).toBeNull()
  })

  it('reports overround and hold alongside the fair price', () => {
    const fair = fairPriceFromAmericans([-110, -110], 'multiplicative')!
    expect(fair.american[0]).toBe(-100)
    expect(fair.overround).toBeCloseTo(0.047619, 6)
    expect(fair.hold).toBeCloseTo(0.045455, 6)
  })
})

describe('expected value and staking', () => {
  it('is exactly zero at fair value, which is what makes it sortable', () => {
    expect(expectedValue(0.5, 100)).toBeCloseTo(0, 9)
    expect(expectedValue(impliedProbability(-150), -150)).toBeCloseTo(0, 9)
  })

  it('computes a clean five percent edge', () => {
    // Fair coin flip offered at +110: 0.5 * 2.10 - 1 = 0.05
    expect(expectedValue(0.5, 110)).toBeCloseTo(0.05, 9)
  })

  it('goes negative when the offered price is worse than fair', () => {
    expect(expectedValue(0.5, -120)).toBeLessThan(0)
  })

  it('sizes at a quarter of full Kelly and never stakes a negative edge', () => {
    // Full Kelly here is 0.05 / 1.10 = 4.545%; a quarter of that is 1.136%.
    expect(kellyStake(0.5, 110, 1)).toBeCloseTo(0.045455, 6)
    expect(kellyStake(0.5, 110, 0.25)).toBeCloseTo(0.011364, 6)
    expect(kellyStake(0.5, -120)).toBe(0)
  })
})

describe('the screener end to end', () => {
  const market: Market = {
    eventId: 'evt_1',
    marketKey: 'player_rush_yds',
    player: 'Bijan Robinson',
    outcomes: ['Over', 'Under'],
    point: 68.5,
    quotes: [
      q('pinnacle', 'Over', -108), q('pinnacle', 'Under', -108),  // fair is about 50/50
      q('draftkings', 'Over', 105), q('draftkings', 'Under', -128),
      q('fanduel', 'Over', -115), q('fanduel', 'Under', -105),
    ],
  }

  it('anchors on the sharp book and ignores the retail books', () => {
    const anchor = buildAnchor(market)!
    expect(anchor.books).toEqual(['pinnacle'])
    expect(anchor.isFallback).toBe(false)
    expect(anchor.probabilities.get('Over')).toBeCloseTo(0.5, 3)
    expect(anchor.hold).toBeLessThan(0.05)
  })

  it('flags the book offering better than fair and skips the ones that are not', () => {
    const rows = findEdges(market, DEFAULT_CONFIG, NOW)
    expect(rows).toHaveLength(1)
    expect(rows[0].book).toBe('draftkings')
    expect(rows[0].outcome).toBe('Over')
    expect(rows[0].ev).toBeGreaterThan(0.01)
    expect(rows[0].point).toBe(68.5)
    expect(rows[0].suggestedStake).toBeGreaterThan(0)
  })

  it('never reports the anchor book as its own edge', () => {
    const rows = findEdges(market, DEFAULT_CONFIG, NOW)
    expect(rows.some(r => r.book === 'pinnacle')).toBe(false)
  })

  it('drops quotes that have gone stale', () => {
    const stale: Market = {
      ...market,
      quotes: market.quotes.map(x =>
        x.book === 'draftkings' ? { ...x, observedAt: '2026-09-07T17:00:00Z' } : x
      ),
    }
    expect(findEdges(stale, DEFAULT_CONFIG, NOW)).toHaveLength(0)
  })

  it('falls back to a consensus only when no sharp book is in the feed, and says so', () => {
    const noSharp: Market = { ...market, quotes: market.quotes.filter(x => x.book !== 'pinnacle') }
    // Two retail books is not a consensus, so it declines to price it at all.
    expect(buildAnchor(noSharp)).toBeNull()

    const threeBooks: Market = {
      ...noSharp,
      quotes: [...noSharp.quotes, q('betmgm', 'Over', -110), q('betmgm', 'Under', -110)],
    }
    const anchor = buildAnchor(threeBooks)!
    expect(anchor.isFallback).toBe(true)
    expect(anchor.books.length).toBe(3)
  })

  it('finds the best available price for line shopping', () => {
    expect(bestPrice(market, 'Over')!.book).toBe('draftkings')
    expect(bestPrice(market, 'Under')!.book).toBe('fanduel')
    expect(bestPrice(market, 'Nonexistent')).toBeNull()
  })
})
