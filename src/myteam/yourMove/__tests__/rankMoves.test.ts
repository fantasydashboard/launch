import { describe, it, expect } from 'vitest'
import { rankMoves } from '../rankMoves'
import type { CandidateAction } from '../types'

const mk = (key: string, lift: number): CandidateAction => ({
  kind: 'add',
  player: { key, name: key, team: '', position: '' },
  categories: ['HR'],
  winProbLift: lift,
  rationale: '',
})

describe('rankMoves', () => {
  it('orders by lift desc and caps the stack', () => {
    const ranked = rankMoves([mk('a', 2), mk('b', 9), mk('c', 5)], { maxMoves: 2, liftFloor: 1 })
    expect(ranked.map((m) => m.player.key)).toEqual(['b', 'c'])
  })

  it('drops candidates below the lift floor', () => {
    const ranked = rankMoves([mk('a', 0.4), mk('b', 3)], { maxMoves: 4, liftFloor: 1 })
    expect(ranked.map((m) => m.player.key)).toEqual(['b'])
  })

  it('dedupes by player, keeping the highest-lift entry', () => {
    const ranked = rankMoves([mk('a', 3), mk('a', 8), mk('b', 5)], { maxMoves: 4, liftFloor: 1 })
    expect(ranked.map((m) => m.player.key)).toEqual(['a', 'b'])
    expect(ranked[0].winProbLift).toBe(8)
  })
})
