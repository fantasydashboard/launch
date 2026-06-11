import { describe, it, expect } from 'vitest'
import { helpedCats, sideOf } from '../helpedCats'
import type { ScoredContext } from '../types'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'SVHD', lowerIsBetter: false, side: 'pit', isRatio: false },
]
const ctx: ScoredContext = {
  cats,
  categoryIds: ['HR', 'SVHD'],
  myStats: { HR: 8, SVHD: 5 },
  oppStats: { HR: 9, SVHD: 6 },
  days: 4,
  platform: 'yahoo',
}

describe('sideOf', () => {
  it('classifies pitchers and hitters', () => {
    expect(sideOf('SP')).toBe('pit')
    expect(sideOf('SP,RP')).toBe('pit')
    expect(sideOf('OF')).toBe('hit')
    expect(sideOf('1B,3B')).toBe('hit')
  })
})

describe('helpedCats', () => {
  it('never credits a hitter with a pitching category (kills the SVHD bug)', () => {
    // A hitter delta that "touches" SVHD must still be excluded by the side gate.
    const out = helpedCats({ HR: 5, SVHD: 5 }, ['HR', 'SVHD'], cats, 'hit', ctx)
    expect(out).not.toContain('SVHD')
    expect(out).toContain('HR')
  })

  it('excludes negligible-margin cats', () => {
    // A tiny HR contribution should not register as "flipping" HR.
    const out = helpedCats({ HR: 0.01 }, ['HR'], cats, 'hit', ctx)
    expect(out).toEqual([])
  })

  it('only considers flippable cats', () => {
    expect(helpedCats({ HR: 5 }, [], cats, 'hit', ctx)).toEqual([])
  })
})
