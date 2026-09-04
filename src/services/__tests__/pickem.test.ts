import { describe, it, expect } from 'vitest'
import {
  normalCdf, normalInv, poissonBinomial, correlatedDistribution,
  assessLine, rankPick, evaluateEntry, DEFAULT_STRUCTURES,
} from '../betting/pickem'
import type { Market } from '../betting/types'

const FRESH = new Date().toISOString()

function mkt(point: number, over: number, under: number, key = 'player_rush_yds'): Market {
  return {
    eventId: 'evt', marketKey: key, player: 'Test Player', point,
    outcomes: ['Over', 'Under'],
    quotes: [
      { book: 'lowvig', outcome: 'Over', american: over, point, observedAt: FRESH },
      { book: 'lowvig', outcome: 'Under', american: under, point, observedAt: FRESH },
    ],
  }
}

describe('normal distribution helpers', () => {
it('cdf at known points', () => {
  expect(normalCdf(0)).toBeCloseTo(0.5, 6); expect(normalCdf(1.959964)).toBeCloseTo(0.975, 5); expect(normalCdf(-1.959964)).toBeCloseTo(0.025, 5)
})
it('inverse round trips through the cdf', () => {
  for (const p of [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99]) expect(normalCdf(normalInv(p))).toBeCloseTo(p, 5)
})
})

describe('poisson binomial', () => {
  it('sums to one and matches brute force', () => {
    const probs = [0.6, 0.45, 0.7, 0.52]
    const dist = poissonBinomial(probs)
    expect(dist.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    // Enumerate all 2^4 outcomes directly.
    const brute = new Array(probs.length + 1).fill(0)
    for (let mask = 0; mask < (1 << probs.length); mask++) {
      let p = 1, hits = 0
      probs.forEach((pi, i) => {
        if (mask & (1 << i)) { p *= pi; hits++ } else { p *= 1 - pi }
      })
      brute[hits] += p
    }
    dist.forEach((v, k) => expect(v).toBeCloseTo(brute[k], 9))
  })
  it('all-hit equals the simple product', () => {
    const probs = [0.6, 0.45, 0.7]
    expect(poissonBinomial(probs)[3]).toBeCloseTo(0.6 * 0.45 * 0.7, 9)
  })
})


describe('correlation', () => {
  it('rho of zero reproduces independence', () => {
    const probs = [0.55, 0.6, 0.48, 0.62]
    const indep = poissonBinomial(probs)
    const corr = correlatedDistribution(probs, 0)
    indep.forEach((v, k) => expect(v).toBeCloseTo(corr[k], 9))
  })
  it('correlated distribution still sums to one', () => {
    expect(correlatedDistribution([0.55, 0.6, 0.5], 0.3).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })
  it('positive correlation RAISES the chance of hitting everything', () => {
    // Easy to assume backwards. Correlated legs move together, so all-hit and
    // all-miss both get more likely and the middle thins out.
    const probs = [0.55, 0.58, 0.52]
    const indep = correlatedDistribution(probs, 0)
    const corr = correlatedDistribution(probs, 0.3)
    expect(corr[3] > indep[3]).toBe(true)
    expect(corr[0] > indep[0]).toBe(true)
  })
  it('and it therefore helps a power play', () => {
    const legs = [0.55, 0.58, 0.52].map((p, i) => ({
      player: `P${i}`, marketKey: 'player_rush_yds', side: 'Over' as const,
      offeredPoint: 50, probability: p, eventId: 'same-game', confidence: 'exact' as const,
    }))
    const power = DEFAULT_STRUCTURES.find(s => s.name === 'Power 3')!
    const correlated = evaluateEntry(legs, power, 0.3)!
    const independent = evaluateEntry(legs, power, 0)!
    expect(correlated.ev > independent.ev).toBe(true)
    expect(correlated.sameGameLegs).toBe(3)
    expect(independent.rhoUsed).toBe(0)
  })
  it('legs in different games get no correlation applied', () => {
    const legs = [0.55, 0.58, 0.52].map((p, i) => ({
      player: `P${i}`, marketKey: 'player_rush_yds', side: 'Over' as const,
      offeredPoint: 50, probability: p, eventId: `game-${i}`, confidence: 'exact' as const,
    }))
    const e = evaluateEntry(legs, DEFAULT_STRUCTURES.find(s => s.name === 'Power 3')!, 0.3)!
    expect(e.rhoUsed).toBe(0)
    expect(e.sameGameLegs).toBe(0)
  })
})


describe('entry expected value', () => {
  it('a coin-flip power 3 at 5x loses money, as it must', () => {
    const legs = [0.5, 0.5, 0.5].map((p, i) => ({
      player: `P${i}`, marketKey: 'player_rush_yds', side: 'Over' as const,
      offeredPoint: 50, probability: p, eventId: `g${i}`, confidence: 'exact' as const,
    }))
    const e = evaluateEntry(legs, DEFAULT_STRUCTURES.find(s => s.name === 'Power 3')!)!
    expect(e.probAllHit).toBeCloseTo(0.125, 9)
    expect(e.ev).toBeCloseTo(0.125 * 5 - 1, 9)   // -0.375
    expect(e.ev < 0).toBe(true)
  })
  it('needs a real edge per leg to break even', () => {
    // 5x on three legs needs each leg around 58.5% to reach break even.
    const at = (p: number) => evaluateEntry(
      [0, 1, 2].map(i => ({
        player: `P${i}`, marketKey: 'player_rush_yds', side: 'Over' as const,
        offeredPoint: 50, probability: p, eventId: `g${i}`, confidence: 'exact' as const,
      })),
      DEFAULT_STRUCTURES.find(s => s.name === 'Power 3')!
    )!.ev
    expect(at(0.55) < 0).toBe(true)
    expect(at(0.60) > 0).toBe(true)
  })
  it('flex pays on partial hits, so it beats power at the same leg odds', () => {
    const legs = [0, 1, 2].map(i => ({
      player: `P${i}`, marketKey: 'player_rush_yds', side: 'Over' as const,
      offeredPoint: 50, probability: 0.55, eventId: `g${i}`, confidence: 'exact' as const,
    }))
    const flex = evaluateEntry(legs, DEFAULT_STRUCTURES.find(s => s.name === 'Flex 3')!)!
    const power = evaluateEntry(legs, DEFAULT_STRUCTURES.find(s => s.name === 'Power 3')!)!
    expect(flex.ev > power.ev).toBe(true)
  })
  it('rejects a leg count that does not match the structure', () => {
    const legs = [{ player: 'A', marketKey: 'x', side: 'Over' as const, offeredPoint: 1,
                    probability: 0.5, eventId: 'g', confidence: 'exact' as const }]
    expect(evaluateEntry(legs, DEFAULT_STRUCTURES.find(s => s.name === 'Power 3')!)).toBe(null)
  })
  it('flags entries built on modeled probabilities', () => {
    const legs = [0, 1, 2].map(i => ({
      player: `P${i}`, marketKey: 'player_rush_yds', side: 'Over' as const, offeredPoint: 50,
      probability: 0.6, eventId: `g${i}`, confidence: (i === 0 ? 'modeled' : 'exact') as any,
    }))
    expect(evaluateEntry(legs, DEFAULT_STRUCTURES.find(s => s.name === 'Power 3')!)!.hasModeledLegs).toBe(true)
  })
})


describe('reading a line against the market', () => {
  it('exact match uses the real price and says so', () => {
    const a = assessLine(68.5, [mkt(68.5, -110, -110)], 'player_rush_yds')!
    expect(a.confidence).toBe('exact')
    expect(a.probOver).toBeCloseTo(0.5, 3)
  })
  it('two priced points fit a real distribution', () => {
    const a = assessLine(70, [mkt(68.5, -110, -110), mkt(78.5, 150, -180)], 'player_rush_yds')!
    expect(a.confidence).toBe('interpolated')
    // 68.5 is the coin flip, so the market's middle should land right about there.
    expect(a.marketLine).toBeCloseTo(68.5, 0)
    expect(a.probOver < 0.5, 'a line above the middle should be under 50%').toBe(true)
  })
  it('one priced point falls back to the model and says so', () => {
    const a = assessLine(60, [mkt(68.5, -110, -110)], 'player_rush_yds')!
    expect(a.confidence).toBe('modeled')
    expect(a.probOver > 0.5, 'a line below the middle should clear 50%').toBe(true)
  })
  it('probability falls as the offered line rises', () => {
    const markets = [mkt(68.5, -110, -110), mkt(78.5, 150, -180)]
    const probs = [55, 62, 68.5, 75, 85].map(pt => assessLine(pt, markets, 'player_rush_yds')!.probOver)
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i] < probs[i - 1]).toBe(true)
    }
  })
  it('gap is signed against the market line', () => {
    const a = assessLine(60, [mkt(68.5, -110, -110)], 'player_rush_yds')!
    expect(a.gap < 0, 'an app line below the market should read negative').toBe(true)
  })
  it('returns nothing when no sharp book priced the market', () => {
    const soft: Market = {
      eventId: 'evt', marketKey: 'player_rush_yds', player: 'X', point: 68.5,
      outcomes: ['Over', 'Under'],
      quotes: [
        { book: 'draftkings', outcome: 'Over', american: -110, point: 68.5, observedAt: FRESH },
        { book: 'draftkings', outcome: 'Under', american: -110, point: 68.5, observedAt: FRESH },
      ],
    }
    expect(assessLine(68.5, [soft], 'player_rush_yds')).toBe(null)
  })
})


describe('ranking a pick', () => {
  it('picks the over when the app set the line too low', () => {
    const r = rankPick({
      player: 'Bijan Robinson', marketKey: 'player_rush_yds', eventId: 'evt',
      book: 'prizepicks', offeredPoint: 60, observedAt: FRESH,
      anchorMarkets: [mkt(68.5, -110, -110), mkt(78.5, 150, -180)],
    })!
    expect(r.side).toBe('Over')
    expect(r.probability > 0.5).toBe(true)
    expect(r.edgeUnits > 8).toBe(true)
  })
  it('picks the under when the app set it too high', () => {
    const r = rankPick({
      player: 'Bijan Robinson', marketKey: 'player_rush_yds', eventId: 'evt',
      book: 'prizepicks', offeredPoint: 85, observedAt: FRESH,
      anchorMarkets: [mkt(68.5, -110, -110), mkt(78.5, 150, -180)],
    })!
    expect(r.side).toBe('Under')
    expect(r.probability > 0.5).toBe(true)
  })
  it('a line sitting on the market is a coin flip with no edge', () => {
    const r = rankPick({
      player: 'X', marketKey: 'player_rush_yds', eventId: 'evt',
      book: 'sleeper', offeredPoint: 68.5, observedAt: FRESH,
      anchorMarkets: [mkt(68.5, -110, -110)],
    })!
    expect(r.probability).toBeCloseTo(0.5, 2)
    expect(r.edgeUnits < 0.5).toBe(true)
  })
})
