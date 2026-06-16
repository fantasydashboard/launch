import { describe, it, expect } from 'vitest'
import { classifyContested, isAccumulatorCat } from '../contestedTiers'

describe('classifyContested', () => {
  it('treats only the tight 45–55 band as a true coin-flip', () => {
    expect(classifyContested(50)).toBe('coinflip')
    expect(classifyContested(45)).toBe('coinflip')
    expect(classifyContested(55)).toBe('coinflip')
  })
  it('leans win above the band', () => {
    expect(classifyContested(56)).toBe('leanWin')
    expect(classifyContested(60)).toBe('leanWin')
  })
  it('leans loss below the band', () => {
    expect(classifyContested(44)).toBe('leanLoss')
    expect(classifyContested(40)).toBe('leanLoss')
  })
})

describe('isAccumulatorCat', () => {
  it('flags volume cats won by games played, case/space-insensitive', () => {
    expect(isAccumulatorCat('IP')).toBe(true)
    expect(isAccumulatorCat('BF')).toBe(true)
    expect(isAccumulatorCat(' ab ')).toBe(true)
    expect(isAccumulatorCat('gs')).toBe(true)
  })
  it('does not flag fightable counting or ratio cats', () => {
    expect(isAccumulatorCat('HR')).toBe(false)
    expect(isAccumulatorCat('RBI')).toBe(false)
    expect(isAccumulatorCat('ERA')).toBe(false)
    expect(isAccumulatorCat('SB')).toBe(false)
  })
})
