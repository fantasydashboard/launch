import { describe, it, expect } from 'vitest'
import { publicNflPool } from '../publicPool'

const player = (over: Record<string, any> = {}) => ({
  full_name: 'Some Body', position: 'RB', team: 'SF', active: true, ...over,
})

describe('publicNflPool', () => {
  it('keys each player by his Sleeper id', () => {
    const pool = publicNflPool({ '4034': player({ full_name: 'Christian McCaffrey' }) })
    expect(pool).toHaveLength(1)
    expect(pool[0].playerKey).toBe('4034')
    expect(pool[0].name).toBe('Christian McCaffrey')
  })

  /* Sleeper's player map is the whole universe — retired players, practice-squad bodies and
     every position in the sport. A rankings board of 11,000 rows is not a rankings board. */
  it('keeps only the four skill positions', () => {
    const pool = publicNflPool({
      a: player({ position: 'QB' }), b: player({ position: 'RB' }),
      c: player({ position: 'WR' }), d: player({ position: 'TE' }),
      e: player({ position: 'K' }), f: player({ position: 'DEF' }),
      g: player({ position: 'LB' }),
    })
    expect(pool.map((p) => p.position).sort()).toEqual(['QB', 'RB', 'TE', 'WR'])
  })

  it('drops inactive players', () => {
    const pool = publicNflPool({ a: player({ active: false }) })
    expect(pool).toHaveLength(0)
  })

  /*
   * Sleeper does not send `active` for every player, and the pool must keep the ones it
   * omits. Worth its own case because every other fixture here sets the key explicitly, so
   * an implementation that started REQUIRING active === true would drop most of the real map
   * while this file went on passing.
   */
  it('keeps a player whose active flag is absent entirely', () => {
    const { active: _active, ...noFlag } = player()
    const pool = publicNflPool({ a: noFlag })
    expect(pool).toHaveLength(1)
    expect(pool[0].playerKey).toBe('a')
  })

  /* A free agent with no NFL team has no schedule, so no bye and no games remaining —
     every downstream number about him would be a guess dressed as a projection. */
  it('drops players with no NFL team', () => {
    const pool = publicNflPool({ a: player({ team: null }) })
    expect(pool).toHaveLength(0)
  })

  it('drops a player with no name to show', () => {
    const pool = publicNflPool({ a: player({ full_name: '' }) })
    expect(pool).toHaveLength(0)
  })

  it('upper-cases the pro team so the schedule join matches', () => {
    const pool = publicNflPool({ a: player({ team: 'sf' }) })
    expect(pool[0].proTeam).toBe('SF')
  })

  /* Nobody owns anybody on a public board. teamKey must not collide with a real roster id. */
  it('gives every player the same empty owner', () => {
    const pool = publicNflPool({ a: player(), b: player() })
    expect(pool.every((p) => p.teamKey === '')).toBe(true)
  })

  it('points at the Sleeper thumbnail for the id', () => {
    const pool = publicNflPool({ '4034': player() })
    expect(pool[0].headshot).toBe('https://sleepercdn.com/content/nfl/players/thumb/4034.jpg')
  })
})
