import { describe, it, expect } from 'vitest'
import { buildManualSeason } from '../manualSeason'

describe('buildManualSeason — champions-only', () => {
  it('builds a single champion team flagged rank 1', () => {
    const s = buildManualSeason({ season: 2019, champion: 'The Dynasty' })
    expect(s.season).toBe(2019)
    expect(s.teams).toHaveLength(1)
    expect(s.teams[0]).toMatchObject({
      teamName: 'The Dynasty',
      teamKey: 'n:the dynasty',
      rank: 1,
      champion: true,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      madePlayoffs: false,
    })
  })
  it('adds a runner-up at rank 2 when provided', () => {
    const s = buildManualSeason({ season: 2019, champion: 'Champs', runnerUp: 'Almost' })
    expect(s.teams.map((t) => [t.rank, t.teamName, t.champion])).toEqual([
      [1, 'Champs', true],
      [2, 'Almost', false],
    ])
  })
  it('ignores a blank runner-up', () => {
    const s = buildManualSeason({ season: 2019, champion: 'Champs', runnerUp: '   ' })
    expect(s.teams).toHaveLength(1)
  })
  it('trims names into both display + key', () => {
    const s = buildManualSeason({ season: 2019, champion: '  Big Dogs  ' })
    expect(s.teams[0].teamName).toBe('Big Dogs')
    expect(s.teams[0].teamKey).toBe('n:big dogs')
  })
})

describe('buildManualSeason — full standings', () => {
  it('ranks by row order, flags row 1 champion, keeps W-L-T', () => {
    const s = buildManualSeason({
      season: 2018,
      champion: 'ignored when standings present',
      standings: [
        { name: 'First', wins: 11, losses: 3, ties: 0 },
        { name: 'Second', wins: 10, losses: 4 },
        { name: 'Third', wins: 9, losses: 5, ties: 0 },
      ],
    })
    expect(s.teams).toHaveLength(3)
    expect(s.teams[0]).toMatchObject({ teamName: 'First', rank: 1, champion: true, wins: 11, losses: 3 })
    expect(s.teams[1]).toMatchObject({ teamName: 'Second', rank: 2, champion: false, wins: 10, losses: 4, ties: 0 })
    expect(s.teams[2]).toMatchObject({ teamName: 'Third', rank: 3, champion: false, wins: 9 })
  })
  it('skips blank standings rows and re-ranks the rest', () => {
    const s = buildManualSeason({
      season: 2018,
      champion: 'x',
      standings: [{ name: 'A', wins: 5 }, { name: '  ' }, { name: 'B', wins: 3 }],
    })
    expect(s.teams.map((t) => [t.rank, t.teamName])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ])
  })
  it('clamps negative numbers to zero', () => {
    const s = buildManualSeason({ season: 2018, champion: 'x', standings: [{ name: 'A', wins: -4, losses: -1 }] })
    expect(s.teams[0]).toMatchObject({ wins: 0, losses: 0 })
  })
})
