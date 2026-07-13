import { describe, it, expect } from 'vitest'
import { parseSchedule, normalizePitcherName, teamAbbrVariants, lookupStarts } from '../mlbSchedule'

describe('mlbSchedule', () => {
  it('normalizePitcherName strips accents and punctuation', () => {
    expect(normalizePitcherName('Jesús Luzardo')).toBe('jesus luzardo')
    expect(normalizePitcherName('Hunter Brown')).toBe('hunter brown')
  })

  it('normalizePitcherName drops a trailing generational suffix', () => {
    expect(normalizePitcherName('Hunter Brown Jr.')).toBe('hunter brown')
    expect(normalizePitcherName('Luis Garcia III')).toBe('luis garcia')
    // not a suffix mid-name
    expect(normalizePitcherName('Jr Reynolds')).toBe('jr reynolds')
  })

  it('lookupStarts matches exact, then falls back to initial+last when unambiguous', () => {
    const sched = parseSchedule({
      dates: [
        {
          games: [
            {
              gameDate: '2026-06-11T23:05:00Z',
              teams: {
                home: { team: { abbreviation: 'PHI' }, probablePitcher: { fullName: 'Cristopher Sánchez' } },
                away: { team: { abbreviation: 'NYM' }, probablePitcher: { fullName: 'Kodai Senga' } },
              },
            },
          ],
        },
      ],
    })
    // exact (after accent-normalization)
    expect(lookupStarts(sched, 'Cristopher Sanchez')).toHaveLength(1)
    // first-name spelling differs -> initial+last fallback resolves uniquely
    expect(lookupStarts(sched, 'Christopher Sanchez')).toHaveLength(1)
    // genuinely absent
    expect(lookupStarts(sched, 'Tarik Skubal')).toEqual([])
  })

  it('lookupStarts refuses an ambiguous initial+last fallback', () => {
    const sched = parseSchedule({
      dates: [
        {
          games: [
            {
              teams: {
                home: { team: { abbreviation: 'SD' }, probablePitcher: { fullName: 'Michael King' } },
                away: { team: { abbreviation: 'SF' }, probablePitcher: { fullName: 'Mason King' } },
              },
            },
          ],
        },
      ],
    })
    // "M. King" is ambiguous (two of them) -> no guess
    expect(lookupStarts(sched, 'Marcus King')).toEqual([])
    // but an exact name still resolves
    expect(lookupStarts(sched, 'Michael King')).toHaveLength(1)
  })

  it('parseSchedule counts games per team and collects probable starts', () => {
    const raw = {
      dates: [
        {
          games: [
            {
              gameDate: '2026-06-11T23:05:00Z',
              teams: {
                home: { team: { abbreviation: 'PHI' }, probablePitcher: { fullName: 'Jesús Luzardo' } },
                away: { team: { abbreviation: 'NYM' }, probablePitcher: { fullName: 'Kodai Senga' } },
              },
            },
          ],
        },
        {
          games: [
            {
              gameDate: '2026-06-14T17:05:00Z',
              teams: {
                home: { team: { abbreviation: 'PHI' }, probablePitcher: { fullName: 'Jesús Luzardo' } },
                away: { team: { abbreviation: 'ATL' }, probablePitcher: { fullName: 'Spencer Strider' } },
              },
            },
          ],
        },
      ],
    }
    const sched = parseSchedule(raw)
    expect(sched.gamesByTeam.PHI).toBe(2)
    expect(sched.gamesByTeam.NYM).toBe(1)
    // Luzardo has a two-start week (matched by normalized name)
    expect(sched.startsByPitcher['jesus luzardo']).toHaveLength(2)
    expect(sched.startsByPitcher['jesus luzardo'][0].opponentAbbr).toBe('NYM')
  })

  it('keys gamesByTeam by every abbreviation variant (statsapi ATH/AZ <-> ESPN OAK/ARI)', () => {
    const raw = {
      dates: [
        {
          games: [
            {
              gameDate: '2026-06-11T23:05:00Z',
              teams: {
                home: { team: { abbreviation: 'ATH' } }, // statsapi for Athletics
                away: { team: { abbreviation: 'AZ' } }, // statsapi for Diamondbacks
              },
            },
          ],
        },
      ],
    }
    const sched = parseSchedule(raw)
    // A roster carrying the ESPN/Yahoo codes still resolves to the game.
    expect(sched.gamesByTeam.OAK).toBe(1)
    expect(sched.gamesByTeam.ATH).toBe(1)
    expect(sched.gamesByTeam.ARI).toBe(1)
    expect(sched.gamesByTeam.AZ).toBe(1)
  })

  it('teamAbbrVariants returns the abbr itself when there is no known variant', () => {
    expect(teamAbbrVariants('PHI')).toEqual(['PHI'])
    expect(teamAbbrVariants('ATH')).toContain('OAK')
  })

  it('parseSchedule tolerates missing fields', () => {
    expect(parseSchedule({}).gamesByTeam).toEqual({})
    expect(parseSchedule({ dates: [{ games: [{}] }] }).startsByPitcher).toEqual({})
  })
})

const RAW = {
  dates: [
    {
      games: [
        {
          gameDate: '2026-07-13T23:00:00Z',
          teams: {
            home: { team: { abbreviation: 'COL' }, probablePitcher: { fullName: 'Kyle Freeland' } },
            away: { team: { abbreviation: 'LAD' }, probablePitcher: { fullName: 'Yoshinobu Yamamoto' } },
          },
        },
      ],
    },
  ],
}

describe('parseSchedule homeTeamByTeam', () => {
  it('maps every team (and variants) to the home team of their game', () => {
    const s = parseSchedule(RAW)
    expect(s.homeTeamByTeam['COL']).toBe('COL')
    expect(s.homeTeamByTeam['LAD']).toBe('COL')
  })
  it('is empty for no games', () => {
    expect(parseSchedule({ dates: [] }).homeTeamByTeam).toEqual({})
  })
})
