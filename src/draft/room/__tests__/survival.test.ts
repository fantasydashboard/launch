import { describe, it, expect } from 'vitest'
import { simulateSurvival, type SurvivalInput } from '../survival'
import type { PositionPrior } from '../tendencies'

const prior = (byPosition: Record<string, number>, sample = 5): PositionPrior => ({ byPosition, sample })

const available = [
  { playerKey: 'rb1', position: 'RB', adp: 1, value: 300 },
  { playerKey: 'rb2', position: 'RB', adp: 5, value: 250 },
  { playerKey: 'rb3', position: 'RB', adp: 9, value: 200 },
  { playerKey: 'wr1', position: 'WR', adp: 2, value: 290 },
  { playerKey: 'wr2', position: 'WR', adp: 6, value: 240 },
  { playerKey: 'te1', position: 'TE', adp: 20, value: 150 },
]

function run(over: Partial<SurvivalInput> = {}) {
  const base: SurvivalInput = {
    available,
    upcomingSlots: [],
    priorForSlot: () => prior({ RB: 0.5, WR: 0.5 }),
    runs: 200,
    seed: 42,
    ...over,
  }
  return simulateSurvival(base)
}

describe('simulateSurvival', () => {
  it('with no intervening picks everyone survives and best-available is current best', () => {
    const r = run({ upcomingSlots: [] })
    for (const p of available) expect(r.survival[p.playerKey]).toBe(1)
    expect(r.expectedBestAtPosition.RB).toBe(300)
    expect(r.expectedBestAtPosition.WR).toBe(290)
  })

  it('all probabilities stay within [0,1]', () => {
    const r = run({ upcomingSlots: [1, 2, 3, 4] })
    for (const v of Object.values(r.survival)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('the best player at a position everyone wants rarely survives', () => {
    const r = run({
      upcomingSlots: [1, 2, 3, 4],
      priorForSlot: () => prior({ RB: 1 }), // every picker takes an RB
    })
    expect(r.survival.rb1).toBeLessThan(0.05)
    // Four RB picks exhaust the three RBs entirely.
    expect(r.survival.rb3).toBeLessThan(0.05)
    // Nobody touched the receivers.
    expect(r.survival.wr1).toBe(1)
  })

  it('a position nobody drafts survives untouched', () => {
    const r = run({
      upcomingSlots: [1, 2, 3],
      priorForSlot: () => prior({ RB: 1 }),
    })
    expect(r.survival.te1).toBe(1)
    expect(r.expectedBestAtPosition.TE).toBe(150)
  })

  it('expected best available degrades as picks are consumed', () => {
    const r = run({
      upcomingSlots: [1, 2],
      priorForSlot: () => prior({ RB: 1 }),
    })
    // Two RB picks land, so the best remaining is worse than the best now (300)
    // but better than assuming the top two always go — managers reach past people.
    expect(r.expectedBestAtPosition.RB).toBeLessThan(300)
    expect(r.expectedBestAtPosition.RB).toBeGreaterThan(200)
  })

  it('is deterministic — same seed and input give identical output', () => {
    const a = run({ upcomingSlots: [1, 2, 3] })
    const b = run({ upcomingSlots: [1, 2, 3] })
    expect(a.survival).toEqual(b.survival)
    expect(a.expectedBestAtPosition).toEqual(b.expectedBestAtPosition)
  })

  it('a different seed can give a different answer — proving the seed is used', () => {
    const a = run({ upcomingSlots: [1, 2, 3], seed: 1 })
    const b = run({ upcomingSlots: [1, 2, 3], seed: 999 })
    expect(a.survival).not.toEqual(b.survival)
  })

  it('players without ADP are never drafted by the simulation but still counted as available', () => {
    const withNoAdp = [...available, { playerKey: 'ghost', position: 'RB', adp: null, value: 999 }]
    const r = simulateSurvival({
      available: withNoAdp as any,
      upcomingSlots: [1, 2, 3],
      priorForSlot: () => prior({ RB: 1 }),
      runs: 100,
      seed: 7,
    })
    expect(r.survival.ghost).toBe(1)
    // He is the highest-value RB, so he is the expected best available.
    expect(r.expectedBestAtPosition.RB).toBe(999)
  })

  it('handles an empty pool without throwing', () => {
    const r = simulateSurvival({
      available: [],
      upcomingSlots: [1, 2],
      priorForSlot: () => prior({ RB: 1 }),
      runs: 10,
      seed: 3,
    })
    expect(r.survival).toEqual({})
    expect(r.expectedBestAtPosition).toEqual({})
  })
})

describe('simulateSurvival — the expectation in points', () => {
  it('reports the points of the player you would actually get, not the highest projector', () => {
    // Ranking puts `a` ahead, so he is who you would take — even though `b`
    // projects more points. Averaging b would describe a choice nobody makes.
    const res = simulateSurvival({
      available: [
        { playerKey: 'a', position: 'TE', adp: 60, value: 300, projected: 210 },
        { playerKey: 'b', position: 'TE', adp: 61, value: 250, projected: 260 },
      ],
      upcomingSlots: [],
      priorForSlot: () => ({ byPosition: {}, sample: 0, counts: {} }),
      runs: 10,
      seed: 7,
    })
    expect(res.expectedBestAtPosition.TE).toBeCloseTo(300, 5)
    expect(res.expectedBestProjectedAtPosition.TE).toBeCloseTo(210, 5)
  })

  it('falls back to value when a player carries no separate projection', () => {
    const res = simulateSurvival({
      available: [{ playerKey: 'a', position: 'RB', adp: 30, value: 180 }],
      upcomingSlots: [],
      priorForSlot: () => ({ byPosition: {}, sample: 0, counts: {} }),
      runs: 5,
      seed: 1,
    })
    expect(res.expectedBestProjectedAtPosition.RB).toBeCloseTo(180, 5)
  })
})

describe('simulateSurvival — modelling how managers actually pick', () => {
  it('does not always take the very top of the list', () => {
    // One pick, one position, three candidates. A model that always takes the
    // best ADP would leave rb1 at 0% and rb2 untouched at 100%.
    const r = run({ upcomingSlots: [1], priorForSlot: () => prior({ RB: 1 }) })
    expect(r.survival.rb1).toBeGreaterThan(0)
    expect(r.survival.rb2).toBeLessThan(1)
  })

  it('spends a pick even when the prior favours a position nobody has', () => {
    // A no-history prior spreads over K and DEF too. Draws that found no pool
    // used to remove nobody at all, which is why everyone looked safe.
    const r = run({
      upcomingSlots: [1, 2, 3],
      priorForSlot: () => prior({ K: 0.5, DEF: 0.3, RB: 0.2 }),
    })
    expect(r.survival.rb1).toBeLessThan(1)
  })

  it('models the market when we have no read on the manager', () => {
    // A board deep enough that the reach window does not span it — with six
    // players every model looks the same, because everyone is within reach.
    const deep = Array.from({ length: 40 }, (_, i) => ({
      playerKey: `d${i + 1}`,
      position: i % 2 === 0 ? 'RB' : 'WR',
      adp: i + 1,
      value: 300 - i * 5,
    }))
    // sample 0 = no history. Picks should come off the top of the ADP board
    // regardless of position, not be scattered across positions evenly.
    const r = simulateSurvival({
      available: deep,
      upcomingSlots: [1, 2],
      priorForSlot: () => ({ byPosition: { QB: 0.5, TE: 0.5 }, sample: 0, counts: {} }),
      runs: 400,
      seed: 42,
    })
    // The top of the board is at risk whatever the prior says about position.
    expect(r.survival.d1).toBeLessThan(0.95)
    // Someone thirty names down is not.
    expect(r.survival.d35).toBe(1)
    expect(r.survival.d35).toBeGreaterThan(r.survival.d1)
  })

  it('stays deterministic with the reach model in play', () => {
    const a = run({ upcomingSlots: [1, 2, 3] })
    const b = run({ upcomingSlots: [1, 2, 3] })
    expect(a.survival).toEqual(b.survival)
  })
})

describe('simulateSurvival — how confident the model is allowed to be', () => {
  it('leaves the top of the board a real chance of lasting', () => {
    // Measured: players the old model called ~1% to last actually lasted 10% of
    // the time. A model that takes the same man in nearly every run cannot say so.
    const r = run({
      upcomingSlots: [1, 2, 3, 4, 5, 6],
      priorForSlot: () => prior({ RB: 0.5, WR: 0.5 }),
      runs: 400,
    })
    expect(r.survival.rb1).toBeGreaterThan(0.02)
    expect(r.survival.rb1).toBeLessThan(0.35)
  })

  it('reaches deep enough to threaten the middle of the board', () => {
    // The other half of the miss: mid-board players read as far safer than they
    // were, because nobody ever reached past the top two.
    const r = run({
      upcomingSlots: [1, 2, 3, 4],
      priorForSlot: () => prior({ RB: 1 }),
      runs: 400,
    })
    expect(r.survival.rb3).toBeLessThan(0.9)
  })
})
