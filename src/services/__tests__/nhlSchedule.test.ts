import { describe, it, expect } from 'vitest'
import { parseNhlSchedule, nhlAbbrVariants } from '../nhlSchedule'

const payload = {
  gameWeek: [
    { date: '2026-10-08', games: [
      { homeTeam: { abbrev: 'BOS' }, awayTeam: { abbrev: 'UTA' } },
      { homeTeam: { abbrev: 'LAK' }, awayTeam: { abbrev: 'SJS' } },
    ] },
    { date: '2026-10-09', games: [{ homeTeam: { abbrev: 'NYR' }, awayTeam: { abbrev: 'BOS' } }] },
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
