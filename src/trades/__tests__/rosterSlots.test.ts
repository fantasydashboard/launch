import { describe, it, expect } from 'vitest'
import { startableCounts, startableFraction, startablePositions, parseRosterSlots, flexEligibility, FLEX_ELIGIBILITY, DEFAULT_SLOTS, canonicalPosition } from '../rosterSlots'

describe('parseRosterSlots', () => {
  it('parses Yahoo roster_positions, dropping bench/IL', () => {
    const settings = {
      roster_positions: [
        { roster_position: { position: 'C', count: 1 } },
        { roster_position: { position: '3B', count: 1 } },
        { roster_position: { position: 'OF', count: 3 } },
        { roster_position: { position: 'UTIL', count: 2 } },
        { roster_position: { position: 'SP', count: 2 } },
        { roster_position: { position: 'BN', count: 5 } },
        { roster_position: { position: 'IL', count: 3 } },
      ],
    }
    const slots = parseRosterSlots('yahoo', settings)
    expect(slots).toEqual({ C: 1, '3B': 1, OF: 3, UTIL: 2, SP: 2 })
  })

  it('parses ESPN lineupSlotCounts via slot id map, dropping bench/IL', () => {
    // ESPN slot ids: 0=C,1=1B,2=2B,3=3B,4=SS,5=OF,12=UTIL,13=P,16=BE(bench),17=IL
    const settings = { rosterSettings: { lineupSlotCounts: { '3': 1, '5': 3, '12': 2, '16': 5, '17': 3 } } }
    const slots = parseRosterSlots('espn', settings)
    expect(slots).toEqual({ '3B': 1, OF: 3, UTIL: 2 })
  })

  it('falls back to DEFAULT_SLOTS when settings are missing', () => {
    expect(parseRosterSlots('yahoo', null)).toEqual(DEFAULT_SLOTS)
    expect(parseRosterSlots('espn', {})).toEqual(DEFAULT_SLOTS)
  })

  it('folds granular LF/CF/RF slots into a single OF pool', () => {
    const settings = {
      roster_positions: [
        { roster_position: { position: 'OF', count: 1 } },
        { roster_position: { position: 'LF', count: 1 } },
        { roster_position: { position: 'CF', count: 1 } },
        { roster_position: { position: 'RF', count: 1 } },
        { roster_position: { position: '2B', count: 1 } },
      ],
    }
    const slots = parseRosterSlots('yahoo', settings)
    expect(slots).toEqual({ OF: 4, '2B': 1 })
    expect(slots.LF).toBeUndefined()
  })

  it('exposes flex eligibility so UTIL accepts any hitter sub-position', () => {
    expect(FLEX_ELIGIBILITY.UTIL).toContain('3B')
    expect(FLEX_ELIGIBILITY.P).toEqual(expect.arrayContaining(['SP', 'RP']))
  })
})

describe('parseRosterSlots — football', () => {
  it('ESPN football: numeric lineupSlotCounts → NFL roster shape (bench excluded)', () => {
    const settings = {
      rosterSettings: { lineupSlotCounts: { '0': 1, '2': 2, '4': 2, '6': 1, '23': 1, '16': 1, '17': 1, '20': 6 } },
    }
    expect(parseRosterSlots('espn', settings, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DEF: 1, K: 1,
    })
  })

  it('Sleeper football: roster_positions labels → NFL roster shape (BN/IR/TAXI excluded)', () => {
    const settings = {
      roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'IR', 'TAXI'],
    }
    expect(parseRosterSlots('sleeper', settings, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1,
    })
  })

  it('Sleeper football: flex aliases normalize to FLEX / SUPER_FLEX', () => {
    const settings = { roster_positions: ['QB', 'WRRB_FLEX', 'REC_FLEX', 'SUPER_FLEX'] }
    expect(parseRosterSlots('sleeper', settings, 'football')).toEqual({
      QB: 1, FLEX: 2, SUPER_FLEX: 1,
    })
  })

  it('Yahoo football: position labels incl. W/R/T flex → FLEX', () => {
    const settings = {
      roster_positions: [
        { roster_position: { position: 'QB', count: 1 } },
        { roster_position: { position: 'RB', count: 2 } },
        { roster_position: { position: 'WR', count: 2 } },
        { roster_position: { position: 'TE', count: 1 } },
        { roster_position: { position: 'W/R/T', count: 1 } },
        { roster_position: { position: 'Q/W/R/T', count: 1 } },
        { roster_position: { position: 'K', count: 1 } },
        { roster_position: { position: 'DEF', count: 1 } },
        { roster_position: { position: 'BN', count: 5 } },
      ],
    }
    expect(parseRosterSlots('yahoo', settings, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPER_FLEX: 1, K: 1, DEF: 1,
    })
  })

  it('football fallback when settings are empty', () => {
    expect(parseRosterSlots('sleeper', null, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1,
    })
  })
})

describe('startablePositions', () => {
  it("expands flex slots and omits positions the league doesn't start", () => {
    // League of Record: QB/RB/RB/WR/WR/TE/FLEX x3 + bench. No K, no DEF.
    const slots = parseRosterSlots(
      'sleeper',
      { roster_positions: ['QB','RB','RB','WR','WR','TE','FLEX','FLEX','FLEX','BN','BN','BN','BN','BN'] },
      'football',
    )
    const startable = startablePositions(slots)
    expect([...startable].sort()).toEqual(['QB', 'RB', 'TE', 'WR'])
  })

  it('keeps K and DEF when the league actually starts them', () => {
    const slots = parseRosterSlots(
      'sleeper',
      { roster_positions: ['QB','RB','WR','TE','K','DEF','BN'] },
      'football',
    )
    expect(startablePositions(slots).has('K')).toBe(true)
    expect(startablePositions(slots).has('DEF')).toBe(true)
  })

  it('SUPER_FLEX makes QB startable even with no dedicated QB slot', () => {
    expect(startablePositions({ SUPER_FLEX: 1 }).has('QB')).toBe(true)
  })

  it('ignores zero-count slots', () => {
    expect(startablePositions({ QB: 1, K: 0 }).has('K')).toBe(false)
  })
})

describe('startableCounts', () => {
  const slots = parseRosterSlots(
    'sleeper',
    { roster_positions: ['QB','RB','RB','WR','WR','TE','FLEX','FLEX','FLEX','BN','BN','BN','BN','BN'] },
    'football',
  )

  it('scales each position by how many the league actually starts', () => {
    // 10 teams, 3 flex allocated by real usage (RB .40 / WR .45 / TE .10 normalised).
    const c = startableCounts(slots, 10, 'football')
    expect(c.QB).toBe(10)
    expect(c.RB).toBeGreaterThan(30)
    expect(c.WR).toBeGreaterThan(30)
    // Tight ends barely see a flex seat, so their pool stays near the ten dedicated ones.
    expect(c.TE).toBeLessThanOrEqual(14)
  })

  /*
   * The bug this weighting fixes: an even flex split gave TE a pool of 20 against QB's 10, so
   * TE11 read as a comfortable starter (0.55) while QB9 read as replaceable (0.90). Two
   * onesie positions, two different scales, visible on screen as one green and one grey.
   */
  it('keeps the two onesie positions on comparable scales', () => {
    const c = startableCounts(slots, 10, 'football')
    // Both are one-per-team positions, so the 10th and the 7th should read alike.
    expect(startableFraction(10, 'TE', c)!).toBeGreaterThan(2 / 3)
    expect(startableFraction(7, 'QB', c)!).toBeGreaterThan(2 / 3)
    expect(startableFraction(5, 'TE', c)!).toBeLessThanOrEqual(2 / 3)
    expect(startableFraction(5, 'QB', c)!).toBeLessThanOrEqual(2 / 3)
  })

  /* The whole point of deriving the pool: the scale has to follow the league, not the sport. */
  it('adjusts for superflex — a QB pool far bigger than one per team', () => {
    const sf = parseRosterSlots(
      'sleeper',
      { roster_positions: ['QB','RB','RB','WR','WR','TE','SUPER_FLEX','BN','BN'] },
      'football',
    )
    const c = startableCounts(sf, 10, 'football')
    // A superflex seat goes to a quarterback almost every time, so ~15 QBs start, not 10.
    expect(c.QB).toBeGreaterThan(13)
    expect(startableFraction(12, 'QB', c)!).toBeLessThan(1) // QB12 still a starter here
    // Same player in a standard league is not.
    expect(startableFraction(12, 'QB', startableCounts(slots, 10, 'football'))!).toBeGreaterThan(1)
  })

  it('adjusts for a two-tight-end league', () => {
    const twoTe = parseRosterSlots(
      'sleeper',
      { roster_positions: ['QB','RB','RB','WR','WR','TE','TE','FLEX','BN'] },
      'football',
    )
    const c = startableCounts(twoTe, 10, 'football')
    expect(c.TE).toBeGreaterThan(20)
    // TE18 is a fringe starter with two TE slots, and nowhere near one with a single slot.
    expect(startableFraction(18, 'TE', c)!).toBeLessThan(1)
    expect(startableFraction(18, 'TE', startableCounts(slots, 10, 'football'))!).toBeGreaterThan(1)
  })

  it('still gives a flex-only position a share rather than a pool of zero', () => {
    // No dedicated TE slot: TE exists solely through the flex.
    const flexOnly = { QB: 1, RB: 2, WR: 2, FLEX: 2 }
    expect(startableCounts(flexOnly, 10, 'football').TE).toBeGreaterThan(0)
  })

  it('needs no special case for onesie positions — the pool encodes it', () => {
    const c = startableCounts(slots, 10, 'football')
    // QB5 is mid-pack among starters; RB5 is elite. Same rank, different meaning.
    expect(startableFraction(5, 'QB', c)).toBeCloseTo(0.5, 5)
    expect(startableFraction(5, 'RB', c)!).toBeLessThan(0.2)
  })

  it('marks anyone past the pool as unstartable', () => {
    const c = startableCounts(slots, 10, 'football')
    expect(startableFraction(36, 'RB', c)!).toBeGreaterThan(1)
    expect(startableFraction(c.RB, 'RB', c)!).toBeCloseTo(1, 5)
  })

  it('scales with league size rather than hardcoding thresholds', () => {
    expect(startableCounts(slots, 14, 'football').QB).toBe(14)
    expect(startableCounts(slots, 14, 'football').RB).toBeGreaterThan(startableCounts(slots, 10, 'football').RB)
  })

  /*
   * THE MERGED UTIL LIST IS ONLY SAFE WHERE A PLAYER IS ON THE OTHER SIDE.
   *
   * FLEX_ELIGIBILITY.UTIL merges baseball's hitters with hockey's skaters, and the comment
   * there argues the merge is harmless because the two vocabularies are disjoint apart from C.
   * That argument holds for coversSlot, which compares the list against a real player — no
   * hockey player is shortstop-eligible, so the baseball half is discarded for free.
   *
   * startableCounts walks the same list with NO player to discard anything, and a hockey
   * league came back reporting a startable pool of one shortstop, one first baseman and one
   * designated hitter — while its own defencemen split the utility seat thirteen ways instead
   * of four. The sport is required here for that reason.
   */
  it('never invents a position the sport does not have', () => {
    const hockey = { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 1 }
    const c = startableCounts(hockey, 12, 'hockey')
    for (const absent of ['1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH']) {
      expect(c[absent]).toBeUndefined()
    }
    expect(Object.keys(c).sort()).toEqual(['C', 'D', 'G', 'LW', 'RW'])
  })

  it('splits a hockey utility seat among the skaters, not the whole merged list', () => {
    const hockey = { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 1 }
    const c = startableCounts(hockey, 12, 'hockey')
    /* Four skater positions share twelve utility seats: three each, on top of the dedicated
       ones. The merged list gave defence 0.9 of those twelve. */
    expect(c.D).toBe(4 * 12 + 3)
    expect(c.C).toBe(2 * 12 + 3)
    expect(c.G).toBe(2 * 12)
  })

  it('leaves a baseball utility seat to the hitters', () => {
    const c = startableCounts({ C: 1, '1B': 1, SS: 1, OF: 3, UTIL: 2, SP: 5 }, 12, 'baseball')
    expect(c.LW).toBeUndefined()
    expect(c.D).toBeUndefined()
    expect(c.SS).toBeGreaterThan(12)
  })

  it('reads the hockey forward slot as the three forward positions', () => {
    const c = startableCounts({ C: 1, LW: 1, RW: 1, F: 3, D: 4, G: 2 }, 12, 'hockey')
    /* One dedicated seat plus a third of the three forward seats: two per team. */
    expect(c.C).toBe(12 + 12)
    expect(c.D).toBe(48)
  })

  it('returns null when the rank cannot be placed', () => {
    expect(startableFraction(0, 'RB', startableCounts(slots, 10, 'football'))).toBeNull()
    expect(startableFraction(5, 'K', startableCounts(slots, 10, 'football'))).toBeNull()
  })
})

/*
 * ESPN slot ids mean different positions in different sports, and the sport was never passed.
 *
 * parseRosterSlots takes `sport` with a default of 'baseball', and both ESPN composables call
 * it with two arguments. So an ESPN FOOTBALL league had its lineup read through the baseball
 * map: slot 0 is a quarterback and came back a catcher, slot 2 a running back and came back a
 * second baseman, and every football-only slot — FLEX, K, D/ST — was absent from the map and
 * silently dropped.
 *
 * The damage was exactly visible on the page. A standard ESPN football lineup produced six
 * baseball slots, and This Week reported "You're leaving 6 starting slots empty" above a bench
 * holding the entire roster: no football player can fill a shortstop. The Wire's board had no
 * position pills at all, because the startable positions it derives were catchers and
 * middle infielders.
 */
describe('ESPN football lineup slots', () => {
  // A standard ESPN NFL roster: QB, 2 RB, 2 WR, TE, FLEX, D/ST, K, 7 bench, 1 IR.
  const NFL = {
    rosterSettings: {
      lineupSlotCounts: {
        '0': 1, '2': 2, '4': 2, '6': 1, '23': 1, '16': 1, '17': 1, '20': 7, '21': 1,
      },
    },
  }

  it('reads football slots when told the sport', () => {
    expect(parseRosterSlots('espn', NFL, 'football')).toEqual({
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DEF: 1, K: 1,
    })
  })

  it('produced six baseball slots without it — the six the page reported empty', () => {
    // Pinning the old behaviour so the regression is unmistakable if the argument is ever
    // dropped again: this is what a football roster looked like through the baseball map.
    const wrong = parseRosterSlots('espn', NFL)
    const total = Object.values(wrong).reduce((a, b) => a + b, 0)
    expect(total).toBe(6)
    expect(Object.keys(wrong)).not.toContain('QB')
  })
})

/*
 * ESPN spells team defence "D/ST"; its own lineup slot 16 parses to "DEF".
 *
 * So the slot and the only player who can fill it never matched, and the board showed an open
 * DEF seat above a bench holding the Steelers. The second half is worse: every position
 * normaliser in the codebase splits on "/" to handle multi-eligible players, so "D/ST" came
 * out as "D" — which is why the bench row's rank read "D9". Fold before anything splits, or
 * the slash eats the position.
 */
describe('team defence has one name', () => {
  it('folds every spelling to DEF', () => {
    for (const raw of ['D/ST', 'DST', 'd-st', 'DEF', 'Defense', ' D ']) {
      expect(canonicalPosition(raw)).toBe('DEF')
    }
  })

  it('leaves every other position alone', () => {
    for (const raw of ['QB', 'rb', 'WR', 'TE', 'K', 'SS', '1B']) {
      expect(canonicalPosition(raw)).toBe(raw.trim().toUpperCase())
    }
  })

  it('lets an ESPN defence fill the ESPN DEF slot', () => {
    // The two halves that never met: slot 16 from the lineup, "D/ST" from the player.
    const slots = parseRosterSlots(
      'espn',
      { rosterSettings: { lineupSlotCounts: { '0': 1, '16': 1 } } },
      'football',
    )
    expect(slots.DEF).toBe(1)
    expect(canonicalPosition('D/ST')).toBe('DEF')
  })
})

describe('ESPN hockey lineup slots', () => {
  /* Dallas Pro H2H Points: 9 F, 5 D, 2 G, 1 UTIL, 5 bench, 1 IR — its real lineupSlotCounts. */
  const DALLAS = { rosterSettings: { lineupSlotCounts: {
    '3': 9, '4': 5, '5': 2, '6': 1, '7': 5, '8': 1,
  } } }

  /*
   * READ THROUGH THE BASEBALL MAP THIS BECAME NINE THIRD BASEMEN. Slot 3 is a forward in
   * hockey and third base in baseball; 4 is a defenceman and a shortstop; 5 is a goalie and
   * an outfielder. My Team, Trades and the Matchup all showed twenty-three empty baseball
   * slots above a bench holding the whole roster, because no hockey player fills a shortstop.
   */
  it('reads hockey slots as hockey', () => {
    expect(parseRosterSlots('espn', DALLAS, 'hockey')).toEqual({ F: 9, D: 5, G: 2, UTIL: 1 })
  })

  it('leaves bench and IR out of the starting requirement', () => {
    const slots = parseRosterSlots('espn', DALLAS, 'hockey')
    expect(slots.BENCH).toBeUndefined()
    expect(slots.IR).toBeUndefined()
  })

  it('does not disturb the other sports', () => {
    expect(parseRosterSlots('espn', DALLAS, 'baseball').F).toBeUndefined()
    expect(parseRosterSlots('espn', { rosterSettings: { lineupSlotCounts: { '0': 1, '2': 2 } } }, 'football'))
      .toEqual({ QB: 1, RB: 2 })
  })
})

describe('hockey slot eligibility', () => {
  /*
   * A forward slot takes any of the three forward positions, and UTIL takes any skater.
   * Without these a hockey roster could not fill the two slots it starts most of its team
   * through — the board would report nine open forward seats above a full bench.
   */
  it('lets any forward fill the forward slot', () => {
    for (const pos of ['C', 'LW', 'RW']) expect(FLEX_ELIGIBILITY.F).toContain(pos)
  })

  it('lets any skater fill utility, including a defenceman', () => {
    for (const pos of ['C', 'LW', 'RW', 'D']) expect(FLEX_ELIGIBILITY.UTIL).toContain(pos)
  })

  /* A goalie is not a skater. Utility taking one would field a second goalie in a skater
     seat, which no league allows. */
  it('never lets a goalie into utility or the forward slot', () => {
    expect(FLEX_ELIGIBILITY.UTIL).not.toContain('G')
    expect(FLEX_ELIGIBILITY.F).not.toContain('G')
  })

  /* The merge is only safe because the vocabularies are disjoint apart from C, which is
     utility-eligible in both sports. Baseball must be untouched by it. */
  it('leaves baseball utility working', () => {
    for (const pos of ['1B', '2B', 'SS', 'OF', 'DH']) expect(FLEX_ELIGIBILITY.UTIL).toContain(pos)
  })
})

describe('parseRosterSlots, on a league we could not read', () => {
  /*
   * NO HOCKEY DEFAULT, and the sport has to be PASSED for that to hold. parseRosterSlots
   * defaults its sport to baseball, so a caller that omits it hands a hockey league a lineup
   * of catchers, shortstops and outfielders — the same failure the ESPN_NHL_SLOT_TO_POS
   * comment records happening twice: empty baseball seats above a bench holding the whole
   * roster, because no hockey player can fill a shortstop. useYahooLeaguePool omitted it.
   */
  it('invents nothing for a hockey league, and baseball only when asked for baseball', () => {
    expect(parseRosterSlots('yahoo', null, 'hockey')).toEqual({})
    expect(parseRosterSlots('espn', null, 'hockey')).toEqual({})
    expect(Object.keys(parseRosterSlots('yahoo', null, 'baseball')).length).toBeGreaterThan(0)
  })

  /* The trap: omitting the sport is not a neutral act, it is a vote for baseball. */
  it('falls to baseball when the sport is omitted, which is why callers must pass it', () => {
    expect(parseRosterSlots('yahoo', null)).toEqual(DEFAULT_SLOTS)
  })

  it('reads a real Yahoo hockey roster without needing the sport at all', () => {
    const slots = parseRosterSlots('yahoo', {
      roster_positions: [
        { roster_position: { position: 'C', count: 2 } },
        { roster_position: { position: 'LW', count: 2 } },
        { roster_position: { position: 'RW', count: 2 } },
        { roster_position: { position: 'D', count: 4 } },
        { roster_position: { position: 'G', count: 2 } },
        { roster_position: { position: 'Util', count: 1 } },
        { roster_position: { position: 'BN', count: 4 } },
        { roster_position: { position: 'IR', count: 2 } },
      ],
    }, 'hockey')
    expect(slots).toEqual({ C: 2, LW: 2, RW: 2, D: 4, G: 2, Util: 1 })
  })

  /* Yahoo writes it "Util"; the flex table is keyed "UTIL". The seats must still be allocated,
     which is why flexEligibility upper-cases the slot before looking it up. */
  it('allocates a Yahoo-cased utility seat to the skaters', () => {
    const c = startableCounts({ C: 2, LW: 2, RW: 2, D: 4, G: 2, Util: 1 }, 12, 'hockey')
    expect(c.Util).toBeUndefined()
    expect(c.D).toBe(4 * 12 + 3)
  })
})

describe('flexEligibility', () => {
  it('resolves UTIL by sport and leaves every other slot alone', () => {
    expect(flexEligibility('UTIL', 'hockey')).toEqual(['C', 'LW', 'RW', 'D'])
    expect(flexEligibility('UTIL', 'baseball')).not.toContain('LW')
    expect(flexEligibility('FLEX', 'football')).toEqual(FLEX_ELIGIBILITY.FLEX)
    expect(flexEligibility('F', 'hockey')).toEqual(['C', 'LW', 'RW'])
  })

  it('is undefined for a concrete position', () => {
    expect(flexEligibility('D', 'hockey')).toBeUndefined()
    expect(flexEligibility('QB', 'football')).toBeUndefined()
  })

  /* A sport with no UTIL of its own keeps the merged list rather than silently losing the
     slot — wrong is recoverable, absent reads as "this league has no utility seat". */
  it('falls back to the merged list for a sport it has no table for', () => {
    expect(flexEligibility('UTIL', 'basketball')).toEqual(FLEX_ELIGIBILITY.UTIL)
  })
})
