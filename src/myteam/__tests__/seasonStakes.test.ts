import { describe, it, expect } from 'vitest'
import { seasonStakes } from '../seasonStakes'

describe('seasonStakes', () => {
  it('coast — locked into the bracket (cushion outlasts the weeks left)', () => {
    expect(seasonStakes({ rank: 2, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).mode).toBe('coast')
  })
  it('coast — out of reach (deficit exceeds weeks left)', () => {
    expect(seasonStakes({ rank: 10, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).mode).toBe('coast')
  })
  it('tags coast with WHY: clinched when locked in, eliminated when out of reach', () => {
    expect(seasonStakes({ rank: 2, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).coastKind).toBe('clinched')
    expect(seasonStakes({ rank: 10, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).coastKind).toBe('eliminated')
  })
  it('non-coast modes carry no coastKind', () => {
    expect(seasonStakes({ rank: 4, leagueSize: 10, weeksLeft: 5, playoffSpots: 6 }).coastKind).toBeUndefined()
  })
  it('must-win — just outside, time short, still catchable', () => {
    expect(seasonStakes({ rank: 7, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 }).mode).toBe('must-win')
  })
  it('clinch — comfortably in, default', () => {
    expect(seasonStakes({ rank: 4, leagueSize: 10, weeksLeft: 5, playoffSpots: 6 }).mode).toBe('clinch')
  })
  it('never auto-detects maximize (override-only) and always explains itself', () => {
    const s = seasonStakes({ rank: 7, leagueSize: 10, weeksLeft: 2, playoffSpots: 6 })
    expect(s.mode).not.toBe('maximize')
    expect(s.reasoning.length).toBeGreaterThan(0)
  })
})
