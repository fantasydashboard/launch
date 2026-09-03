import { describe, it, expect } from 'vitest'
import { startableCounts, startableFraction, startablePositions, parseRosterSlots, FLEX_ELIGIBILITY, DEFAULT_SLOTS } from '../rosterSlots'

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
    // 10 teams: QB 1 each; RB 2 + a third of the 3 flex = 3; WR 3; TE 1 + 1 = 2.
    const c = startableCounts(slots, 10)
    expect(c.QB).toBe(10)
    expect(c.RB).toBe(30)
    expect(c.WR).toBe(30)
    expect(c.TE).toBe(20)
  })

  it('needs no special case for onesie positions — the pool encodes it', () => {
    const c = startableCounts(slots, 10)
    // QB5 is mid-pack among starters; RB5 is elite. Same rank, different meaning.
    expect(startableFraction(5, 'QB', c)).toBeCloseTo(0.5, 5)
    expect(startableFraction(5, 'RB', c)).toBeCloseTo(1 / 6, 5)
  })

  it('marks anyone past the pool as unstartable', () => {
    const c = startableCounts(slots, 10)
    expect(startableFraction(36, 'RB', c)!).toBeGreaterThan(1)
    expect(startableFraction(30, 'RB', c)!).toBeCloseTo(1, 5)
  })

  it('scales with league size rather than hardcoding thresholds', () => {
    expect(startableCounts(slots, 14).QB).toBe(14)
    expect(startableCounts(slots, 14).RB).toBe(42)
  })

  it('returns null when the rank cannot be placed', () => {
    expect(startableFraction(0, 'RB', startableCounts(slots, 10))).toBeNull()
    expect(startableFraction(5, 'K', startableCounts(slots, 10))).toBeNull()
  })
})
