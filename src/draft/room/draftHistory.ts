/**
 * Every draft you've finished, kept.
 *
 * Two reasons, and the second matters more than the first. One: a single grade
 * is nearly meaningless — the room you drafted against might have been packed
 * into a hundred points, or a mock full of bots — so the useful question is
 * whether you're consistently near the top of the rooms you sit in. Two: the
 * calibration table needs sample. One draft could not settle whether the model's
 * 80-90% band is really biased or just unlucky; ten can, and pooling them here is
 * the only way that evidence ever accumulates.
 *
 * Mocks and league drafts are kept apart. A mock against bots is a different
 * population from a night against nine people who know each other, and averaging
 * across the two produces a number describing neither.
 */

import { gradeForPercentile } from './recap'
import type { CalibrationBucket } from './replay'

export interface DraftRecordPick {
  overallPick: number
  playerKey: string
  name: string
  position: string
}

export interface DraftRecord {
  draftId: string
  /** ISO timestamp of when the record was written. */
  savedAt: string
  season: string
  /** A mock is not the same population as your league's draft night. */
  kind: 'league' | 'mock'
  teams: number
  rounds: number
  mySlot: number | null
  grade: string
  rank: number
  of: number
  startingPoints: number
  behindLeader: number
  positionEdge: Record<string, number>
  picks: DraftRecordPick[]
  /** What our advice would have scored, when the replay could compute it. */
  outcome?: { yours: number; ours: number } | null
  calibration?: CalibrationBucket[]
}

/** How many drafts count as "lately". */
export const RECENT_WINDOW = 5

export interface HistorySummary {
  count: number
  /** Mean finishing percentile — 0 is the best lineup in the room. */
  averagePercentile: number
  averageGrade: string
  recentCount: number
  recentPercentile: number
  recentGrade: string
  bestFinish: { rank: number; of: number } | null
  /** How often our advice would have outscored the roster you drafted. */
  advicePreferred: { better: number; of: number } | null
}

const percentileOf = (r: DraftRecord) => (r.of <= 1 ? 0 : (r.rank - 1) / (r.of - 1))

/** Newest first. Records carry their own timestamp, so order is never assumed. */
export function sortByDate(records: DraftRecord[]): DraftRecord[] {
  return [...(records ?? [])].sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''))
}

export function summarizeHistory(
  records: DraftRecord[],
  recentWindow = RECENT_WINDOW,
): HistorySummary {
  const all = sortByDate(records ?? [])
  const empty: HistorySummary = {
    count: 0, averagePercentile: 0, averageGrade: '—',
    recentCount: 0, recentPercentile: 0, recentGrade: '—',
    bestFinish: null, advicePreferred: null,
  }
  if (!all.length) return empty

  /**
   * Percentiles are averaged, never letters.
   *
   * A letter is already a lossy bucket of a percentile; averaging letters
   * quantizes twice, so a run of high-B finishes and a run of low-A finishes
   * come out identical. Averaging the underlying number and grading once at the
   * end keeps the distinction.
   */
  const mean = (rows: DraftRecord[]) =>
    rows.reduce((n, r) => n + percentileOf(r), 0) / rows.length

  const recent = all.slice(0, Math.max(1, recentWindow))
  const best = all.reduce<DraftRecord | null>(
    (b, r) => (b === null || percentileOf(r) < percentileOf(b) ? r : b),
    null,
  )

  const withOutcome = all.filter((r) => r.outcome && Number.isFinite(r.outcome.ours))
  const averagePercentile = mean(all)
  const recentPercentile = mean(recent)

  return {
    count: all.length,
    averagePercentile,
    averageGrade: gradeForPercentile(averagePercentile),
    recentCount: recent.length,
    recentPercentile,
    recentGrade: gradeForPercentile(recentPercentile),
    bestFinish: best ? { rank: best.rank, of: best.of } : null,
    advicePreferred: withOutcome.length
      ? {
          better: withOutcome.filter((r) => (r.outcome!.ours ?? 0) > (r.outcome!.yours ?? 0)).length,
          of: withOutcome.length,
        }
      : null,
  }
}

/**
 * Every draft's calibration added together. This is the number that earns the
 * right to change the model — one draft's 32-player bucket cannot.
 */
export function pooledCalibration(records: DraftRecord[]): CalibrationBucket[] {
  const merged = new Map<number, { predSum: number; survived: number; total: number }>()
  for (const r of records ?? []) {
    for (const b of r.calibration ?? []) {
      const e = merged.get(b.bucket) ?? { predSum: 0, survived: 0, total: 0 }
      // `predicted` is a mean over that bucket's rows, so it re-weights by total.
      e.predSum += b.predicted * b.total
      e.survived += b.actualSurvived
      e.total += b.total
      merged.set(b.bucket, e)
    }
  }
  return [...merged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, e]) => ({
      bucket,
      predicted: e.total ? e.predSum / e.total : 0,
      actualSurvived: e.survived,
      total: e.total,
    }))
}

/** Add or replace a draft, keyed on its id — re-opening a draft must not duplicate it. */
export function upsertRecord(records: DraftRecord[], record: DraftRecord): DraftRecord[] {
  const rest = (records ?? []).filter((r) => r.draftId !== record.draftId)
  return sortByDate([...rest, record])
}

export function removeRecord(records: DraftRecord[], draftId: string): DraftRecord[] {
  return (records ?? []).filter((r) => r.draftId !== draftId)
}
