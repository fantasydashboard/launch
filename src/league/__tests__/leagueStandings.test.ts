import { describe, it, expect } from 'vitest'
import { buildLeagueStandings } from '../leagueStandings'
import type { PowerRow } from '../powerRankings'

function row(p: Partial<PowerRow>): PowerRow {
  return {
    teamKey: 'x', teamName: 'X', teamLogo: '', strength: 0, strengthRank: 1, recordRank: 1,
    wins: 0, losses: 0, ties: 0, winPct: 0, luckDelta: 0, luck: 'legit', tier: 'Bubble',
    managerless: false, move: '', blurb: '',
    /* These were absent, so the fixture type-errored and every rank the object did not carry
       came through as undefined. Harmless while nothing sorted on them; the all-play sort
       does, and would have ordered the board by undefined. */
    resumeRank: 1, allPlayRank: 1, executionDelta: 0, scheduleDelta: 0, resumePct: 0,
    ...p,
  }
}

describe('buildLeagueStandings', () => {
  const rows = [
    row({ teamKey: 'A', recordRank: 2, strengthRank: 1, allPlayRank: 1, luck: 'sleeper' }),
    row({ teamKey: 'B', recordRank: 1, strengthRank: 3, allPlayRank: 3, luck: 'pretender' }),
    row({ teamKey: 'C', recordRank: 3, strengthRank: 2, allPlayRank: 2, luck: 'legit' }),
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

  it('carries strength through from PowerRow', () => {
    const rowsWithStrength = [
      row({ teamKey: 'A', recordRank: 2, strengthRank: 1, luck: 'sleeper', strength: 123 }),
      row({ teamKey: 'B', recordRank: 1, strengthRank: 3, luck: 'pretender', strength: 456 }),
    ]
    const out = buildLeagueStandings(rowsWithStrength, new Map(), 'A')
    // sorted by recordRank: B(1) then A(2)
    expect(out[0].teamKey).toBe('B')
    expect(out[0].strength).toBe(456)
    expect(out[1].teamKey).toBe('A')
    expect(out[1].strength).toBe(123)
  })

  it('null stakes when none provided', () => {
    const out = buildLeagueStandings(rows, new Map(), 'A')
    expect(out.every((r) => r.stakes === null)).toBe(true)
  })
})

/*
 * All-play replaced a blended "résumé" sort — 65% all-play with 35% actual record, which is a
 * defensible number and an indefensible thing to put on a button. All-play is one idea and
 * the one people ask for by name: your record if you had played every team, every week.
 */
describe('the all-play sort', () => {
  const rows = [
    row({ teamKey: 'A', recordRank: 3, strengthRank: 3, allPlayRank: 1 }),
    row({ teamKey: 'B', recordRank: 1, strengthRank: 1, allPlayRank: 3 }),
    row({ teamKey: 'C', recordRank: 2, strengthRank: 2, allPlayRank: 2 }),
  ]

  it('orders by all-play, not by record or talent', () => {
    const out = buildLeagueStandings(rows, new Map(), 'me', 'allplay')
    expect(out.map((r) => r.teamKey)).toEqual(['A', 'C', 'B'])
  })

  it('still orders by record and talent on their own keys', () => {
    expect(buildLeagueStandings(rows, new Map(), 'me', 'record').map((r) => r.teamKey)).toEqual(['B', 'C', 'A'])
    expect(buildLeagueStandings(rows, new Map(), 'me', 'talent').map((r) => r.teamKey)).toEqual(['B', 'C', 'A'])
  })
})
