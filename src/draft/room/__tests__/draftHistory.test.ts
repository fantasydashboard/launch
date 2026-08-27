import { describe, it, expect } from 'vitest'
import {
  summarizeHistory, pooledCalibration, upsertRecord, removeRecord, sortByDate,
  type DraftRecord,
} from '../draftHistory'

const rec = (over: Partial<DraftRecord> = {}): DraftRecord => ({
  draftId: 'd1',
  savedAt: '2026-08-01T12:00:00.000Z',
  season: '2026',
  kind: 'mock',
  teams: 10,
  rounds: 14,
  mySlot: 7,
  grade: 'B',
  rank: 5,
  of: 10,
  startingPoints: 2000,
  behindLeader: 50,
  positionEdge: {},
  picks: [],
  ...over,
})

describe('summarizeHistory', () => {
  it('says nothing when there is nothing to say', () => {
    const s = summarizeHistory([])
    expect(s.count).toBe(0)
    expect(s.averageGrade).toBe('—')
    expect(s.bestFinish).toBeNull()
  })

  it('averages the percentile, not the letter', () => {
    // Two firsts and a last. Averaging letters (A+, A+, D) loses that the mean
    // finish is a third of the way down; averaging percentiles keeps it.
    const s = summarizeHistory([
      rec({ draftId: 'a', rank: 1, of: 10 }),
      rec({ draftId: 'b', rank: 1, of: 10 }),
      rec({ draftId: 'c', rank: 10, of: 10 }),
    ])
    expect(s.averagePercentile).toBeCloseTo(1 / 3, 5)
    expect(s.averageGrade).toBe('B+')
  })

  it('distinguishes a run of high Bs from a run of low As', () => {
    const highB = summarizeHistory([rec({ rank: 5, of: 10 }), rec({ draftId: 'x', rank: 5, of: 10 })])
    const lowA = summarizeHistory([rec({ rank: 3, of: 10 }), rec({ draftId: 'y', rank: 3, of: 10 })])
    expect(highB.averagePercentile).toBeGreaterThan(lowA.averagePercentile)
  })

  it('scores the last five on the newest five, whatever order they arrive in', () => {
    const older = Array.from({ length: 5 }, (_, i) =>
      rec({ draftId: `old${i}`, savedAt: `2026-07-0${i + 1}T00:00:00.000Z`, rank: 10, of: 10 }),
    )
    const newer = Array.from({ length: 5 }, (_, i) =>
      rec({ draftId: `new${i}`, savedAt: `2026-08-0${i + 1}T00:00:00.000Z`, rank: 1, of: 10 }),
    )
    // Deliberately shuffled in.
    const s = summarizeHistory([...newer, ...older].sort(() => 0))
    expect(s.count).toBe(10)
    expect(s.recentCount).toBe(5)
    expect(s.recentGrade).toBe('A+')
    expect(s.averageGrade).not.toBe('A+')
  })

  it('reports the best finish, not the most recent one', () => {
    const s = summarizeHistory([
      rec({ draftId: 'a', savedAt: '2026-08-05T00:00:00.000Z', rank: 8, of: 12 }),
      rec({ draftId: 'b', savedAt: '2026-07-05T00:00:00.000Z', rank: 2, of: 12 }),
    ])
    expect(s.bestFinish).toEqual({ rank: 2, of: 12 })
  })

  it('counts how often our advice would have beaten you', () => {
    const s = summarizeHistory([
      rec({ draftId: 'a', outcome: { yours: 2000, ours: 2100 } }),
      rec({ draftId: 'b', outcome: { yours: 2000, ours: 1900 } }),
      rec({ draftId: 'c' }), // no replay, not counted either way
    ])
    expect(s.advicePreferred).toEqual({ better: 1, of: 2 })
  })

  it('handles a one-team draft without dividing by zero', () => {
    const s = summarizeHistory([rec({ rank: 1, of: 1 })])
    expect(Number.isFinite(s.averagePercentile)).toBe(true)
    expect(s.averageGrade).toBe('A+')
  })
})

describe('pooledCalibration', () => {
  it('adds drafts together, weighting each bucket by its own sample', () => {
    const a = rec({
      draftId: 'a',
      calibration: [{ bucket: 0.8, predicted: 0.85, actualSurvived: 8, total: 10 }],
    })
    const b = rec({
      draftId: 'b',
      calibration: [{ bucket: 0.8, predicted: 0.81, actualSurvived: 20, total: 30 }],
    })
    const [pooled] = pooledCalibration([a, b])
    expect(pooled.total).toBe(40)
    expect(pooled.actualSurvived).toBe(28)
    // 0.85 over 10 and 0.81 over 30 — the bigger sample pulls harder.
    expect(pooled.predicted).toBeCloseTo((0.85 * 10 + 0.81 * 30) / 40, 5)
  })

  it('keeps buckets separate and in order', () => {
    const r = rec({
      calibration: [
        { bucket: 0.9, predicted: 1, actualSurvived: 9, total: 10 },
        { bucket: 0.1, predicted: 0.15, actualSurvived: 1, total: 10 },
      ],
    })
    expect(pooledCalibration([r]).map((b) => b.bucket)).toEqual([0.1, 0.9])
  })

  it('ignores drafts saved without a calibration table', () => {
    expect(pooledCalibration([rec()])).toEqual([])
  })
})

describe('upsertRecord', () => {
  it('replaces a draft rather than duplicating it', () => {
    const first = rec({ draftId: 'd1', rank: 5 })
    const again = rec({ draftId: 'd1', rank: 2 })
    const out = upsertRecord(upsertRecord([], first), again)
    expect(out).toHaveLength(1)
    expect(out[0].rank).toBe(2)
  })

  it('keeps the list newest first', () => {
    const out = upsertRecord(
      [rec({ draftId: 'old', savedAt: '2026-07-01T00:00:00.000Z' })],
      rec({ draftId: 'new', savedAt: '2026-08-09T00:00:00.000Z' }),
    )
    expect(out.map((r) => r.draftId)).toEqual(['new', 'old'])
  })

  it('removes by id and leaves the rest alone', () => {
    const list = [rec({ draftId: 'a' }), rec({ draftId: 'b' })]
    expect(removeRecord(list, 'a').map((r) => r.draftId)).toEqual(['b'])
    expect(removeRecord(list, 'nope')).toHaveLength(2)
  })

  it('sorts safely when a record has no timestamp', () => {
    expect(() => sortByDate([rec({ savedAt: undefined as any })])).not.toThrow()
  })
})

describe('summarizeHistory — local drafts are their own population', () => {
  it('keeps a local rehearsal out of the mock averages', () => {
    // A solo rehearsal is not a draft against nine live opponents. Mixing them
    // would make the grade average describe neither.
    const rows = [
      rec({ draftId: 'a', kind: 'mock', rank: 1, of: 10 }),
      rec({ draftId: 'b', kind: 'local', rank: 10, of: 10 }),
    ]
    const mocks = summarizeHistory(rows.filter((r) => r.kind === 'mock'))
    const locals = summarizeHistory(rows.filter((r) => r.kind === 'local'))
    expect(mocks.count).toBe(1)
    expect(locals.count).toBe(1)
    expect(mocks.averageGrade).not.toBe(locals.averageGrade)
  })

  it('still summarises them all together when nothing is filtered', () => {
    const s = summarizeHistory([
      rec({ draftId: 'a', kind: 'mock', rank: 1, of: 10 }),
      rec({ draftId: 'b', kind: 'local', rank: 10, of: 10 }),
    ])
    expect(s.count).toBe(2)
  })
})
