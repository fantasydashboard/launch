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
    expect(out[0]).toMatchObject({ starts: 60, stats: { W: 36, SHO: 4, SA: 1640, TOI: 3600, GP: 60 } })
    expect(out[0].stats.SVPCT).toBeCloseTo(1500 / 1640, 6)
    expect(out[0].stats.GAA).toBeCloseTo(140 / 60, 6)
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

describe('goalie columns priced as rates over volume', () => {
  it('a workhorse is not marked down for conceding more goals by playing more', async () => {
    const { buildHockeyCategoryValue } = await import('../hockeyCategoryValue')
    const cats = [
      { key: 'W', statId: 1, reverse: false },
      { key: 'GAA', statId: 10, reverse: true },
      { key: 'SVPCT', statId: 11, reverse: false },
      { key: 'SHO', statId: 7, reverse: false },
    ]
    // Same quality per start: .910, 2.80 GAA, .55 wins/start, .05 SO/start. Only starts differ.
    const same = (id: number, starts: number) => proj({
      playerId: id, starts, wins: 0.55 * starts, shutouts: 0.05 * starts,
      shotsAgainst: 31 * starts, saves: 0.91 * 31 * starts, goalsAgainst: 2.8 * starts,
    })
    const field = [3, 4, 5, 6].map((id, i) => proj({
      playerId: id, starts: 45, wins: 20 + i, shutouts: 2, saves: 1250 + 10 * i, goalsAgainst: 130 - 5 * i,
    }))
    const rows = goalieRankInput([same(1, 60), same(2, 40), ...field], [])
    const projections = Object.fromEntries(rows.map((g) => [String(g.playerId),
      { playerKey: String(g.playerId), position: 'G', stats: g.stats }]))
    const { totalByKey } = buildHockeyCategoryValue({ projections, categories: cats as any, draftablePlayers: 24 })
    expect(totalByKey['1']).toBeGreaterThan(totalByKey['2'])
  })
})
