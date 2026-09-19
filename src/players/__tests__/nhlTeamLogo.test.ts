import { describe, it, expect } from 'vitest'
import { nhlTeamLogo } from '../nhlTeamLogo'

describe('NHL team logos', () => {
  it('maps a team to its ESPN logo', () => {
    expect(nhlTeamLogo('COL')).toBe('https://a.espncdn.com/i/teamlogos/nhl/500/col.png')
  })

  /* ESPN writes LA, NJ, SJ, TB and UTA where most other feeds write the three-letter form. */
  it('accepts the abbreviation other sources use', () => {
    expect(nhlTeamLogo('LAK')).toBe(nhlTeamLogo('LA'))
    expect(nhlTeamLogo('SJS')).toBe(nhlTeamLogo('SJ'))
    expect(nhlTeamLogo('TBL')).toBe(nhlTeamLogo('TB'))
    expect(nhlTeamLogo('NJD')).toBe(nhlTeamLogo('NJ'))
  })

  it('takes Washington either way', () => {
    expect(nhlTeamLogo('WAS')).toBe(nhlTeamLogo('WSH'))
  })

  /*
   * Undefined, never a guessed URL. A broken image is worse than no image, and this is the
   * contract mlbTeamLogo and nflTeamLogo already keep.
   */
  it('omits the logo rather than guessing', () => {
    expect(nhlTeamLogo('ZZZ')).toBeUndefined()
    expect(nhlTeamLogo('')).toBeUndefined()
    expect(nhlTeamLogo(undefined)).toBeUndefined()
  })

  it('covers all 32 clubs', () => {
    const teams = ['ANA','BOS','BUF','CAR','CBJ','CGY','CHI','COL','DAL','DET','EDM','FLA',
      'LA','MIN','MTL','NJ','NSH','NYI','NYR','OTT','PHI','PIT','SEA','SJ','STL','TB','TOR',
      'UTA','VAN','VGK','WPG','WSH']
    expect(teams).toHaveLength(32)
    for (const t of teams) expect(nhlTeamLogo(t)).toBeTruthy()
  })
})
