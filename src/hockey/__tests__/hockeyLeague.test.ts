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
        /* These five were the league's "we cannot name it" set, and every total the board
           served was short by all of them. Blocked shots alone are half a point apiece and a
           defenceman puts up 124 of them. */
        { statId: 9, points: 1 }, { statId: 31, points: 0.1 }, { statId: 32, points: 0.5 },
        { statId: 38, points: 0.5 }, { statId: 39, points: 0.5 },
        // an id ESPN does not publish, standing in for one it adds next season
        { statId: 997, points: 0.5 },
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
    expect(r.weights).toEqual({
      W: 4, GA: -2, SV: 0.2, SHO: 3, G: 2, A: 1, SOG: 0.1,
      OTL: 1, HITS: 0.1, BLK: 0.5, PPP: 0.5, SHP: 0.5,
    })
    expect(r.weights.GA).toBeLessThan(0)
  })

  /* A league lists every stat it COULD score and sets most to nought. Keeping those would
     make an eight-stat league look like a twenty-one-stat one. */
  it('drops stats the league lists but does not pay for', () => {
    expect(Object.keys(r.weights)).toHaveLength(12)
    expect(r.weights.L).toBeUndefined()          // statId 2, listed at zero
    expect(r.weights.PLUSMINUS).toBeUndefined()  // statId 15, listed at zero
  })

  it('carries the starting slots and nothing else', () => {
    expect(r.slots).toEqual({ F: 9, D: 5, G: 2, UTIL: 1 })
    expect(r.slots.BENCH).toBeUndefined()
    expect(r.slots.IR).toBeUndefined()
  })

  /* The gap travels with the thing that caused it, rather than being recomputed later. */
  it('reports the scored stats it cannot name', () => {
    expect(r.unnamedScoredStatIds).toEqual([997])
  })

  it('does not count a zero-weight unnameable stat as a gap', () => {
    const { unnamed } = weightsFromScoringItems([{ statId: 997, points: 0 }])
    expect(unnamed).toEqual([])
  })

  /*
   * Seats the DRAFT fills: lineup plus bench, never IR. The fixture is 9 F, 5 D, 2 G, 1 UTIL,
   * 5 bench and 3 IR — 25 slots but a 22-round draft. Counting IR invented a round at the end
   * of every drafter's list, and ESPN's own pick schedule is what caught it: 220 picks across
   * 10 teams is 22, not 23.
   */
  it('counts the seats the draft fills, and not injured reserve', () => {
    expect(r.rosterSize).toBe(22)
  })

  /* A points league lists every stat it could score. Reading that list as a category list
     would report twenty-one categories the league is not decided in. */
  it('reports no categories for a points league', () => {
    expect(r.categories).toEqual([])
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

describe('a category league is asked a different question', () => {
  /* Category leagues publish no points, so the weight check that guards a points league
     would refuse every one of them. This is the bug that kept the board from ever building
     for a category league. */
  const CATEGORY = {
    settings: {
      name: 'Nine Cat', size: 10,
      scoringSettings: {
        scoringType: 'H2H_CATEGORY',
        scoringItems: [
          { statId: 13 }, { statId: 14 }, { statId: 38 }, { statId: 29 },
          { statId: 31 }, { statId: 32 }, { statId: 1 }, { statId: 11 },
          { statId: 10, isReverseItem: true },
        ],
      },
      rosterSettings: { lineupSlotCounts: { '3': 9, '4': 4, '5': 2, '7': 5, '8': 2 } },
    },
  }
  const r = rulesFromEspnSettings(CATEGORY, 'cat', 2027)!

  it('reads the columns the league is decided in', () => {
    expect(r.categories.map((c) => c.key)).toEqual(
      ['G', 'A', 'PPP', 'SOG', 'HITS', 'BLK', 'W', 'SVPCT', 'GAA'],
    )
  })

  it('takes the reverse column from the league\'s own flag', () => {
    expect(r.categories.find((c) => c.key === 'GAA')!.reverse).toBe(true)
    expect(r.categories.find((c) => c.key === 'G')!.reverse).toBe(false)
  })

  it('builds a board despite publishing no weights', () => {
    expect(r.weights).toEqual({})
    expect(rulesProblem(r)).toBe('')
  })

  it('still refuses a category league that named no categories', () => {
    expect(rulesProblem({ ...r, categories: [] })).toContain('categories')
  })

  it('knows a category league from a points one', () => {
    expect(isCategoryLeague(r.scoringType)).toBe(true)
    expect(isCategoryLeague('H2H_POINTS')).toBe(false)
    expect(isCategoryLeague('ROTO')).toBe(true)
  })
})

/*
 * A roster has to hold its own starting lineup.
 *
 * Nothing checked it, and the failure was silent rather than loud: categoryLedger derives the
 * bench as `rosterSize - named` and clamps it at zero, so a league entered with thirteen
 * starters and a roster of ten quietly drafted as though the bench did not exist. The numbers
 * never looked wrong, they were just built on a roster nobody could field.
 */
describe('a roster that cannot hold its own lineup', () => {
  const base = {
    leagueId: 'x', season: 2027, name: 'n', teams: 12, scoringType: 'H2H_CATEGORY',
    weights: {}, categories: [{ key: 'G', statId: 13, reverse: false }],
    slots: { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 1 },   // 13 starters
    unnamedScoredStatIds: [],
  }

  it('refuses a roster smaller than the lineup it must start', () => {
    expect(rulesProblem({ ...base, rosterSize: 10 })).toMatch(/13 starting|roster/i)
  })

  it('accepts a roster with room to spare', () => {
    expect(rulesProblem({ ...base, rosterSize: 20 })).toBe('')
  })

  /* Exactly enough is legal — a league can run with no bench at all. */
  it('accepts a roster that is all starters', () => {
    expect(rulesProblem({ ...base, rosterSize: 13 })).toBe('')
  })

  /* Unknown roster size is a different complaint and not this one's to make. */
  it('says nothing about a roster size that was never reported', () => {
    expect(rulesProblem({ ...base, rosterSize: 0 })).toBe('')
  })
})
