import { describe, it, expect } from 'vitest'
import { computeCategoryWeaknesses, computeCategoryStrengths } from '@/recommendations/categorySignals'
import type { CategoryDef, MyTeamCategoryProfile } from '@/recommendations/types'

const CATS: CategoryDef[] = [
  { statId: 'SV', label: 'SV', name: 'Saves', side: 'pit', higherIsBetter: true },
  { statId: 'HR', label: 'HR', name: 'Home Runs', side: 'hit', higherIsBetter: true },
  { statId: 'AVG', label: 'AVG', name: 'Average', side: 'hit', higherIsBetter: true },
]

const profile: MyTeamCategoryProfile = {
  teamId: 't1',
  teamName: 'My Team',
  numTeams: 12,
  categories: [
    { statId: 'SV', wins: 11, losses: 100, ties: 0, rank: 11 }, // bottom third
    { statId: 'HR', wins: 60, losses: 40, ties: 0, rank: 6 }, // middle
    { statId: 'AVG', wins: 90, losses: 10, ties: 0, rank: 1 }, // top third
  ],
}

describe('computeCategoryWeaknesses', () => {
  it('flags only bottom-third categories', () => {
    const recs = computeCategoryWeaknesses(profile, CATS)
    expect(recs.map((r) => r.statId)).toEqual(['SV'])
  })

  it('produces a templated headline with ordinal rank and category name', () => {
    const [rec] = computeCategoryWeaknesses(profile, CATS)
    expect(rec.headline).toBe('11th in Saves')
    expect(rec.kind).toBe('category-weakness')
    expect(rec.severity).toBe('high')
    expect(rec.evidenceRoute).toBe('/league')
    expect(rec.leverage).toBeGreaterThan(0.5)
  })
})

describe('computeCategoryStrengths', () => {
  it('flags only top-third categories', () => {
    const recs = computeCategoryStrengths(profile, CATS)
    expect(recs.map((r) => r.statId)).toEqual(['AVG'])
    expect(recs[0].kind).toBe('category-strength')
    expect(recs[0].headline).toBe('1st in Average')
    expect(recs[0].severity).toBe('low')
  })
})
