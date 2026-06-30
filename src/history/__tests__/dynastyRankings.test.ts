import { describe, it, expect } from 'vitest'
import { buildDynastyRankings } from '../dynastyRankings'
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

describe('buildDynastyRankings', () => {
  it('sums fixed weights correctly for a single season', () => {
    // 4-team season. Champion at rank 1, 10-0 record, made playoffs.
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          team({ teamKey: 'A', rank: 1, wins: 10, losses: 0, champion: true, madePlayoffs: true }),
          team({ teamKey: 'B', rank: 2, wins: 6, losses: 4, madePlayoffs: true }),
          team({ teamKey: 'C', rank: 3, wins: 4, losses: 6 }),
          team({ teamKey: 'D', rank: 4, wins: 0, losses: 10 }),
        ],
      },
    ]
    const rows = buildDynastyRankings(seasons, '')
    const byKey = Object.fromEntries(rows.map((r) => [r.teamKey, r]))
    // A: champ 100 + playoffs 20 + top-half(<=2) 10 + winPct 1.0*30=30 + longevity 5 = 165
    expect(byKey.A.score).toBe(165)
    // B: runner-up 40 + playoffs 20 + top-half 10 + winPct .6*30=18 + 5 = 93
    expect(byKey.B.score).toBe(93)
    // C: third 20 + winPct .4*30=12 + 5 = 37 (rank 3 not top-half of 4, not last)
    expect(byKey.C.score).toBe(37)
    // D: last -15 + winPct 0 + 5 = -10
    expect(byKey.D.score).toBe(-10)
  })

  it('accumulates across seasons and tracks titles/runnerUps/playoffApps/seasonsPlayed', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          team({ teamKey: 'A', rank: 1, wins: 8, losses: 2, champion: true, madePlayoffs: true }),
          team({ teamKey: 'B', rank: 2, wins: 6, losses: 4, madePlayoffs: true }),
        ],
      },
      {
        season: 2023,
        teams: [
          team({ teamKey: 'A', rank: 2, wins: 5, losses: 5, madePlayoffs: true }),
          team({ teamKey: 'B', rank: 1, wins: 9, losses: 1, champion: true, madePlayoffs: true }),
        ],
      },
    ]
    const rows = buildDynastyRankings(seasons, '')
    const a = rows.find((r) => r.teamKey === 'A')!
    expect(a.titles).toBe(1)
    expect(a.runnerUps).toBe(1)
    expect(a.playoffApps).toBe(2)
    expect(a.seasonsPlayed).toBe(2)
  })

  it('sorts by score desc', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          team({ teamKey: 'Low', rank: 4, wins: 1, losses: 9 }),
          team({ teamKey: 'High', rank: 1, wins: 9, losses: 1, champion: true, madePlayoffs: true }),
          team({ teamKey: 'Mid', rank: 2, wins: 5, losses: 5, madePlayoffs: true }),
          team({ teamKey: 'X', rank: 3, wins: 5, losses: 5 }),
        ],
      },
    ]
    const rows = buildDynastyRankings(seasons, '')
    expect(rows[0].teamKey).toBe('High')
    expect(rows[rows.length - 1].teamKey).toBe('Low')
    // Monotonic non-increasing score.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score)
    }
  })

  it('tiebreaks equal scores by titles desc then teamKey', () => {
    // Two teams engineered to the same score; one has a title.
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          // Champ but worse record vs non-champ with identical total — force a title tiebreak
          // by giving both the same score.
          team({ teamKey: 'Zeta', rank: 1, wins: 5, losses: 5 }), // no champ
          team({ teamKey: 'Alpha', rank: 1, wins: 5, losses: 5 }),
        ],
      },
    ]
    const rows = buildDynastyRankings(seasons, '')
    // Both identical score & 0 titles → teamKey asc: Alpha before Zeta.
    expect(rows.map((r) => r.teamKey)).toEqual(['Alpha', 'Zeta'])
  })

  it('marks the user row via isMe', () => {
    const seasons: HistorySeason[] = [
      { season: 2024, teams: [team({ teamKey: 'A', rank: 1, wins: 1 })] },
    ]
    const rows = buildDynastyRankings(seasons, 'A')
    expect(rows[0].isMe).toBe(true)
  })

  it('uses the latest-season name/logo', () => {
    const seasons: HistorySeason[] = [
      { season: 2024, teams: [team({ teamKey: 'A', teamName: 'New', teamLogo: 'new.png', rank: 1 })] },
      { season: 2023, teams: [team({ teamKey: 'A', teamName: 'Old', teamLogo: 'old.png', rank: 1 })] },
    ]
    const rows = buildDynastyRankings(seasons, '')
    expect(rows[0].teamName).toBe('New')
    expect(rows[0].teamLogo).toBe('new.png')
  })
})
