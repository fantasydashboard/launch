import { describe, it, expect } from 'vitest'
import { emptySeatCost, emptySeatWarning } from '../emptySeatCost'

describe('emptySeatCost', () => {
  it('says byes for football, which is the sport that has them', () => {
    expect(emptySeatCost('football')).toContain('byes')
  })

  /* Hockey, baseball and basketball have no byes — the Trades page said "thinner cover for
     byes" four times on one hockey page. */
  it('does not mention byes for any sport that has none', () => {
    for (const sport of ['hockey', 'baseball', 'basketball']) {
      expect(emptySeatCost(sport)).not.toContain('bye')
      expect(emptySeatCost(sport)).toContain('no game')
    }
  })

  it('writes the warning sentence in the same language', () => {
    expect(emptySeatWarning('football', 2, 1)).toContain('byes get harder')
    expect(emptySeatWarning('hockey', 2, 1)).not.toContain('bye')
    expect(emptySeatWarning('hockey', 2, 1)).toContain('You send 2 and get 1 back')
  })
})
