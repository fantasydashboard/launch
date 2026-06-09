import { describe, it, expect } from 'vitest'
import { normalizeFreeAgent } from '@/players/fromYahoo'

describe('normalizeFreeAgent', () => {
  it('maps the yahoo FA shape to AvailablePlayer', () => {
    const raw = {
      player_key: '431.p.123',
      player_id: '123',
      full_name: 'Some Closer',
      position: 'RP',
      mlb_team: 'NYY',
      headshot: 'http://img/x.png',
      percent_owned: 45.2,
      percent_change: 2.1,
      status: 'NA',
      injury_note: '',
      stats: { '32': 30, '26': 2.5 },
      total_points: 0,
    }
    const out = normalizeFreeAgent(raw)
    expect(out).toEqual({
      playerKey: '431.p.123',
      name: 'Some Closer',
      position: 'RP',
      team: 'NYY',
      headshot: 'http://img/x.png',
      percentOwned: 45.2,
      status: 'NA',
      stats: { '32': 30, '26': 2.5 },
    })
  })

  it('defaults missing optional fields safely', () => {
    const out = normalizeFreeAgent({ player_key: 'k', full_name: 'N', stats: {} })
    expect(out.playerKey).toBe('k')
    expect(out.percentOwned).toBe(0)
    expect(out.position).toBe('')
    expect(out.stats).toEqual({})
  })
})
