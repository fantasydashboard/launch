import { describe, it, expect } from 'vitest'
import {
  americanToProbability, noVigFavouritePct, linesFromScoreboard, environmentByTeam,
} from '../nhlGameLines'

/* Shaped exactly like ESPN's NHL scoreboard, from a real payload read on 2026-09-30. */
const game = (over: Record<string, unknown> = {}) => ({
  competitions: [{
    competitors: [
      { homeAway: 'home', team: { abbreviation: 'PHI' } },
      { homeAway: 'away', team: { abbreviation: 'PIT' } },
    ],
    odds: [{
      details: 'PHI -142', overUnder: 6.5, spread: -1.5,
      homeTeamOdds: { favorite: true, underdog: false },
      awayTeamOdds: { favorite: false, underdog: true },
      moneyline: { home: { close: { odds: '-142' } }, away: { close: { odds: '+120' } } },
      ...over,
    }],
  }],
})

describe('americanToProbability', () => {
  it('reads both sides of the moneyline', () => {
    expect(americanToProbability(-142)).toBeCloseTo(0.5868, 3)
    expect(americanToProbability(+120)).toBeCloseTo(0.4545, 3)
    expect(americanToProbability(-200)).toBeCloseTo(0.6667, 3)
  })

  it('returns nothing for a price it cannot read', () => {
    for (const bad of [0, NaN, Infinity, undefined as any]) {
      expect(americanToProbability(bad)).toBeNull()
    }
  })
})

describe('noVigFavouritePct', () => {
  /*
   * Both sides of a two-way market price above 100% and the excess is the book's take. Left in,
   * every favourite reads stronger than the market thinks, and the error grows with the juice.
   */
  it('removes the overround rather than trusting one side', () => {
    const raw = americanToProbability(-142)!
    const fair = noVigFavouritePct(-142, +120)!
    expect(raw).toBeGreaterThan(fair)
    expect(fair).toBeCloseTo(0.5634, 3)
  })

  it('calls an evenly priced game a coin flip', () => {
    expect(noVigFavouritePct(-110, -110)).toBeCloseTo(0.5, 6)
  })

  it('never reports the underdog as the favourite', () => {
    expect(noVigFavouritePct(+120, -142)).toBeCloseTo(0.5634, 3)
  })

  it('gives up rather than guessing when a price is missing', () => {
    expect(noVigFavouritePct(0, -110)).toBeNull()
  })
})

describe('linesFromScoreboard', () => {
  it('reads the total and both clubs', () => {
    const [line] = linesFromScoreboard({ events: [game()] })
    expect(line).toMatchObject({ home: 'PHI', away: 'PIT', total: 6.5, favourite: 'home' })
    expect(line.favouriteWinPct).toBeCloseTo(0.5634, 3)
  })

  /*
   * THE ONE THAT WOULD HAVE SHIPPED. For the NFL `details` is the spread — "CIN -3.5". For the
   * NHL it is the MONEYLINE — "PHI -142". The football parser reads that as a 142-goal spread
   * and splits a 6.5-goal game into 74.25 against −67.75: plausible code, absurd number, and
   * no error anywhere. Nothing here may read `details` as a number.
   */
  it('never mistakes the moneyline in `details` for a spread', () => {
    const [line] = linesFromScoreboard({ events: [game()] })
    expect(line.total).toBe(6.5)
    const env = environmentByTeam([line])
    expect(env.PHI).toBeCloseTo(3.25, 6)
    expect(env.PHI).toBeLessThan(10)
  })

  /* The puck line is ±1.5 in almost every game, so it cannot be what separates two clubs. */
  it('ignores the puck line entirely', () => {
    const wide = linesFromScoreboard({ events: [game({ spread: -1.5 })] })
    const flat = linesFromScoreboard({ events: [game({ spread: 0 })] })
    expect(environmentByTeam(wide)).toEqual(environmentByTeam(flat))
  })

  it('takes the favourite from the payload rather than a regex', () => {
    const away = linesFromScoreboard({ events: [game({
      homeTeamOdds: { favorite: false }, awayTeamOdds: { favorite: true },
    })] })
    expect(away[0].favourite).toBe('away')
    const pickem = linesFromScoreboard({ events: [game({
      homeTeamOdds: { favorite: false }, awayTeamOdds: { favorite: false },
    })] })
    expect(pickem[0].favourite).toBeNull()
  })

  it('drops a game with no readable total instead of inventing one', () => {
    for (const bad of [{ overUnder: undefined }, { overUnder: 0 }, { overUnder: 'n/a' }]) {
      expect(linesFromScoreboard({ events: [game(bad)] })).toHaveLength(0)
    }
    expect(linesFromScoreboard({ events: [{ competitions: [{ competitors: [] }] }] })).toHaveLength(0)
  })

  it('survives a payload with nothing in it', () => {
    for (const bad of [null, undefined, {}, { events: [] }, { events: [{}] }]) {
      expect(linesFromScoreboard(bad)).toEqual([])
    }
  })
})

describe('environmentByTeam', () => {
  it('gives both clubs the game they are in', () => {
    const env = environmentByTeam(linesFromScoreboard({ events: [game()] }))
    expect(env.PHI).toBeCloseTo(3.25, 6)
    expect(env.PIT).toBeCloseTo(3.25, 6)
  })

  it('separates a high-scoring game from a low-scoring one', () => {
    const high = environmentByTeam(linesFromScoreboard({ events: [game({ overUnder: 7.5 })] }))
    const low = environmentByTeam(linesFromScoreboard({ events: [game({ overUnder: 5.5 })] }))
    expect(high.PHI).toBeGreaterThan(low.PHI)
  })

  /*
   * NOT SPLIT, AND SAID SO. Football earned its adjustment by sweeping an exponent against an
   * analyst's own order — 0.80 to 0.90, falling away on both sides. There is no hockey
   * equivalent to fit against yet, so turning a win probability into goals would be a number
   * chosen rather than measured. Both clubs get the game's own environment until it can be.
   */
  it('does not yet claim to know which club gets the extra goal', () => {
    const env = environmentByTeam(linesFromScoreboard({ events: [game({
      moneyline: { home: { close: { odds: '-400' } }, away: { close: { odds: '+320' } } },
    })] }))
    expect(env.PHI).toBeCloseTo(env.PIT, 6)
  })

  /* A roster abbreviation must always find its game — the schedule keys both spellings too. */
  it('keys every spelling a roster might use', () => {
    const la = environmentByTeam([{ home: 'LAK', away: 'SJS', total: 6, favourite: null, favouriteWinPct: null }])
    expect(la.LAK).toBeCloseTo(3, 6)
    expect(la.LA).toBeCloseTo(3, 6)
    expect(la.SJ).toBeCloseTo(3, 6)
  })
})
