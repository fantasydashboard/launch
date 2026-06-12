import { describe, it, expect } from 'vitest'
import { tierAdds, ADD_MIN_LIFT, ADD_STRONG_LIFT } from '../tierAdds'
import type { CandidateAction } from '@/myteam/yourMove/types'

// displayLift is linear below 10pp, so winProbLift == displayed lift in these cases.
const a = (key: string, lift: number): CandidateAction => ({
  kind: 'add',
  player: { key, name: key, team: 'X', position: 'OF' },
  categories: ['HR'],
  winProbLift: lift,
  rationale: '',
})

describe('tierAdds', () => {
  it('drops adds below the floor entirely', () => {
    const { strong, smaller } = tierAdds([a('p1', 2), a('p2', 1), a('p3', 0)])
    expect(strong).toHaveLength(0)
    expect(smaller).toHaveLength(0)
  })

  it('splits strong vs smaller at the strong threshold', () => {
    const { strong, smaller } = tierAdds([a('s1', 11), a('s2', 5), a('m1', 4), a('m2', 3)])
    expect(strong.map((x) => x.player.key)).toEqual(['s1', 's2'])
    expect(smaller.map((x) => x.player.key)).toEqual(['m1', 'm2'])
  })

  it('threshold constants are sane (min below strong)', () => {
    expect(ADD_MIN_LIFT).toBeLessThan(ADD_STRONG_LIFT)
  })
})
