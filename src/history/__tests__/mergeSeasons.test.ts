import { describe, it, expect } from 'vitest'
import { isSeasonFinal, mergeHistorySeasons } from '../mergeSeasons'
import type { HistorySeason, HistoryTeam } from '../types'

function team(p: Partial<HistoryTeam> & { teamKey: string }): HistoryTeam {
  return {
    teamName: p.teamKey,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    rank: 0,
    madePlayoffs: false,
    champion: false,
    ...p,
  }
}
function season(year: number, teams: HistoryTeam[] = []): HistorySeason {
  return { season: year, teams }
}

describe('isSeasonFinal', () => {
  it('is final when the season predates the active season', () => {
    expect(isSeasonFinal(2023, 2026)).toBe(true)
  })
  it('is NOT final for the active (current) season', () => {
    // Stays updatable so the champion-crowning refresh still lands before it locks.
    expect(isSeasonFinal(2026, 2026)).toBe(false)
  })
  it('is NOT final for a future season', () => {
    expect(isSeasonFinal(2027, 2026)).toBe(false)
  })
})

describe('mergeHistorySeasons', () => {
  it('adds stored seasons the live fetch lacks and sorts newest-first', () => {
    const live = [season(2026), season(2025)]
    const stored = [season(2024), season(2023)]
    const merged = mergeHistorySeasons(live, stored)
    expect(merged.map((s) => s.season)).toEqual([2026, 2025, 2024, 2023])
  })
  it('prefers the LIVE payload when a season exists in both', () => {
    const live = [season(2025, [team({ teamKey: 'live' })])]
    const stored = [season(2025, [team({ teamKey: 'stored' })])]
    const merged = mergeHistorySeasons(live, stored)
    expect(merged).toHaveLength(1)
    expect(merged[0].teams[0].teamKey).toBe('live')
  })
  it('returns live unchanged when stored is empty', () => {
    const live = [season(2026), season(2025)]
    expect(mergeHistorySeasons(live, [])).toEqual(live)
  })
})
