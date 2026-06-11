import { describe, it, expect } from 'vitest'
import { dailyCandidates } from '../dailyCandidates'
import { projectGames } from '../projectRemainingWeek'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import type { WeekSchedule } from '@/services/mlbSchedule'
import type { BenchPlayer } from '../generators/startSitGenerator'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false },
]
const fas: AvailablePlayer[] = [
  { playerKey: 'h-on', name: 'Plays Today', position: 'OF', team: 'NYY', percentOwned: 10, stats: { HR: 30 } },
  { playerKey: 'h-off', name: 'Off Today', position: 'OF', team: 'SEA', percentOwned: 10, stats: { HR: 30 } },
  { playerKey: 'sp', name: 'Hunter Brown', position: 'SP', team: 'HOU', percentOwned: 20, stats: { K: 160 } },
]
const benched: BenchPlayer[] = [
  { playerKey: 'b-on', name: 'Bench On', team: 'NYY', position: '2B', stats: { HR: 20 } },
]
const today: WeekSchedule = {
  gamesByTeam: { NYY: 1, HOU: 1 }, // SEA is off today
  startsByPitcher: { 'hunter brown': [{ pitcherName: 'Hunter Brown', teamAbbr: 'HOU', opponentAbbr: 'LAA', date: '2026-06-11' }] },
}

describe('projectGames', () => {
  it('scales counting stats per-game; zero games -> zero', () => {
    expect(projectGames({ HR: 32.4 }, null, cats, 1, 0.6).HR).toBeCloseTo((32.4 / 0.6 / 162) * 1, 5)
    expect(projectGames({ HR: 30 }, null, cats, 0, 0.6).HR).toBe(0)
  })
})

describe('dailyCandidates', () => {
  it('includes hitters/bench whose team plays today and SPs starting today; excludes off-today hitters', () => {
    const cands = dailyCandidates(fas, benched, today, cats, 0.6)
    const keys = cands.map((c) => c.player.key)
    expect(keys).toContain('h-on') // plays today
    expect(keys).toContain('sp') // starts today
    expect(keys).toContain('b-on') // benched, plays today
    expect(keys).not.toContain('h-off') // team off today
    expect(cands.find((c) => c.player.key === 'sp')!.detail).toMatch(/starts today/i)
  })
})
