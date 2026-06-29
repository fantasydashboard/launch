import { describe, it, expect } from 'vitest'
import { buildLeagueStandings } from '../leagueStandings'
import type { PowerRow } from '../powerRankings'

function row(p: Partial<PowerRow>): PowerRow {
  return {
    teamKey: 'x', teamName: 'X', teamLogo: '', strength: 0, strengthRank: 1, recordRank: 1,
    wins: 0, losses: 0, ties: 0, winPct: 0, luckDelta: 0, luck: 'legit', tier: 'Bubble',
    managerless: false, move: '', blurb: '', ...p,
  }
}

describe('buildLeagueStandings', () => {
  const rows = [
    row({ teamKey: 'A', recordRank: 2, strengthRank: 1, luck: 'sleeper' }),
    row({ teamKey: 'B', recordRank: 1, strengthRank: 3, luck: 'pretender' }),
    row({ teamKey: 'C', recordRank: 3, strengthRank: 2, luck: 'legit' }),
  ]
  const stakes = new Map([['B', 'clinched' as const], ['C', 'eliminated' as const]])

  it('sorts into standings order (by record) and attaches stakes + talent connector', () => {
    const out = buildLeagueStandings(rows, stakes, 'A')
    expect(out.map((r) => r.teamKey)).toEqual(['B', 'A', 'C'])
    expect(out[0].stakes).toBe('clinched')
    expect(out[0].talentRank).toBe(3)
    expect(out[0].luck).toBe('pretender')
    expect(out.find((r) => r.teamKey === 'A')!.isMe).toBe(true)
  })

  it('null stakes when none provided', () => {
    const out = buildLeagueStandings(rows, new Map(), 'A')
    expect(out.every((r) => r.stakes === null)).toBe(true)
  })
})
