import { describe, it, expect } from 'vitest'
import { resolveScoringType } from '../scoringType'
import { getLeagueType } from '@/config/sports'

describe('resolveScoringType', () => {
  it('reports what ESPN\'s own category check established', () => {
    expect(resolveScoringType({ espnCategory: true })).toBe('H2H_CATEGORY')
  })

  it('prefers the platform\'s own word over any cached copy', () => {
    expect(resolveScoringType({ yahoo: 'headone', live: 'head', saved: 'roto' })).toBe('headone')
  })

  it('falls back to the live record when Yahoo has not answered yet', () => {
    expect(resolveScoringType({ live: 'head', saved: 'roto' })).toBe('head')
  })

  /*
   * THE REGRESSION. A Yahoo category league whose live record carries no scoring_type. Reading
   * only the live record returned undefined, getLeagueType defaults undefined to 'points', and
   * a ten-category league was treated as a points league — while the lineup panel beside it,
   * which did consult the saved record, correctly called it category.
   */
  it('finds the saved record when the live one is empty', () => {
    expect(resolveScoringType({ live: null, saved: 'head' })).toBe('head')
    expect(getLeagueType(resolveScoringType({ live: null, saved: 'head' }))).toBe('categories')
  })

  it('treats an empty string as absent rather than as an answer', () => {
    expect(resolveScoringType({ yahoo: '', live: '   ', saved: 'head' })).toBe('head')
  })

  it('has no answer when nothing published one', () => {
    expect(resolveScoringType({})).toBeUndefined()
  })
})
