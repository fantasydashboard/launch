import { describe, it, expect } from 'vitest'
import { parseSchedule, normalizePitcherName } from '../mlbSchedule'

describe('mlbSchedule', () => {
  it('normalizePitcherName strips accents and punctuation', () => {
    expect(normalizePitcherName('Jesús Luzardo')).toBe('jesus luzardo')
    expect(normalizePitcherName('Hunter Brown')).toBe('hunter brown')
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

  it('parseSchedule tolerates missing fields', () => {
    expect(parseSchedule({}).gamesByTeam).toEqual({})
    expect(parseSchedule({ dates: [{ games: [{}] }] }).startsByPitcher).toEqual({})
  })
})
