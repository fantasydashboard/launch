import { describe, it, expect } from 'vitest'
import { leagueTdRates, scoreStats, rescoreObserved } from '@/football/observedPoints'
import type { SeasonLine } from '@/services/playerUsage'
import {
  priorGamesFor, forwardWeightFor, PRIOR_GAMES, FORWARD_WEIGHT,
} from '@/football/rosBlend'

const FULL_PPR: Record<string, number> = {
  pass_yd: 0.04, pass_td: 4, pass_int: -1,
  rush_yd: 0.1, rush_td: 6,
  rec: 1, rec_yd: 0.1, rec_td: 6,
  fum_lost: -2,
}

const line = (over: Partial<SeasonLine> & { stats?: Record<string, number> }): SeasonLine => ({
  playerKey: 'p', team: 'KC', opponent: 'BUF', position: 'QB', points: 0, week: 1, ...over,
})

describe('scoreStats', () => {
  it('prices only what the league prices', () => {
    // rec_yd is priced, rec is not — a non-PPR league must not be handed a reception point.
    expect(scoreStats({ rec: 8, rec_yd: 100 }, { rec_yd: 0.1 })).toBeCloseTo(10)
  })

  it('ignores stats the weights do not mention, and weights the stats do not have', () => {
    expect(scoreStats({ pass_yd: 300, blocked_kicks: 9 }, FULL_PPR)).toBeCloseTo(12)
  })

  it('carries negatives', () => {
    expect(scoreStats({ pass_yd: 250, pass_int: 2, fum_lost: 1 }, FULL_PPR)).toBeCloseTo(10 - 2 - 2)
  })
})

describe('the currency bug this module exists to fix', () => {
  it('re-scores a full-PPR reception at a full point, not the half the feed supplied', () => {
    // linesFromStats fills `points` from pts_half_ppr: 8 catches, 100 yards = 4 + 10 = 14.
    const l = line({ position: 'WR', points: 14, stats: { rec: 8, rec_yd: 100 } })
    const [out] = rescoreObserved([l], FULL_PPR, { regressTds: false })
    expect(out.points).toBeCloseTo(18)   // 8 receptions at a full point, not a half
  })

  it('leaves a quarterback unchanged, which is why the bug hid at that position', () => {
    const stats = { pass_yd: 300, pass_td: 2 }
    const l = line({ points: scoreStats(stats, FULL_PPR), stats })
    const [out] = rescoreObserved([l], FULL_PPR, { regressTds: false })
    expect(out.points).toBeCloseTo(l.points)
  })
})

describe('leagueTdRates', () => {
  it('measures the rate off the sample', () => {
    const lines = [
      line({ stats: { pass_yd: 600, pass_td: 4 } }),
      line({ stats: { pass_yd: 400, pass_td: 4 } }),
    ]
    expect(leagueTdRates(lines).QB.pass).toBeCloseTo(8 / 1000)
  })

  it('refuses a rate the sample cannot support', () => {
    // 100 yards and a score is not evidence that a score happens every 100 yards.
    const rates = leagueTdRates([line({ stats: { pass_yd: 100, pass_td: 1 } })])
    expect(rates.QB.pass).toBe(0)
  })

  it('keeps positions apart', () => {
    const lines = [
      line({ position: 'WR', stats: { rec_yd: 1000, rec_td: 8 } }),
      line({ position: 'TE', stats: { rec_yd: 1000, rec_td: 4 } }),
    ]
    const r = leagueTdRates(lines)
    expect(r.WR.rec).toBeCloseTo(0.008)
    expect(r.TE.rec).toBeCloseTo(0.004)
  })
})

describe('touchdown regression', () => {
  const pool = [
    line({ playerKey: 'a', stats: { pass_yd: 5000, pass_td: 35 } }),   // rate: 1 per ~143 yds
    line({ playerKey: 'b', stats: { pass_yd: 5000, pass_td: 35 } }),
  ]

  it('marks down a player whose scores outran his yardage', () => {
    // Mahomes, week 3 2026: five passing scores on 566 yards, against a rate of one per ~143.
    const hot = line({ playerKey: 'hot', stats: { pass_yd: 566, pass_td: 5 } })
    const raw = scoreStats({ pass_yd: 566, pass_td: 5 }, FULL_PPR)
    const got = rescoreObserved([...pool, hot], FULL_PPR).find((l) => l.playerKey === 'hot')!
    expect(got.points).toBeLessThan(raw)
  })

  it('marks UP a player whose yardage outran his scores', () => {
    // The case that proves it is not just a haircut on everybody: Drake Maye, week 3 2026.
    const cold = line({ playerKey: 'cold', stats: { pass_yd: 600, pass_td: 1 } })
    const raw = scoreStats({ pass_yd: 600, pass_td: 1 }, FULL_PPR)
    const got = rescoreObserved([...pool, cold], FULL_PPR).find((l) => l.playerKey === 'cold')!
    expect(got.points).toBeGreaterThan(raw)
  })

  it('leaves a component alone when the player has no yardage to imply from', () => {
    // A quarterback with a one-yard plunge keeps it; the rushing rate is not evidence about him.
    const qb = line({ playerKey: 'q', stats: { pass_yd: 300, pass_td: 2, rush_td: 1, rush_yd: 0 } })
    const got = rescoreObserved([...pool, qb], FULL_PPR).find((l) => l.playerKey === 'q')!
    const keptRushTd = got.points - scoreStats({ pass_yd: 300, pass_td: 300 * (70 / 10000) }, FULL_PPR)
    expect(keptRushTd).toBeCloseTo(6, 1)
  })

  it('can be turned off', () => {
    const hot = line({ playerKey: 'hot', stats: { pass_yd: 566, pass_td: 5 } })
    const got = rescoreObserved([...pool, hot], FULL_PPR, { regressTds: false })
      .find((l) => l.playerKey === 'hot')!
    expect(got.points).toBeCloseTo(scoreStats({ pass_yd: 566, pass_td: 5 }, FULL_PPR))
  })
})

describe('lines that cannot be scored', () => {
  it('passes a line with no stats through untouched rather than zeroing it', () => {
    // An older cached line, or a feed that changed shape. A zero here reads as a player who
    // stopped producing, which is a lie the blend would act on.
    const stale = line({ playerKey: 'stale', points: 21.4, stats: undefined })
    const [out] = rescoreObserved([stale], FULL_PPR)
    expect(out.points).toBe(21.4)
  })
})

describe('per-position constants', () => {
  // These are not style choices. Each was swept on 2025 against rest-of-season actual, jointly
  // with the other, and the sweep is recorded in rosBlend.ts. A change here without a new sweep
  // is a regression, so the values are pinned.
  it('holds the swept prior for each position', () => {
    expect(priorGamesFor('QB')).toBe(12)
    expect(priorGamesFor('RB')).toBe(3)
    expect(priorGamesFor('WR')).toBe(12)
    expect(priorGamesFor('TE')).toBe(12)
  })

  it('holds the swept forward weight, including zero at quarterback', () => {
    // Zero is a real setting, not a missing one: the forward term is monotonically harmful at
    // QB now that touchdown regression removes the noise it used to smooth.
    expect(forwardWeightFor('QB')).toBe(0)
    expect(forwardWeightFor('RB')).toBe(0.25)
    expect(forwardWeightFor('WR')).toBe(0.25)
    expect(forwardWeightFor('TE')).toBe(0.25)
  })

  it('gives a back the lightest prior and a tight end the heaviest', () => {
    // The whole principle in one assertion: twenty touches a week stabilise faster than four
    // targets, so the position with the thinnest sample leans hardest on the forecast.
    expect(priorGamesFor('RB')).toBeLessThan(priorGamesFor('WR'))
    // WR was raised to TE's level on purpose (2026-09-30): at receiver the prior is a
    // deliberate lean toward the forecast, not the sweep's best cell. Never ABOVE a tight end.
    expect(priorGamesFor('WR')).toBeLessThanOrEqual(priorGamesFor('TE'))
  })

  it('falls back for anything it does not recognise', () => {
    expect(priorGamesFor('K')).toBe(PRIOR_GAMES)
    expect(priorGamesFor(undefined)).toBe(PRIOR_GAMES)
    expect(forwardWeightFor('DEF')).toBe(FORWARD_WEIGHT)
  })
})
