import { describe, it, expect } from 'vitest'
import { kickoffsFromScoreboard } from '@/services/gameLines'

/** The shape ESPN actually returns, trimmed to what we read. */
const payload = {
  events: [
    {
      date: '2026-10-02T00:15Z',
      competitions: [{
        date: '2026-10-02T00:15Z',
        competitors: [{ team: { abbreviation: 'CLE' } }, { team: { abbreviation: 'PIT' } }],
      }],
    },
    {
      date: '2026-10-04T17:00Z',
      competitions: [{
        date: '2026-10-04T17:00Z',
        competitors: [{ team: { abbreviation: 'BUF' } }, { team: { abbreviation: 'NE' } }],
      }],
    },
  ],
}

describe('kickoffsFromScoreboard', () => {
  it('gives both teams in a game the same kickoff', () => {
    const k = kickoffsFromScoreboard(payload)
    expect(k.CLE).toBe(Date.parse('2026-10-02T00:15Z'))
    expect(k.PIT).toBe(k.CLE)
  })

  it('orders Thursday before Sunday, which is the whole point of reading it', () => {
    const k = kickoffsFromScoreboard(payload)
    expect(k.CLE).toBeLessThan(k.BUF)
  })

  it('leaves a bye team out rather than giving it a time', () => {
    const k = kickoffsFromScoreboard(payload)
    expect('KC' in k).toBe(false)
  })

  it('drops a game with an unreadable date instead of defaulting it', () => {
    const k = kickoffsFromScoreboard({
      events: [{ date: 'soon', competitions: [{ competitors: [{ team: { abbreviation: 'KC' } }] }] }],
    })
    expect(k).toEqual({})
  })

  it('reads an unparseable payload as nothing known, never as no games', () => {
    expect(kickoffsFromScoreboard(null)).toEqual({})
    expect(kickoffsFromScoreboard({})).toEqual({})
  })
})
