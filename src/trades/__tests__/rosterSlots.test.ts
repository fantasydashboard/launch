import { describe, it, expect } from 'vitest'
import { parseRosterSlots, FLEX_ELIGIBILITY, DEFAULT_SLOTS } from '../rosterSlots'

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
