import { describe, it, expect } from 'vitest'
import { buildRosMovers, type MoverPlayer } from '../rosMovers'

const players: Record<string, MoverPlayer> = {
  wrA: { playerKey: 'wrA', name: 'Climber', position: 'WR', team: 'CAR' },
  wrB: { playerKey: 'wrB', name: 'Slider', position: 'WR', team: 'PHI' },
  wrC: { playerKey: 'wrC', name: 'Steady', position: 'WR', team: 'DET' },
  wrDeep: { playerKey: 'wrDeep', name: 'Deep Guy', position: 'WR', team: 'NYJ' },
  rbA: { playerKey: 'rbA', name: 'Back One', position: 'RB', team: 'KC' },
  kicker: { playerKey: 'kicker', name: 'Some Kicker', position: 'K', team: 'BUF' },
}
const depth = { QB: 24, RB: 48, WR: 60, TE: 36 }
const build = (
  current: Record<string, number>,
  previous: Record<string, number>,
  over: Partial<Parameters<typeof buildRosMovers>[0]> = {},
) => buildRosMovers({ current, previous, players, depth, ...over })

describe('buildRosMovers', () => {
  it('reports a climb with where he came from and where he is now', () => {
    const { risers } = build({ wrA: 15 }, { wrA: 29 })
    expect(risers).toHaveLength(1)
    expect(risers[0]).toMatchObject({ name: 'Climber', position: 'WR', team: 'CAR', from: 29, to: 15, move: 14 })
  })

  it('reports a drop as a faller, not a riser', () => {
    const { risers, fallers } = build({ wrB: 39 }, { wrB: 26 })
    expect(risers).toHaveLength(0)
    expect(fallers).toHaveLength(1)
    expect(fallers[0]).toMatchObject({ name: 'Slider', from: 26, to: 39, move: -13 })
  })

  /* A one- or two-slot shuffle is the board breathing, not news. Given a green arrow it would
     read as a recommendation, and there are dozens of them every week. */
  it('ignores movement below the floor', () => {
    const { risers, fallers } = build({ wrA: 18, wrB: 22 }, { wrA: 20, wrB: 20 }, { minMove: 3 })
    expect(risers).toHaveLength(0)
    expect(fallers).toHaveLength(0)
  })

  it('counts a move exactly at the floor', () => {
    const { risers } = build({ wrA: 17 }, { wrA: 20 }, { minMove: 3 })
    expect(risers).toHaveLength(1)
  })

  /*
   * The filter that decides whether this is a post or a list of noise. Below the relevant depth
   * the ranks are nearly arbitrary — a point of projection separates twenty receivers — so the
   * biggest MOVES in the whole pool are almost all down there, and unfiltered they crowd out
   * every name a reader recognises.
   */
  it('leaves out a climb that happens far outside the relevant pool', () => {
    const { risers } = build({ wrDeep: 70 }, { wrDeep: 100 })
    expect(risers).toHaveLength(0)
  })

  it('keeps a faller who mattered last week even though he has dropped out of the pool', () => {
    const { fallers } = build({ wrDeep: 75 }, { wrDeep: 55 })
    expect(fallers).toHaveLength(1)
    expect(fallers[0]).toMatchObject({ from: 55, to: 75 })
  })

  it('keeps a riser who has climbed INTO the pool from outside it', () => {
    const { risers } = build({ wrDeep: 44 }, { wrDeep: 71 })
    expect(risers).toHaveLength(1)
  })

  /* Movement cannot be measured against a board he was not on. */
  it('skips a player missing from either board', () => {
    const { risers, fallers } = build({ wrA: 10 }, { wrB: 10 })
    expect(risers).toHaveLength(0)
    expect(fallers).toHaveLength(0)
  })

  it('skips a position the board does not rank', () => {
    const { risers } = build({ kicker: 1 }, { kicker: 20 })
    expect(risers).toHaveLength(0)
  })

  it('skips a player with no meta on file rather than naming him blank', () => {
    const { risers } = build({ ghost: 5 }, { ghost: 40 })
    expect(risers).toHaveLength(0)
  })

  it('leads with the biggest climb and respects the limit', () => {
    const current = { wrA: 10, wrB: 20, wrC: 30, rbA: 5 }
    const previous = { wrA: 40, wrB: 25, wrC: 45, rbA: 30 }
    // Climber +30, Back One +25, Steady +15, Slider +5.
    const { risers } = build(current, previous, { limit: 2 })
    expect(risers.map((r) => r.name)).toEqual(['Climber', 'Back One'])
  })

  it('leads with the biggest drop', () => {
    const current = { wrA: 40, wrB: 25, wrC: 45 }
    const previous = { wrA: 10, wrB: 20, wrC: 30 }
    const { fallers } = build(current, previous, { limit: 2 })
    expect(fallers.map((r) => r.move)).toEqual([-30, -15])
  })

  it('ranks players across positions in one list', () => {
    const { risers } = build({ wrA: 12, rbA: 4 }, { wrA: 20, rbA: 30 })
    expect(risers.map((r) => r.position)).toEqual(['RB', 'WR'])
  })

  it('returns empty lists for empty input', () => {
    expect(build({}, {})).toEqual({ risers: [], fallers: [] })
  })
})
