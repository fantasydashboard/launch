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
  /*
   * A SKATER MUST NEVER BE HANDED A GOALIE'S PROJECTION.
   *
   * goalieMatcher falls back to surname when the full names disagree, which is what joins
   * ESPN's "Sam Montembeault" to the NHL's "Samuel Montembeault". Its contract says it answers
   * for an ESPN GOALIE row — and the merge called it for every player, skaters included.
   *
   * So defenceman Alexander Romanov surname-matched goalie Georgii Romanov and inherited his
   * numbers: GP replaced by the goalie's 4 starts, plus a full set of W/SV/GA/SA/SVPCT/GAA on
   * a defenceman. Value is seasonTotal / GP, so his real season of scoring was divided by four
   * games and he came out at 47.7 points a night — first on the board, ahead of Cale Makar at
   * 3.7, and free, so the page advised picking him up.
   */
  it('does not give a skater a goalie projection that only matches by surname', () => {
    const { projections } = mergeHockeyProjections({
      espn: [espnPlayer({
        playerKey: '4587854', name: 'Alexander Romanov', position: 'D',
        stats: { GP: 74, G: 6, A: 17, SOG: 106, HITS: 168, BLK: 166 },
      })],
      rates: [],
      goalieProjections: [{
        playerId: 5000, name: 'Georgii Romanov',
        starts: 4, wins: 1, saves: 112, goalsAgainst: 14, shutouts: 0, shotsAgainst: 126,
        savePct: 0.888,
      }],
    })

    const romanov = projections['4587854']
    expect(romanov.position).toBe('D')
    /* His own games, not the goalie's starts — this is the divisor the board ranks on. */
    expect(romanov.stats.GP).toBe(74)
    expect(romanov.stats.W).toBeUndefined()
    expect(romanov.stats.SV).toBeUndefined()
    expect(romanov.stats.SVPCT).toBeUndefined()
    expect(romanov.stats.GAA).toBeUndefined()
  })

  /* The surname fallback still has to work where it was meant to: goalie to goalie. */
  it('still joins a goalie whose given name is spelled differently', () => {
    const { projections } = mergeHockeyProjections({
      espn: [espnPlayer({
        playerKey: '2560', name: 'Sam Montembeault', position: 'G',
        stats: { GP: 40, W: 33 },
      })],
      rates: [],
      goalieProjections: [{
        playerId: 6000, name: 'Samuel Montembeault',
        starts: 38, wins: 17.9, saves: 1000, goalsAgainst: 95, shutouts: 2, shotsAgainst: 1095,
        savePct: 0.913,
      }],
    })

    expect(projections['2560'].stats.W).toBeCloseTo(17.9)
    expect(projections['2560'].stats.GP).toBe(38)
  })

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
    /* Rates are ours; only the GAMES they are multiplied over come from the feed, and even
       those are now an expectation rather than the feed's number — see gamesProjection. The
       ratio is what this test is about: 3 points for every goal, whatever the games. */
    const p = projections['3900']
    expect(p.stats.PTS / p.stats.G).toBeCloseTo(3, 5)   // 1.5 / 0.5, ours — not ESPN's 120/60
    expect(p.stats.G).not.toBeCloseTo(60, 0)            // and emphatically not ESPN's own
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
  /*
   * GAMES ARE AN EXPECTATION NOW, NOT THE FEED'S NUMBER.
   *
   * These used to assert that a skater was projected over exactly the games ESPN listed, that
   * an unlisted skater got a full 82, and that a nonsense count clamped to 82. All three are
   * superseded: ESPN answers "if healthy" and had 32% of the board at a full season against a
   * real 19-21%, so the column is now centred and narrowed across the pool. Rewritten to the
   * new contract rather than deleted, because the old intent — games must be a real season,
   * and the stats must scale with them — still holds.
   */
  it('scales a skater\'s stats by the games it projects for him', () => {
    const { projections } = mergeHockeyProjections({
      espn: [espnPlayer({ stats: { GP: 41 } })],
      rates: [rate()],
    })
    const p = projections['3900']
    expect(p.stats.G).toBeCloseTo(0.5 * p.stats.GP, 5)   // his rate, over whatever games we expect
  })

  it('never projects a season nobody could play', () => {
    for (const gp of [0, 41, 200, undefined]) {
      const { projections } = mergeHockeyProjections({
        espn: [espnPlayer({ stats: gp === undefined ? {} : { GP: gp } })], rates: [rate()],
      })
      const out = projections['3900'].stats.GP
      expect(out).toBeGreaterThan(0)
      expect(out).toBeLessThanOrEqual(82)
    }
  })

  it('still rates a skater ESPN never listed', () => {
    const { projections } = mergeHockeyProjections({ espn: [], rates: [rate()] })
    const gp = projections['nhl:8478402'].stats.GP
    expect(gp).toBeGreaterThan(0)
    expect(gp).toBeLessThanOrEqual(82)
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
    /* Each keeps his OWN rate, which is the point — asserted as a rate rather than a total,
       because the games they are multiplied over are now projected rather than a fixed 82 and
       are not what this test is about. */
    const c = projections['4233563'], d = projections['5148146']
    expect(c.stats.G / c.stats.GP).toBeCloseTo(0.5, 5)     // the centre's
    expect(d.stats.G / d.stats.GP).toBeCloseTo(0.04, 5)    // the defenceman's
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

/*
 * THE SHAPE THE FEED ACTUALLY SENDS.
 *
 * The two tests above hand the merge a rate row carrying `team`, and proved the comma handling
 * against it for as long as they have existed. The live feed sends no team field on a rate row
 * at all — {playerId, name, position, gamesPlayed, perGame} — so teamByKey was built empty on
 * every production run while the suite stayed green. Nobody saw it, because an absent crest
 * looks like a design choice.
 */
describe('teamByKey against the payload production actually receives', () => {
  it('falls back to ESPN proTeamId when the rate row has no team', () => {
    const { teamByKey } = mergeHockeyProjections({
      espn: [{ ...espnPlayer(), proTeamId: 6 } as any],
      rates: [rate({ team: undefined } as any)],
    })
    expect(teamByKey['3900']).toBe('EDM')
  })

  it('still prefers the rate feed when it does carry one', () => {
    const { teamByKey } = mergeHockeyProjections({
      espn: [{ ...espnPlayer(), proTeamId: 6 } as any],
      rates: [rate({ team: 'COL,CAR' })],
    })
    expect(teamByKey['3900']).toBe('CAR')
  })

  /* A free agent is not a club, and a crest for one is worse than none. */
  it('treats ESPN team 0 as no club rather than "FA"', () => {
    const { teamByKey } = mergeHockeyProjections({
      espn: [{ ...espnPlayer(), proTeamId: 0 } as any],
      rates: [rate({ team: undefined } as any)],
    })
    expect(teamByKey['3900']).toBeUndefined()
  })
})
