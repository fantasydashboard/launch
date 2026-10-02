import { describe, it, expect } from 'vitest'
import { pointsUsablePicks } from '../pointsUsablePicks'
describe('pointsUsablePicks', () => {
  it('ranks by per-game rate times usable games', () => {
    const r = pointsUsablePicks([
      { key: 'a', name: 'A', position: 'C', perGame: 3, usable: 1 },     // 3
      { key: 'b', name: 'B', position: 'D', perGame: 2, usable: 3.5 },   // 7
      { key: 'c', name: 'C', position: 'LW', perGame: 5, usable: 0 },    // dropped
    ])
    expect(r.map((x) => [x.key, x.points])).toEqual([['b', 7], ['a', 3]])
  })
  it('drops unscored players and honours n', () => {
    const r = pointsUsablePicks([
      { key: 'a', name: 'A', position: 'C', perGame: 3, usable: null },
      { key: 'b', name: 'B', position: 'C', perGame: 1, usable: 1 },
      { key: 'c', name: 'C', position: 'C', perGame: 2, usable: 1 },
    ], 1)
    expect(r.map((x) => x.key)).toEqual(['c'])
  })
})
