import { describe, it, expect } from 'vitest'
import { sumWeekProjections, type WeekProjections } from '../footballProjections'

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
