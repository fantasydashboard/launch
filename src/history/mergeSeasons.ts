/**
 * Pure helpers for durable league-history snapshots.
 *
 * `isSeasonFinal` decides whether a season is immutable (locked) history.
 * `mergeHistorySeasons` unions a user's live fetch with stored snapshots,
 * preferring the live payload on overlap — stored rows only fill seasons the
 * user's own account can't see. Both are deterministic + side-effect-free.
 */
import type { HistorySeason } from './types'

/**
 * A season is final (immutable, lockable) once a newer season exists — i.e.
 * `season < activeSeason`. The current season is deliberately NOT treated as
 * final even after a champion is decided: finished-season writes are
 * insert-or-nothing, so if we locked mid-year the champion-crowning refresh
 * would never be recorded. Keeping the current season non-final lets it keep
 * refreshing (champion included); it locks a year later when it rolls off.
 */
export function isSeasonFinal(season: number, activeSeason: number): boolean {
  return season < activeSeason
}

/** Union by season number; live wins on overlap. Result sorted season DESC. */
export function mergeHistorySeasons(
  live: HistorySeason[],
  stored: HistorySeason[],
): HistorySeason[] {
  const liveSeasons = new Set(live.map((s) => s.season))
  const merged = [...live]
  for (const s of stored) {
    if (!liveSeasons.has(s.season)) merged.push(s)
  }
  merged.sort((a, b) => b.season - a.season)
  return merged
}
