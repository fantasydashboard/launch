import { describe, it, expect } from 'vitest'
import { isBenchSlot, opponentStartersBySeat } from '../opponentStarters'

const p = (playerKey: string, teamKey: string, lineupSlot?: string) =>
  ({ playerKey, teamKey, lineupSlot } as any)

describe('isBenchSlot', () => {
  it('knows every spelling of a seat that does not count', () => {
    for (const s of ['BN', 'BE', 'Bench', 'IR', 'IL', 'IL+', 'NA', 'DL', 'TAXI', 'il']) {
      expect(isBenchSlot(s)).toBe(true)
    }
  })

  it('treats a real slot as a real slot', () => {
    for (const s of ['C', 'LW', 'D', 'G', 'UTIL', 'Util', 'F', 'QB', 'FLEX']) {
      expect(isBenchSlot(s)).toBe(false)
    }
  })

  /* An unknown slot is not a bench slot — it is an unknown, and calling it bench would
     quietly drop a started player out of the opponent's lineup. */
  it('does not call an unknown slot a bench slot', () => {
    expect(isBenchSlot('')).toBe(false)
    expect(isBenchSlot(undefined)).toBe(false)
  })
})

describe('opponentStartersBySeat', () => {
  const seats = [{ slot: 'C' }, { slot: 'C' }, { slot: 'LW' }, { slot: 'D' }, { slot: 'G' }]
  const pool = [
    p('them-c1', 'espn_7', 'C'), p('them-c2', 'espn_7', 'C'),
    p('them-lw', 'espn_7', 'LW'), p('them-d', 'espn_7', 'D'), p('them-g', 'espn_7', 'G'),
    p('them-bench', 'espn_7', 'BN'),
    p('mine-c', 'espn_3', 'C'),
  ]

  it('fills each of my seats with their man in the same slot', () => {
    expect(opponentStartersBySeat(seats, pool, 'espn_7'))
      .toEqual(['them-c1', 'them-c2', 'them-lw', 'them-d', 'them-g'])
  })

  it('never takes a player from another team', () => {
    expect(opponentStartersBySeat(seats, pool, 'espn_7')).not.toContain('mine-c')
  })

  it('leaves their benched players out', () => {
    expect(opponentStartersBySeat(seats, pool, 'espn_7')).not.toContain('them-bench')
  })

  /* Each man fills one seat. Handing the same player to two seats would double his value
     across the matchup and invent an opponent stronger than the one they set. */
  it('gives each of their players at most one seat', () => {
    const out = opponentStartersBySeat([{ slot: 'C' }, { slot: 'C' }, { slot: 'C' }], pool, 'espn_7')
    expect(out).toEqual(['them-c1', 'them-c2', ''])
    expect(out.filter(Boolean).length).toBe(new Set(out.filter(Boolean)).size)
  })

  it('reports an empty seat as empty rather than shifting everyone up one', () => {
    const thin = [p('them-c1', 'espn_7', 'C'), p('them-g', 'espn_7', 'G')]
    /* The G must still land in the G seat, not slide into the LW seat the C left open. */
    expect(opponentStartersBySeat(seats, thin, 'espn_7'))
      .toEqual(['them-c1', '', '', '', 'them-g'])
  })

  it('matches a slot however the platform capitalises it', () => {
    const yahoo = [p('them-util', 'y.7', 'Util')]
    expect(opponentStartersBySeat([{ slot: 'UTIL' }], yahoo, 'y.7')).toEqual(['them-util'])
  })

  /*
   * THE CASE THAT MATTERS MOST. A pool whose rows carry no slot at all is not a lineup of
   * empty seats, it is a lineup we cannot see — and the caller has to be able to tell those
   * apart, because rendering the second as the first invents a scoreline.
   */
  it('returns nothing when the pool carries no slots, so the caller can say it does not know', () => {
    const slotless = [p('them-a', 'espn_7'), p('them-b', 'espn_7')]
    expect(opponentStartersBySeat(seats, slotless, 'espn_7')).toEqual([])
  })

  it('returns nothing for a team with nobody in the pool', () => {
    expect(opponentStartersBySeat(seats, pool, 'espn_99')).toEqual([])
    expect(opponentStartersBySeat(seats, pool, '')).toEqual([])
  })
})
