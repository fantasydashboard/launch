import { describe, it, expect } from 'vitest'
import { opposingStarterName, spQualityFactor } from '../oppMatchup'
import type { WeekSchedule } from '@/services/mlbSchedule'

const schedule: WeekSchedule = {
  gamesByTeam: { LAD: 1, COL: 1 },
  homeTeamByTeam: { LAD: 'COL', COL: 'COL' },
  startsByPitcher: {
    'kyle freeland': [{ pitcherName: 'Kyle Freeland', teamAbbr: 'COL', opponentAbbr: 'LAD', date: '' }],
    'yoshinobu yamamoto': [{ pitcherName: 'Yoshinobu Yamamoto', teamAbbr: 'LAD', opponentAbbr: 'COL', date: '' }],
  },
}

describe('opposingStarterName', () => {
  it('finds the starter facing a given team', () => {
    expect(opposingStarterName(schedule, 'LAD')).toBe('Kyle Freeland')
    expect(opposingStarterName(schedule, 'COL')).toBe('Yoshinobu Yamamoto')
  })
  it('resolves cross-source team variants (OAK->ATH etc.)', () => {
    const s: WeekSchedule = { gamesByTeam: {}, homeTeamByTeam: {}, startsByPitcher: {
      'x': [{ pitcherName: 'X', teamAbbr: 'SEA', opponentAbbr: 'ATH', date: '' }],
    } }
    expect(opposingStarterName(s, 'OAK')).toBe('X')
  })
  it('returns null when no one starts against them', () => {
    expect(opposingStarterName(schedule, 'NYY')).toBeNull()
  })
})

describe('spQualityFactor', () => {
  it('an ace (high K%, low ERA) is a HARD matchup for a hitter (<1)', () => {
    expect(spQualityFactor({ kRate: 0.32, era: 2.6 })).toBeLessThan(1)
  })
  it('a soft arm (low K%, high ERA) is a GOOD matchup for a hitter (>1)', () => {
    expect(spQualityFactor({ kRate: 0.15, era: 5.4 })).toBeGreaterThan(1)
  })
  it('null quality is neutral', () => {
    expect(spQualityFactor(null)).toBe(1)
  })
  it('is clamped to a sane band', () => {
    expect(spQualityFactor({ kRate: 0.5, era: 0.5 })).toBeGreaterThanOrEqual(0.75)
    expect(spQualityFactor({ kRate: 0, era: 12 })).toBeLessThanOrEqual(1.25)
  })
})
