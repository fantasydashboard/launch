import { describe, it, expect } from 'vitest'
import { lineupPoints, marginalValueByKey, type MarginalPlayer } from '../marginalValue'

const slots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 3, BN: 5 }

const p = (playerKey: string, position: string, points: number): MarginalPlayer => ({
  playerKey, name: playerKey, position, points,
})

describe('lineupPoints', () => {
  it('counts only what can start', () => {
    const roster = [p('rb1', 'RB', 200), p('rb2', 'RB', 190), p('rb3', 'RB', 180)]
    // Two RB slots plus a flex — all three start under these settings.
    expect(lineupPoints(slots, roster)).toBe(570)
    // With one back slot and no flex, only the best one counts.
    expect(lineupPoints({ RB: 1 }, roster)).toBe(200)
  })

  it('starts the best players regardless of draft order', () => {
    const roster = [p('late', 'RB', 300), p('early', 'RB', 100)]
    expect(lineupPoints({ RB: 1 }, roster)).toBe(300)
  })

  it('is zero for an empty roster', () => {
    expect(lineupPoints(slots, [])).toBe(0)
  })
})

describe('marginalValueByKey', () => {
  it('gives a player filling an empty slot his full value', () => {
    const out = marginalValueByKey({ slots: { QB: 1 }, roster: [], candidates: [p('qb', 'QB', 300)] })
    expect(out.qb).toBe(300)
  })

  it('gives an upgrade only the difference he makes', () => {
    // One receiver slot, already held by a 200-point man.
    const out = marginalValueByKey({
      slots: { WR: 1 },
      roster: [p('have', 'WR', 200)],
      candidates: [p('better', 'WR', 240), p('worse', 'WR', 150)],
    })
    expect(out.better).toBe(40)
    expect(out.worse).toBe(0)
  })

  it('is the exact failure that cost 157 points: a good TE behind a full flex', () => {
    // Kraft at tight end, three flex slots full of backs who all outscore the
    // best available tight end. VONA loved that tight end; the lineup cannot use
    // him at all.
    const roster = [
      p('kraft', 'TE', 207),
      p('rb1', 'RB', 250), p('rb2', 'RB', 240),
      p('flex1', 'RB', 230), p('flex2', 'RB', 220), p('flex3', 'RB', 210),
      p('wr1', 'WR', 200), p('wr2', 'WR', 190), p('qb', 'QB', 300),
    ]
    const out = marginalValueByKey({
      slots,
      roster,
      candidates: [p('anotherTE', 'TE', 205), p('goodWR', 'WR', 235)],
    })
    expect(out.anotherTE).toBe(0)
    // The receiver DOES help: the WR slots take the two best receivers, so he
    // pushes the 190 out of WR2 rather than displacing anyone in the flex.
    expect(out.goodWR).toBe(235 - 190)
  })

  it('never goes negative', () => {
    const out = marginalValueByKey({
      slots: { RB: 1 },
      roster: [p('star', 'RB', 300)],
      candidates: [p('scrub', 'RB', 10)],
    })
    expect(out.scrub).toBe(0)
  })

  it('values a player at a position with no slot at zero', () => {
    const out = marginalValueByKey({
      slots: { QB: 1, RB: 2 },
      roster: [],
      candidates: [p('k', 'K', 140)],
    })
    expect(out.k).toBe(0)
  })

  it('handles an empty candidate list', () => {
    expect(marginalValueByKey({ slots, roster: [], candidates: [] })).toEqual({})
  })
})
