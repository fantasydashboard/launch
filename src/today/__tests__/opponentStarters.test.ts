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

/*
 * A FULL SLATE, WHICH IS THE NIGHT THIS HAS NEVER RUN ON.
 *
 * Every screenshot of this feature so far came from a five-game night, where most of both
 * lineups is idle and the pairing is barely exercised — a seat whose occupant is not playing
 * looks the same whether we paired it right or not. On a twelve-game night every seat is live
 * and a mispairing is a wrong verdict on a real decision, so the cases below are the ones a
 * quiet night cannot show.
 */
describe('a full slate, every seat live', () => {
  /* A standard ESPN hockey lineup, in the order the platform publishes it. */
  const SEATS = ['C', 'C', 'LW', 'LW', 'RW', 'RW', 'D', 'D', 'D', 'D', 'UTIL', 'G', 'G']
    .map((slot) => ({ slot }))

  const them = (pairs: [string, string][]) =>
    pairs.map(([playerKey, lineupSlot]) => ({ playerKey, teamKey: 'espn_9', lineupSlot } as any))

  it('fills all thirteen seats from a full opposing lineup, in slot order', () => {
    const pool = them([
      ['c1', 'C'], ['c2', 'C'], ['lw1', 'LW'], ['lw2', 'LW'], ['rw1', 'RW'], ['rw2', 'RW'],
      ['d1', 'D'], ['d2', 'D'], ['d3', 'D'], ['d4', 'D'], ['u1', 'UTIL'], ['g1', 'G'], ['g2', 'G'],
      ['bench1', 'BN'], ['bench2', 'BN'],
    ])
    expect(opponentStartersBySeat(SEATS, pool, 'espn_9')).toEqual([
      'c1', 'c2', 'lw1', 'lw2', 'rw1', 'rw2', 'd1', 'd2', 'd3', 'd4', 'u1', 'g1', 'g2',
    ])
  })

  /*
   * THE ONE THAT WOULD BITE. Two seats share a slot, and if the queue were re-read rather than
   * consumed, the better of their two centres would be handed to BOTH of my centre seats —
   * inventing an opponent stronger than the one they set, twice over, on the seats a manager
   * is actually deciding.
   */
  it('never hands the same man to two seats that share a slot', () => {
    const pool = them([['c1', 'C'], ['c2', 'C'], ['d1', 'D'], ['d2', 'D'], ['d3', 'D'], ['d4', 'D']])
    const out = opponentStartersBySeat(SEATS, pool, 'espn_9')
    const filled = out.filter(Boolean)
    expect(filled).toEqual(['c1', 'c2', 'd1', 'd2', 'd3', 'd4'])
    expect(new Set(filled).size).toBe(filled.length)
  })

  /* Their lineup is deeper than mine at a position — the extras belong to no seat of mine. */
  it('drops their surplus rather than pushing it into a slot it does not belong to', () => {
    const pool = them([['c1', 'C'], ['c2', 'C'], ['c3', 'C'], ['lw1', 'LW']])
    const out = opponentStartersBySeat(SEATS, pool, 'espn_9')
    expect(out).not.toContain('c3')
    expect(out[2]).toBe('lw1')
  })

  /*
   * A SEAT I LEFT EMPTY. My lineup is the list of seats, so a hole in mine shortens it — and
   * their man in that slot must not slide up into the seat above him and be scored against a
   * player he is not opposite.
   */
  it('keeps their men against the right seats when my lineup is short a body', () => {
    const myShortLineup = [{ slot: 'C' }, { slot: 'LW' }, { slot: 'G' }]
    const pool = them([['c1', 'C'], ['c2', 'C'], ['lw1', 'LW'], ['g1', 'G']])
    expect(opponentStartersBySeat(myShortLineup, pool, 'espn_9')).toEqual(['c1', 'lw1', 'g1'])
  })

  /* A utility seat is filled by whoever their manager put IN it, not by our idea of who fits. */
  it('reads a utility seat from their lineup rather than solving it', () => {
    const pool = them([['star', 'UTIL'], ['c1', 'C']])
    const out = opponentStartersBySeat(SEATS, pool, 'espn_9')
    expect(out[10]).toBe('star')
    expect(out[0]).toBe('c1')
  })

  it('is stable — the same pool and seats give the same pairing every time', () => {
    const pool = them([['c1', 'C'], ['c2', 'C'], ['d1', 'D'], ['d2', 'D']])
    const a = opponentStartersBySeat(SEATS, pool, 'espn_9')
    const b = opponentStartersBySeat(SEATS, pool, 'espn_9')
    expect(a).toEqual(b)
  })

  /* The pool is the whole league on a busy night; only the one opponent may be drawn from. */
  it('ignores the other ten teams in the pool', () => {
    const mine = them([['c1', 'C'], ['c2', 'C']])
    const others = [
      { playerKey: 'x1', teamKey: 'espn_3', lineupSlot: 'C' },
      { playerKey: 'x2', teamKey: 'espn_4', lineupSlot: 'C' },
    ] as any[]
    const out = opponentStartersBySeat(SEATS, [...others, ...mine], 'espn_9')
    expect(out.filter(Boolean)).toEqual(['c1', 'c2'])
  })
})
