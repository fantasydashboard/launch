import { describe, it, expect } from 'vitest'
import { parseNhlSchedule, nhlAbbrVariants } from '../nhlSchedule'

/*
 * `gameType: 2` on every fixture, because the live endpoint puts it on every fixture. These
 * were written without it, which made them agree with a parser that counted preseason as
 * real — a fixture missing a field the source always sends will vouch for a bug rather than
 * catch it.
 */
const payload = {
  gameWeek: [
    { date: '2026-10-08', games: [
      { gameType: 2, homeTeam: { abbrev: 'BOS' }, awayTeam: { abbrev: 'UTA' } },
      { gameType: 2, homeTeam: { abbrev: 'LAK' }, awayTeam: { abbrev: 'SJS' } },
    ] },
    { date: '2026-10-09', games: [{ gameType: 2, homeTeam: { abbrev: 'NYR' }, awayTeam: { abbrev: 'BOS' } }] },
  ],
}

describe('the NHL slate', () => {
  it('counts a single day', () => {
    const s = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    expect(s.gamesByTeam.BOS).toBe(1)
    expect(s.gamesByTeam.NYR).toBeUndefined()
  })

  /*
   * The endpoint answers with a WHOLE WEEK from the date asked for, so days past the range
   * have to be dropped or "tonight" quietly becomes "the next seven nights" — and a manager
   * told his winger plays today when he plays Thursday starts a losing lineup.
   */
  it('drops the days outside the range', () => {
    const day = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    const both = parseNhlSchedule(payload, '2026-10-08', '2026-10-09')
    expect(day.gamesByTeam.BOS).toBe(1)
    expect(both.gamesByTeam.BOS).toBe(2)   // Boston plays on both days
  })

  it('records who is at home, for venue', () => {
    const s = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    expect(s.homeTeamByTeam.BOS).toBe('BOS')
    expect(s.homeTeamByTeam.UTA).toBe('BOS')
  })

  /*
   * ESPN's proTeams table shortens five clubs. Keying one spelling means a Kings player looks
   * idle every night of the season, and nothing about that failure announces itself — the
   * same silent miss mlbSchedule documents for OAK/ATH and ARI/AZ.
   */
  it('keys both spellings so a roster abbreviation always resolves', () => {
    const s = parseNhlSchedule(payload, '2026-10-08', '2026-10-08')
    expect(s.gamesByTeam.LAK).toBe(1)
    expect(s.gamesByTeam.LA).toBe(1)
    expect(s.gamesByTeam.SJS).toBe(1)
    expect(s.gamesByTeam.SJ).toBe(1)
  })

  it('knows the variants either way round', () => {
    expect(nhlAbbrVariants('LA')).toContain('LAK')
    expect(nhlAbbrVariants('TBL')).toContain('TB')
    expect(nhlAbbrVariants('BOS')).toEqual(['BOS'])
  })

  /*
   * EMPTY, NEVER GUESSED. The NHL publishes no probable starting goalies, and a guessed
   * starter is worse than an absent one: it puts a backup in a lineup on a night he never
   * dressed.
   */
  it('publishes no probable goalies, because the NHL does not', () => {
    expect(parseNhlSchedule(payload, '2026-10-08', '2026-10-08').startsByPitcher).toEqual({})
  })

  it('survives a payload with no week in it', () => {
    expect(parseNhlSchedule({}, '2026-10-08', '2026-10-08').gamesByTeam).toEqual({})
    expect(parseNhlSchedule(null, '2026-10-08', '2026-10-08').gamesByTeam).toEqual({})
  })
})

/**
 * Preseason. Verified against api-web.nhle.com on 2026-09-20, when every fixture in the
 * returned week carried `gameType: 1` and the parser counted all of them.
 */
describe('parseNhlSchedule game types', () => {
  const day = (date: string, games: unknown[]) => ({ gameWeek: [{ date, games }] })
  const g = (gameType: number, away: string, home: string) => ({
    gameType, awayTeam: { abbrev: away }, homeTeam: { abbrev: home },
  })

  it('does not count preseason as a game', () => {
    const out = parseNhlSchedule(day('2026-09-20', [g(1, 'NYI', 'NJD')]), '2026-09-20', '2026-09-20')
    expect(out.gamesByTeam.NYI).toBeUndefined()
    expect(out.gamesByTeam.NJD).toBeUndefined()
  })

  it('counts regular season and playoffs', () => {
    const reg = parseNhlSchedule(day('2026-10-06', [g(2, 'COL', 'VGK')]), '2026-10-06', '2026-10-06')
    expect(reg.gamesByTeam.COL).toBe(1)
    const post = parseNhlSchedule(day('2027-04-20', [g(3, 'COL', 'VGK')]), '2027-04-20', '2027-04-20')
    expect(post.gamesByTeam.VGK).toBe(1)
  })

  /* Absent is not "counts" — an unlabelled fixture is not assumed to be a real one. */
  it('drops a game with no gameType rather than assuming it counts', () => {
    const out = parseNhlSchedule(
      day('2026-10-06', [{ awayTeam: { abbrev: 'COL' }, homeTeam: { abbrev: 'VGK' } }]),
      '2026-10-06', '2026-10-06',
    )
    expect(out.gamesByTeam.COL).toBeUndefined()
  })

  it('counts only the real games on a mixed day', () => {
    const out = parseNhlSchedule(
      day('2026-10-01', [g(1, 'BOS', 'MTL'), g(2, 'COL', 'VGK')]),
      '2026-10-01', '2026-10-01',
    )
    expect(out.gamesByTeam.BOS).toBeUndefined()
    expect(out.gamesByTeam.COL).toBe(1)
  })
})
