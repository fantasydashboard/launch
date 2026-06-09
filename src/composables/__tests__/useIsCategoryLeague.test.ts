import { describe, it, expect } from 'vitest'
import { isYahooCategoryLeague } from '@/composables/useIsCategoryLeague'

describe('isYahooCategoryLeague', () => {
  it('returns true for head', () => {
    expect(isYahooCategoryLeague('head')).toBe(true)
  })

  it('returns true for headone', () => {
    expect(isYahooCategoryLeague('headone')).toBe(true)
  })

  it('returns true for h2h_category', () => {
    expect(isYahooCategoryLeague('h2h_category')).toBe(true)
  })

  it('returns true for a string containing category', () => {
    expect(isYahooCategoryLeague('headcategory')).toBe(true)
  })

  it('returns false for roto', () => {
    expect(isYahooCategoryLeague('roto')).toBe(false)
  })

  it('returns false for points scoring types', () => {
    expect(isYahooCategoryLeague('points')).toBe(false)
    expect(isYahooCategoryLeague('head_points')).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isYahooCategoryLeague(null)).toBe(false)
    expect(isYahooCategoryLeague(undefined)).toBe(false)
  })
})
