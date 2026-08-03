import { describe, it, expect } from 'vitest'
import { yahooMyTeamKey, yahooTeamNames, yahooTeamMeta, espnTeamMeta, resolveLeagueSize } from '@/composables/useActivePointsSource'

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

describe('resolveLeagueSize', () => {
  const pool = [{ teamKey: 'a' }, { teamKey: 'b' }, { teamKey: 'c' }]

  it('prefers the team list — correct even when rosters are empty', () => {
    const names = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' }
    expect(resolveLeagueSize(names, 12, [])).toEqual({ size: 4, source: 'teams' })
  })

  it('falls back to league settings when there is no team list', () => {
    expect(resolveLeagueSize({}, 12, [])).toEqual({ size: 12, source: 'settings' })
  })

  it('falls back to distinct pool teamKeys when team list and settings are absent', () => {
    expect(resolveLeagueSize({}, undefined, pool)).toEqual({ size: 3, source: 'pool' })
  })

  it('defaults to 12 when nothing is known', () => {
    expect(resolveLeagueSize({}, undefined, [])).toEqual({ size: 12, source: 'default' })
  })

  it('never returns 1 — a one-entry source falls through to the next rung', () => {
    expect(resolveLeagueSize({ '1': 'Only' }, 10, [])).toEqual({ size: 10, source: 'settings' })
    expect(resolveLeagueSize({ '1': 'Only' }, undefined, [{ teamKey: 'a' }])).toEqual({ size: 12, source: 'default' })
  })

  it('ignores non-finite or absurd settings values', () => {
    expect(resolveLeagueSize({}, NaN, pool)).toEqual({ size: 3, source: 'pool' })
    expect(resolveLeagueSize({}, 0, pool)).toEqual({ size: 3, source: 'pool' })
  })

  it('tolerates null/undefined inputs', () => {
    expect(resolveLeagueSize(null as any, undefined, null as any)).toEqual({ size: 12, source: 'default' })
  })
})
