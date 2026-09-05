import { describe, it, expect } from 'vitest'
import {
  singleSlotPositions, isZeroSumSwap, readNeeds, acceptOdds, rungFor, pitchFor,
} from '../tradeStrategy'

/* A standard football league: one QB, two RBs, two WRs, one TE, one flex. */
const SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 }

describe('single-slot positions', () => {
  it('finds the positions with exactly one seat', () => {
    // TE has its own seat plus a share of FLEX, so it is NOT single-slot here.
    expect(singleSlotPositions({ QB: 1, RB: 2, WR: 2, TE: 1 })).toEqual(new Set(['QB', 'TE']))
  })

  it('stops calling a position single-slot once a flex can start a second one', () => {
    const s = singleSlotPositions(SLOTS)
    expect(s.has('QB')).toBe(true)   // no flex takes a QB in a 1QB league
    expect(s.has('TE')).toBe(false)  // FLEX can start a second TE
  })

  it('treats superflex as opening up quarterback', () => {
    expect(singleSlotPositions({ QB: 1, RB: 2, WR: 2, TE: 1, SUPER_FLEX: 1 }).has('QB')).toBe(false)
  })
})

/*
 * The rule the board violated in public: it offered a tight end for a tight end and captioned
 * it "costs them 29 — worth asking". With one seat the two lineups move by equal and opposite
 * amounts, so no sweetener makes it mutual.
 */
describe('zero-sum swaps', () => {
  const ONE_TE = { QB: 1, RB: 2, WR: 2, TE: 1 }

  it('rejects a tight end for a tight end when only one starts', () => {
    expect(isZeroSumSwap(['TE'], ['TE'], ONE_TE)).toBe(true)
  })

  it('allows running back for running back, where two start', () => {
    expect(isZeroSumSwap(['RB'], ['RB'], ONE_TE)).toBe(false)
  })

  it('allows a cross-position swap at a single-slot position', () => {
    expect(isZeroSumSwap(['TE'], ['RB'], ONE_TE)).toBe(false)
  })

  it('does not apply to consolidation, where the shapes differ', () => {
    expect(isZeroSumSwap(['TE', 'RB'], ['TE'], ONE_TE)).toBe(false)
  })
})

describe('needs', () => {
  it('finds the hole, not the ranking', () => {
    const needs = readNeeds([
      { position: 'RB', vor: 40 },
      { position: 'RB', vor: -12 },   // starting someone below replacement
      { position: 'WR', vor: 30 },
    ], SLOTS)
    expect(needs.RB.worstStarterVor).toBe(-12)
    expect(needs.RB.isHole).toBe(true)
    expect(needs.WR.isHole).toBe(false)
  })

  it('reports seats, so a caller can tell a hole from an unfixable one', () => {
    expect(readNeeds([{ position: 'QB', vor: -5 }], SLOTS).QB.slots).toBe(1)
  })
})

describe('acceptOdds', () => {
  it('rates a deal that helps them far above one that costs them', () => {
    const helps = acceptOdds({ theirGain: 10, myGain: 10 })
    const costs = acceptOdds({ theirGain: -29, myGain: 30 })
    expect(helps).toBeGreaterThan(costs)
    expect(costs).toBeLessThan(0.2) // "costs them 29" is not worth sending
  })

  it('separates a small cost from a donation', () => {
    const small = acceptOdds({ theirGain: -5, myGain: 30 })
    const donation = acceptOdds({ theirGain: -29, myGain: 30 })
    expect(small).toBeGreaterThan(donation)
  })

  it('lifts a deal that fills a real hole', () => {
    const base = { theirGain: -5, myGain: 20 }
    const withHole = acceptOdds({ ...base, fills: { position: 'RB', worstStarterVor: -12, isHole: true, slots: 2 } })
    expect(withHole).toBeGreaterThan(acceptOdds(base))
  })

  it('knows a team playing out the string will not engage', () => {
    const live = acceptOdds({ theirGain: 5, myGain: 5, situation: { posture: 'bubble', stakes: 'live' } })
    const done = acceptOdds({ theirGain: 5, myGain: 5, situation: { posture: 'bubble', stakes: 'coasting' } })
    expect(done).toBeLessThan(live)
  })

  it('stays inside a probability, whatever the inputs', () => {
    expect(acceptOdds({ theirGain: 999, myGain: 1, situation: { posture: 'contender', stakes: 'must-win' } })).toBeLessThanOrEqual(0.95)
    expect(acceptOdds({ theirGain: -999, myGain: 1, situation: { posture: 'rebuilder', stakes: 'coasting' } })).toBeGreaterThanOrEqual(0.02)
  })
})

describe('the ask ladder', () => {
  it('calls a mutual gain fair, a small cost a reach, and a big one a long shot', () => {
    expect(rungFor(6, 10)).toBe('fair')
    expect(rungFor(-3, 20)).toBe('reach')
    expect(rungFor(-29, 30)).toBe('long-shot')
  })
})

describe('the pitch', () => {
  it('opens with THEIR hole, not your gain', () => {
    const msg = pitchFor({
      theirTeamName: 'Gridiron Man', getNames: ['Luther Burden'], giveNames: ['Cam Skattebo'],
      fills: { position: 'RB', worstStarterVor: -12, isHole: true, slots: 2 }, theirGain: -3,
    })
    expect(msg).toMatch(/^Gridiron Man/)
    expect(msg).toContain('below replacement')
    expect(msg).toContain('Cam Skattebo')
    expect(msg).not.toMatch(/I gain|points to me/i)
  })

  it('leads with the mutual case when there is one', () => {
    const msg = pitchFor({ theirTeamName: 'X', getNames: ['A'], giveNames: ['B'], theirGain: 8 })
    expect(msg).toContain('helps us both')
  })

  it('adds urgency only when their season says so', () => {
    const base = { theirTeamName: 'X', getNames: ['A'], giveNames: ['B'], theirGain: -2 }
    expect(pitchFor({ ...base, situation: { posture: 'bubble', stakes: 'must-win' } })).toContain('win this week')
    expect(pitchFor(base)).not.toContain('win this week')
  })
})
