import { describe, it, expect } from 'vitest'
import { gamesRemaining } from '@/today/gamesRemaining'

const P = (over: Record<string, unknown> = {}) =>
  ({ teamKey: 'me', proTeam: 'BOS', ...over }) as any

const SCHED = { BOS: 4, TOR: 3, LAK: 2, COL: 0 }

describe('gamesRemaining', () => {
  it('adds up every scheduled game on the roster', () => {
    const r = gamesRemaining([P(), P({ proTeam: 'TOR' })], 'me', SCHED)
    expect(r.games).toBe(7)
    expect(r.players).toBe(2)
  })

  it('counts only the fantasy team asked for', () => {
    const pool = [P(), P({ teamKey: 'them', proTeam: 'TOR' })]
    expect(gamesRemaining(pool, 'me', SCHED).games).toBe(4)
    expect(gamesRemaining(pool, 'them', SCHED).games).toBe(3)
  })

  /* A player who cannot be started contributes nothing a manager can use. */
  it('leaves out anyone who cannot take the ice', () => {
    expect(gamesRemaining([P({ onIL: true })], 'me', SCHED).games).toBe(0)
    expect(gamesRemaining([P({ status: 'IL10' })], 'me', SCHED).games).toBe(0)
    expect(gamesRemaining([P({ status: 'OUT' })], 'me', SCHED).games).toBe(0)
  })

  it('still counts day-to-day, who usually plays', () => {
    expect(gamesRemaining([P({ status: 'DTD' })], 'me', SCHED).games).toBe(4)
  })

  /* LA vs LAK is the exact mismatch that makes a player look idle all season. */
  it('resolves clubs the sources spell differently', () => {
    expect(gamesRemaining([P({ proTeam: 'LA' })], 'me', SCHED).games).toBe(2)
    expect(gamesRemaining([P({ proTeam: 'LAK' })], 'me', SCHED).games).toBe(2)
  })

  it('counts a team with no games as a player with none', () => {
    const r = gamesRemaining([P({ proTeam: 'COL' })], 'me', SCHED)
    expect(r.games).toBe(0)
    expect(r.players).toBe(0)
  })

  it('is zero without a team key, rather than counting everybody', () => {
    expect(gamesRemaining([P()], '', SCHED).games).toBe(0)
  })
})
