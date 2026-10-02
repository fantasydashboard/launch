import { describe, it, expect } from 'vitest'
import { weekBounds, remainingNights } from '../usableWeek'

describe('weekBounds', () => {
  it('Wednesday runs to Sunday', () => {
    expect(weekBounds(new Date(2026, 9, 7))).toEqual({ from: '2026-10-07', to: '2026-10-11' })
  })
  it('Sunday is a one-day week', () => {
    expect(weekBounds(new Date(2026, 9, 11))).toEqual({ from: '2026-10-11', to: '2026-10-11' })
  })
})
describe('remainingNights', () => {
  it('drops nights before today', () => {
    const n = (d: string) => ({ date: d, teams: new Set<string>() })
    expect(remainingNights([n('2026-10-05'), n('2026-10-07')], '2026-10-07').map((x) => x.date)).toEqual(['2026-10-07'])
  })
})
