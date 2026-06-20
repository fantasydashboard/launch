import { describe, it, expect } from 'vitest'
import { parseEspnAcquisition, parseYahooAcquisition, acquisitionTip } from '../acquisition'

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
