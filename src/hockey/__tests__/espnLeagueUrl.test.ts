import { describe, it, expect } from 'vitest'
import { parseEspnLeagueUrl, looksLikeEspnLeague } from '../espnLeagueUrl'

describe('parseEspnLeagueUrl', () => {
  it('reads a league URL', () => {
    expect(parseEspnLeagueUrl('https://fantasy.espn.com/hockey/league?leagueId=123456&seasonId=2027'))
      .toEqual({ leagueId: '123456', sport: 'hockey', season: 2027 })
  })

  it('reads a team, draft or settings URL the same way', () => {
    for (const u of [
      'https://fantasy.espn.com/hockey/team?leagueId=99&teamId=3&seasonId=2027',
      'https://fantasy.espn.com/hockey/draft?leagueId=99&seasonId=2027',
      'https://fantasy.espn.com/hockey/league/settings?leagueId=99&seasonId=2027',
    ]) {
      expect(parseEspnLeagueUrl(u)).toMatchObject({ leagueId: '99', sport: 'hockey' })
    }
  })

  it('accepts a pasted URL with no scheme', () => {
    expect(parseEspnLeagueUrl('fantasy.espn.com/hockey/league?leagueId=77'))
      .toMatchObject({ leagueId: '77', sport: 'hockey' })
  })

  it('accepts a bare id', () => {
    expect(parseEspnLeagueUrl('  123456 ')).toEqual({ leagueId: '123456' })
  })

  /*
   * ABSENT, NEVER DEFAULTED. Hockey and basketball are named for the year the season ENDS and
   * football and baseball for the year it starts, so a season guessed here would be wrong for
   * half the sports and wrong by a whole year — which renders as an empty league rather than
   * as an error anybody can see.
   */
  it('leaves the season absent when the URL does not carry one', () => {
    expect(parseEspnLeagueUrl('https://fantasy.espn.com/hockey/league?leagueId=5').season)
      .toBeUndefined()
  })

  it('ignores a season that is not a season', () => {
    expect(parseEspnLeagueUrl('https://fantasy.espn.com/hockey/league?leagueId=5&seasonId=1').season)
      .toBeUndefined()
  })

  /* A league id sitting in some other parameter must not be mistaken for the real one. */
  it('takes the league id from the league parameter, not from anywhere it appears', () => {
    expect(parseEspnLeagueUrl('https://fantasy.espn.com/hockey/team?teamId=888&leagueId=42'))
      .toMatchObject({ leagueId: '42' })
  })

  it('handles ESPN\'s other spelling of the parameter', () => {
    expect(parseEspnLeagueUrl('https://fantasy.espn.com/hockey/league?leagueID=42'))
      .toMatchObject({ leagueId: '42' })
  })

  it('reads the sport off the path when there is one', () => {
    expect(parseEspnLeagueUrl('https://fantasy.espn.com/baseball/league?leagueId=1').sport)
      .toBe('baseball')
    expect(parseEspnLeagueUrl('https://fantasy.espn.com/somethingelse/league?leagueId=1').sport)
      .toBeUndefined()
  })

  it('returns null rather than a guess for anything without a league id', () => {
    for (const bad of ['', '   ', 'not a url', 'https://fantasy.espn.com/hockey/league',
      'https://sleeper.com/draft/nfl/123456789012345678', 'https://example.com?leagueId=abc']) {
      expect(parseEspnLeagueUrl(bad)).toBeNull()
    }
  })

  it('answers the looks-like question', () => {
    expect(looksLikeEspnLeague('https://fantasy.espn.com/hockey/league?leagueId=1')).toBe(true)
    expect(looksLikeEspnLeague('nonsense')).toBe(false)
  })
})
