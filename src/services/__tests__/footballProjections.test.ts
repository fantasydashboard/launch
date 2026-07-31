import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  sumWeekProjections,
  fetchSeasonProjectionStats,
  fetchWeekProjectionStats,
  type WeekProjections,
} from '../footballProjections'
import { sleeperService } from '../sleeper'

describe('sumWeekProjections', () => {
  const keys = ['pass_yd', 'pass_td', 'rush_yd', 'rec']

  it('sums a stat across weeks per player', () => {
    const weeks: WeekProjections[] = [
      { '1': { pass_yd: 250, pass_td: 2 } },
      { '1': { pass_yd: 300, pass_td: 1 } },
    ]
    const out = sumWeekProjections(weeks, keys)
    expect(out['1'].pass_yd).toBe(550)
    expect(out['1'].pass_td).toBe(3)
  })

  it('skips a missing/empty week without error', () => {
    const weeks: WeekProjections[] = [{ '1': { rush_yd: 80 } }, {}, { '1': { rush_yd: 20 } }]
    expect(sumWeekProjections(weeks, keys)['1'].rush_yd).toBe(100)
  })

  it('keeps only the allowlisted stat keys and ignores non-numeric values', () => {
    const weeks: WeekProjections[] = [{ '1': { pass_yd: 250, gp: 1, foo: 'x' as unknown as number } }]
    const out = sumWeekProjections(weeks, keys)
    expect(out['1'].pass_yd).toBe(250)
    expect(out['1'].gp).toBeUndefined()
    expect(out['1'].foo).toBeUndefined()
  })

  it('never produces NaN from a NaN/Infinity value', () => {
    const weeks: WeekProjections[] = [{ '1': { rec: NaN } }, { '1': { rec: 5 } }]
    expect(sumWeekProjections(weeks, keys)['1'].rec).toBe(5)
  })

  it('empty input → empty map', () => {
    expect(sumWeekProjections([], keys)).toEqual({})
  })
})

describe('fetchSeasonProjectionStats', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses the SEASON endpoint (no summing) and filters to statKeys', async () => {
    const spy = vi.spyOn(sleeperService, 'getSeasonProjections').mockResolvedValue({
      '100': { rec: 80, rec_yd: 1189, pass_yd: 4008, junk: 5 },
    })
    const out = await fetchSeasonProjectionStats('2026')
    expect(spy).toHaveBeenCalledWith('football', '2026')
    expect(out['100'].rec).toBe(80)
    expect(out['100'].rec_yd).toBe(1189)
    expect(out['100'].pass_yd).toBe(4008)
    expect(out['100'].junk).toBeUndefined()
  })
})

describe('fetchWeekProjectionStats', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('filters to scoring keys and drops non-finite values', async () => {
    vi.spyOn(sleeperService, 'getWeekProjections').mockResolvedValue({
      p1: { rush_yd: 80, rush_td: 1, foo_bar: 999, rec: NaN },
    })
    const out = await fetchWeekProjectionStats('2026', 5)
    expect(out.p1.rush_yd).toBe(80)
    expect(out.p1.rush_td).toBe(1)
    expect(out.p1.foo_bar).toBeUndefined() // not a scoring key
    expect(out.p1.rec).toBeUndefined()     // NaN dropped
  })
})
