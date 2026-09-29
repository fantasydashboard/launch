import { describe, it, expect } from 'vitest'
import { phaseOf, daysBetween, localYmd } from '@/composables/useSeasonPhase'

const w = (over: Partial<Parameters<typeof phaseOf>[1] & object> = {}) => ({
  preSeasonStart: '2026-09-19',
  regularSeasonStart: '2026-09-29',
  regularSeasonEnd: '2027-04-10',
  days: [],
  ...over,
}) as any

describe('phaseOf', () => {
  it('calls the day before opening night "before"', () => {
    expect(phaseOf('2026-09-28', w())).toBe('before')
  })

  it('calls opening night itself "regular", not "before"', () => {
    expect(phaseOf('2026-09-29', w())).toBe('regular')
  })

  it('stays "regular" through the season', () => {
    expect(phaseOf('2027-01-15', w())).toBe('regular')
    expect(phaseOf('2027-04-10', w())).toBe('regular')
  })

  it('calls the day after the last game "after"', () => {
    expect(phaseOf('2027-04-11', w())).toBe('after')
  })

  /* A failed fetch must never read as "the season has not started" — that would hide a live
     board on a night games are being played, which is worse than the bug this fixes. */
  it('is unknown when the window is missing, never "before"', () => {
    expect(phaseOf('2026-09-28', null)).toBe('unknown')
    expect(phaseOf('2026-09-28', w({ regularSeasonStart: null }))).toBe('unknown')
  })
})

describe('daysBetween', () => {
  it('counts whole days forward', () => {
    expect(daysBetween('2026-09-28', '2026-09-29')).toBe(1)
    expect(daysBetween('2026-09-28', '2026-10-08')).toBe(10)
  })

  it('is zero on the same day and negative backwards', () => {
    expect(daysBetween('2026-09-28', '2026-09-28')).toBe(0)
    expect(daysBetween('2026-09-29', '2026-09-28')).toBe(-1)
  })

  /* Parsed as local midnight, so a date does not slip when the clock crosses a DST boundary. */
  it('survives a DST boundary', () => {
    expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1)
    expect(daysBetween('2027-03-14', '2027-03-15')).toBe(1)
  })
})

describe('localYmd', () => {
  /* toISOString() is UTC: for anyone west of Greenwich it rolls the date forward all evening,
     so the board would ask for tomorrow's slate from dinnertime onwards. */
  it('uses local calendar date, not UTC', () => {
    expect(localYmd(new Date(2026, 8, 28, 23, 30))).toBe('2026-09-28')
    expect(localYmd(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})

/*
 * Baseball's calendar is the mirror image of hockey's: on 29 September 2026 the NHL season is
 * a day old and the MLB regular season is two days dead. The same page was telling both sets
 * of managers that the board would light up when games resumed.
 */
describe('phaseOf across the two daily sports on the same day', () => {
  const NHL = { preSeasonStart: '2026-09-19', regularSeasonStart: '2026-09-29',
                regularSeasonEnd: '2027-04-10', days: [] } as any
  const MLB = { preSeasonStart: '2026-01-01', regularSeasonStart: '2026-03-25',
                regularSeasonEnd: '2026-09-27', days: [] } as any

  it('has hockey live and baseball finished on 2026-09-29', () => {
    expect(phaseOf('2026-09-29', NHL)).toBe('regular')
    expect(phaseOf('2026-09-29', MLB)).toBe('after')
  })

  it('had both of them out of season a week earlier', () => {
    expect(phaseOf('2026-09-22', NHL)).toBe('before')
    expect(phaseOf('2026-09-22', MLB)).toBe('regular')
  })

  it('treats the final day of the regular season as still in it', () => {
    expect(phaseOf('2026-09-27', MLB)).toBe('regular')
    expect(phaseOf('2026-09-28', MLB)).toBe('after')
  })
})
