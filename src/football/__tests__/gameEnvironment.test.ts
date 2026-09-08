import { describe, it, expect } from 'vitest'
import {
  impliedFromLine, adjustQbForEnvironment, meanImplied, QB_ENVIRONMENT_EXPONENT,
} from '../gameEnvironment'

describe('splitting a game total', () => {
  /* Checked against the analyst's own published totals for the same week: CIN -3.5 with a
     50.5 over/under gave him 27.5 for Cincinnati; this construction gives 27.0. */
  it('gives the favourite the larger share', () => {
    const { home, away } = impliedFromLine(50.5, -3.5, 'home')
    expect(home).toBeCloseTo(27.0, 5)
    expect(away).toBeCloseTo(23.5, 5)
    expect(home + away).toBeCloseTo(50.5, 5)
  })

  it('splits a pick-em evenly', () => {
    const { home, away } = impliedFromLine(44, 0, 'home')
    expect(home).toBe(22)
    expect(away).toBe(22)
  })

  it('does not care which sign the caller passes the spread with', () => {
    expect(impliedFromLine(48, -3, 'away')).toEqual(impliedFromLine(48, 3, 'away'))
  })
})

describe('the quarterback adjustment', () => {
  const implied = { LAC: 28.5, BUF: 23.0, PIT: 17.0 }
  const mean = 22.7

  it('lifts a passer whose offence is expected to score', () => {
    expect(adjustQbForEnvironment(18, 'LAC', implied, mean)).toBeGreaterThan(18)
  })

  it('marks down a passer in a game nobody expects points from', () => {
    expect(adjustQbForEnvironment(18, 'PIT', implied, mean)).toBeLessThan(18)
  })

  it('leaves a league-average environment alone', () => {
    expect(adjustQbForEnvironment(18, 'BUF', { BUF: 22.7 }, 22.7)).toBeCloseTo(18, 5)
  })

  /* Square root, not linear: a 20% better environment is worth about 10%, which is what the
     sweep against the analyst's order actually fitted. */
  it('applies the fitted strength rather than the raw ratio', () => {
    const out = adjustQbForEnvironment(20, 'X', { X: 27.24 }, 22.7) // ratio 1.2
    expect(out / 20).toBeCloseTo(Math.sqrt(1.2), 3)
    expect(QB_ENVIRONMENT_EXPONENT).toBe(0.5)
  })

  /* An unpriced game is unknown, not average. Inventing a neutral number for it would move a
     real player on no evidence. */
  it('returns the projection untouched when the game has no line', () => {
    expect(adjustQbForEnvironment(18, 'SEA', implied, mean)).toBe(18)
    expect(adjustQbForEnvironment(18, undefined, implied, mean)).toBe(18)
    expect(adjustQbForEnvironment(18, 'LAC', {}, mean)).toBe(18)
    expect(adjustQbForEnvironment(18, 'LAC', implied, 0)).toBe(18)
  })

  it('is case and whitespace tolerant on the team code', () => {
    expect(adjustQbForEnvironment(18, ' lac ', implied, mean)).toBeGreaterThan(18)
  })
})

describe('meanImplied', () => {
  it('averages the priced teams only', () => {
    expect(meanImplied({ A: 20, B: 24 })).toBe(22)
    expect(meanImplied({ A: 20, B: 0 })).toBe(20)
    expect(meanImplied({})).toBe(0)
  })
})

import { parseSpread, impliedFromScoreboard } from '@/services/gameLines'

describe('reading ESPN scoreboard odds', () => {
  const game = (away: string, home: string, ou: number, details: string) => ({
    competitions: [{
      odds: [{ overUnder: ou, details }],
      competitors: [
        { homeAway: 'home', team: { abbreviation: home } },
        { homeAway: 'away', team: { abbreviation: away } },
      ],
    }],
  })

  it('reads the favourite and the number out of ESPN\'s details string', () => {
    expect(parseSpread('CIN -3.5')).toEqual({ team: 'CIN', spread: 3.5 })
    expect(parseSpread('SEA -3')).toEqual({ team: 'SEA', spread: 3 })
    expect(parseSpread('EVEN')).toBeNull()
  })

  /* The real Week 1 line: Cincinnati favoured by 3.5 in a 50.5-point game. */
  it('gives the home favourite the larger share', () => {
    const out = impliedFromScoreboard({ events: [game('TB', 'CIN', 50.5, 'CIN -3.5')] })
    expect(out.CIN).toBeCloseTo(27.0, 5)
    expect(out.TB).toBeCloseTo(23.5, 5)
  })

  it('handles the away team being favoured', () => {
    const out = impliedFromScoreboard({ events: [game('SF', 'LAR', 48.5, 'SF -3.5')] })
    expect(out.SF).toBeGreaterThan(out.LAR)
  })

  it('splits a game with no readable spread evenly rather than dropping it', () => {
    const out = impliedFromScoreboard({ events: [game('NE', 'SEA', 44, 'EVEN')] })
    expect(out.NE).toBe(22)
    expect(out.SEA).toBe(22)
  })

  it('skips a game with no total instead of inventing one', () => {
    expect(impliedFromScoreboard({ events: [game('A', 'B', NaN as any, 'B -3')] })).toEqual({})
    expect(impliedFromScoreboard({})).toEqual({})
    expect(impliedFromScoreboard(null)).toEqual({})
  })
})
