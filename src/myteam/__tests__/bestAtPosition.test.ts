import { describe, it, expect } from 'vitest'
import { bestBodyAt } from '../bestAtPosition'

const p = (key: string, team: string, pos: string, name = key): any =>
  ({ playerKey: key, name, position: pos, teamKey: team, eligiblePositions: pos.split(','), proTeam: 'NYI' })

describe('bestBodyAt', () => {
  const pool = [
    p('a', 'them', 'C', 'Dylan Cozens'),
    p('b', 'them', 'C', 'Sam Bennett'),
    p('c', 'them', 'D', 'Moritz Seider'),
    p('d', 'mine', 'C', 'Steven Stamkos'),
  ]
  const valueByKey: any = {
    a: { total: 331, games: 82 }, b: { total: 232, games: 82 },
    c: { total: 260, games: 82 }, d: { total: 339, games: 82 },
  }

  it('names the best body that team holds at the position', () => {
    expect(bestBodyAt({ pool, valueByKey, teamKey: 'them', position: 'C', sport: 'hockey' }))
      .toEqual({ name: 'Dylan Cozens', points: 331 })
  })

  it('does not reach onto another roster', () => {
    const best = bestBodyAt({ pool, valueByKey, teamKey: 'them', position: 'C', sport: 'hockey' })!
    expect(best.name).not.toBe('Steven Stamkos')
  })

  it('honours multi-position eligibility', () => {
    const multi = [p('m', 'them', 'C,LW', 'Mika Zibanejad')]
    const best = bestBodyAt({
      pool: multi, valueByKey: { m: { total: 263, games: 82 } } as any,
      teamKey: 'them', position: 'LW', sport: 'hockey',
    })
    expect(best?.name).toBe('Mika Zibanejad')
  })

  /* Unpriced is not zero — see the module header. */
  it('ignores a body with no projection rather than naming him', () => {
    const best = bestBodyAt({
      pool: [p('x', 'them', 'C', 'Nobody Priced'), p('a', 'them', 'C', 'Dylan Cozens')],
      valueByKey: { a: { total: 331, games: 82 } } as any,
      teamKey: 'them', position: 'C', sport: 'hockey',
    })
    expect(best?.name).toBe('Dylan Cozens')
  })

  it('returns null when the team has nobody priced there', () => {
    expect(bestBodyAt({ pool, valueByKey, teamKey: 'them', position: 'G', sport: 'hockey' })).toBeNull()
  })
})
