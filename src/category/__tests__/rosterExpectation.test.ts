import { describe, it, expect } from 'vitest'
import { rosterExpectation } from '../rosterExpectation'

const proj = (stats: Record<string, number>) => ({ stats })

describe('rosterExpectation', () => {
  /* Two skaters, one with two games left, one with one. */
  const projections = {
    sniper: proj({ GP: 80, G: 40, A: 40, SOG: 240 }),   // 0.5 G, 0.5 A, 3 SOG per game
    grinder: proj({ GP: 80, G: 8, A: 12, SOG: 80 }),    // 0.1 G, 0.15 A, 1 SOG per game
  }
  const players = [
    { key: 'sniper', proTeam: 'TB' },
    { key: 'grinder', proTeam: 'NYR' },
  ]
  const gamesByTeam = { TB: 2, NYR: 1 }

  it('sums each man’s rate over the games he actually has left', () => {
    const out = rosterExpectation({ players, projections, gamesByTeam, categories: ['G', 'A', 'SOG'] })
    expect(out.remaining.G).toBeCloseTo(0.5 * 2 + 0.1 * 1, 9)
    expect(out.remaining.SOG).toBeCloseTo(3 * 2 + 1 * 1, 9)
  })

  it('counts the bodies that actually play, for the columns that need a headcount', () => {
    const out = rosterExpectation({ players, projections, gamesByTeam, categories: ['G'] })
    expect(out.bodies).toBe(2)
  })

  it('leaves out a man whose club has no game left', () => {
    const out = rosterExpectation({
      players, projections, gamesByTeam: { TB: 2 }, categories: ['G'],
    })
    expect(out.remaining.G).toBeCloseTo(1.0, 9)
    expect(out.bodies).toBe(1)
  })

  /* A projection with no games is an unknown schedule, not a one-game season — dividing by it
     would hand the loudest rate on the board to the least information on it. */
  it('skips a man with no projected games rather than dividing by nothing', () => {
    const out = rosterExpectation({
      players: [{ key: 'ghost', proTeam: 'TB' }],
      projections: { ghost: proj({ GP: 0, G: 10 }) },
      gamesByTeam: { TB: 2 }, categories: ['G'],
    })
    expect(out.remaining.G).toBe(0)
    expect(out.bodies).toBe(0)
  })

  it('reports zero for a column nobody contributes to', () => {
    const out = rosterExpectation({ players, projections, gamesByTeam, categories: ['BLK'] })
    expect(out.remaining.BLK).toBe(0)
  })

  it('survives a missing projection, a junk stat and an empty roster', () => {
    const out = rosterExpectation({
      players: [{ key: 'nobody', proTeam: 'TB' }, { key: 'sniper', proTeam: 'TB' }],
      projections: { ...projections, sniper: proj({ GP: 80, G: NaN }) },
      gamesByTeam: { TB: 1 }, categories: ['G'],
    })
    expect(out.remaining.G).toBe(0)
    expect(rosterExpectation({ players: [], projections, gamesByTeam, categories: ['G'] }).remaining.G).toBe(0)
  })

  it('reads the club abbreviation whichever way the feeds spell it', () => {
    const out = rosterExpectation({
      players: [{ key: 'sniper', proTeam: 'TBL' }],
      projections, gamesByTeam: { TB: 2 }, categories: ['G'],
    })
    expect(out.remaining.G).toBeCloseTo(1.0, 9)
  })
})
