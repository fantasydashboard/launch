import { describe, it, expect } from 'vitest'
import { positionalValue, needWeightsFromSnapshot, type EligiblePlayer } from '../positionalValue'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false },
]

const mk = (key: string, pos: string[], hr: number, sb: number): EligiblePlayer => ({
  playerKey: key,
  name: key,
  team: 'X',
  eligiblePositions: pos,
  stats: { HR: hr, SB: sb },
  roleValue: 0, // unused by positionalValue; required by the interface
})

describe('needWeightsFromSnapshot', () => {
  it('weights contested cats, zeroes safe / hopeless', () => {
    const w = needWeightsFromSnapshot([
      { statId: 'HR', status: 'tossup', myWinPct: 50 },
      { statId: 'SB', status: 'loss', myWinPct: 40 }, // in reach
      { statId: 'R', status: 'loss', myWinPct: 10 }, // hopeless
      { statId: 'K', status: 'safe', myWinPct: 85 }, // banked
    ])
    expect(w.HR).toBe(1)
    expect(w.SB).toBe(1)
    expect(w.R).toBe(0)
    expect(w.K).toBe(0)
  })
})

describe('positionalValue', () => {
  const pool: EligiblePlayer[] = [
    mk('power1B', ['1B'], 35, 1),
    mk('weak1B', ['1B'], 8, 2),
    mk('mid1B', ['1B'], 18, 3),
    mk('speedOF', ['OF'], 10, 35),
  ]

  it('ranks players within their position by need-weighted value', () => {
    const needHR = { HR: 1, SB: 0 }
    const power = positionalValue(mk('power1B', ['1B'], 35, 1), '1B', pool, cats, needHR)
    const weak = positionalValue(mk('weak1B', ['1B'], 8, 2), '1B', pool, cats, needHR)
    expect(power).toBeGreaterThan(weak) // the masher is the better 1B when you need HR
  })

  it('is need-aware: the same player is weak or strong depending on the cat you need', () => {
    // A team needing SB values a speed guy; a team needing HR does not.
    const speedy = mk('speedOF', ['OF'], 10, 35)
    const poolOF: EligiblePlayer[] = [speedy, mk('slowOF', ['OF'], 12, 2), mk('midOF', ['OF'], 15, 8)]
    const needSB = positionalValue(speedy, 'OF', poolOF, cats, { HR: 0, SB: 1 })
    const needHR = positionalValue(speedy, 'OF', poolOF, cats, { HR: 1, SB: 0 })
    expect(needSB).toBeGreaterThan(needHR)
  })

  it('only evaluates players eligible at the position', () => {
    // speedOF is not a 1B, so it does not affect the 1B pool baseline.
    const withOF = positionalValue(mk('mid1B', ['1B'], 18, 3), '1B', pool, cats, { HR: 1, SB: 0 })
    const without = positionalValue(
      mk('mid1B', ['1B'], 18, 3),
      '1B',
      pool.filter((p) => p.playerKey !== 'speedOF'),
      cats,
      { HR: 1, SB: 0 },
    )
    expect(withOF).toBeCloseTo(without, 9)
  })

  it('returns 0 when no one is eligible at the position', () => {
    expect(positionalValue(mk('x', ['C'], 5, 5), 'C', pool, cats, { HR: 1 })).toBe(0)
  })
})
