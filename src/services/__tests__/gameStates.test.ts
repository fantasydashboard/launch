import { describe, it, expect } from 'vitest'
import { statesFromScoreboard } from '@/services/gameLines'

/*
 * "Has he scored yet" cannot be answered from a points map, only from the schedule.
 *
 * This reads the same ESPN scoreboard payload the implied totals already come from, so it
 * costs no extra request and no new dependency.
 */
describe('game state from the scoreboard', () => {
  const payload = {
    events: [
      {
        competitions: [{
          status: { type: { state: 'post', completed: true } },
          competitors: [{ team: { abbreviation: 'SEA' } }, { team: { abbreviation: 'NE' } }],
        }],
      },
      {
        competitions: [{
          status: { type: { state: 'in', completed: false } },
          competitors: [{ team: { abbreviation: 'LAR' } }, { team: { abbreviation: 'SF' } }],
        }],
      },
      {
        competitions: [{
          status: { type: { state: 'pre', completed: false } },
          competitors: [{ team: { abbreviation: 'CIN' } }, { team: { abbreviation: 'TB' } }],
        }],
      },
    ],
  }

  it('reads both sides of every game', () => {
    const s = statesFromScoreboard(payload)
    expect(s.SEA).toBe('post')
    expect(s.NE).toBe('post')
    expect(s.LAR).toBe('in')
    expect(s.CIN).toBe('pre')
  })

  it('treats anything it cannot read as not yet played', () => {
    // The safe direction: an unknown game keeps its projection. Guessing "finished" is what
    // zeroed a whole roster.
    const s = statesFromScoreboard({ events: [{ competitions: [{ competitors: [{ team: { abbreviation: 'XXX' } }] }] }] })
    expect(s.XXX).toBe('pre')
  })

  it('returns nothing at all for an unusable payload', () => {
    expect(statesFromScoreboard(null)).toEqual({})
    expect(statesFromScoreboard({})).toEqual({})
  })
})
