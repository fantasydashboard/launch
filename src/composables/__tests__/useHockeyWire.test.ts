import { describe, it, expect } from 'vitest'
import { sideOf, groupPoolByTeam, toHockeyCategories, rankDropOptions } from '../useHockeyWire'
import type { CatSpec } from '@/myteam/types'

describe('sideOf', () => {
  /* The only roster rule hockey has that the engine needs: you cannot replace a goalie with a
     winger, because the slot is not the same slot. */
  it('separates goalies from everybody else', () => {
    expect(sideOf('G')).toBe('goalie')
    expect(sideOf('C')).toBe('skater')
    expect(sideOf('LW')).toBe('skater')
    expect(sideOf('D')).toBe('skater')
  })

  it('treats an unknown position as a skater, which is what most of them are', () => {
    expect(sideOf('')).toBe('skater')
    expect(sideOf(undefined as unknown as string)).toBe('skater')
  })
})

describe('groupPoolByTeam', () => {
  const stats = (k: string) => ({ G: k === 'a' ? 10 : 20 })

  /*
   * `pool` carries `teamKey` as `espn_{id}` and the aggregator speaks the bare id. Leaving the
   * prefix on produces a league in which no team matches the one the reader is on, so every
   * row is scored against nobody.
   */
  it('strips the platform prefix so team ids match the standings', () => {
    const out = groupPoolByTeam(
      [{ playerKey: 'a', teamKey: 'espn_3' }, { playerKey: 'b', teamKey: 'espn_7' }],
      stats,
    )
    expect(out.map((t) => t.teamId).sort()).toEqual(['3', '7'])
  })

  it('gathers a team’s players under one entry', () => {
    const out = groupPoolByTeam(
      [{ playerKey: 'a', teamKey: 'espn_3' }, { playerKey: 'b', teamKey: 'espn_3' }],
      stats,
    )
    expect(out).toHaveLength(1)
    expect(out[0].players.map((p) => p.playerKey)).toEqual(['a', 'b'])
  })

  it('attaches the rest-of-season stats rather than the row’s own', () => {
    const out = groupPoolByTeam([{ playerKey: 'a', teamKey: 'espn_3' }], stats)
    expect(out[0].players[0].stats).toEqual({ G: 10 })
  })

  /* A player with no team cannot be counted toward one. */
  it('drops a player with no team rather than inventing a bucket', () => {
    expect(groupPoolByTeam([{ playerKey: 'a' }], stats)).toEqual([])
  })
})

describe('toHockeyCategories', () => {
  it('carries the direction, because several hockey columns are won by having fewer', () => {
    const cats = [
      { statId: 'G', lowerIsBetter: false },
      { statId: 'GAA', lowerIsBetter: true },
    ] as CatSpec[]
    expect(toHockeyCategories(cats)).toEqual([
      { key: 'G', statId: 0, reverse: false },
      { key: 'GAA', statId: 0, reverse: true },
    ])
  })
})

describe('rankDropOptions', () => {
  const roster = [
    { playerKey: 'star', position: 'C' },
    { playerKey: 'filler', position: 'RW' },
    { playerKey: 'goalie', position: 'G' },
  ]
  const totals = { star: 8.5, filler: -1.2, goalie: 2.0 }
  const stats = (k: string) => ({ G: k === 'star' ? 40 : 5 })

  it('puts the weakest player first, because that is who comes off', () => {
    const out = rankDropOptions(roster, totals, stats)
    expect(out.map((d) => d.playerKey)).toEqual(['filler', 'goalie', 'star'])
  })

  /*
   * THE REASON THIS RANKS ON Z AND NOT ON RAW TOTALS.
   *
   * A league scoring shots and goals puts two hundred of one against thirty of the other, so
   * a sum of raw columns is a shot count wearing the name of a value — and the highest-volume
   * shooter on a roster would be the last player it ever offered to drop. Here the shot
   * machine has the lower z and must sort ahead of the scorer despite outnumbering him
   * six to one on raw totals.
   */
  it('ranks on value rather than on whichever column has the biggest numbers', () => {
    const shotMachine = [
      { playerKey: 'volume', position: 'RW' },
      { playerKey: 'scorer', position: 'C' },
    ]
    const out = rankDropOptions(
      shotMachine,
      { volume: -0.5, scorer: 6.0 },
      (k) => (k === 'volume' ? { SOG: 240, G: 8 } : { SOG: 150, G: 40 }),
    )
    expect(out[0].playerKey).toBe('volume')
  })

  it('leaves an injured player out, because his slot is not the one an add takes', () => {
    const out = rankDropOptions(
      [...roster, { playerKey: 'hurt', position: 'D', onIL: true }],
      { ...totals, hurt: -9 },
      stats,
    )
    expect(out.map((d) => d.playerKey)).not.toContain('hurt')
  })

  /* An unrateable body on a roster is exactly who should be first out the door, not somebody
     the sort quietly promotes by treating his absence as a zero. */
  it('sorts a player the projection has never heard of to the bottom', () => {
    const out = rankDropOptions([...roster, { playerKey: 'ghost', position: 'C' }], totals, stats)
    expect(out[0].playerKey).toBe('ghost')
  })

  it('carries the roster half through, so a goalie is only swapped for a goalie', () => {
    const out = rankDropOptions(roster, totals, stats)
    expect(out.find((d) => d.playerKey === 'goalie')!.side).toBe('goalie')
    expect(out.find((d) => d.playerKey === 'star')!.side).toBe('skater')
  })
})
