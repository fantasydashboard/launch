import { describe, it, expect } from 'vitest'
import { detectLeaks } from '../detectLeaks'
import type { EligiblePlayer } from '../positionalValue'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [{ statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }]
const needHR = { HR: 1 }

const p = (key: string, pos: string[], hr: number, status = ''): EligiblePlayer => ({
  playerKey: key,
  name: key,
  team: 'X',
  eligiblePositions: pos,
  stats: { HR: hr },
  status,
})

describe('detectLeaks', () => {
  it('flags a weak started 1B with a stronger bench 1B (free swap preferred)', () => {
    const starters = [p('weakStart1B', ['1B'], 6)]
    const bench = [p('strongBench1B', ['1B'], 34)]
    const fas = [p('ok1B', ['1B'], 20)]
    const leaks = detectLeaks(starters, bench, fas, cats, needHR, { materiality: 0.5 })
    expect(leaks).toHaveLength(1)
    expect(leaks[0].position).toBe('1B')
    expect(leaks[0].better.key).toBe('strongBench1B')
    expect(leaks[0].better.source).toBe('bench') // owns a better one -> free swap
    expect(leaks[0].categories).toContain('HR')
    expect(leaks[0].gap).toBeGreaterThan(0)
  })

  it('falls back to a waiver upgrade when no bench option exists', () => {
    const starters = [p('weakStart1B', ['1B'], 6)]
    const leaks = detectLeaks(starters, [], [p('waiver1B', ['1B'], 34)], cats, needHR)
    expect(leaks).toHaveLength(1)
    expect(leaks[0].better.source).toBe('waiver')
  })

  it('does not flag when the starter is already the best at the position', () => {
    const starters = [p('stud1B', ['1B'], 40)]
    const bench = [p('weakBench', ['1B'], 8)]
    expect(detectLeaks(starters, bench, [], cats, needHR)).toEqual([])
  })

  it('ignores IL/unavailable alternatives', () => {
    const starters = [p('weakStart1B', ['1B'], 6)]
    const bench = [p('hurtStud', ['1B'], 40, 'IL')]
    expect(detectLeaks(starters, bench, [], cats, needHR)).toEqual([])
  })

  it('flags pitching positions too (P3) using pitching needs', () => {
    const pitCats: CatSpec[] = [{ statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false }]
    const starters = [{ playerKey: 'weakSP', name: 'weakSP', team: 'X', eligiblePositions: ['SP'], stats: { K: 40 } }]
    const bench = [{ playerKey: 'betterSP', name: 'betterSP', team: 'X', eligiblePositions: ['SP'], stats: { K: 180 } }]
    const leaks = detectLeaks(starters, bench, [], pitCats, { K: 1 })
    expect(leaks).toHaveLength(1)
    expect(leaks[0].better.key).toBe('betterSP')
  })

  it('de-overlaps: skips a better player Your Move already surfaces', () => {
    const starters = [p('weakStart1B', ['1B'], 6)]
    const bench = [p('strongBench1B', ['1B'], 34)]
    const exclude = new Set(['strongBench1B'])
    expect(detectLeaks(starters, bench, [], cats, needHR, { excludeKeys: exclude })).toEqual([])
  })

  it('respects need-weighting: no flag in a category you do not need', () => {
    const starters = [p('weakStart1B', ['1B'], 6)]
    const bench = [p('strongBench1B', ['1B'], 34)]
    expect(detectLeaks(starters, bench, [], cats, { HR: 0 })).toEqual([])
  })
})
