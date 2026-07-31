import { describe, it, expect } from 'vitest'
import { playingTeams, zeroByeWeek } from '../footballBye'

describe('playingTeams', () => {
  it('collects home + away team codes from schedule games', () => {
    const games = [
      { home: 'BUF', away: 'MIA' },
      { home: 'KC', away: 'DEN' },
    ]
    const set = playingTeams(games)
    expect(set.has('BUF')).toBe(true)
    expect(set.has('DEN')).toBe(true)
    expect(set.has('SF')).toBe(false)
  })

  it('tolerates alternate key shapes and missing fields', () => {
    const games = [{ home_team: 'BUF', away_team: 'MIA' }, { metadata: {} }]
    const set = playingTeams(games as any)
    expect(set.has('BUF')).toBe(true)
    expect(set.has('MIA')).toBe(true)
    expect(set.size).toBe(2)
  })
})

describe('zeroByeWeek', () => {
  it('zeroes players whose pro team is not playing', () => {
    const points = { a: 20, b: 15 }
    const proTeamByKey = { a: 'BUF', b: 'SF' } // SF on bye
    const out = zeroByeWeek(points, proTeamByKey, new Set(['BUF', 'MIA']))
    expect(out.a).toBe(20)
    expect(out.b).toBe(0)
  })

  it('does not mutate the input', () => {
    const points = { a: 20 }
    zeroByeWeek(points, { a: 'SF' }, new Set(['BUF']))
    expect(points.a).toBe(20)
  })
})
