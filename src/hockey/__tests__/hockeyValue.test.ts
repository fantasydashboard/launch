import { describe, it, expect } from 'vitest'
import {
  statsFromEspn, projectionsFromEspn, buildHockeyValue, unidentifiedScoredStats, roleOf,
  SKATER_WEEKLY_CAP, GOALIE_WEEKLY_CAP,
} from '../hockeyValue'

/* MacKinnon's actual projected line, and Askarov's, from ESPN's 2027 feed. */
const MACKINNON = { '13': 53, '14': 80, '16': 133, '29': 367, '30': 82 }
/* 17 W + 16 L + 5 OTL = 38 decisions, which is the identity id 0 satisfies for 57 of the
   58 projected goalies. Id 34 is carried too, at the same 38, precisely because it looks
   like a start count and is not one. */
const ASKAROV = { '1': 17, '2': 16, '3': 1046, '4': 121, '6': 925, '7': 3, '0': 38, '9': 5, '34': 38 }

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
    const out = statsFromEspn({ ...MACKINNON, '31': 62, '32': 42, '997': 5 })
    expect(out).toEqual({ G: 53, A: 80, PTS: 133, SOG: 367, GP: 82, HITS: 62, BLK: 42 })
    // 997 is not a stat ESPN publishes. An id with no derivation is dropped, not passed
    // through under its own number for somebody to score as if they knew what it was.
    expect(out['997']).toBeUndefined()
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

  /*
   * A goalie's volume comes from DECISIONS, a skater's from games played.
   *
   * This used to read id 34 and call it games started. It is not: for all 398 skaters it
   * equals games played, and it is zero for fifteen goalies projected 37 to 52 appearances,
   * so read as starts it would have called three starting goalies unstartable.
   */
  it('measures a goalie in decisions and a skater in games played', () => {
    expect(valueByKey.ask.games).toBe(38)    // 17 W + 16 L + 5 OTL
    expect(valueByKey.mac.games).toBe(82)
  })

  it('falls back to appearances for a goalie ESPN gave no record', () => {
    const noRecord = projectionsFromEspn([espnRow('bk', 5, { '3': 500, '4': 60, '6': 440, '30': 25 })])
    const v = buildHockeyValue({ projections: noRecord, weights: WEIGHTS }).valueByKey.bk
    expect(v.games).toBe(25)
    /* 440 saves at 0.2 against 60 goals at -2 is 88 - 120, and a backup with no wins really
       is worth less than nothing in this scoring. The point of the test is that he is priced
       on 25 appearances rather than on zero games, which would have made him worth exactly
       nought and indistinguishable from a player nobody projected at all. */
    expect(v.total).toBeCloseTo(-32, 5)
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
    expect(unidentifiedScoredStats([{ statId: 13, points: 2 }, { statId: 997, points: 0.5 }])).toEqual([997])
  })

  it('ignores a stat the league leaves at zero', () => {
    // No gap: we cannot name 997, but the league pays nothing for it.
    expect(unidentifiedScoredStats([{ statId: 997, points: 0 }])).toEqual([])
  })

  it('finds nothing wrong with a league that only scores what we know', () => {
    const items = [1, 4, 6, 7, 9, 13, 14, 29, 31, 32, 38, 39].map((statId) => ({ statId, points: 1 }))
    expect(unidentifiedScoredStats(items)).toEqual([])
  })
})

describe('the gap reaches the caller', () => {
  /*
   * The real league's five "unnameable" stats were 9, 31, 32, 38 and 39, and every total the
   * board served was short by all five. They are all named now, so the case this test has to
   * cover is the one that remains real: an id ESPN adds that we have never seen.
   */
  it('reports unnameable scored stats through the result, not just a helper', () => {
    const proj = projectionsFromEspn([espnRow('mac', 1, MACKINNON)])
    const r = buildHockeyValue({
      projections: proj, weights: WEIGHTS,
      scoringItems: [{ statId: 13, points: 2 }, { statId: 998, points: 0.1 }, { statId: 997, points: 1 }],
    })
    expect(r.unscoredStatIds).toEqual([997, 998])
  })

  it('finds no gap in the league that used to show five', () => {
    const proj = projectionsFromEspn([espnRow('mac', 1, MACKINNON)])
    const items = [
      { statId: 4, points: -2 }, { statId: 29, points: 0.1 }, { statId: 31, points: 0.1 },
      { statId: 6, points: 0.2 }, { statId: 32, points: 0.5 }, { statId: 38, points: 0.5 },
      { statId: 39, points: 0.5 }, { statId: 9, points: 1 }, { statId: 14, points: 1 },
      { statId: 13, points: 2 }, { statId: 7, points: 3 }, { statId: 1, points: 4 },
    ]
    expect(buildHockeyValue({ projections: proj, weights: WEIGHTS, scoringItems: items }).unscoredStatIds).toEqual([])
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
