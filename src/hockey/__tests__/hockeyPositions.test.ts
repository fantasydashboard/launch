import { describe, it, expect } from 'vitest'
import {
  hockeyPosition, hockeySlot, isStartingSlot, startingSlotsFromEspn,
  HOCKEY_SLOT_ACCEPTS, HOCKEY_STAT_BY_ID, HOCKEY_STAT_UNVERIFIED, LOWER_IS_BETTER,
} from '../hockeyPositions'

describe('hockey positions and slots', () => {
  /* Derived from 377 projected players, confirmed by who tops each position. */
  it('maps ESPN position ids to positions', () => {
    expect([1, 2, 3, 4, 5].map(hockeyPosition)).toEqual(['C', 'LW', 'RW', 'D', 'G'])
  })

  /* Absent is not a position. An unknown id must not become a default, or a player lands in
     a lineup slot on no evidence at all. */
  it('returns empty for an unknown position id rather than guessing', () => {
    expect(hockeyPosition(99)).toBe('')
    expect(hockeyPosition(undefined)).toBe('')
  })

  it('maps lineup slots, and leaves slot 10 unmapped on purpose', () => {
    expect(hockeySlot(3)).toBe('F')
    expect(hockeySlot(6)).toBe('UTIL')
    expect(hockeySlot(5)).toBe('G')
    // ~1% of every skater position is eligible for slot 10 and none for goalies, which is
    // not enough to name it. Naming it wrongly would seat players in a chair that is not there.
    expect(hockeySlot(10)).toBe('')
  })

  it('knows a forward slot takes any forward but no defenceman', () => {
    expect(HOCKEY_SLOT_ACCEPTS.F).toEqual(['C', 'LW', 'RW'])
    expect(HOCKEY_SLOT_ACCEPTS.F).not.toContain('D')
  })

  it('knows UTIL takes any skater but never a goalie', () => {
    expect(HOCKEY_SLOT_ACCEPTS.UTIL).toEqual(['C', 'LW', 'RW', 'D'])
    expect(HOCKEY_SLOT_ACCEPTS.UTIL).not.toContain('G')
  })

  it('separates the lineup from the roster', () => {
    expect(isStartingSlot('F')).toBe(true)
    expect(isStartingSlot('BENCH')).toBe(false)
    expect(isStartingSlot('IR')).toBe(false)
  })

  /* Bench and IR are roster capacity, not lineup openings — handing them to the optimiser
     would have it "starting" players who by definition are not. */
  it('converts ESPN slot counts to starting openings only', () => {
    // The real league read: 9 F, 5 D, 2 G, 1 UTIL, 5 bench, 3 IR.
    const out = startingSlotsFromEspn({ '3': 9, '4': 5, '5': 2, '6': 1, '7': 5, '8': 3 })
    expect(out).toEqual({ F: 9, D: 5, G: 2, UTIL: 1 })
    expect(Object.values(out).reduce((a, b) => a + b, 0)).toBe(17)
  })

  it('ignores slots set to zero', () => {
    expect(startingSlotsFromEspn({ '3': 9, '0': 0, '1': 0 })).toEqual({ F: 9 })
  })
})

describe('hockey stat identifiers', () => {
  /* Verified twice: by arithmetic in the projection payload, and against a real league's
     scoringItems, which puts a points value on the same ids. */
  it('carries the stats both checks agreed on', () => {
    expect(HOCKEY_STAT_BY_ID[13]).toBe('G')
    expect(HOCKEY_STAT_BY_ID[14]).toBe('A')
    expect(HOCKEY_STAT_BY_ID[16]).toBe('PTS')   // 53 G + 80 A = 133
    expect(HOCKEY_STAT_BY_ID[6]).toBe('SV')     // 1046 SA - 121 GA = 925
    expect(HOCKEY_STAT_BY_ID[4]).toBe('GA')     // the only negative weight in the league
  })

  /*
   * The ids this map used to give up on, and the identity that cracked each.
   *
   * Every number quoted is from the 456-player projection feed, and the point of testing
   * them is that these are the FIVE STATS THE TEST LEAGUE PAYS FOR AND WE USED TO DROP —
   * hits, blocks, power-play points, short-handed points and overtime losses. A regression
   * here is not cosmetic; it silently shortens every total on the board.
   */
  it('carries the stats that only identify as a set', () => {
    expect(HOCKEY_STAT_BY_ID[31]).toBe('HITS')  // top 5 are Trenin, Sherwood, Cuylle, Kolesar
    expect(HOCKEY_STAT_BY_ID[32]).toBe('BLK')   // top 5 are all defencemen; D avg 124 vs F 41
    expect(HOCKEY_STAT_BY_ID[38]).toBe('PPP')   // 18 + 19, and 16x commoner than 39
    expect(HOCKEY_STAT_BY_ID[39]).toBe('SHP')   // 20 + 21
    expect(HOCKEY_STAT_BY_ID[9]).toBe('OTL')    // the third term of W + L + OTL = decisions
    expect(HOCKEY_STAT_BY_ID[15]).toBe('PLUSMINUS')  // the only id that goes negative
    expect(HOCKEY_STAT_BY_ID[17]).toBe('PIM')   // top 5 are the league's most-penalised
  })

  /*
   * Id 34 is NOT games started, which this map asserted for a while.
   *
   * It equals games played for all 398 skaters — a skater does not start — and reads zero
   * for fifteen goalies projected 37 to 52 appearances. Pinned so nobody reinstates it.
   */
  it('does not call id 34 games started', () => {
    expect(HOCKEY_STAT_BY_ID[34]).not.toBe('GS')
    expect(HOCKEY_STAT_BY_ID[0]).toBe('DEC')    // the verified alternative
  })

  /*
   * The gap machinery outlives the gap.
   *
   * This set is empty now that every id in the feed has a derivation. The test that it
   * contains nothing which is also in the map is what keeps it honest when ESPN adds a stat
   * next season and somebody lists the id here.
   */
  it('keeps unidentified stats out of the map rather than guessing at them', () => {
    for (const id of HOCKEY_STAT_UNVERIFIED) {
      expect(HOCKEY_STAT_BY_ID[id]).toBeUndefined()
    }
  })

  it('knows which categories run backwards', () => {
    expect(LOWER_IS_BETTER.has('GAA')).toBe(true)
    // A higher save percentage is better — only the average runs the other way.
    expect(LOWER_IS_BETTER.has('SVPCT')).toBe(false)
  })
})
