import { describe, it, expect } from 'vitest'
import { collapseSeasons, collapseById } from '../leagueLineage'

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


/*
 * The switcher showed "League of Record · 2026" three times, and "Dynasty Champs · 2026"
 * three times. The season rule cannot catch that — rows sharing a name AND a season are kept
 * on purpose, because two genuinely different leagues can be named alike. These were the same
 * league_id repeated, which the previous version re-admitted when it rebuilt the result by
 * filtering the input against a set of kept ids.
 */
describe('duplicate ids never reach the switcher', () => {
  const L = (id: string, name: string, season: string) =>
    ({ league_id: id, league_name: name, platform: 'sleeper', sport: 'football', season })

  it('shows one row per league however many copies the store holds', () => {
    const rows = [
      L('1389692138421239808', 'League of Record', '2026'),
      L('1312950142000697344', 'Dynasty Champs', '2026'),
      L('1389692138421239808', 'League of Record', '2026'),
      L('1312950142000697344', 'Dynasty Champs', '2026'),
      L('1389692138421239808', 'League of Record', '2026'),
      L('1312950142000697344', 'Dynasty Champs', '2026'),
    ]
    const out = collapseSeasons(rows)
    expect(out).toHaveLength(2)
    expect(out.map((r) => r.league_name)).toEqual(['League of Record', 'Dynasty Champs'])
  })

  it('still keeps two different leagues that share a name and a season', () => {
    const out = collapseSeasons([L('a', 'Dynasty Champs', '2024'), L('b', 'Dynasty Champs', '2024')])
    expect(out).toHaveLength(2)
  })

  it('treats a numeric id and its string form as the same league', () => {
    const rows = [L('123', 'Home', '2026'), { ...L('123', 'Home', '2026'), league_id: 123 as unknown as string }]
    expect(collapseSeasons(rows)).toHaveLength(1)
  })
})

describe('collapseById', () => {
  it('keeps the first of each id and preserves order', () => {
    const rows = [{ league_id: 'a' }, { league_id: 'b' }, { league_id: 'a' }]
    expect(collapseById(rows).map((r) => r.league_id)).toEqual(['a', 'b'])
  })

  it('matches across the string/number split the two sources disagree on', () => {
    const rows = [{ league_id: '7' }, { league_id: 7 as unknown as string }]
    expect(collapseById(rows)).toHaveLength(1)
  })
})
