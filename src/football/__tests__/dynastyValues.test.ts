import { describe, it, expect } from 'vitest'
import {
  buildDynastyRows,
  leanOf,
  dynastyTotal,
  dynastyCoverage,
  scoreDynastyTrade,
  type DynastySource,
} from '../dynastyValues'
import { normalizeFantasyCalc } from '@/services/dynastyService'

const src = (sleeperId: string, value: number, redraftValue: number, extra: Partial<DynastySource> = {}): DynastySource => ({
  sleeperId, name: 'P' + sleeperId, position: 'RB', age: 25,
  value, redraftValue, overallRank: 1, positionRank: 1, ...extra,
})

describe('leanOf', () => {
  /* Real shapes from the live feed: a 30-year-old back worth far more this year than next,
     and a 22-year-old receiver worth far more later than now. */
  it('calls the ageing star a win-now asset', () => {
    const { lean } = leanOf(5146, 8872) // Christian McCaffrey, 30.3
    expect(lean).toBe('win-now')
  })

  it('calls the young unproven receiver a future asset', () => {
    const { lean } = leanOf(3328, 506) // Jordyn Tyson, 22.1
    expect(lean).toBe('future')
  })

  it('says nothing when the two horizons roughly agree', () => {
    expect(leanOf(1000, 1000).lean).toBe('level')
    expect(leanOf(1000, 900).lean).toBe('level')
  })

  it('is scale-free, so a flier and a stud are judged the same way', () => {
    // Same 50% skew at wildly different magnitudes.
    expect(leanOf(1000, 500).skew).toBeCloseTo(leanOf(10000, 5000).skew, 6)
  })

  it('never divides by zero', () => {
    expect(leanOf(0, 0)).toEqual({ lean: 'level', skew: 0 })
  })
})

describe('buildDynastyRows', () => {
  it('keys on the Sleeper id, which is our own playerKey', () => {
    const rows = buildDynastyRows([src('4034', 8000, 9000)])
    expect(rows['4034'].value).toBe(8000)
    expect(rows['4034'].lean).toBe('level')
  })

  /* The rule the whole feature depends on. An unpriced player must be ABSENT, because a zero
     sorts a real player to the bottom of the board and reads as a verdict we never made. */
  it('omits players the market has not priced — never zeroes them', () => {
    const rows = buildDynastyRows([
      src('1', 5000, 4000),
      { ...src('2', NaN as unknown as number, 100) },
      { ...src('', 900, 900) },
    ])
    expect(Object.keys(rows)).toEqual(['1'])
    expect(rows['2']).toBeUndefined()
  })
})

describe('coverage and totals', () => {
  const rows = buildDynastyRows([src('a', 5000, 4000), src('b', 3000, 3000)])

  it('reports how much of a side it could actually price', () => {
    expect(dynastyCoverage(['a', 'b'], rows)).toEqual({ priced: 2, total: 2, complete: true })
    expect(dynastyCoverage(['a', 'zzz'], rows)).toEqual({ priced: 1, total: 2, complete: false })
  })

  it('totals only what it knows', () => {
    expect(dynastyTotal(['a', 'b'], rows)).toBe(8000)
    expect(dynastyTotal(['a', 'zzz'], rows)).toBe(5000)
  })
})

describe('scoreDynastyTrade', () => {
  const rows = buildDynastyRows([
    src('old', 5146, 8872), // ageing star
    src('young', 7161, 4940), // young riser
    src('mid', 5000, 5000),
  ])

  it('scores giving the ageing star for the young riser as a future move', () => {
    const s = scoreDynastyTrade(['old'], ['young'], rows)!
    expect(s.delta).toBe(7161 - 5146)
    expect(s.lean).toBe('future')
  })

  it('scores the reverse as win-now', () => {
    expect(scoreDynastyTrade(['young'], ['old'], rows)!.lean).toBe('win-now')
  })

  /* Refusing to answer is the feature. A total summed over a hole looks identical to a total
     summed over a full deal, and would quietly price a trade the market never saw. */
  it('refuses to score a deal containing an unpriced player', () => {
    expect(scoreDynastyTrade(['old'], ['nobody'], rows)).toBeNull()
    expect(scoreDynastyTrade(['nobody'], ['young'], rows)).toBeNull()
    expect(scoreDynastyTrade([], ['young'], rows)).toBeNull()
  })
})

describe('normalizeFantasyCalc', () => {
  it('reads the provider shape and drops rows it cannot key or value', () => {
    const out = normalizeFantasyCalc([
      { value: 11803, redraftValue: 10528, overallRank: 1, positionRank: 1,
        player: { name: 'Jahmyr Gibbs', position: 'RB', sleeperId: '9221', maybeAge: 24.2 } },
      { value: 500, player: { name: 'No Sleeper Id', position: 'WR' } },
      { player: { name: 'No Value', sleeperId: '77' } },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ sleeperId: '9221', position: 'RB', value: 11803, redraftValue: 10528, age: 24.2 })
  })

  it('survives a payload that is not an array', () => {
    expect(normalizeFantasyCalc(null)).toEqual([])
    expect(normalizeFantasyCalc({ error: 'nope' })).toEqual([])
  })

  it('defaults a missing redraft value to zero without dropping the row', () => {
    const out = normalizeFantasyCalc([{ value: 900, player: { sleeperId: '5', position: 'TE' } }])
    expect(out[0].redraftValue).toBe(0)
  })
})
