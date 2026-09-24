import { describe, it, expect } from 'vitest'
import { mergeHockeyProjections, normalizeName, type EspnHockeyPlayer } from '../hockeyProjectionSource'
import type { SkaterRate } from '../nhlRates'

const rate = (over: Partial<SkaterRate> = {}): SkaterRate => ({
  playerId: 8478402,
  name: 'Connor McDavid',
  position: 'C',
  team: 'EDM',
  gamesPlayed: 80,
  perGame: {
    goals: 0.5, assists: 1.0, points: 1.5, plusMinus: 0.2, penaltyMinutes: 0.3, ppPoints: 0.5,
    shots: 3.0, hits: 0.8, blockedShots: 0.4, ppGoals: 0.15, shGoals: 0.02, shPoints: 0.04,
  },
  ppSecondsPerGame: 200,
  confidence: 0.9,
  ...over,
})

const espnPlayer = (over: Partial<EspnHockeyPlayer> = {}): EspnHockeyPlayer => ({
  playerKey: '3900',
  name: 'Connor McDavid',
  position: 'C',
  stats: { GP: 82, PTS: 120 },
  adp: 1.8,
  auctionValue: 62,
  percentOwned: 99.8,
  injuryStatus: null,
  ...over,
})

describe('mergeHockeyProjections', () => {
  it('keys a matched skater by ESPN id, because the draft feed does', () => {
    const { projections } = mergeHockeyProjections({ espn: [espnPlayer()], rates: [rate()] })
    expect(Object.keys(projections)).toEqual(['3900'])
    expect(projections['3900'].playerKey).toBe('3900')
  })

  /* The whole reason for the merge: the numbers come from our rate model, not from ESPN's
     projection, even though the row is ESPN-keyed and carries ESPN's metadata. */
  it('takes the stats from the rate model rather than from ESPN', () => {
    const { projections } = mergeHockeyProjections({
      espn: [espnPlayer({ stats: { GP: 82, PTS: 120, G: 60 } })],
      rates: [rate()],
    })
    expect(projections['3900'].stats.G).toBeCloseTo(41, 5)    // 0.5 * 82, ours — not ESPN's 60
    expect(projections['3900'].stats.PTS).toBeCloseTo(123, 5) // 1.5 * 82, not ESPN's 120
  })

  it('carries the market and the injury, which only ESPN knows', () => {
    const { projections } = mergeHockeyProjections({
      espn: [espnPlayer({ injuryStatus: 'DAY_TO_DAY' })],
      rates: [rate()],
    })
    const p = projections['3900']
    expect(p.adp).toBe(1.8)
    expect(p.auctionValue).toBe(62)
    expect(p.percentOwned).toBe(99.8)
    expect(p.injuryStatus).toBe('DAY_TO_DAY')
  })

  /*
   * The horizon, which is the one number borrowed from ESPN. Bedard at 64 expected games is a
   * different asset from Bedard at 82, and the difference is a quarter of his season.
   */
  it('projects a skater over the games ESPN expects him to play', () => {
    const { projections } = mergeHockeyProjections({
      espn: [espnPlayer({ stats: { GP: 41 } })],
      rates: [rate()],
    })
    expect(projections['3900'].stats.GP).toBe(41)
    expect(projections['3900'].stats.G).toBeCloseTo(20.5, 5)
  })

  it('gives a skater ESPN never listed a full season rather than inventing an injury', () => {
    const { projections } = mergeHockeyProjections({ espn: [], rates: [rate()] })
    expect(projections['nhl:8478402'].stats.GP).toBe(82)
  })

  it('refuses a games count outside a real season', () => {
    const zero = mergeHockeyProjections({
      espn: [espnPlayer({ stats: { GP: 0 } })], rates: [rate()],
    })
    expect(zero.projections['3900'].stats.GP).toBe(82)
    const huge = mergeHockeyProjections({
      espn: [espnPlayer({ stats: { GP: 200 } })], rates: [rate()],
    })
    expect(huge.projections['3900'].stats.GP).toBe(82)
  })

  /*
   * THE ELIAS PETTERSSON TEST.
   *
   * Two real players, one name: a centre who scored 51 points and a defenceman who scored 10.
   * Every surface that resolved a player by lower-cased name alone was handing out whichever
   * row the map happened to keep last, so a manager could be shown a third-pairing
   * defenceman's value under his first-round centre's name with nothing on the page to say so.
   *
   * The assertion is that each gets HIS OWN key and HIS OWN rate. A name-only join passes the
   * first half of this test and fails the second, which is what makes it worth writing.
   */
  it('separates two players who share a name by position', () => {
    const centre = rate({ playerId: 8480012, name: 'Elias Pettersson', position: 'C' })
    const dman = rate({
      playerId: 8483678, name: 'Elias Pettersson', position: 'D',
      perGame: { ...rate().perGame, goals: 0.04, points: 0.14 },
    })
    const { projections } = mergeHockeyProjections({
      espn: [
        espnPlayer({ playerKey: '4233563', name: 'Elias Pettersson', position: 'C', stats: { GP: 82 } }),
        espnPlayer({ playerKey: '5148146', name: 'Elias Pettersson', position: 'D', stats: { GP: 82 } }),
      ],
      rates: [centre, dman],
    })
    expect(Object.keys(projections).sort()).toEqual(['4233563', '5148146'])
    expect(projections['4233563'].stats.G).toBeCloseTo(41, 5)    // the centre's 0.5/gm
    expect(projections['5148146'].stats.G).toBeCloseTo(3.28, 5)  // the defenceman's 0.04/gm
  })

  it('matches across accents and punctuation, which the two feeds spell differently', () => {
    const { projections, matched } = mergeHockeyProjections({
      espn: [espnPlayer({ playerKey: '77', name: 'T.J. Oshie', position: 'RW' })],
      rates: [rate({ playerId: 8471698, name: 'TJ Oshie', position: 'R' })],
    })
    expect(matched).toBe(1)
    expect(projections['77']).toBeDefined()
  })

  /*
   * Goalies, the documented seam. There is no goalie rate model — a goalie's value is how
   * often his coach starts him, not a rate that regresses — so he keeps ESPN's projection.
   * Dropping him would empty half a draft board to make a point about where numbers come from.
   */
  it('passes a goalie through with ESPN’s own projection', () => {
    const { projections } = mergeHockeyProjections({
      espn: [espnPlayer({ playerKey: '2562', name: 'Connor Hellebuyck', position: 'G', stats: { W: 40, SV: 1700 } })],
      rates: [],
    })
    expect(projections['2562'].stats).toEqual({ W: 40, SV: 1700 })
    expect(projections['2562'].position).toBe('G')
  })

  it('does not list an ESPN row twice when the rate model already claimed it', () => {
    const { projections } = mergeHockeyProjections({ espn: [espnPlayer()], rates: [rate()] })
    expect(Object.keys(projections)).toHaveLength(1)
  })

  /* A rate-model row wins the name slot over an ESPN-only one: same player, better number. */
  it('resolves a name to the rate-model row when both feeds have him', () => {
    const { keyByName } = mergeHockeyProjections({ espn: [espnPlayer()], rates: [rate()] })
    expect(keyByName['connor mcdavid']).toBe('3900')
  })

  it('reports which league categories the feed cannot fill', () => {
    const { missing } = mergeHockeyProjections({
      espn: [], rates: [rate()], leagueKeys: ['G', 'A', 'FOW'],
    })
    expect(missing).toEqual(['FOW'])
  })

  /*
   * The team, carried so a board can show a crest beside a name. `teamAbbrevs` lists every
   * team a player appeared for — "COL,CAR" after a trade — and the one that matters is the
   * one he is with NOW, which is the last of them.
   */
  it('carries the team a player is on now, not the one he was traded from', () => {
    const { teamByKey } = mergeHockeyProjections({
      espn: [espnPlayer()],
      rates: [rate({ team: 'COL,CAR' })],
    })
    expect(teamByKey['3900']).toBe('CAR')
  })

  it('carries a single team through untouched', () => {
    const { teamByKey } = mergeHockeyProjections({ espn: [espnPlayer()], rates: [rate()] })
    expect(teamByKey['3900']).toBe('EDM')
  })

  it('survives both feeds being empty', () => {
    const r = mergeHockeyProjections({ espn: [], rates: [] })
    expect(r.projections).toEqual({})
    expect(r.matched).toBe(0)
  })
})

describe('normalizeName', () => {
  it('strips diacritics and punctuation without merging different names', () => {
    expect(normalizeName('Nazem Kadri')).toBe('nazem kadri')
    expect(normalizeName('T.J. Oshie')).toBe('tj oshie')
    expect(normalizeName('Tim Stützle')).toBe('tim stutzle')
    expect(normalizeName('Pierre-Luc Dubois')).toBe('pierreluc dubois')
    expect(normalizeName('Connor McDavid')).not.toBe(normalizeName('Connor McMichael'))
  })
})
