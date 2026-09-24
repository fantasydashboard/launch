import { describe, it, expect } from 'vitest'
import { detectCadence, leagueShape } from '../leagueShape'

describe('detectCadence', () => {
  /* Verified against ESPN's public league defaults, 2026-09-23. */
  it('reads a roster that locks per scoring period as daily', () => {
    expect(detectCadence({ sport: 'hockey', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })).toBe('daily')
    expect(detectCadence({ sport: 'basketball', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })).toBe('daily')
    expect(detectCadence({ sport: 'baseball', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })).toBe('daily')
  })

  /* Football locks each player at his own kickoff because the scoring period is ALREADY the
     week. The same string means something different in a sport that plays nightly, which is
     why this is not a general rule. */
  it('reads football locking per game as weekly', () => {
    expect(detectCadence({ sport: 'football', rosterLocktimeType: 'INDIVIDUAL_GAME' })).toBe('weekly')
  })

  /*
   * The honest gap. In a nightly sport, INDIVIDUAL_GAME has never been observed and we do not
   * know that it means weekly there — only one of the two values was visible in the probe, so
   * inferring the other would be a rule that is right by accident. Unknown, and say so.
   */
  it('refuses to guess a nightly sport from an unobserved value', () => {
    expect(detectCadence({ sport: 'hockey', rosterLocktimeType: 'INDIVIDUAL_GAME' })).toBeNull()
  })

  it('is null when the platform said nothing', () => {
    expect(detectCadence({ sport: 'hockey' })).toBeNull()
    expect(detectCadence({ sport: 'hockey', rosterLocktimeType: '' })).toBeNull()
    expect(detectCadence({})).toBeNull()
  })
})

describe('leagueShape', () => {
  it('reports a detected cadence as detected', () => {
    const s = leagueShape({ sport: 'hockey', scoringType: 'head', rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD' })
    expect(s).toEqual({ cadence: 'daily', scoring: 'categories', source: 'detected' })
  })

  /* A hand-set cadence outranks detection. The owner knows their league; we are inferring it
     from one observed value on one platform. */
  it('lets a manual answer beat detection', () => {
    const s = leagueShape({
      sport: 'hockey', scoringType: 'head',
      rosterLocktimeType: 'FIRSTGAME_SCORINGPERIOD', manualCadence: 'weekly',
    })
    expect(s.cadence).toBe('weekly')
    expect(s.source).toBe('manual')
  })

  /* Football is points and weekly always — one game a week leaves no other shape. */
  it('always calls football weekly points', () => {
    const s = leagueShape({ sport: 'football', scoringType: 'ppr' })
    expect(s).toEqual({ cadence: 'weekly', scoring: 'points', source: 'detected' })
  })

  /* Unknown falls back per sport and says so, so the surface can offer the override instead
     of presenting a guess as a fact. */
  it('defaults a nightly sport to daily and admits it', () => {
    const s = leagueShape({ sport: 'hockey', scoringType: 'head' })
    expect(s).toEqual({ cadence: 'daily', scoring: 'categories', source: 'default' })
  })

  it('carries scoring through for all three kinds', () => {
    expect(leagueShape({ sport: 'hockey', scoringType: 'roto' }).scoring).toBe('roto')
    expect(leagueShape({ sport: 'hockey', scoringType: 'headpoint' }).scoring).toBe('points')
    expect(leagueShape({ sport: 'hockey', scoringType: 'head' }).scoring).toBe('categories')
  })
})
