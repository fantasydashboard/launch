import { describe, it, expect } from 'vitest'
import { gradeLabel } from '../gradeMove'

describe('gradeLabel', () => {
  it('grades by ECW delta thresholds', () => {
    expect(gradeLabel(0.45)).toEqual({ label: 'Strong upgrade', tone: 'up' })
    expect(gradeLabel(0.35)).toEqual({ label: 'Strong upgrade', tone: 'up' })
    expect(gradeLabel(0.2)).toEqual({ label: 'Solid upgrade', tone: 'up' })
    expect(gradeLabel(0.15)).toEqual({ label: 'Solid upgrade', tone: 'up' })
    expect(gradeLabel(0.1)).toEqual({ label: 'Marginal upgrade', tone: 'up' })
    expect(gradeLabel(0.05)).toEqual({ label: 'Marginal upgrade', tone: 'up' })
    expect(gradeLabel(0)).toEqual({ label: 'Lateral move', tone: 'flat' })
    expect(gradeLabel(-0.04)).toEqual({ label: 'Lateral move', tone: 'flat' })
    expect(gradeLabel(-0.3)).toEqual({ label: 'Downgrade', tone: 'down' })
  })
})
