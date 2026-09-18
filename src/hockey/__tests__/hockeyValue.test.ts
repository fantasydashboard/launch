import { describe, it, expect } from 'vitest'
import {
  statsFromEspn, projectionsFromEspn, buildHockeyValue, unidentifiedScoredStats, roleOf,
  SKATER_WEEKLY_CAP, GOALIE_WEEKLY_CAP,
} from '../hockeyValue'

/* MacKinnon's actual projected line, and Askarov's, from ESPN's 2027 feed. */
const MACKINNON = { '13': 53, '14': 80, '16': 133, '29': 367, '30': 82 }
const ASKAROV = { '1': 17, '2': 16, '3': 1046, '4': 121, '6': 925, '7': 3, '34': 38 }

/* Your league's real weights, read off its scoringItems. */
const WEIGHTS = { G: 2, A: 1, SOG: 0.1, W: 4, SHO: 3, SV: 0.2, GA: -2 }

const espnRow = (id: string, posId: number, stats: Record<string, number>) => ({
  player: {
    id, defaultPositionId: posId,
    stats: [
      { statSourceId: 0, statSplitTypeId: 0, stats: { '13': 999 } },   // actuals — must be ignored
      { statSourceId: 1, statSplitTypeId: 0, stats },                  // the projection
    ],
  },
})

describe('reading ESPN hockey projections', () => {
  it('maps the stat ids it can name and drops the rest', () => {
    const out = statsFromEspn({ ...MACKINNON, '31': 62, '32': 42 })
    expect(out).toEqual({ G: 53, A: 80, PTS: 133, SOG: 367, GP: 82 })
    // 31 and 32 carry real projections but nothing says which stat they are.
    expect(out['31']).toBeUndefined()
  })

  /* sourceId 1 is projected, 0 is actual. Mixing them would blend what a player has done
     with what he is expected to do. */
  it('takes the projected split, never the actual one', () => {
    const p = projectionsFromEspn([espnRow('1', 1, MACKINNON)])
    expect(p['1'].stats.G).toBe(53)
    expect(p['1'].stats.G).not.toBe(999)
  })

  it('skips a player whose position it cannot identify', () => {
    expect(projectionsFromEspn([espnRow('x', 99, MACKINNON)])).toEqual({})
  })

  it('skips a player with no projection at all', () => {
    const row = { player: { id: '2', defaultPositionId: 1, stats: [{ statSourceId: 0, statSplitTypeId: 0, stats: MACKINNON }] } }
    expect(projectionsFromEspn([row])).toEqual({})
  })
})

describe('scoring a hockey projection', () => {
  const proj = projectionsFromEspn([espnRow('mac', 1, MACKINNON), espnRow('ask', 5, ASKAROV)])
  const { valueByKey } = buildHockeyValue({ projections: proj, weights: WEIGHTS })

  it('scores a skater on the league\'s weights, not ESPN\'s total', () => {
    // 53*2 + 80*1 + 367*0.1 = 106 + 80 + 36.7
    expect(valueByKey.mac.total).toBeCloseTo(222.7, 5)
    expect(valueByKey.mac.perStat.G).toBe(106)
  })

  /* ESPN gives every goalie an appliedTotal of zero. Value has to come from raw stats or
     goalies rank below everyone, forever. */
  it('gives a goalie real value where ESPN gives him none', () => {
    // 17*4 + 3*3 + 925*0.2 + 121*-2 = 68 + 9 + 185 - 242
    expect(valueByKey.ask.total).toBeCloseTo(20, 5)
    expect(valueByKey.ask.total).toBeGreaterThan(0)
  })

  it('carries the negative for goals against rather than dropping it', () => {
    expect(valueByKey.ask.perStat.GA).toBe(-242)
  })

  /* A goalie is worth what he STARTS. Counting relief appearances would make a backup look
     like a timeshare. */
  it('measures a goalie in starts and a skater in games played', () => {
    expect(valueByKey.ask.games).toBe(38)    // GS, not GP
    expect(valueByKey.mac.games).toBe(82)
  })

  it('caps a goalie\'s weekly rate below a skater\'s', () => {
    expect(valueByKey.ask.weeklyCap).toBe(GOALIE_WEEKLY_CAP)
    expect(valueByKey.mac.weeklyCap).toBe(SKATER_WEEKLY_CAP)
    expect(GOALIE_WEEKLY_CAP).toBeLessThan(SKATER_WEEKLY_CAP)
  })

  /* `side` distinguishes a baseball hitter from a pitcher. Overloading it with a hockey
     meaning would make every consumer that branches on it wrong. */
  it('leaves `side` undefined, the way football does', () => {
    expect(valueByKey.mac.side).toBeUndefined()
    expect(valueByKey.ask.side).toBeUndefined()
  })

  it('returns what REMAINS once games have been played', () => {
    const half = buildHockeyValue({ projections: proj, weights: WEIGHTS, gamesPlayed: { mac: 41 } })
    expect(half.valueByKey.mac.games).toBe(41)
    expect(half.valueByKey.mac.total).toBeCloseTo(222.7 / 2, 4)
  })
})

describe('stats the league pays for that we cannot name', () => {
  /* The gap must be reportable. If a league scores a stat we cannot identify, every total is
     short by whatever it was worth — silently, unless something says so. */
  it('reports a scored stat it has no name for', () => {
    expect(unidentifiedScoredStats([{ statId: 13, points: 2 }, { statId: 31, points: 0.5 }])).toEqual([31])
  })

  it('ignores a stat the league leaves at zero', () => {
    // No gap: we cannot name 31, but the league pays nothing for it.
    expect(unidentifiedScoredStats([{ statId: 31, points: 0 }])).toEqual([])
  })

  it('finds nothing wrong with a league that only scores what we know', () => {
    const items = [1, 4, 6, 7, 13, 14, 29].map((statId) => ({ statId, points: 1 }))
    expect(unidentifiedScoredStats(items)).toEqual([])
  })
})

describe('the gap reaches the caller', () => {
  /* Your real league scores five ids we cannot name. Every total is short by whatever they
     were worth, and the only defence against that being invisible is reporting it. */
  it('reports unnameable scored stats through the result, not just a helper', () => {
    const proj = projectionsFromEspn([espnRow('mac', 1, MACKINNON)])
    const r = buildHockeyValue({
      projections: proj, weights: WEIGHTS,
      scoringItems: [{ statId: 13, points: 2 }, { statId: 31, points: 0.1 }, { statId: 9, points: 1 }],
    })
    expect(r.unscoredStatIds).toEqual([9, 31])
  })

  it('reports nothing when the caller supplies no scoring items', () => {
    const proj = projectionsFromEspn([espnRow('mac', 1, MACKINNON)])
    expect(buildHockeyValue({ projections: proj, weights: WEIGHTS }).unscoredStatIds).toEqual([])
  })
})

describe('roles', () => {
  it('groups the three forward positions together', () => {
    expect(['C', 'LW', 'RW'].map(roleOf)).toEqual(['F', 'F', 'F'])
    expect(roleOf('D')).toBe('D')
    expect(roleOf('G')).toBe('G')
    expect(roleOf('')).toBe('')
  })
})
