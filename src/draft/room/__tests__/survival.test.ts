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
    // Two RBs gone, so the expected best remaining RB is the third.
    expect(r.expectedBestAtPosition.RB).toBeCloseTo(200, 0)
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
