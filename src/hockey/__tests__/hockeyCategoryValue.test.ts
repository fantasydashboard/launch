import { describe, it, expect } from 'vitest'
import {
  categoriesFromScoringItems, buildHockeyCategoryValue, rawContribution, RATE_VOLUME,
  type HockeyCategory,
} from '../hockeyCategoryValue'
import type { HockeyProjection } from '../hockeyValue'

const cat = (key: string, statId: number, reverse = false): HockeyCategory => ({ key, statId, reverse })

describe('reading a category league\'s columns', () => {
  /*
   * A CATEGORY LEAGUE'S scoringItems MEAN SOMETHING DIFFERENT. In a points league the list is
   * every stat the league COULD score with most sitting at zero, so a zero filter is right
   * there. Apply that filter here and you get no categories at all, because a category league
   * assigns no points to anything — which is exactly why the board used to refuse to build.
   */
  it('takes every listed stat as a category, points or no points', () => {
    const { categories } = categoriesFromScoringItems([
      { statId: 13 }, { statId: 14 }, { statId: 29 }, { statId: 31 },
    ])
    expect(categories.map((c) => c.key)).toEqual(['G', 'A', 'SOG', 'HITS'])
  })

  it('reports a category it cannot name rather than dropping it quietly', () => {
    const { categories, unnamed } = categoriesFromScoringItems([{ statId: 13 }, { statId: 997 }])
    expect(categories.map((c) => c.key)).toEqual(['G'])
    expect(unnamed).toEqual([997])
  })

  /*
   * DIRECTION COMES FROM THE LEAGUE WHEN THE LEAGUE SAYS. Penalty minutes are a column most
   * leagues win by having MORE of and some by having fewer, and no property of the stat
   * settles it — only the league's own flag does.
   */
  it('believes the league\'s own reverse flags over the built-in list', () => {
    const { categories } = categoriesFromScoringItems([
      { statId: 13, isReverseItem: false },
      { statId: 17, isReverseItem: true },    // PIM, scored as lower-is-better here
    ])
    expect(categories.find((c) => c.key === 'PIM')!.reverse).toBe(true)
    expect(categories.find((c) => c.key === 'G')!.reverse).toBe(false)
  })

  it('falls back to the built-in list when no item carries a flag', () => {
    const { categories } = categoriesFromScoringItems([{ statId: 13 }, { statId: 10 }])
    expect(categories.find((c) => c.key === 'GAA')!.reverse).toBe(true)
    expect(categories.find((c) => c.key === 'G')!.reverse).toBe(false)
  })

  it('does not list the same category twice', () => {
    const { categories } = categoriesFromScoringItems([{ statId: 13 }, { statId: 13 }])
    expect(categories).toHaveLength(1)
  })
})

describe('rate categories', () => {
  const p = (stats: Record<string, number>): HockeyProjection =>
    ({ playerKey: 'x', position: 'G', stats })

  it('leaves a counting stat alone', () => {
    expect(rawContribution(p({ G: 40 }), 'G', 0)).toBe(40)
  })

  /*
   * A .930 OVER TWELVE STARTS IS NOT A .930 OVER SIXTY. Taken at face value the rate hands
   * the column to whoever has the smallest sample; converted to impact, it is worth what it
   * actually moves a season-long team rate by.
   */
  it('weights a rate by the volume it was earned over', () => {
    const league = 0.900
    const workhorse = rawContribution(p({ SVPCT: 0.930, SA: 1800 }), 'SVPCT', league)
    const cameo = rawContribution(p({ SVPCT: 0.930, SA: 300 }), 'SVPCT', league)
    expect(workhorse).toBeCloseTo(0.03 * 1800, 6)
    expect(cameo).toBeCloseTo(0.03 * 300, 6)
    expect(workhorse!).toBeGreaterThan(cameo!)
  })

  it('turns a below-average rate into a negative contribution', () => {
    expect(rawContribution(p({ SVPCT: 0.880, SA: 1000 }), 'SVPCT', 0.900)!).toBeLessThan(0)
  })

  /* Absent is not zero. A skater has no save percentage, and entering him at the bottom of
     the column would be a claim about him that the data never made. */
  it('returns nothing for a player who has no such stat', () => {
    expect(rawContribution(p({ G: 10 }), 'SVPCT', 0.9)).toBeUndefined()
  })

  it('returns nothing when the volume behind a rate is missing or zero', () => {
    expect(rawContribution(p({ SVPCT: 0.93 }), 'SVPCT', 0.9)).toBeUndefined()
    expect(rawContribution(p({ SVPCT: 0.93, SA: 0 }), 'SVPCT', 0.9)).toBeUndefined()
  })

  it('knows which volume belongs to which rate', () => {
    expect(RATE_VOLUME.SVPCT).toBe('SA')
    expect(RATE_VOLUME.GAA).toBe('TOI')
  })
})

/* Twelve forwards with a spread in goals and shots, so the standardisation has something to
   work with and the answers can be reasoned about by hand. */
function skaters(n = 12): Record<string, HockeyProjection> {
  const out: Record<string, HockeyProjection> = {}
  for (let i = 0; i < n; i++) {
    out[`s${i}`] = {
      playerKey: `s${i}`, position: 'C',
      stats: { G: 40 - i * 2, A: 50 - i * 2, SOG: 300 - i * 10, HITS: 50 + i * 10, GP: 82 },
    }
  }
  return out
}

describe('scoring a category league', () => {
  const CATS = [cat('G', 13), cat('A', 14), cat('SOG', 29)]

  it('ranks the best player first and the worst last', () => {
    const { totalByKey } = buildHockeyCategoryValue({ projections: skaters(), categories: CATS })
    const order = Object.entries(totalByKey).sort((a, b) => b[1] - a[1]).map(([k]) => k)
    expect(order[0]).toBe('s0')
    expect(order[order.length - 1]).toBe('s11')
  })

  /* A z-score is a distance from the mean, so the pool has to average out to nothing. This is
     the property that makes summed z-scores comparable across columns at all. */
  it('centres each column on the pool', () => {
    const { totalByKey } = buildHockeyCategoryValue({ projections: skaters(), categories: CATS })
    const sum = Object.values(totalByKey).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(0, 6)
  })

  /*
   * THE WHOLE POINT OF A CATEGORY LEAGUE, IN ONE TEST. A column everybody is level in decides
   * nothing, no matter how big its numbers are. The points-league instinct — more goals is
   * more value — is the wrong instinct here.
   */
  it('gives a column nobody separates in no weight at all', () => {
    const flat: Record<string, HockeyProjection> = {}
    for (let i = 0; i < 6; i++) {
      flat[`p${i}`] = { playerKey: `p${i}`, position: 'C', stats: { G: 30, A: 50 - i * 5 } }
    }
    const withFlat = buildHockeyCategoryValue({ projections: flat, categories: [cat('G', 13), cat('A', 14)] })
    const without = buildHockeyCategoryValue({ projections: flat, categories: [cat('A', 14)] })
    expect(withFlat.totalByKey.p0).toBeCloseTo(without.totalByKey.p0, 6)
  })

  it('counts a reverse category backwards', () => {
    const pool: Record<string, HockeyProjection> = {}
    for (let i = 0; i < 6; i++) {
      pool[`p${i}`] = { playerKey: `p${i}`, position: 'C', stats: { PIM: 10 + i * 10 } }
    }
    const up = buildHockeyCategoryValue({ projections: pool, categories: [cat('PIM', 17, false)] })
    const down = buildHockeyCategoryValue({ projections: pool, categories: [cat('PIM', 17, true)] })
    expect(up.totalByKey.p0).toBeCloseTo(-down.totalByKey.p0, 6)
    expect(up.totalByKey.p5).toBeGreaterThan(0)
    expect(down.totalByKey.p5).toBeLessThan(0)
  })

  it('reports how many players each column was measured over', () => {
    const r = buildHockeyCategoryValue({ projections: skaters(), categories: CATS })
    expect(r.poolSizeByCategory.G).toBe(12)
  })

  it('shows the per-column breakdown, not just the total', () => {
    const r = buildHockeyCategoryValue({ projections: skaters(), categories: CATS })
    expect(Object.keys(r.perCategoryByKey.s0).sort()).toEqual(['A', 'G', 'SOG'])
    const summed = Object.values(r.perCategoryByKey.s0).reduce((a, b) => a + b, 0)
    expect(summed).toBeCloseTo(r.totalByKey.s0, 6)
  })

  it('returns nothing rather than guessing when there are no categories', () => {
    expect(buildHockeyCategoryValue({ projections: skaters(), categories: [] }).totalByKey).toEqual({})
  })
})

describe('goalies and skaters are separate universes', () => {
  /*
   * A goalie has no shots on goal and a skater has no saves. If a category were standardised
   * over everybody, every goalie would take a large negative in every skater column and sink
   * below the worst skater alive — a bug that would look like "our model does not rate
   * goalies" rather than like a bug.
   */
  const mixed = (): Record<string, HockeyProjection> => {
    const out = skaters(10)
    for (let i = 0; i < 6; i++) {
      out[`g${i}`] = {
        playerKey: `g${i}`, position: 'G',
        stats: { W: 35 - i * 3, SV: 1600 - i * 100, GA: 140 + i * 10, SA: 1740 - i * 90, DEC: 60 - i * 4 },
      }
    }
    return out
  }
  const CATS = [cat('G', 13), cat('SOG', 29), cat('W', 1), cat('SV', 6), cat('GA', 4, true)]

  it('does not punish a goalie for having no goals', () => {
    const r = buildHockeyCategoryValue({ projections: mixed(), categories: CATS })
    expect(r.perCategoryByKey.g0.G).toBeUndefined()
    expect(r.perCategoryByKey.g0.W).toBeDefined()
    expect(r.totalByKey.g0).toBeGreaterThan(0)
  })

  it('measures each column only over the players who have that stat', () => {
    const r = buildHockeyCategoryValue({ projections: mixed(), categories: CATS })
    expect(r.poolSizeByCategory.G).toBe(10)    // skaters only
    expect(r.poolSizeByCategory.W).toBe(6)     // goalies only
  })

  it('has the best goalie outrank the worst skater', () => {
    const r = buildHockeyCategoryValue({ projections: mixed(), categories: CATS })
    expect(r.totalByKey.g0).toBeGreaterThan(r.totalByKey.s9)
  })
})

describe('choosing the pool to standardise against', () => {
  /*
   * Standardising against all 456 projected players puts the mean at a fourth-liner and makes
   * every startable player look good. The pool has to be the players who actually get drafted
   * — which is circular, so it is two passes: rank against everybody, keep the top, rank again
   * against those.
   */
  const deep = (): Record<string, HockeyProjection> => {
    const out: Record<string, HockeyProjection> = {}
    for (let i = 0; i < 100; i++) {
      out[`s${i}`] = { playerKey: `s${i}`, position: 'C', stats: { G: 50 - i * 0.5, SOG: 300 - i * 2 } }
    }
    return out
  }
  const CATS = [cat('G', 13), cat('SOG', 29)]

  it('moves the yardstick when the pool is trimmed', () => {
    const all = buildHockeyCategoryValue({ projections: deep(), categories: CATS })
    const drafted = buildHockeyCategoryValue({ projections: deep(), categories: CATS, draftablePlayers: 20 })
    // The same player measured against a stronger field is worth less above it.
    expect(drafted.totalByKey.s0).toBeLessThan(all.totalByKey.s0)
    expect(drafted.poolSizeByCategory.G).toBe(20)
  })

  /*
   * EVERYBODY STILL GETS A NUMBER. Scoring only the pool would delete every undrafted player
   * from the board, and a draft board that stops at the last draftable player fails exactly
   * where it is needed most: late, when the next name is by definition one nobody projected
   * as draftable.
   */
  it('still scores the players outside the pool', () => {
    const r = buildHockeyCategoryValue({ projections: deep(), categories: CATS, draftablePlayers: 20 })
    expect(Object.keys(r.totalByKey)).toHaveLength(100)
    expect(r.totalByKey.s99).toBeLessThan(0)
  })

  it('ignores a pool size that is larger than the field', () => {
    const r = buildHockeyCategoryValue({ projections: deep(), categories: CATS, draftablePlayers: 500 })
    expect(r.poolSizeByCategory.G).toBe(100)
  })

  /*
   * The trim is taken per position group, not off one combined list. Goalies sum fewer columns
   * than skaters and their totals sit lower as a matter of arithmetic, so a global cut would
   * drop nearly all of them and then measure the survivors against the four best alive.
   */
  it('keeps goalies in the pool even though their totals run lower', () => {
    const pool: Record<string, HockeyProjection> = {}
    for (let i = 0; i < 80; i++) {
      pool[`s${i}`] = { playerKey: `s${i}`, position: 'C', stats: { G: 50 - i * 0.5, A: 60 - i * 0.5, SOG: 300 - i * 2 } }
    }
    for (let i = 0; i < 20; i++) {
      pool[`g${i}`] = { playerKey: `g${i}`, position: 'G', stats: { W: 35 - i, SV: 1600 - i * 40 } }
    }
    const cats = [cat('G', 13), cat('A', 14), cat('SOG', 29), cat('W', 1), cat('SV', 6)]
    const r = buildHockeyCategoryValue({ projections: pool, categories: cats, draftablePlayers: 50 })
    // 20 of 100 players are goalies, so about 10 of 50 pool seats should be theirs.
    expect(r.poolSizeByCategory.W).toBeGreaterThanOrEqual(8)
    expect(r.poolSizeByCategory.W).toBeLessThanOrEqual(12)
  })
})
