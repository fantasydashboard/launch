import { describe, it, expect } from 'vitest'
import { luckVerdict } from '@/myteam/luckVerdict'

describe('luckVerdict', () => {
  it('overperforming (record beats talent) -> sell-high, CTA to trades', () => {
    const v = luckVerdict({ recordRank: 2, talentRank: 8, leagueSize: 10, standingState: 'in' })
    expect(v.stance).toBe('sell-high')
    expect(v.cta?.route).toBe('/trades')
  })

  it('underperforming (talent beats record) -> buy-low', () => {
    const v = luckVerdict({ recordRank: 8, talentRank: 2, leagueSize: 10, standingState: 'chasing' })
    expect(v.stance).toBe('buy-low')
  })

  it('aligned within tolerance -> aligned, CTA to matchup', () => {
    const v = luckVerdict({ recordRank: 5, talentRank: 6, leagueSize: 10, standingState: 'in' })
    expect(v.stance).toBe('aligned')
    expect(v.cta?.route).toBe('/matchup')
  })

  it('clinched softens the sell-high headline', () => {
    const v = luckVerdict({ recordRank: 1, talentRank: 6, leagueSize: 10, standingState: 'clinched' })
    expect(v.stance).toBe('sell-high')
    expect(v.headline).toMatch(/locked in/i)
  })

  it('eliminated overrides buy-low to a play-it-out read', () => {
    const v = luckVerdict({ recordRank: 9, talentRank: 3, leagueSize: 10, standingState: 'eliminated' })
    expect(v.stance).toBe('aligned')
    expect(v.headline).toMatch(/out of the race/i)
  })

  it('tolerance scales with league size (round(n/4), min 2)', () => {
    // n=12 -> tol=3: delta 2 is aligned
    expect(luckVerdict({ recordRank: 3, talentRank: 5, leagueSize: 12, standingState: 'in' }).stance).toBe('aligned')
    // n=8 -> tol=2: delta 2 is sell-high
    expect(luckVerdict({ recordRank: 3, talentRank: 5, leagueSize: 8, standingState: 'in' }).stance).toBe('sell-high')
  })
})
