import { describe, it, expect } from 'vitest'
import { openNights, openShare, usableFor, skaterPositions, DEFAULT_SKATER_SLOTS, type UsableRosterPlayer, type Night } from '../usableGames'

const night = (date: string, ...teams: string[]): Night => ({ date, teams: new Set(teams) })
const p = (key: string, team: string, pos: string, rate = 2, out = false): UsableRosterPlayer =>
  ({ key, team, positions: skaterPositions(pos), rate, out })

// A full 13-skater roster: 3C 3LW 3RW 4D, every team different.
const roster = [
  p('c1','A','C',3), p('c2','B','C',2.5), p('c3','C','C',2),
  p('l1','D','LW',3), p('l2','E','LW',2.5), p('l3','F','LW',2),
  p('r1','G','RW',3), p('r2','H','RW',2.5), p('r3','I','RW',2),
  p('d1','J','D',2), p('d2','K','D',1.8), p('d3','L','D',1.6), p('d4','M','D',1.4),
]
const everyone = 'ABCDEFGHIJKLM'.split('')

describe('skaterPositions', () => {
  it('reads multi-position strings and drops non-skaters', () => {
    expect(skaterPositions('C,LW')).toEqual(['C', 'LW'])
    expect(skaterPositions('RW/C')).toEqual(['RW', 'C'])
    expect(skaterPositions('G')).toEqual([])
    expect(skaterPositions(['D'])).toEqual(['D'])
  })
})

describe('openNights', () => {
  it('a light night with one of my players is open everywhere', () => {
    const open = openNights(roster, DEFAULT_SKATER_SLOTS, [night('2026-10-06', 'A', 'X')])
    expect(open['2026-10-06']).toEqual({ C: 1, LW: 1, RW: 1, D: 1 })
  })
  it('a night when my whole roster plays has no open forward spot, but D stays open via nothing left', () => {
    const open = openNights(roster, DEFAULT_SKATER_SLOTS, [night('n', ...everyone)])
    // 3 C fill 2 C + UTIL; LW/RW overflow to bench; 4 D fill 4 D. Nothing open.
    expect(open['n']).toEqual({ C: 0, LW: 0, RW: 0, D: 0 })
  })
  it('D stays open when the forwards are full and a D is idle', () => {
    const open = openNights(roster, DEFAULT_SKATER_SLOTS, [night('n', ...'ABCDEFGHIJK'.split(''))]) // L, M idle
    expect(open['n'].C).toBe(0)
    expect(open['n'].D).toBe(1)
  })
  it('a multi-position player is open if any of his positions has room', () => {
    const full = openNights(roster, DEFAULT_SKATER_SLOTS, [night('n', 'A','B','C','D','E','F','J','K','L','M')]) // RW all idle
    const u = usableFor({ team: 'Z', positions: skaterPositions('C,RW'), rate: 2 }, [night('n','Z')], full)
    expect(u.usable).toBe(1)
  })
  it('an injured player does not take a slot', () => {
    const hurt = roster.map((x) => (x.key === 'd1' ? { ...x, out: true } : x))
    const open = openNights(hurt, DEFAULT_SKATER_SLOTS, [night('n', ...everyone)])
    expect(open['n'].D).toBe(1)
  })
  it('a short roster is open every night', () => {
    const open = openNights([p('c1','A','C')], DEFAULT_SKATER_SLOTS, [night('n','A')])
    expect(open['n']).toEqual({ C: 1, LW: 1, RW: 1, D: 1 })
  })
})

describe('openShare and usableFor', () => {
  it('averages managers', () => {
    const busy = roster
    const idle = roster.map((x) => ({ ...x, team: 'NONE' }))
    const share = openShare([busy, idle], DEFAULT_SKATER_SLOTS, [night('n', ...everyone)])
    expect(share['n'].C).toBeCloseTo(0.5)
  })
  it('points = rate x usable, and nights he does not play are 0', () => {
    const open = { a: { C: 1, LW: 1, RW: 1, D: 1 }, b: { C: 0.25, LW: 0.25, RW: 0.25, D: 1 } }
    const u = usableFor({ team: 'T', positions: ['C'], rate: 2 }, [night('a','T'), night('b','T'), night('c','X')], open as any)
    expect(u.games).toBe(2)
    expect(u.usable).toBeCloseTo(1.25)
    expect(u.points).toBeCloseTo(2.5)
    expect(u.byNight.map((n) => n.plays)).toEqual([true, true, false])
  })
})
