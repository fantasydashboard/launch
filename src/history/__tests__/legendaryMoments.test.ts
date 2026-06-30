import { describe, it, expect } from 'vitest'
import { buildLegendaryMoments } from '../legendaryMoments'
import type { HistorySeason, HistoryTeam, HistoryWeek } from '../types'

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

describe('buildLegendaryMoments', () => {
  it('detects the biggest week from points and labels it', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', teamName: 'Aces', wins: 1, losses: 1 }), team({ teamKey: 'B', wins: 1, losses: 1 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' }, points: { A: 142.5, B: 100 } },
          { week: 2, results: { A: 'L', B: 'W' }, points: { A: 90, B: 160.2 } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    const top = moments.find((m) => m.kind === 'topWeek')!
    expect(top).toBeTruthy()
    expect(top.teamName).toBe('B')
    expect(top.value).toBe(160.2)
    expect(top.season).toBe(2024)
    expect(top.week).toBe(2)
  })

  it('omits topWeek for category leagues with no points', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 2 }), team({ teamKey: 'B', wins: 1, losses: 1 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' } },
          { week: 2, results: { A: 'W', B: 'L' } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    expect(moments.find((m) => m.kind === 'topWeek')).toBeUndefined()
    // streak / season records still present
    expect(moments.find((m) => m.kind === 'winStreak')).toBeTruthy()
  })

  it('detects longest win and lose streaks across week ordering', () => {
    // A wins weeks 1,2,3 across two seasons in order; B loses 1,2,3,4.
    const seasons: HistorySeason[] = [
      {
        season: 2023,
        teams: [team({ teamKey: 'A', wins: 2 }), team({ teamKey: 'B', losses: 2 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' } },
          { week: 2, results: { A: 'W', B: 'L' } },
        ],
      },
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 1, losses: 1 }), team({ teamKey: 'B', losses: 2 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' } },
          { week: 2, results: { A: 'L', B: 'L' } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    const win = moments.find((m) => m.kind === 'winStreak')!
    expect(win.teamName).toBe('A')
    expect(win.value).toBe(3) // 2023 w1,w2 + 2024 w1
    expect(win.season).toBe(2024) // streak ended in 2024
    const lose = moments.find((m) => m.kind === 'loseStreak')!
    expect(lose.teamName).toBe('B')
    expect(lose.value).toBe(4)
  })

  it('a tie breaks a streak', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 1, ties: 1 })],
        weeks: [
          { week: 1, results: { A: 'W' } },
          { week: 2, results: { A: 'T' } },
          { week: 3, results: { A: 'W' } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    // No streak >= 2 → no winStreak moment.
    expect(moments.find((m) => m.kind === 'winStreak')).toBeUndefined()
  })

  it('finds best and worst season by winPct', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          team({ teamKey: 'A', teamName: 'Aces', wins: 16, losses: 4 }), // .800
          team({ teamKey: 'B', teamName: 'Bums', wins: 2, losses: 18 }), // .100
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    const best = moments.find((m) => m.kind === 'bestSeason')!
    expect(best.teamName).toBe('Aces')
    expect(best.value).toBe('16-4')
    const worst = moments.find((m) => m.kind === 'worstSeason')!
    expect(worst.teamName).toBe('Bums')
    expect(worst.value).toBe('2-18')
  })

  it('returns empty for empty input', () => {
    expect(buildLegendaryMoments([])).toEqual([])
  })
})
