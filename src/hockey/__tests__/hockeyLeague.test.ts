import { describe, it, expect } from 'vitest'
import {
  rulesFromEspnSettings, weightsFromScoringItems, rulesProblem, isCategoryLeague,
} from '../hockeyLeague'

/* League 1454426929's real settings, trimmed to what the parser reads. */
const REAL = {
  settings: {
    name: 'Fantasy Nerds Gummies',
    size: 8,
    scoringSettings: {
      scoringType: 'H2H_POINTS',
      scoringItems: [
        { statId: 1, points: 4 }, { statId: 4, points: -2 }, { statId: 6, points: 0.2 },
        { statId: 7, points: 3 }, { statId: 13, points: 2 }, { statId: 14, points: 1 },
        { statId: 29, points: 0.1 },
        // scored but unnameable
        { statId: 9, points: 1 }, { statId: 31, points: 0.1 }, { statId: 32, points: 0.5 },
        // listed and worth nothing — the league does not score these
        { statId: 2, points: 0 }, { statId: 15, points: 0 }, { statId: 23, points: 0 },
      ],
    },
    rosterSettings: { lineupSlotCounts: { '3': 9, '4': 5, '5': 2, '6': 1, '7': 5, '8': 3 } },
  },
}

describe('reading a hockey league\'s own rules', () => {
  const r = rulesFromEspnSettings(REAL, '1454426929', 2027)!

  it('reads the league the way ESPN reports it', () => {
    expect(r.teams).toBe(8)
    expect(r.scoringType).toBe('H2H_POINTS')
    expect(r.name).toBe('Fantasy Nerds Gummies')
  })

  it('reads the weights, including the negative one', () => {
    expect(r.weights).toEqual({ W: 4, GA: -2, SV: 0.2, SHO: 3, G: 2, A: 1, SOG: 0.1 })
    expect(r.weights.GA).toBeLessThan(0)
  })

  /* A league lists every stat it COULD score and sets most to nought. Keeping those would
     make an eight-stat league look like a twenty-one-stat one. */
  it('drops stats the league lists but does not pay for', () => {
    expect(Object.keys(r.weights)).toHaveLength(7)
    expect(r.weights.L).toBeUndefined()   // statId 2, listed at zero
  })

  it('carries the starting slots and nothing else', () => {
    expect(r.slots).toEqual({ F: 9, D: 5, G: 2, UTIL: 1 })
    expect(r.slots.BENCH).toBeUndefined()
    expect(r.slots.IR).toBeUndefined()
  })

  /* The gap travels with the thing that caused it, rather than being recomputed later. */
  it('reports the scored stats it cannot name', () => {
    expect(r.unnamedScoredStatIds).toEqual([9, 31, 32])
  })

  it('does not count a zero-weight unnameable stat as a gap', () => {
    const { unnamed } = weightsFromScoringItems([{ statId: 31, points: 0 }])
    expect(unnamed).toEqual([])
  })
})

describe('refusing to build a board on rules we do not have', () => {
  /*
   * No default scoring, ever. A board built on invented weights looks exactly like one built
   * on real weights, and a reader has no way to tell the difference — so the honest move is
   * to refuse and say why.
   */
  it('refuses when the league published no scoring', () => {
    const r = rulesFromEspnSettings(
      { settings: { size: 10, scoringSettings: { scoringItems: [] }, rosterSettings: { lineupSlotCounts: { '3': 9 } } } },
      'x', 2027,
    )
    expect(r!.weights).toEqual({})
    expect(rulesProblem(r)).toMatch(/no scoring weights/i)
    expect(rulesProblem(r)).toMatch(/will not substitute a default/i)
  })

  /* Team count sets every replacement level. Guessing it prices the board off a league size
     nobody is playing. */
  it('refuses when the team count is missing rather than assuming one', () => {
    const r = rulesFromEspnSettings(
      { settings: { scoringSettings: { scoringItems: [{ statId: 13, points: 2 }] }, rosterSettings: { lineupSlotCounts: { '3': 9 } } } },
      'x', 2027,
    )
    expect(r!.teams).toBe(0)
    expect(rulesProblem(r)).toMatch(/how many teams/i)
  })

  it('refuses when ESPN returned nothing at all', () => {
    expect(rulesFromEspnSettings({}, 'x', 2027)).toBeNull()
    expect(rulesProblem(null)).toMatch(/no settings/i)
  })

  it('passes a league that has everything', () => {
    expect(rulesProblem(rulesFromEspnSettings(REAL, 'x', 2027))).toBe('')
  })
})

describe('league shape', () => {
  it('tells a category league from a points league', () => {
    expect(isCategoryLeague('H2H_POINTS')).toBe(false)
    expect(isCategoryLeague('H2H_CATEGORY')).toBe(true)
    expect(isCategoryLeague('ROTO')).toBe(true)
    expect(isCategoryLeague('')).toBe(false)
  })
})
