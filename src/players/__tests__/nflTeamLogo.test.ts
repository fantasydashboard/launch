import { describe, it, expect } from 'vitest'
import { nflTeamLogo } from '../nflTeamLogo'

describe('nflTeamLogo', () => {
  it('maps a straightforward abbr to the ESPN logo CDN', () => {
    expect(nflTeamLogo('BAL')).toContain('/nfl/500/bal')
  })
  it('maps WAS to the wsh ESPN code', () => {
    expect(nflTeamLogo('WAS')).toContain('wsh')
  })
  it('returns undefined for unknown / blank so the logo is omitted', () => {
    expect(nflTeamLogo('')).toBeUndefined()
    expect(nflTeamLogo(undefined)).toBeUndefined()
  })
})
