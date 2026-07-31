import { describe, it, expect } from 'vitest'
import { optimalLineup, lineupMarginal } from '../lineupMarginal'
import type { DepthPlayer } from '@/trades/positionalLandscape'

// slots: 1 QB, 2 RB, 1 FLEX (RB/WR/TE)
const slots = { QB: 1, RB: 2, FLEX: 1 }

function dp(playerKey: string, position: string, value: number): DepthPlayer {
  return { playerKey, teamKey: 'me', eligiblePositions: [position], value }
}

const roster: DepthPlayer[] = [
  dp('qb1', 'QB', 300),
  dp('rb1', 'RB', 200),
  dp('rb2', 'RB', 150),
  dp('rb3', 'RB', 90), // fills FLEX
]

describe('optimalLineup', () => {
  it('sums the best legal lineup and reports who starts', () => {
    const r = optimalLineup(roster, slots)
    expect(r.total).toBe(740) // 300 + 200 + 150 + 90
    expect(r.started.has('qb1')).toBe(true)
  })
})

describe('lineupMarginal', () => {
  it('a 2nd QB behind an elite starter adds nothing (marginal 0)', () => {
    const m = lineupMarginal(roster, dp('qb2', 'QB', 250), slots)
    expect(m.marginal).toBe(0)
    expect(m.dropKey).toBeNull()
  })

  it('a better flex-eligible RB improves the lineup and displaces the weakest starter', () => {
    // rb4=170 beats rb3=90 in the FLEX → +80, displacing rb3.
    const m = lineupMarginal(roster, dp('rb4', 'RB', 170), slots)
    expect(m.marginal).toBe(80)
    expect(m.dropKey).toBe('rb3')
  })

  it('an elite QB upgrade displaces the incumbent QB', () => {
    const m = lineupMarginal(roster, dp('qbX', 'QB', 400), slots)
    expect(m.marginal).toBe(100) // 400 − 300
    expect(m.dropKey).toBe('qb1')
  })
})
