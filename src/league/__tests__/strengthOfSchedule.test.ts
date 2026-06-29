import { describe, it, expect } from 'vitest'
import { buildStrengthOfSchedule, type SosTeam, type SosScheduleWeek } from '../strengthOfSchedule'

const teams: SosTeam[] = [
  { teamKey: 'A', teamName: 'Alpha', strength: 100, standingRank: 1 },
  { teamKey: 'B', teamName: 'Bravo', strength: 90, standingRank: 2 },
  { teamKey: 'C', teamName: 'Charlie', strength: 80, standingRank: 3 },
  { teamKey: 'D', teamName: 'Delta', strength: 70, standingRank: 4 },
]

describe('buildStrengthOfSchedule', () => {
  it('ranks easiest remaining road first by average opponent strength', () => {
    const schedule: SosScheduleWeek[] = [
      { matchups: [['A', 'D'], ['B', 'C']] }, // A plays D(70); D plays A(100)
      { matchups: [['A', 'C'], ['B', 'D']] }, // A plays C(80); D plays B(90)
    ]
    const sos = buildStrengthOfSchedule(teams, schedule)
    // A's opponents: D(70), C(80) → avg 75 (easiest). D's: A(100), B(90) → avg 95 (hardest).
    const a = sos.find((r) => r.teamKey === 'A')!
    const d = sos.find((r) => r.teamKey === 'D')!
    expect(a.sosRank).toBe(1)
    expect(a.avgOppStrength).toBe(75)
    expect(d.sosRank).toBe(4)
    expect(d.avgOppStrength).toBe(95)
    expect(a.total).toBe(4)
  })

  it('flags a top team with a hard road as fade, a low team with an easy road as surge', () => {
    const schedule: SosScheduleWeek[] = [
      { matchups: [['A', 'B'], ['C', 'D']] },
      { matchups: [['A', 'B'], ['C', 'D']] },
    ]
    const sos = buildStrengthOfSchedule(teams, schedule)
    // SOS (avg opp strength): C 70 (easiest), D 80, A 90, B 100 (hardest).
    const b = sos.find((r) => r.teamKey === 'B')! // 2nd in standings (upper half), hardest road
    const c = sos.find((r) => r.teamKey === 'C')! // 3rd in standings (lower half), easiest road
    expect(b.trend).toBe('fade')
    expect(c.trend).toBe('surge')
  })

  it('excludes teams with no remaining games from the ranking', () => {
    const schedule: SosScheduleWeek[] = [{ matchups: [['A', 'B']] }] // C, D have no games left
    const sos = buildStrengthOfSchedule(teams, schedule)
    expect(sos.map((r) => r.teamKey).sort()).toEqual(['A', 'B'])
    expect(sos[0].total).toBe(2)
  })
})
