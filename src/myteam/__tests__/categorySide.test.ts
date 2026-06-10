import { describe, it, expect } from 'vitest'
import { classifyCategory } from '../categorySide'

describe('classifyCategory', () => {
  it('classifies pitching categories', () => {
    expect(classifyCategory('ERA', true)).toEqual({ side: 'pit', isRatio: true })
    expect(classifyCategory('W', false)).toEqual({ side: 'pit', isRatio: false })
    expect(classifyCategory('WHIP', true)).toEqual({ side: 'pit', isRatio: true })
    expect(classifyCategory('SV', false)).toEqual({ side: 'pit', isRatio: false })
    expect(classifyCategory('Innings Pitched', false)).toEqual({ side: 'pit', isRatio: false })
  })
  it('classifies hitting categories', () => {
    expect(classifyCategory('HR', false)).toEqual({ side: 'hit', isRatio: false })
    expect(classifyCategory('AVG', false)).toEqual({ side: 'hit', isRatio: true })
    expect(classifyCategory('OPS', false)).toEqual({ side: 'hit', isRatio: true })
    expect(classifyCategory('SB', false)).toEqual({ side: 'hit', isRatio: false })
  })
  it('defaults unknown to hitting, non-ratio', () => {
    expect(classifyCategory('Mystery Stat', false)).toEqual({ side: 'hit', isRatio: false })
  })
})
