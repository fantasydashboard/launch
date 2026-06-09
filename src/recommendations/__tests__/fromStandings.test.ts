import { describe, it, expect } from 'vitest'
import { profileFromStandings, type StandingsEntryLike } from '@/recommendations/fromStandings'
import type { CategoryDef } from '@/recommendations/types'

const CATS: CategoryDef[] = [
  { statId: 'SV', label: 'SV', name: 'Saves', side: 'pit', higherIsBetter: true },
  { statId: 'HR', label: 'HR', name: 'Home Runs', side: 'hit', higherIsBetter: true },
]

const standings: StandingsEntryLike[] = [
  { team: { teamId: 'a', name: 'Alpha' }, perCategoryWins: { SV: 10, HR: 2 } },
  { team: { teamId: 'b', name: 'Bravo' }, perCategoryWins: { SV: 5, HR: 9 } },
  { team: { teamId: 'c', name: 'Charlie' }, perCategoryWins: { SV: 1, HR: 6 } },
]

describe('profileFromStandings', () => {
  it('ranks the chosen team per category (1 = most wins)', () => {
    const profile = profileFromStandings(standings, CATS, 'c')
    expect(profile.teamId).toBe('c')
    expect(profile.teamName).toBe('Charlie')
    expect(profile.numTeams).toBe(3)
    const sv = profile.categories.find((x) => x.statId === 'SV')!
    const hr = profile.categories.find((x) => x.statId === 'HR')!
    expect(sv.rank).toBe(3) // 1 win = last of three
    expect(sv.wins).toBe(1)
    expect(hr.rank).toBe(2) // 6 wins = middle
  })

  it('throws if the team is not in the standings', () => {
    expect(() => profileFromStandings(standings, CATS, 'z')).toThrow()
  })
})
