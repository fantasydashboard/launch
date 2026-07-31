import { describe, it, expect } from 'vitest'
import { tagOpportunity, type OppPlayer } from '../footballOpportunity'

describe('tagOpportunity', () => {
  it('flags a healthy backup behind an injured starter as backup-elevated', () => {
    const players: OppPlayer[] = [
      { playerKey: 's', proTeam: 'BUF', position: 'RB', depthChartOrder: 1, injuryStatus: 'Out' },
      { playerKey: 'b', proTeam: 'BUF', position: 'RB', depthChartOrder: 2, injuryStatus: null },
    ]
    const tags = tagOpportunity(players)
    expect(tags.b).toBe('backup-elevated')
    expect(tags.s).toBe('starter')
  })

  it('a backup behind a HEALTHY starter is deep-bench, not elevated', () => {
    const players: OppPlayer[] = [
      { playerKey: 's', proTeam: 'KC', position: 'RB', depthChartOrder: 1, injuryStatus: null },
      { playerKey: 'b', proTeam: 'KC', position: 'RB', depthChartOrder: 2, injuryStatus: null },
    ]
    expect(tagOpportunity(players).b).toBe('deep-bench')
  })

  it('depth order 1 is starter; missing depth order is empty tag', () => {
    const players: OppPlayer[] = [
      { playerKey: 'a', proTeam: 'SF', position: 'WR', depthChartOrder: 1, injuryStatus: null },
      { playerKey: 'x', proTeam: 'SF', position: 'WR', depthChartOrder: null, injuryStatus: null },
    ]
    const tags = tagOpportunity(players)
    expect(tags.a).toBe('starter')
    expect(tags.x).toBe('')
  })

  it('does not cross positions or teams when checking the starter', () => {
    // Injured QB1 on BUF must NOT elevate the RB2 on BUF.
    const players: OppPlayer[] = [
      { playerKey: 'qb', proTeam: 'BUF', position: 'QB', depthChartOrder: 1, injuryStatus: 'Out' },
      { playerKey: 'rb2', proTeam: 'BUF', position: 'RB', depthChartOrder: 2, injuryStatus: null },
    ]
    expect(tagOpportunity(players).rb2).toBe('deep-bench')
  })
})
