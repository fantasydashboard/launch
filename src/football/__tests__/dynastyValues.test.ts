import { describe, it, expect } from 'vitest'
import {
  buildDynastyRows,
  momentumOf,
  reseatByDynasty,
  mergeDynastyOrder,
  readHorizons,
  MOMENTUM_THRESHOLD,
  leanOf,
  dynastyTotal,
  dynastyCoverage,
  scoreDynastyTrade,
  type DynastySource,
} from '../dynastyValues'
import { normalizeFantasyCalc } from '@/services/dynastyService'

const src = (sleeperId: string, value: number, redraftValue: number, extra: Partial<DynastySource> = {}): DynastySource => ({
  sleeperId, name: 'P' + sleeperId, position: 'RB', age: 25,
  value, redraftValue, overallRank: 1, positionRank: 1, trend30: 0, ...extra,
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

/*
 * Telling a mispricing apart from a news event.
 *
 * Josh Jacobs, live, the day he went on the exempt list: dynasty value 2126 after a 30-day
 * fall of 842 — the biggest drop in the whole feed — while Sleeper still carried him Active
 * with an 18-game projection and a fourth-round ADP. Our own buy-low rule would have fired on
 * that gap and told someone to trade for a player who may never play again.
 */
describe('momentum', () => {
  it('flags the real collapse that motivated it', () => {
    expect(momentumOf(2126, -842)).toBe('falling') // -28%
  })

  it('leaves ordinary churn alone', () => {
    // The median player moves under 5% in a month; the 75th percentile is under 12%.
    expect(momentumOf(10000, -480)).toBe('steady')
    expect(momentumOf(10000, 1180)).toBe('steady')
  })

  it('is symmetric, and sits exactly on the stated threshold', () => {
    expect(momentumOf(1000, -250)).toBe('falling')
    expect(momentumOf(1000, 250)).toBe('rising')
    expect(MOMENTUM_THRESHOLD).toBe(0.25)
  })

  it('is scale-free, so a stud and a flier are judged the same way', () => {
    expect(momentumOf(12000, -4000)).toBe('falling')
    expect(momentumOf(600, -200)).toBe('falling')
  })

  it('says steady when it has nothing to go on', () => {
    expect(momentumOf(0, -500)).toBe('steady')
    expect(momentumOf(1000, 0)).toBe('steady')
    expect(momentumOf(1000, NaN)).toBe('steady')
  })

  it('carries onto the joined row', () => {
    const rows = buildDynastyRows([src('5850', 2126, 1708, { trend30: -842 })])
    expect(rows['5850'].momentum).toBe('falling')
    expect(rows['5850'].trend30).toBe(-842)
  })

  it('defaults a row with no trend to steady rather than dropping it', () => {
    const rows = buildDynastyRows([src('x', 5000, 4000)])
    expect(rows['x'].momentum).toBe('steady')
    expect(rows['x'].trend30).toBe(0)
  })
})

describe('reseatByDynasty', () => {
  const vor = { a: { vorRos: 100 }, b: { vorRos: 60 }, c: { vorRos: 20 } }
  // Market order is the reverse of ours: c is the best long-term asset, a the worst.
  const rows = buildDynastyRows([
    { ...src('a', 500, 500), overallRank: 3 },
    { ...src('b', 800, 500), overallRank: 2 },
    { ...src('c', 900, 500), overallRank: 1 },
  ])

  it('hands our own value curve out in the market order', () => {
    const out = reseatByDynasty(vor, rows)
    expect(out.c.vorRos).toBe(100)
    expect(out.b.vorRos).toBe(60)
    expect(out.a.vorRos).toBe(20)
  })

  it('keeps the curve intact — the same numbers, different owners', () => {
    const out = reseatByDynasty(vor, rows)
    expect(Object.values(out).map((v) => v.vorRos).sort((x, y) => y - x)).toEqual([100, 60, 20])
  })

  it('leaves unpriced players on their own value rather than inventing one', () => {
    const out = reseatByDynasty({ ...vor, z: { vorRos: 7 } }, rows)
    expect(out.z.vorRos).toBe(7)
  })

  it('is identity when there is no market to re-seat onto', () => {
    expect(reseatByDynasty(vor, {})).toBe(vor)
    expect(reseatByDynasty({}, rows)).toEqual({})
  })
})


/*
 * A list shorter than the league is the normal case. Measured on a real dynasty league: a
 * 200-row file covered 198 rostered players and left 126 — 39% of everyone rostered — with no
 * rank at all, showing "—" and sinking to the bottom of the sort.
 */
describe('mergeDynastyOrder', () => {
  const POS: Record<string, string> = { a: 'RB', b: 'RB', c: 'WR', d: 'WR', e: 'TE' }
  const posOf = (k: string) => POS[k] ?? ''
  const market = buildDynastyRows([
    { ...src('a', 900, 500), position: 'RB', overallRank: 1 },
    { ...src('b', 800, 500), position: 'RB', overallRank: 2 },
    { ...src('c', 700, 500), position: 'WR', overallRank: 3 },
    { ...src('d', 600, 500), position: 'WR', overallRank: 4 },
    { ...src('e', 500, 500), position: 'TE', overallRank: 5 },
  ])

  it('puts your list on top and fills the rest from the market', () => {
    // You ranked only c and a, in that order.
    const m = mergeDynastyOrder(market, { c: 1, a: 2 }, posOf)
    expect(m.rows.c.overallRank).toBe(1)
    expect(m.rows.a.overallRank).toBe(2)
    // b, d, e follow in the market's own order.
    expect([m.rows.b.overallRank, m.rows.d.overallRank, m.rows.e.overallRank]).toEqual([3, 4, 5])
    expect(m.matched).toBe(2)
    expect(m.filled).toBe(3)
    expect(m.boundary).toBe(3)
  })

  it('records which opinion put each player where', () => {
    const m = mergeDynastyOrder(market, { c: 1, a: 2 }, posOf)
    expect(m.rows.c.source).toBe('list')
    expect(m.rows.b.source).toBe('market')
  })

  it('keeps position ranks counting across the boundary', () => {
    const m = mergeDynastyOrder(market, { c: 1, a: 2 }, posOf)
    expect(m.rows.c.positionRank).toBe(1) // first WR seen
    expect(m.rows.a.positionRank).toBe(1) // first RB seen
    expect(m.rows.b.positionRank).toBe(2) // second RB, from the market band
    expect(m.rows.d.positionRank).toBe(2) // second WR
  })

  it('keeps the market values, so deal totals still refuse over an unpriced player', () => {
    const m = mergeDynastyOrder(market, { c: 1 }, posOf)
    expect(m.rows.c.value).toBe(700)
    // A listed player the market never priced gets a rank and no value.
    const m2 = mergeDynastyOrder(market, { ghost: 1, c: 2 }, (k) => (k === 'ghost' ? 'RB' : posOf(k)))
    expect(m2.rows.ghost.overallRank).toBe(1)
    expect(m2.rows.ghost.value).toBe(0)
    expect(scoreDynastyTrade(['c'], ['ghost'], m2.rows)).not.toBeNull() // priced, just worth 0
  })

  it('is the plain market when no list is active', () => {
    const m = mergeDynastyOrder(market, {}, posOf)
    expect(m.rows).toBe(market)
    expect(m.boundary).toBe(0)
    expect(m.matched).toBe(0)
  })

  /* A list of forty running backs is not a top-N board. Appending the market below it would
     bury every quarterback, receiver and tight end behind RB40. */
  it('refuses to append below a list that is not a top-N board', () => {
    const big: DynastySource[] = Array.from({ length: 60 }, (_, i) =>
      ({ ...src(`p${i}`, 1000 - i, 500), position: i % 2 ? 'WR' : 'RB', overallRank: i + 1 }))
    const wide = buildDynastyRows(big)
    // Only ranks players from deep in the market — misses most of the top 50.
    const sparse = Object.fromEntries(big.slice(50).map((x, i) => [x.sleeperId, i + 1]))
    const m = mergeDynastyOrder(wide, sparse, () => 'RB')
    expect(m.suspectPartial).toBe(true)
    expect(m.filled).toBe(0)
  })

  it('does not cry wolf on a genuine top-N list', () => {
    const big: DynastySource[] = Array.from({ length: 60 }, (_, i) =>
      ({ ...src(`p${i}`, 1000 - i, 500), position: 'RB', overallRank: i + 1 }))
    const wide = buildDynastyRows(big)
    const topN = Object.fromEntries(big.slice(0, 55).map((x, i) => [x.sleeperId, i + 1]))
    const m = mergeDynastyOrder(wide, topN, () => 'RB')
    expect(m.suspectPartial).toBe(false)
    expect(m.filled).toBe(5)
  })
})


/*
 * The badge used to fire on the raw gap, which correlates with age at r = -0.67 on the live
 * market — under 24 it flagged 36 players one way against 1 the other. It was printing "young"
 * and "old" beside a column that already prints age.
 */
describe('readHorizons', () => {
  /** A cohort where the gap is exactly what age predicts: the young all skew future. */
  const cohort = (n: number, age: number, gap: number, tag: string) =>
    Array.from({ length: n }, (_, i) => ({
      playerKey: `${tag}${i}`, age, seasonRank: 50 + i, dynastyRank: 50 + i - gap,
    }))

  it('says nothing about a player whose gap is exactly typical for his age', () => {
    const players = [...cohort(8, 22, 20, 'y'), ...cohort(8, 31, -20, 'o')]
    const r = readHorizons(players)
    // Every one of them has a large raw gap; none of it is news.
    expect(r['y0'].gap).toBe(20)
    expect(r['y0'].lean).toBe('')
    expect(r['o0'].gap).toBe(-20)
    expect(r['o0'].lean).toBe('')
  })

  it('flags the player his own age band does not explain', () => {
    const players = [
      ...cohort(8, 22, 20, 'y'),
      ...cohort(8, 31, -20, 'o'),
      // A 22-year-old the market rates level while every other 22-year-old is +20.
      { playerKey: 'dart', age: 22, seasonRank: 74, dynastyRank: 72 },
    ]
    const r = readHorizons(players)
    expect(r['dart'].expected).toBe(20)
    expect(r['dart'].residual).toBeLessThan(0)
    expect(r['dart'].lean).toBe('win-now')
  })

  it('flags an old player the market still likes for the future', () => {
    const players = [
      ...cohort(8, 31, -20, 'o'),
      { playerKey: 'love', age: 31, seasonRank: 128, dynastyRank: 85 },
    ]
    expect(readHorizons(players)['love'].lean).toBe('future')
  })

  it('flags nobody on a board where everyone agrees', () => {
    const players = cohort(12, 25, 5, 'a')
    const r = readHorizons(players)
    expect(Object.values(r).every((x) => x.lean === '')).toBe(true)
  })

  it('falls back to the board median when an age band is too thin to trust', () => {
    const players = [...cohort(10, 25, 5, 'a'), { playerKey: 'lone', age: 40, seasonRank: 10, dynastyRank: 5 }]
    // One 40-year-old cannot supply his own baseline, so the board's stands in.
    expect(readHorizons(players)['lone'].expected).toBe(5)
  })

  it('ignores players missing either rank rather than guessing one', () => {
    const players = [...cohort(6, 24, 10, 'a'), { playerKey: 'x', age: 24, seasonRank: 0, dynastyRank: 12 }]
    expect(readHorizons(players)['x']).toBeUndefined()
  })

  it('returns nothing at all on a board too small to have a baseline', () => {
    expect(readHorizons([{ playerKey: 'a', age: 25, seasonRank: 1, dynastyRank: 2 }])).toEqual({})
  })
})
