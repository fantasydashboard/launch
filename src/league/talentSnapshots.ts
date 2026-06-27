/**
 * Weekly talent (power-rank) snapshots, persisted per league. Talent-over-time can't
 * be reconstructed retroactively, so we capture the current week's power rank each
 * time the page loads; the trajectory's dashed line then accrues week by week.
 *
 * localStorage for now (works for the user's own testing without backend changes);
 * a Supabase table is the productionization path for cross-device history.
 */
import type { TalentSnapshot } from '@/league/powerTrajectory'

const keyFor = (leagueId: string) => `ufd:powertalent:${leagueId}`

/** Minimal storage surface so tests can inject a fake. */
export interface SnapshotStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const safeStore = (): SnapshotStore | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null // private mode / SSR
  }
}

export function readTalentSnapshots(leagueId: string, store: SnapshotStore | null = safeStore()): TalentSnapshot[] {
  if (!leagueId || !store) return []
  try {
    const raw = store.getItem(keyFor(leagueId))
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((s) => s && typeof s.week === 'number' && s.ranks && typeof s.ranks === 'object')
      .sort((a, b) => a.week - b.week)
  } catch {
    return []
  }
}

/**
 * Record (or overwrite) the snapshot for `week`. Returns the full, sorted history.
 * Overwriting the current week keeps the latest read accurate as rosters change.
 */
export function recordTalentSnapshot(
  leagueId: string,
  week: number,
  ranks: Record<string, number>,
  store: SnapshotStore | null = safeStore(),
): TalentSnapshot[] {
  const history = readTalentSnapshots(leagueId, store)
  if (!leagueId || !store || !week || !Object.keys(ranks).length) return history

  const idx = history.findIndex((s) => s.week === week)
  const snap: TalentSnapshot = { week, ranks }
  if (idx >= 0) history[idx] = snap
  else history.push(snap)
  history.sort((a, b) => a.week - b.week)

  try {
    store.setItem(keyFor(leagueId), JSON.stringify(history))
  } catch {
    // Storage full / blocked — history still returns in-memory for this session.
  }
  return history
}
