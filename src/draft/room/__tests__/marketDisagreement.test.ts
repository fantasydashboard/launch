import { describe, it, expect } from 'vitest'
import { marketDisagreement } from '../marketDisagreement'

describe('marketDisagreement', () => {
  it('flags VALUE when we rank him a full round earlier than the market', () => {
    // We have him 22nd, the market has him 34th, in a 12-team league: a round.
    const r = marketDisagreement({ projRank: 22, adpRank: 34, teams: 12 })
    expect(r.flag).toBe('value')
    expect(r.rounds).toBeCloseTo(1, 5)
  })

  it('flags FADE when the market ranks him a full round earlier than we do', () => {
    const r = marketDisagreement({ projRank: 34, adpRank: 22, teams: 12 })
    expect(r.flag).toBe('fade')
    expect(r.rounds).toBeCloseTo(-1, 5)
  })

  it('says nothing just under the threshold', () => {
    // A badge on every row carries the same information as a badge on none.
    const r = marketDisagreement({ projRank: 23, adpRank: 34, teams: 12 })
    expect(r.flag).toBe('')
    expect(r.rounds).toBeCloseTo(11 / 12, 5)
  })

  it('scales the threshold to league size', () => {
    // Ten positions is a full round in a 10-team league and not in a 12.
    expect(marketDisagreement({ projRank: 20, adpRank: 30, teams: 10 }).flag).toBe('value')
    expect(marketDisagreement({ projRank: 20, adpRank: 30, teams: 12 }).flag).toBe('')
  })

  it('is symmetric — the same gap either way earns a badge', () => {
    const up = marketDisagreement({ projRank: 10, adpRank: 40, teams: 12 })
    const down = marketDisagreement({ projRank: 40, adpRank: 10, teams: 12 })
    expect(up.flag).toBe('value')
    expect(down.flag).toBe('fade')
    expect(up.rounds).toBeCloseTo(-down.rounds, 5)
  })

  it('says nothing about a player the market never priced', () => {
    // Unpriced is not disagreed with.
    expect(marketDisagreement({ projRank: 10, teams: 12 })).toEqual({ rounds: 0, flag: '' })
    expect(marketDisagreement({ adpRank: 10, teams: 12 })).toEqual({ rounds: 0, flag: '' })
  })

  it('suppresses the badge rather than dividing by a nonsense league size', () => {
    expect(marketDisagreement({ projRank: 10, adpRank: 40, teams: 0 })).toEqual({ rounds: 0, flag: '' })
  })
})
