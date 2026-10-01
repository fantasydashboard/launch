import { describe, it, expect } from 'vitest'
import { kickoffLabel, isEarlyKickoff } from '../kickoffLabel'

/* Real week-4 2026 kickoffs, as ESPN publishes them (UTC). */
const TNF = Date.parse('2026-10-02T00:15Z')      // Thu 8:15pm ET
const LONDON = Date.parse('2026-10-04T13:30Z')   // Sun 9:30am ET
const EARLY = Date.parse('2026-10-04T17:00Z')    // Sun 1:00pm ET
const LATE = Date.parse('2026-10-04T20:25Z')     // Sun 4:25pm ET
const SNF = Date.parse('2026-10-05T00:20Z')      // Sun 8:20pm ET
const MNF = Date.parse('2026-10-06T00:15Z')      // Mon 8:15pm ET

describe('kickoffLabel', () => {
  it('names the three windows a manager already has names for', () => {
    expect(kickoffLabel(TNF)).toBe('TNF')
    expect(kickoffLabel(SNF)).toBe('SNF')
    expect(kickoffLabel(MNF)).toBe('MNF')
  })

  it('gives the Sunday slate its clock, which is what separates early from late', () => {
    expect(kickoffLabel(EARLY)).toBe('Sun 1:00')
    expect(kickoffLabel(LATE)).toBe('Sun 4:25')
    expect(kickoffLabel(LONDON)).toBe('Sun 9:30')
  })

  it('says nothing for a bye or an unread scoreboard', () => {
    expect(kickoffLabel(null)).toBe('')
    expect(kickoffLabel(undefined)).toBe('')
    expect(kickoffLabel(NaN)).toBe('')
  })
})

describe('isEarlyKickoff', () => {
  it('counts the games that lock before the late inactives land', () => {
    expect(isEarlyKickoff(TNF)).toBe(true)
    expect(isEarlyKickoff(LONDON)).toBe(true)
    expect(isEarlyKickoff(EARLY)).toBe(true)
  })

  it('does not count the windows you can still react to', () => {
    expect(isEarlyKickoff(LATE)).toBe(false)
    expect(isEarlyKickoff(SNF)).toBe(false)
    expect(isEarlyKickoff(MNF)).toBe(false)
  })

  it('treats an unknown kickoff as not early, so nothing is warned about on no evidence', () => {
    expect(isEarlyKickoff(null)).toBe(false)
  })
})
