import { describe, it, expect } from 'vitest'
import { buildTrajectory, type WeekOutcomes, type TalentSnapshot, type TeamMeta } from '../powerTrajectory'

const meta: TeamMeta[] = [
  { teamKey: 'A', teamName: 'A', isMe: true },
  { teamKey: 'B', teamName: 'B', isMe: false },
  { teamKey: 'C', teamName: 'C', isMe: false },
  { teamKey: 'D', teamName: 'D', isMe: false },
]

describe('buildTrajectory — standings race', () => {
  const outcomes: WeekOutcomes[] = [
    { week: 1, results: { A: 'W', B: 'L', C: 'W', D: 'L' } },
    { week: 2, results: { A: 'W', B: 'W', C: 'L', D: 'L' } }, // A 2-0, B/C 1-1, D 0-2
  ]

  it('ranks by cumulative record at the end of each week (1 = best)', () => {
    const tj = buildTrajectory(outcomes, [], meta)
    expect(tj.weeks).toEqual([1, 2])
    const A = tj.teams.find((t) => t.teamKey === 'A')!
    expect(A.standings).toEqual([
      { week: 1, rank: 1 }, // 1-0 (tie with C, A<C breaks first)
      { week: 2, rank: 1 }, // 2-0, clear best
    ])
    const D = tj.teams.find((t) => t.teamKey === 'D')!
    expect(D.standings[1]).toEqual({ week: 2, rank: 4 }) // 0-2, worst
  })

  it('skips weeks with no decided results (in-progress week adds no point)', () => {
    const withPending: WeekOutcomes[] = [...outcomes, { week: 3, results: {} }]
    const tj = buildTrajectory(withPending, [], meta)
    expect(tj.weeks).toEqual([1, 2]) // week 3 contributes nothing
  })

  it('preserves the caller team order (current power rank)', () => {
    const tj = buildTrajectory(outcomes, [], meta)
    expect(tj.teams.map((t) => t.teamKey)).toEqual(['A', 'B', 'C', 'D'])
    expect(tj.teams[0].isMe).toBe(true)
  })
})

describe('buildTrajectory — talent overlay', () => {
  const outcomes: WeekOutcomes[] = [{ week: 1, results: { A: 'W', B: 'L', C: 'W', D: 'L' } }]

  it('attaches talent snapshots per team and flags drawable history at ≥2 snaps', () => {
    const snaps: TalentSnapshot[] = [
      { week: 1, ranks: { A: 1, B: 2, C: 3, D: 4 } },
      { week: 2, ranks: { A: 1, B: 3, C: 2, D: 4 } },
    ]
    const tj = buildTrajectory(outcomes, snaps, meta)
    expect(tj.hasTalentHistory).toBe(true)
    const C = tj.teams.find((t) => t.teamKey === 'C')!
    expect(C.talent).toEqual([{ week: 1, rank: 3 }, { week: 2, rank: 2 }])
  })

  it('a single snapshot is not yet drawable history', () => {
    const tj = buildTrajectory(outcomes, [{ week: 1, ranks: { A: 1, B: 2, C: 3, D: 4 } }], meta)
    expect(tj.hasTalentHistory).toBe(false)
    expect(tj.teams.find((t) => t.teamKey === 'A')!.talent).toEqual([{ week: 1, rank: 1 }])
  })
})
