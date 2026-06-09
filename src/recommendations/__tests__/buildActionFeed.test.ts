import { describe, it, expect } from 'vitest'
import { buildActionFeed } from '@/recommendations/buildActionFeed'
import type { CategoryDef, MyTeamCategoryProfile } from '@/recommendations/types'

const CATS: CategoryDef[] = [
  { statId: 'SV', label: 'SV', name: 'Saves', side: 'pit', higherIsBetter: true },
  { statId: 'HR', label: 'HR', name: 'Home Runs', side: 'hit', higherIsBetter: true },
  { statId: 'AVG', label: 'AVG', name: 'Average', side: 'hit', higherIsBetter: true },
  { statId: 'ERA', label: 'ERA', name: 'ERA', side: 'pit', higherIsBetter: false },
]

const profile: MyTeamCategoryProfile = {
  teamId: 't1',
  teamName: 'My Team',
  numTeams: 12,
  categories: [
    { statId: 'SV', wins: 11, losses: 100, ties: 0, rank: 12 }, // worst weakness
    { statId: 'ERA', wins: 30, losses: 70, ties: 0, rank: 9 }, // weaker
    { statId: 'HR', wins: 60, losses: 40, ties: 0, rank: 6 }, // neutral, excluded
    { statId: 'AVG', wins: 90, losses: 10, ties: 0, rank: 1 }, // strength
  ],
}

describe('buildActionFeed', () => {
  it('orders weaknesses before strengths, worst weakness first', () => {
    const feed = buildActionFeed(profile, CATS)
    expect(feed.map((r) => r.statId)).toEqual(['SV', 'ERA', 'AVG'])
    expect(feed[0].kind).toBe('category-weakness')
    expect(feed[feed.length - 1].kind).toBe('category-strength')
  })

  it('respects the limit', () => {
    const feed = buildActionFeed(profile, CATS, 2)
    expect(feed).toHaveLength(2)
    expect(feed.map((r) => r.statId)).toEqual(['SV', 'ERA'])
  })
})
