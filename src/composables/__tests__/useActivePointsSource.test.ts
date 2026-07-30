import { describe, it, expect } from 'vitest'
import { yahooMyTeamKey, yahooTeamNames, yahooTeamMeta, espnTeamMeta } from '@/composables/useActivePointsSource'

describe('yahoo identity helpers', () => {
  const teams = [
    { team_key: 'y.1', name: 'A', is_my_team: false, wins: 2, losses: 1, ties: 0, points_for: 100, logo_url: 'a.png' },
    { team_key: 'y.2', name: 'B', is_my_team: true, wins: 3, losses: 0, ties: 0, points_for: 150, logo_url: 'b.png' },
  ]
  it('myTeamKey is the is_my_team team_key', () => { expect(yahooMyTeamKey(teams)).toBe('y.2') })
  it('teamNames maps team_key → name', () => { expect(yahooTeamNames(teams)).toEqual({ 'y.1': 'A', 'y.2': 'B' }) })
  it('teamMeta maps records', () => { expect(yahooTeamMeta(teams)['y.2']).toEqual({ wins: 3, losses: 0, ties: 0, pointsFor: 150 }) })
})

describe('espnTeamMeta', () => {
  it('maps ESPN teamRecords → OutlookTeamMeta', () => {
    const recs = { '1': { wins: 4, losses: 1, ties: 0, pointsFor: 500 } }
    expect(espnTeamMeta(recs)).toEqual({ '1': { wins: 4, losses: 1, ties: 0, pointsFor: 500 } })
  })
})
