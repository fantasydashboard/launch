import { describe, it, expect } from 'vitest'
import { volumeEdge, type VolPlayer } from '../volumeEdge'
import type { WeekSchedule } from '@/services/mlbSchedule'

const schedule: WeekSchedule = {
  gamesByTeam: { NYY: 4, BOS: 3, LAD: 2 },
  startsByPitcher: { 'gerrit cole': [{ pitcherName: 'Gerrit Cole', teamAbbr: 'NYY', opponentAbbr: 'BOS', date: '2026-06-17' }] },
}
const mine: VolPlayer[] = [
  { name: 'Aaron Judge', teamAbbr: 'NYY', isPitcher: false },
  { name: 'Rafael Devers', teamAbbr: 'BOS', isPitcher: false },
  { name: 'Gerrit Cole', teamAbbr: 'NYY', isPitcher: true },
]
const opp: VolPlayer[] = [
  { name: 'Mookie Betts', teamAbbr: 'LAD', isPitcher: false },
]

describe('volumeEdge', () => {
  it('sums hitter-games by team and pitcher starts from the schedule', () => {
    const v = volumeEdge(mine, opp, schedule)
    expect(v.myGames).toBe(7) // NYY 4 + BOS 3
    expect(v.myStarts).toBe(1) // Cole one start
    expect(v.oppGames).toBe(2) // LAD 2
    expect(v.oppStarts).toBe(0)
    expect(v.read.length).toBeGreaterThan(0)
  })
  it('an unknown team contributes 0 games (degrades, never throws)', () => {
    const v = volumeEdge([{ name: 'X', teamAbbr: 'ZZZ', isPitcher: false }], [], schedule)
    expect(v.myGames).toBe(0)
  })
})
