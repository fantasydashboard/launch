import { describe, it, expect } from 'vitest'
import { goalieRankInput } from '../goalieRankInput'

const proj = (over: Record<string, unknown> = {}) => ({
  playerId: 1, name: 'Andrei Vasilevskiy', team: 'TBL', starts: 60, wins: 36, saves: 1500,
  goalsAgainst: 140, shutouts: 4, savePct: 0.915, shotsAgainst: 1640, ...over,
}) as any
const summary = (over: Record<string, unknown> = {}) => ({
  playerId: 2, goalieFullName: 'Arturs Silovs', teamAbbrevs: 'PIT', gamesStarted: 1,
  wins: 1, saves: 30, shutouts: 1, goalsAgainst: 0, ...over,
})

describe('goalieRankInput', () => {
  it('ranks from projections when the feed has them, ignoring this season\'s box score', () => {
    const out = goalieRankInput([proj()], [summary()])
    expect(out.map((g) => g.name)).toEqual(['Andrei Vasilevskiy'])
    expect(out[0]).toMatchObject({ starts: 60, stats: { W: 36, SV: 1500, SHO: 4, GA: 140, GP: 60 } })
  })

  it('drops goalies projected for no starts', () => {
    expect(goalieRankInput([proj(), proj({ playerId: 3, starts: 0 })], [])).toHaveLength(1)
  })

  it('falls back to the summary rows when there are no projections', () => {
    for (const p of [undefined, []]) {
      const out = goalieRankInput(p as any, [summary({ teamAbbrevs: 'VAN,PIT' })])
      expect(out[0]).toMatchObject({ name: 'Arturs Silovs', team: 'PIT', starts: 1 })
    }
  })
})
