import { describe, it, expect } from 'vitest'
import { detectLeaks } from '../detectLeaks'
import type { EligiblePlayer } from '../positionalValue'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [{ statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }]
const needHR = { HR: 1 }

// roleValue is the 0-100 roster-badge number Leaks now ranks by; hr drives the
// need-gate (categoriesAhead).
const p = (key: string, pos: string[], roleValue: number, hr: number, status = ''): EligiblePlayer => ({
  playerKey: key,
  name: key,
  team: 'X',
  eligiblePositions: pos,
  stats: { HR: hr },
  roleValue,
  status,
})

describe('detectLeaks', () => {
  it('flags a weak started 1B with a stronger bench 1B (free swap preferred)', () => {
    const starters = [p('weakStart1B', ['1B'], 20, 6)]
    const bench = [p('strongBench1B', ['1B'], 80, 34)]
    const fas = [p('ok1B', ['1B'], 50, 20)]
    const leaks = detectLeaks(starters, bench, fas, cats, needHR)
    expect(leaks).toHaveLength(1)
    expect(leaks[0].position).toBe('1B')
    expect(leaks[0].better.key).toBe('strongBench1B')
    expect(leaks[0].better.source).toBe('bench') // owns a better one -> free swap
    expect(leaks[0].categories).toContain('HR')
    expect(leaks[0].gap).toBe(60) // roleValue gap, same scale as the badge
  })

  it('falls back to a waiver upgrade when no bench option exists', () => {
    const starters = [p('weakStart1B', ['1B'], 20, 6)]
    const leaks = detectLeaks(starters, [], [p('waiver1B', ['1B'], 80, 34)], cats, needHR)
    expect(leaks).toHaveLength(1)
    expect(leaks[0].better.source).toBe('waiver')
  })

  it('ranks by roleValue: never flags a starter the badge rates higher', () => {
    // Bench HR leads (34 > 30) but the badge rates the starter higher (82 > 81).
    // The old positional model would flag this; the single-model rule must not.
    const starters = [p('king', ['P'], 82, 30)]
    const bench = [p('valdez', ['P'], 81, 34)]
    expect(detectLeaks(starters, bench, [], cats, needHR)).toEqual([])
  })

  it('does not flag when the starter is already the best at the position', () => {
    const starters = [p('stud1B', ['1B'], 80, 40)]
    const bench = [p('weakBench', ['1B'], 20, 8)]
    expect(detectLeaks(starters, bench, [], cats, needHR)).toEqual([])
  })

  it('ignores IL/unavailable alternatives', () => {
    const starters = [p('weakStart1B', ['1B'], 20, 6)]
    const bench = [p('hurtStud', ['1B'], 80, 40, 'IL')]
    expect(detectLeaks(starters, bench, [], cats, needHR)).toEqual([])
  })

  it('flags pitching positions too (P3) using pitching needs', () => {
    const pitCats: CatSpec[] = [{ statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false }]
    const starters = [{ playerKey: 'weakSP', name: 'weakSP', team: 'X', eligiblePositions: ['SP'], stats: { K: 40 }, roleValue: 20 }]
    const bench = [{ playerKey: 'betterSP', name: 'betterSP', team: 'X', eligiblePositions: ['SP'], stats: { K: 180 }, roleValue: 80 }]
    const leaks = detectLeaks(starters, bench, [], pitCats, { K: 1 })
    expect(leaks).toHaveLength(1)
    expect(leaks[0].better.key).toBe('betterSP')
  })

  it('assigns a shared bench arm once, to the worst leak (no triple-suggest)', () => {
    // One bench SP, two weak started SPs. The old code recommended the same arm for
    // each; now it fills one slot and lands on the bigger leak.
    const pitCats: CatSpec[] = [{ statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false }]
    const starters = [
      { playerKey: 'weakA', name: 'weakA', team: 'X', eligiblePositions: ['SP'], stats: { K: 60 }, roleValue: 50 },
      { playerKey: 'weakB', name: 'weakB', team: 'X', eligiblePositions: ['SP'], stats: { K: 40 }, roleValue: 35 },
    ]
    const bench = [{ playerKey: 'king', name: 'king', team: 'X', eligiblePositions: ['SP'], stats: { K: 180 }, roleValue: 81 }]
    const leaks = detectLeaks(starters, bench, [], pitCats, { K: 1 })
    expect(leaks).toHaveLength(1)
    expect(leaks[0].better.key).toBe('king')
    expect(leaks[0].starter.key).toBe('weakB') // worst leak (81-35 > 81-50)
  })

  it('de-overlaps: skips a better player Your Move already surfaces', () => {
    const starters = [p('weakStart1B', ['1B'], 20, 6)]
    const bench = [p('strongBench1B', ['1B'], 80, 34)]
    const exclude = new Set(['strongBench1B'])
    expect(detectLeaks(starters, bench, [], cats, needHR, { excludeKeys: exclude })).toEqual([])
  })

  it('respects need-weighting: no flag in a category you do not need', () => {
    const starters = [p('weakStart1B', ['1B'], 20, 6)]
    const bench = [p('strongBench1B', ['1B'], 80, 34)]
    expect(detectLeaks(starters, bench, [], cats, { HR: 0 })).toEqual([])
  })

  it('cites only categories the better player helps (no green-here/red-there)', () => {
    // The bench bat is ahead in HR but HR is NOT one of its green chips (helpsCats).
    // The leak must not cite HR — it would contradict the player's red roster chip.
    const starters = [p('weak1B', ['1B'], 20, 6)]
    const bench = [{ ...p('bench1B', ['1B'], 80, 34), helpsCats: new Set<string>() }]
    expect(detectLeaks(starters, bench, [], cats, needHR)).toEqual([])
  })

  it('skips a leak whose flagged starter Your Move already handles', () => {
    const starters = [p('weak1B', ['1B'], 20, 6)]
    const bench = [p('strong1B', ['1B'], 80, 34)]
    // weak1B is being dropped/sat by Your Move -> no point flagging a lineup fix for it.
    expect(detectLeaks(starters, bench, [], cats, needHR, { excludeKeys: new Set(['weak1B']) })).toEqual([])
  })
})
