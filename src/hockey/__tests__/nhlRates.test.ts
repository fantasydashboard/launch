import { describe, it, expect } from 'vitest'
import { rateSkaters, SHRINK_GAMES, type SkaterRow, type IceRow } from '../nhlRates'

const skater = (over: Partial<SkaterRow> = {}): SkaterRow => ({
  playerId: 1, skaterFullName: 'A Player', positionCode: 'C', teamAbbrevs: 'EDM',
  gamesPlayed: 20, goals: 10, assists: 20, points: 30, plusMinus: 5,
  penaltyMinutes: 10, ppPoints: 8, shots: 60, ...over,
})

describe('rateSkaters', () => {
  /*
   * Season totals become per-game rates — but SHRUNK, always, and this test says so rather
   * than pretending otherwise.
   *
   * An earlier version asserted the raw rate (10 goals in 20 games = 0.5) and passed only
   * because the fallback baseline had been reverse-engineered to 0.5 as well, which made the
   * shrinkage arithmetically invisible. Two wrongs agreeing is not a passing test. With the
   * measured baseline (forwards score 0.214/game) the honest answer at 20 games is
   * (10 + 0.214*10) / (20 + 10) = 0.405 — two thirds of the way from the league to him.
   */
  it('turns season totals into per-game rates, shrunk toward the league', () => {
    const [r] = rateSkaters([skater({ gamesPlayed: 20, goals: 10, assists: 20 })])
    expect(r.perGame.goals).toBeCloseTo(0.405, 2)
    // Between the baseline and his own record, never outside them.
    expect(r.perGame.goals).toBeGreaterThan(0.214)
    expect(r.perGame.goals).toBeLessThan(0.5)
  })

  /* The direction that matters: more evidence moves a player toward his own record, and the
     same raw rate is believed more at 80 games than at 20. */
  it('moves toward the raw rate as games accumulate', () => {
    const at20 = rateSkaters([skater({ gamesPlayed: 20, goals: 10 })])[0].perGame.goals
    const at80 = rateSkaters([skater({ gamesPlayed: 80, goals: 40 })])[0].perGame.goals
    expect(at80).toBeGreaterThan(at20)
    expect(at80).toBeLessThan(0.5)
  })

  /*
   * The lesson football already taught. rosBlend exists because a board built on a frozen
   * number cannot learn — and the mirror of that is that a board built on a two-game sample
   * learns far too fast. A winger who scored twice on opening night is not a 1.0 goals-per-game
   * player, and a page that says so will be wrong in the most visible way available.
   */
  it('shrinks a tiny sample toward the baseline instead of believing it', () => {
    const hot = rateSkaters([skater({ playerId: 1, gamesPlayed: 2, goals: 2, assists: 0, points: 2 })])[0]
    const settled = rateSkaters([skater({ playerId: 1, gamesPlayed: 40, goals: 40, assists: 0, points: 40 })])[0]
    expect(hot.perGame.goals).toBeLessThan(1)
    /* The same raw rate, believed far more at 40 games than at 2. */
    expect(settled.perGame.goals).toBeGreaterThan(hot.perGame.goals)
  })

  it('reports how much of a rate is the player rather than the baseline', () => {
    const thin = rateSkaters([skater({ gamesPlayed: 1 })])[0]
    const thick = rateSkaters([skater({ gamesPlayed: 60 })])[0]
    expect(thin.confidence).toBeLessThan(0.3)
    expect(thick.confidence).toBeGreaterThan(0.8)
    expect(thin.confidence).toBeGreaterThanOrEqual(0)
    expect(thick.confidence).toBeLessThanOrEqual(1)
  })

  /* Nobody has played yet. Every rate is the baseline and the page must be able to say so
     rather than printing zeros that look like a verdict on the player. */
  it('gives a player with no games the baseline at zero confidence', () => {
    const [r] = rateSkaters([skater({ gamesPlayed: 0, goals: 0, assists: 0, points: 0, shots: 0 })])
    expect(r.confidence).toBe(0)
    expect(r.perGame.goals).toBeGreaterThan(0)
  })

  /* Defencemen do not score like centres. One pooled baseline would flatter every defenceman
     and punish every forward at the exact moment the sample is too thin to argue back. */
  it('baselines a defenceman against defencemen', () => {
    const rows = [
      skater({ playerId: 1, positionCode: 'D', gamesPlayed: 0 }),
      skater({ playerId: 2, positionCode: 'D', gamesPlayed: 50, goals: 5, assists: 20, points: 25 }),
      skater({ playerId: 3, positionCode: 'C', gamesPlayed: 50, goals: 40, assists: 40, points: 80 }),
    ]
    const out = rateSkaters(rows)
    const d = out.find((r) => r.playerId === 1)!
    const c = out.find((r) => r.playerId === 3)!
    expect(d.perGame.goals).toBeLessThan(c.perGame.goals)
  })

  it('carries power-play time through as the opportunity signal', () => {
    const ice: IceRow[] = [{ playerId: 1, gamesPlayed: 20, ppTimeOnIcePerGame: 180 }]
    const [r] = rateSkaters([skater({ playerId: 1 })], ice)
    expect(r.ppSecondsPerGame).toBe(180)
  })

  it('reads no power-play time as zero rather than guessing', () => {
    const [r] = rateSkaters([skater({ playerId: 1 })])
    expect(r.ppSecondsPerGame).toBe(0)
  })

  it('survives an empty league', () => {
    expect(rateSkaters([])).toEqual([])
  })

  it('exposes the shrink point so a surface can explain itself', () => {
    expect(SHRINK_GAMES).toBeGreaterThan(0)
  })
})
