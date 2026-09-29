import { describe, it, expect } from 'vitest'
import { platformFromLeagueId } from '../platformFromLeagueId'

describe('platformFromLeagueId', () => {
  it('reads an ESPN composite key', () =>
    expect(platformFromLeagueId('espn_hockey_123456_2027')).toBe('espn'))

  /* Yahoo keys are "{game}.l.{league}" — numeric game id on older leagues, a code on newer. */
  it('reads a numeric Yahoo key', () =>
    expect(platformFromLeagueId('453.l.136233')).toBe('yahoo'))

  it('reads a coded Yahoo key', () =>
    expect(platformFromLeagueId('nhl.l.12345')).toBe('yahoo'))

  it('falls back to sleeper for anything else', () => {
    expect(platformFromLeagueId('987654321098765432')).toBe('sleeper')
    expect(platformFromLeagueId('')).toBe('sleeper')
    expect(platformFromLeagueId(undefined)).toBe('sleeper')
  })

  /*
   * The distinction that matters: a Yahoo key must not be read as ESPN. It was, and the league's
   * scoring was then fetched from ESPN's settings endpoint with a Yahoo id — which resolves to
   * nothing, leaving the league with no weights and every player with no projected points.
   */
  it('never calls a Yahoo key ESPN', () => {
    for (const k of ['453.l.136233', 'nhl.l.1', '1.l.1']) {
      expect(platformFromLeagueId(k)).not.toBe('espn')
    }
  })
})
