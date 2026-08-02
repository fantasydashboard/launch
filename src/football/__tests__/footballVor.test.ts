import { describe, it, expect } from 'vitest'
import { buildFootballVor } from '../footballVor'

describe('buildFootballVor', () => {
  // 1 team, RB:2 → replacement RB = 3rd best RB.
  const points = { a: 200, b: 150, c: 100, d: 80 }
  const positionByKey = { a: 'RB', b: 'RB', c: 'RB', d: 'RB' }

  it('vorRos = points − positional replacement (can be negative)', () => {
    const vor = buildFootballVor({ points, positionByKey, slots: { RB: 2 }, teams: 1 })
    // startable RB = 2 → replacement = index 2 = 100.
    expect(vor.a.vorRos).toBe(100) // 200 − 100
    expect(vor.c.vorRos).toBe(0)   // 100 − 100
    expect(vor.d.vorRos).toBe(-20) // 80 − 100, below replacement
  })

  it('confidence is low when a player has no projection (0 points)', () => {
    const vor = buildFootballVor({
      points: { a: 200, ghost: 0 },
      positionByKey: { a: 'RB', ghost: 'WR' },
      slots: { RB: 2, WR: 2 }, teams: 1,
    })
    expect(vor.a.confidence).toBe('high')
    expect(vor.ghost.confidence).toBe('low')
  })

  it('weekly: vorWeek from next week, streamWeeks counts weeks above weekly replacement', () => {
    // Next 3 weeks of points. 1 team, RB:1 → weekly replacement = 2nd best RB that week.
    const weekly = [
      { a: 30, b: 20, c: 10 }, // wk1: rep = 20 → a above (30≥20), b at (20≥20), c below
      { a: 5, b: 25, c: 15 },  // wk2: rep = 15 → a below, b above, c at
      { a: 40, b: 10, c: 8 },  // wk3: rep = 10 → a above, b at, c below
    ]
    const vor = buildFootballVor({
      points: { a: 200, b: 150, c: 100 },
      positionByKey: { a: 'RB', b: 'RB', c: 'RB' },
      slots: { RB: 1 }, teams: 1, weekly,
    })
    expect(vor.a.vorWeek).toBe(10)  // 30 − 20 (next week)
    expect(vor.a.streamWeeks).toBe(2) // wk1 (≥), wk3 (≥); wk2 below
    expect(vor.a.streamOf).toBe(3)
    expect(vor.c.streamWeeks).toBe(0) // never ≥ weekly replacement
  })

  it('no weekly input → weekly fields are 0', () => {
    const vor = buildFootballVor({ points, positionByKey, slots: { RB: 2 }, teams: 1 })
    expect(vor.a.vorWeek).toBe(0)
    expect(vor.a.streamWeeks).toBe(0)
    expect(vor.a.streamOf).toBe(0)
  })

  it('passes through the opportunity tag (empty by default)', () => {
    const vor = buildFootballVor({
      points, positionByKey, slots: { RB: 2 }, teams: 1,
      opportunityByKey: { a: 'backup-elevated' },
    })
    expect(vor.a.opportunity).toBe('backup-elevated')
    expect(vor.b.opportunity).toBe('') // no tag supplied → empty
  })
})
