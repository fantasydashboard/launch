import { describe, it, expect } from 'vitest'
import { rateSkaters, SHRINK_GAMES, CATEGORIES, type SkaterRow, type IceRow } from '../nhlRates'

const skater = (over: Partial<SkaterRow> = {}): SkaterRow => ({
  playerId: 1, skaterFullName: 'A Player', positionCode: 'C', teamAbbrevs: 'EDM',
  gamesPlayed: 20, goals: 10, assists: 20, points: 30, plusMinus: 5,
  penaltyMinutes: 10, ppPoints: 8, shots: 60,
  ppGoals: 3, shGoals: 0, shPoints: 0, hits: 20, blockedShots: 15, ...over,
})

describe('rateSkaters', () => {
  /*
   * Season totals become per-game rates — but SHRUNK, always, and this test says so rather
   * than pretending otherwise.
   *
   * An earlier version asserted the raw rate (10 goals in 20 games = 0.5) and passed only
   * because the fallback baseline had been reverse-engineered to 0.5 as well, which made the
   * shrinkage arithmetically invisible. Two wrongs agreeing is not a passing test. With the
   * measured baseline (forwards score 0.214/game) and the measured shrink point for goals
   * (16.5 games, because goals are the slowest column to stabilise) the honest answer at 20
   * games is (10 + 0.214*16.5) / (20 + 16.5) = 0.371 — just over halfway from the league to
   * him, which is what twenty games of goal-scoring actually buys.
   */
  it('turns season totals into per-game rates, shrunk toward the league', () => {
    const [r] = rateSkaters([skater({ gamesPlayed: 20, goals: 10, assists: 20 })])
    expect(r.perGame.goals).toBeCloseTo(0.371, 2)
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
    expect(SHRINK_GAMES.F.points).toBeGreaterThan(0)
    expect(SHRINK_GAMES.D.points).toBeGreaterThan(0)
  })

  /* A missing entry would divide a rate by NaN and silently rank the player last, so the
     table's completeness is asserted rather than assumed. */
  it('prices every category for both positions', () => {
    for (const group of ['F', 'D'] as const) {
      for (const cat of CATEGORIES) {
        expect(Number.isFinite(SHRINK_GAMES[group][cat]), `${group}.${cat}`).toBe(true)
        expect(SHRINK_GAMES[group][cat], `${group}.${cat}`).toBeGreaterThan(0)
      }
    }
  })

  /*
   * THE MEASUREMENT THIS TABLE EXISTS FOR.
   *
   * One shrinkage number for every category was a guess, and the guess was wrong in both
   * directions at once. Over 1,860 player-seasons, goals need about 16.5 games before a
   * sample outweighs the prior and shots need about 3.4 — five times apart. A file comment
   * here used to claim "a hit is as noisy over two games as a goal is"; hits measured 1.6.
   *
   * So the same nine-game sample must be treated differently by column: a player shooting at
   * twice the league rate has nearly earned that number, while a player scoring at twice the
   * league rate has mostly been lucky. The assertion is the ORDERING of how much survives,
   * which is what a single constant cannot produce however it is tuned.
   */
  it('trusts nine games of shot volume far more than nine games of goals', () => {
    const base = { gamesPlayed: 9, goals: 0, shots: 0, assists: 0, points: 0 }
    /* Each at roughly twice his positional baseline: 0.428 goals/gm and 3.384 shots/gm. */
    const [r] = rateSkaters([skater({ ...base, goals: 3.85, shots: 30.5 })])
    const goalShare = (r.perGame.goals - 0.214) / (0.428 - 0.214)
    const shotShare = (r.perGame.shots - 1.692) / (3.384 - 1.692)
    expect(shotShare).toBeGreaterThan(goalShare * 1.5)
    expect(goalShare).toBeLessThan(0.5)      // nine games of goals is mostly not his
    expect(shotShare).toBeGreaterThan(0.6)   // nine games of shots mostly is
  })

  /* Plus-minus is the column nobody should be ranked on from a partial season: it measured
     around 180 games of prior weight, so even a full season leaves it mostly regressed. */
  it('barely moves plus-minus on a full season, because it is almost all noise', () => {
    const [r] = rateSkaters([skater({ gamesPlayed: 82, plusMinus: 82 })])  // +1.0 a game
    expect(r.perGame.plusMinus).toBeLessThan(0.45)
  })

  /*
   * THE PRIOR THAT MATTERS: last season's own rate, not the league's.
   *
   * Shrinking toward a positional baseline is right when we know nothing about a player and
   * badly wrong when we know a great deal. On opening night nobody has a current-season
   * sample, so a baseline-only model rates Connor McDavid as an average forward — which is the
   * single worst week of the year to be saying that, because it is the week a new user decides
   * whether the board is worth reading.
   *
   * Last season's rate is a far better guess about a player than the population mean, and it
   * is free: the same endpoint, one season back.
   */
  it('rates a player with no games from his own prior season, not the league average', () => {
    const prior = [skater({ playerId: 1, gamesPlayed: 80, goals: 60, assists: 60, points: 120 })]
    const [r] = rateSkaters([skater({ playerId: 1, gamesPlayed: 0, goals: 0, assists: 0, points: 0 })], [], prior)
    // His own prior is 0.75 goals a game; the forward baseline is nearer 0.2.
    expect(r.perGame.goals).toBeGreaterThan(0.6)
  })

  it('still falls back to the baseline for a player with no prior at all', () => {
    const prior = [skater({ playerId: 99, gamesPlayed: 80, goals: 60 })]
    const [r] = rateSkaters([skater({ playerId: 1, gamesPlayed: 0, goals: 0 })], [], prior)
    // A rookie. Nothing known, so the positional baseline is the honest answer.
    expect(r.perGame.goals).toBeLessThan(0.4)
    expect(r.confidence).toBe(0)
  })

  /* A thin prior is not a strong one. Two games last season says nearly as little as none, so
     the prior itself is shrunk toward the baseline before it is used as a target. */
  it('does not trust a two-game prior the way it trusts a full season', () => {
    const thin = [skater({ playerId: 1, gamesPlayed: 2, goals: 4, assists: 0, points: 4 })]
    const thick = [skater({ playerId: 1, gamesPlayed: 80, goals: 160, assists: 0, points: 160 })]
    const fromThin = rateSkaters([skater({ playerId: 1, gamesPlayed: 0, goals: 0 })], [], thin)[0]
    const fromThick = rateSkaters([skater({ playerId: 1, gamesPlayed: 0, goals: 0 })], [], thick)[0]
    expect(fromThick.perGame.goals).toBeGreaterThan(fromThin.perGame.goals)
  })

  /* Once this season has real games, they outweigh last season — the prior is a starting
     point, not an anchor. */
  it('lets the current season overtake the prior as games accumulate', () => {
    const prior = [skater({ playerId: 1, gamesPlayed: 80, goals: 8, assists: 0, points: 8 })]
    const early = rateSkaters([skater({ playerId: 1, gamesPlayed: 2, goals: 4 })], [], prior)[0]
    const late = rateSkaters([skater({ playerId: 1, gamesPlayed: 60, goals: 60 })], [], prior)[0]
    expect(late.perGame.goals).toBeGreaterThan(early.perGame.goals)
  })

  it('behaves exactly as before when no prior is supplied', () => {
    const without = rateSkaters([skater({ gamesPlayed: 20, goals: 10 })])[0]
    const withEmpty = rateSkaters([skater({ gamesPlayed: 20, goals: 10 })], [], [])[0]
    expect(withEmpty.perGame.goals).toBeCloseTo(without.perGame.goals, 6)
  })
})
