import { describe, it, expect } from 'vitest'
import { findOpenSlots } from '../openSlots'
import type { WeekSchedule } from '@/services/mlbSchedule'

const schedule: WeekSchedule = {
  gamesByTeam: { LAD: 1, NYY: 0, ATH: 1 }, // NYY off today; OAK resolves via ATH
  homeTeamByTeam: {},
  startsByPitcher: {},
}

const lineup = [
  { slot: 'C', playerKey: 'a', name: 'Has Game', team: 'LAD', position: 'C', status: '' },
  { slot: 'OF', playerKey: 'b', name: 'Off Today', team: 'NYY', position: 'OF', status: '' },
  { slot: '1B', playerKey: 'c', name: 'Hurt', team: 'OAK', position: '1B', status: 'IL10' },
  { slot: 'SP', playerKey: '', name: '', team: '', position: 'SP', status: '' }, // empty slot
]

describe('findOpenSlots', () => {
  it('flags off-day, injured, and empty active slots; leaves playing/healthy alone', () => {
    const open = findOpenSlots(lineup, schedule)
    const bySlot = Object.fromEntries(open.map((o) => [o.slot, o.reason]))
    expect(bySlot).toEqual({ OF: 'off-day', '1B': 'injured', SP: 'empty' })
    expect(bySlot['C']).toBeUndefined() // has a game, healthy
  })
  it('is empty when everyone plays and is healthy', () => {
    const ok = [{ slot: 'C', playerKey: 'a', name: 'A', team: 'LAD', position: 'C', status: '' }]
    expect(findOpenSlots(ok, schedule)).toEqual([])
  })
})
