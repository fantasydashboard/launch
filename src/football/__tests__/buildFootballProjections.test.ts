import { describe, it, expect } from 'vitest'
import {
  normalizeNflName,
  buildFootballProjectionsByKey,
  resolveSleeperIds,
  type ProjPlayer,
  type SleeperPlayerMeta,
} from '../buildFootballProjections'
import type { WeekProjections } from '@/services/footballProjections'

// Standard PPR-ish scoring subset for deterministic points.
const scoring = { pass_yd: 0.04, pass_td: 4, rush_yd: 0.1, rush_td: 6, rec: 1, rec_yd: 0.1, rec_td: 6 }

describe('normalizeNflName', () => {
  it('lowercases, strips punctuation and suffixes', () => {
    expect(normalizeNflName("Ke'Shawn Vaughn Jr.")).toBe('keshawn vaughn')
    expect(normalizeNflName('A.J. Brown')).toBe('aj brown')
    expect(normalizeNflName('Michael Pittman II')).toBe('michael pittman')
  })
})

describe('buildFootballProjectionsByKey', () => {
  const summed: WeekProjections = {
    'sleep_qb': { pass_yd: 4000, pass_td: 30 },
    'sleep_rb': { rush_yd: 1200, rush_td: 10, rec: 40, rec_yd: 300 },
  }
  const meta: Record<string, SleeperPlayerMeta> = {
    'sleep_qb': { name: 'Josh Allen', position: 'QB' },
    'sleep_rb': { name: 'Bijan Robinson', position: 'RB' },
  }

  it('Sleeper players match by sleeperId and get correct points', () => {
    const players: ProjPlayer[] = [{ key: 'k_qb', name: 'Josh Allen', position: 'QB', sleeperId: 'sleep_qb' }]
    const out = buildFootballProjectionsByKey(players, summed, meta, scoring)
    // 4000*0.04 + 30*4 = 160 + 120 = 280
    expect(out['k_qb'].points).toBeCloseTo(280, 5)
    expect(out['k_qb'].stats.pass_yd).toBe(4000)
  })

  it('ESPN/Yahoo players (no sleeperId) match by normalized name + position', () => {
    const players: ProjPlayer[] = [{ key: 'espn_rb', name: 'Bijan Robinson', position: 'RB' }]
    const out = buildFootballProjectionsByKey(players, summed, meta, scoring)
    // 1200*0.1 + 10*6 + 40*1 + 300*0.1 = 120 + 60 + 40 + 30 = 250
    expect(out['espn_rb'].points).toBeCloseTo(250, 5)
  })

  it('does NOT match a same-name different-position player', () => {
    const players: ProjPlayer[] = [{ key: 'x', name: 'Josh Allen', position: 'RB' }]
    expect(buildFootballProjectionsByKey(players, summed, meta, scoring)['x']).toBeUndefined()
  })

  it('omits players with no projection match', () => {
    const players: ProjPlayer[] = [{ key: 'ghost', name: 'Nobody Here', position: 'WR' }]
    expect(Object.keys(buildFootballProjectionsByKey(players, summed, meta, scoring))).toEqual([])
  })
})

/*
 * The same match `buildFootballProjectionsByKey` performs, exposed on its own.
 *
 * Anything that needs a league player's NFL facts — his pro team, for the bye that decides how
 * many games he still plays — has to run the identical join, and a second copy of the rules
 * would drift from this one and quietly mismatch a handful of players.
 */
describe('resolveSleeperIds', () => {
  const meta: Record<string, SleeperPlayerMeta> = {
    '111': { name: 'Jahmyr Gibbs', position: 'RB' },
    '222': { name: "Ja'Marr Chase", position: 'WR' },
  }

  it('prefers the sleeper id a player already carries', () => {
    const out = resolveSleeperIds([{ key: 'k1', name: 'whoever', position: 'RB', sleeperId: '111' }], meta)
    expect(out.k1).toBe('111')
  })

  it('falls back to normalized name and position', () => {
    const out = resolveSleeperIds([{ key: 'k2', name: 'JaMarr Chase', position: 'wr' }], meta)
    expect(out.k2).toBe('222')
  })

  it('omits a player it cannot match, rather than guessing', () => {
    const out = resolveSleeperIds([{ key: 'k3', name: 'Nobody At All', position: 'TE' }], meta)
    expect(out.k3).toBeUndefined()
  })

  it('does not match across positions', () => {
    const out = resolveSleeperIds([{ key: 'k4', name: 'Jahmyr Gibbs', position: 'WR' }], meta)
    expect(out.k4).toBeUndefined()
  })
})
