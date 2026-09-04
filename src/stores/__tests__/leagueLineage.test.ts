import { describe, it, expect } from 'vitest'
import { collapseSeasons } from '../leagueLineage'

const L = (league_id: string, league_name: string, season: string, extra = {}) =>
  ({ league_id, league_name, platform: 'sleeper', sport: 'football', season, ...extra })

describe('collapseSeasons', () => {
  /* The real shape from the Sleeper API: one league, three seasons, three different ids. */
  it('keeps only the newest season of a league carried across years', () => {
    const rows = [
      L('1048400035362304000', 'League of Record', '2024'),
      L('1186844188245356544', 'League of Record', '2025'),
      L('1389692138421239808', 'League of Record', '2026'),
    ]
    expect(collapseSeasons(rows).map((r) => r.season)).toEqual(['2026'])
  })

  it('collapses several leagues independently', () => {
    const rows = [
      L('a1', 'League of Record', '2025'), L('a2', 'League of Record', '2026'),
      L('b1', 'Dynasty Champs', '2025'), L('b2', 'Dynasty Champs', '2026'),
    ]
    expect(collapseSeasons(rows).map((r) => r.league_id).sort()).toEqual(['a2', 'b2'])
  })

  /* Two leagues that merely share a name in the SAME season are two real leagues — the 2024
     data has exactly this. Collapsing them would hide one the user is actually in. */
  it('keeps same-name leagues that share a season', () => {
    const rows = [L('x', 'Dynasty Champs', '2024'), L('y', 'Dynasty Champs', '2024')]
    expect(collapseSeasons(rows)).toHaveLength(2)
  })

  it('keeps every row of the newest season when an older one forked', () => {
    const rows = [
      L('old1', 'Dynasty Champs', '2024'), L('old2', 'Dynasty Champs', '2024'),
      L('new', 'Dynasty Champs', '2026'),
    ]
    expect(collapseSeasons(rows).map((r) => r.league_id)).toEqual(['new'])
  })

  it('never merges across platform or sport', () => {
    const rows = [
      L('s', 'Home League', '2025'),
      { ...L('y', 'Home League', '2026'), platform: 'yahoo' },
      { ...L('b', 'Home League', '2026'), sport: 'baseball' },
    ]
    expect(collapseSeasons(rows)).toHaveLength(3)
  })

  it('preserves the original order so the switcher does not reshuffle', () => {
    const rows = [L('b', 'Bravo', '2026'), L('a1', 'Alpha', '2025'), L('a2', 'Alpha', '2026')]
    expect(collapseSeasons(rows).map((r) => r.league_id)).toEqual(['b', 'a2'])
  })

  it('leaves a list with nothing to collapse alone', () => {
    const rows = [L('a', 'Alpha', '2026'), L('b', 'Bravo', '2026')]
    expect(collapseSeasons(rows)).toEqual(rows)
  })
})
