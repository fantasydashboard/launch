import { describe, it, expect } from 'vitest'
import { parseEspnAcquisition, parseYahooAcquisition, acquisitionTip, parseEspnAddBudget, parseYahooAddBudget } from '../acquisition'

describe('parseEspnAcquisition', () => {
  it('detects FAAB with budget, continuous, and priority waivers', () => {
    expect(parseEspnAcquisition({ isUsingAcquisitionBudget: true, acquisitionBudget: 100 })).toEqual({ mode: 'faab', budget: 100 })
    expect(parseEspnAcquisition({ acquisitionType: 'WAIVERS_CONTINUOUS' })).toEqual({ mode: 'continuous', budget: null })
    expect(parseEspnAcquisition({ acquisitionType: 'WAIVERS_TRADITIONAL' })).toEqual({ mode: 'waiver', budget: null })
    expect(parseEspnAcquisition(null)).toEqual({ mode: 'unknown', budget: null })
  })
})

describe('parseYahooAcquisition', () => {
  it('detects FAAB vs priority waivers', () => {
    expect(parseYahooAcquisition({ uses_faab: '1' })).toEqual({ mode: 'faab', budget: null })
    expect(parseYahooAcquisition({ uses_faab: '0', waiver_type: 'R' })).toEqual({ mode: 'waiver', budget: null })
    expect(parseYahooAcquisition({})).toEqual({ mode: 'unknown', budget: null })
  })
})

describe('acquisitionTip', () => {
  it('scales FAAB tips by impact, with $ when budget is known', () => {
    expect(acquisitionTip('faab', 0.5, 100)).toContain('bid up')
    expect(acquisitionTip('faab', 0.2, 100)).toContain('moderate')
    expect(acquisitionTip('faab', 0.1, 100)).toContain('low bid')
    expect(acquisitionTip('faab', 0.1, null)).toBe('FAAB league · low bid')
  })
  it('handles continuous, priority, and unknown', () => {
    expect(acquisitionTip('continuous', 0.4, null)).toContain('free add')
    expect(acquisitionTip('waiver', 0.5, null)).toContain('top waiver claim')
    expect(acquisitionTip('waiver', 0.1, null)).toContain('low-priority')
    expect(acquisitionTip('unknown', 0.5, null)).toBe('')
  })
})

describe('parseEspnAddBudget', () => {
  it('FAAB when isUsingAcquisitionBudget', () => {
    const b = parseEspnAddBudget({ isUsingAcquisitionBudget: true, acquisitionBudget: 100 }, { acquisitionBudgetSpent: 20 })
    expect(b).toEqual({ kind: 'faab', budget: 100, remaining: 80 })
  })
  it('unlimited when acquisitionLimit is -1', () => {
    expect(parseEspnAddBudget({ isUsingAcquisitionBudget: false, acquisitionLimit: -1 }, { acquisitions: 75 })).toEqual({ kind: 'unlimited' })
  })
  it('count when acquisitionLimit >= 0', () => {
    expect(parseEspnAddBudget({ isUsingAcquisitionBudget: false, acquisitionLimit: 40 }, { acquisitions: 30 }))
      .toEqual({ kind: 'count', limit: 40, used: 30, remaining: 10 })
  })
})

describe('parseYahooAddBudget', () => {
  it('count from max_weekly_adds + weekly used', () => {
    expect(parseYahooAddBudget({ uses_faab: '0', max_weekly_adds: '5' }, { weeklyAddsUsed: 2, faabBalance: null }))
      .toEqual({ kind: 'count', limit: 5, used: 2, remaining: 3 })
  })
  it('faab when uses_faab, remaining = faab_balance', () => {
    expect(parseYahooAddBudget({ uses_faab: '1' }, { weeklyAddsUsed: null, faabBalance: 34 }))
      .toEqual({ kind: 'faab', budget: null, remaining: 34 })
  })
  it('unlimited when no weekly-add limit', () => {
    expect(parseYahooAddBudget({ uses_faab: '0' }, { weeklyAddsUsed: null, faabBalance: null })).toEqual({ kind: 'unlimited' })
  })
})
