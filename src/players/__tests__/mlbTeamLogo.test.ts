import { describe, it, expect } from 'vitest'
import { mlbTeamLogo } from '../mlbTeamLogo'

describe('mlbTeamLogo', () => {
  it('maps a straightforward abbr to the ESPN logo CDN', () => {
    expect(mlbTeamLogo('NYY')).toBe('https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png')
  })
  it('normalizes source variants to one ESPN abbr', () => {
    expect(mlbTeamLogo('AZ')).toBe(mlbTeamLogo('ARI'))
    expect(mlbTeamLogo('CWS')).toBe(mlbTeamLogo('CHW'))
    expect(mlbTeamLogo('ATH')).toBe(mlbTeamLogo('OAK'))
    expect(mlbTeamLogo('sd')).toBe(mlbTeamLogo('SDP')) // case-insensitive
  })
  it('returns undefined for unknown / blank so the logo is omitted', () => {
    expect(mlbTeamLogo('')).toBeUndefined()
    expect(mlbTeamLogo(undefined)).toBeUndefined()
    expect(mlbTeamLogo('ZZZ')).toBeUndefined()
  })
})
