import { describe, it, expect } from 'vitest'
import { buildAllTimeStandings } from '../allTimeStandings'
import type { HistorySeason, HistoryTeam } from '../types'

function team(p: Partial<HistoryTeam> & { teamKey: string }): HistoryTeam {
  return {
    teamName: p.teamKey,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    rank: 0,
    madePlayoffs: false,
    champion: false,
    ...p,
  }
}

describe('buildAllTimeStandings', () => {
  const seasons: HistorySeason[] = [
    {
      season: 2024,
      teams: [
        team({ teamKey: 'A', teamName: 'Alpha 24', wins: 8, losses: 2, champion: true, madePlayoffs: true }),
        team({ teamKey: 'B', teamName: 'Bravo 24', wins: 6, losses: 4, madePlayoffs: true }),
        team({ teamKey: 'C', teamName: 'Charlie 24', wins: 3, losses: 6, ties: 1 }),
      ],
    },
    {
      season: 2023,
      teams: [
        team({ teamKey: 'A', teamName: 'Alpha 23', wins: 5, losses: 5, madePlayoffs: true }),
        team({ teamKey: 'B', teamName: 'Bravo 23', wins: 9, losses: 1, champion: true, madePlayoffs: true }),
        team({ teamKey: 'C', teamName: 'Charlie 23', wins: 4, losses: 6 }),
      ],
    },
  ]

  it('aggregates cumulative W-L-T per team', () => {
    const rows = buildAllTimeStandings(seasons, 'C')
    const byKey = Object.fromEntries(rows.map((r) => [r.teamKey, r]))
    expect(byKey.A.wins).toBe(13) // 8 + 5
    expect(byKey.A.losses).toBe(7)
    expect(byKey.C.wins).toBe(7)
    expect(byKey.C.ties).toBe(1)
    expect(byKey.C.seasonsPlayed).toBe(2)
  })

  it('computes win% with ties as half-wins', () => {
    const rows = buildAllTimeStandings(seasons, '')
    const c = rows.find((r) => r.teamKey === 'C')!
    // 7 wins + 0.5*1 tie over 20 games (3-6-1 + 4-6) = 7.5 / 20
    expect(c.winPct).toBeCloseTo(7.5 / 20, 6)
  })

  it('counts titles and playoff appearances', () => {
    const rows = buildAllTimeStandings(seasons, '')
    const byKey = Object.fromEntries(rows.map((r) => [r.teamKey, r]))
    expect(byKey.A.titles).toBe(1)
    expect(byKey.B.titles).toBe(1)
    expect(byKey.A.playoffAppearances).toBe(2)
    expect(byKey.C.playoffAppearances).toBe(0)
  })

  it('sorts by titles desc then win% desc, and uses the latest name/logo', () => {
    const rows = buildAllTimeStandings(seasons, '')
    // A and B both have 1 title; A (13-7 = .65) beats B (15-5 = .75)? B higher win% → B first.
    expect(rows[0].teamKey).toBe('B')
    expect(rows[1].teamKey).toBe('A')
    expect(rows[2].teamKey).toBe('C') // 0 titles, last
    // Latest-season display name.
    expect(rows[0].teamName).toBe('Bravo 24')
  })

  it('marks the user row via isMe', () => {
    const rows = buildAllTimeStandings(seasons, 'C')
    expect(rows.find((r) => r.teamKey === 'C')!.isMe).toBe(true)
    expect(rows.find((r) => r.teamKey === 'A')!.isMe).toBe(false)
  })

  it('degrades to a single season = that season standings', () => {
    const rows = buildAllTimeStandings([seasons[0]], 'A')
    expect(rows).toHaveLength(3)
    expect(rows[0].teamKey).toBe('A') // champion, 1 title
    expect(rows[0].seasonsPlayed).toBe(1)
    expect(rows[0].isMe).toBe(true)
  })
})
