/**
 * Durable league-history snapshots. Reads/writes the shared
 * `league_season_snapshots` table so one member's app can backfill another's.
 * Mirrors matchupSnapshots.ts: guarded on a possibly-null supabase singleton,
 * fire-and-forget writes, errors logged never thrown.
 */
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { isSeasonFinal } from '@/history/mergeSeasons'
import type { HistorySeason } from '@/history/types'

const TABLE = 'league_season_snapshots'

type SnapshotSource = 'auto' | 'manual'

interface SnapshotRowValues {
  league_snapshot_key: string
  platform: string
  sport: string
  season: number
  is_final: boolean
  payload: HistorySeason
  contributor_user_id: string
  source: SnapshotSource
}

/** One table row's column values. Shared by the auto snapshotter and manual backfill. */
function buildSnapshotRow(params: {
  key: string
  platform: string
  sport: string
  uid: string
  season: HistorySeason
  isFinal: boolean
  source: SnapshotSource
}): SnapshotRowValues {
  return {
    league_snapshot_key: params.key,
    platform: params.platform,
    sport: params.sport,
    season: params.season.season,
    is_final: params.isFinal,
    payload: params.season,
    contributor_user_id: params.uid,
    source: params.source,
  }
}

/** A stored snapshot row with provenance (source + first contributor). */
export interface SnapshotRow {
  season: number
  source: SnapshotSource
  contributorUserId: string
  payload: HistorySeason
}

export type SnapshotKeyInput =
  | { platform: 'espn'; sport: string; leagueId: string }
  | { platform: 'yahoo'; sport: string; leagueKey: string }
  | { platform: 'sleeper'; rootLeagueId: string }

/** A stable per-league key, identical for every member, computable without
 *  having seen the missing seasons. */
export function leagueSnapshotKey(input: SnapshotKeyInput): string {
  if (input.platform === 'espn') return `espn:${input.sport.toLowerCase()}:${input.leagueId}`
  if (input.platform === 'sleeper') return `sleeper:${input.rootLeagueId}`
  const k = input.leagueKey
  const num = k.includes('.l.') ? k.split('.l.')[1] : k
  return `yahoo:${input.sport.toLowerCase()}:${num}`
}

/** All stored rows (payload + provenance) for a league key. Returns [] on any failure. */
export async function fetchSnapshotRows(key: string): Promise<SnapshotRow[]> {
  if (!supabase || !key) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('season, source, contributor_user_id, payload')
      .eq('league_snapshot_key', key)
    if (error || !data) return []
    return (data as any[]).map((r) => ({
      season: Number(r.season),
      source: (r.source === 'manual' ? 'manual' : 'auto') as SnapshotSource,
      contributorUserId: String(r.contributor_user_id ?? ''),
      payload: r.payload as HistorySeason,
    }))
  } catch (e) {
    console.error('[historySnapshots] fetch rows failed', e)
    return []
  }
}

/** Convenience: just the payloads (used by the merge step). */
export async function fetchSnapshots(key: string): Promise<HistorySeason[]> {
  return (await fetchSnapshotRows(key)).map((r) => r.payload)
}

/** Persist the user's firsthand seasons. Finished seasons are inserted with
 *  ignoreDuplicates (first-write-wins); the active season is overwritten. */
export async function snapshotSeasons(params: {
  key: string
  platform: string
  sport: string
  activeSeason: number
  seasons: HistorySeason[]
}): Promise<void> {
  const { key, platform, sport, activeSeason, seasons } = params
  if (!supabase || !key || !seasons.length) return
  const uid = useAuthStore().user?.id
  if (!uid) return

  const finalRows: SnapshotRowValues[] = []
  const currentRows: SnapshotRowValues[] = []
  for (const s of seasons) {
    const final = isSeasonFinal(s.season, activeSeason)
    ;(final ? finalRows : currentRows).push(
      buildSnapshotRow({ key, platform, sport, uid, season: s, isFinal: final, source: 'auto' }),
    )
  }

  try {
    if (finalRows.length) {
      const { error } = await supabase
        .from(TABLE)
        .upsert(finalRows, { onConflict: 'league_snapshot_key,season', ignoreDuplicates: true })
      if (error) console.error('[historySnapshots] final upsert failed', error)
    }
    if (currentRows.length) {
      const { error } = await supabase
        .from(TABLE)
        .upsert(currentRows, { onConflict: 'league_snapshot_key,season', ignoreDuplicates: false })
      if (error) console.error('[historySnapshots] current upsert failed', error)
    }
  } catch (e) {
    console.error('[historySnapshots] write failed', e)
  }
}

/**
 * Persist one hand-entered ("manual") past season. Unlike snapshotSeasons this REPORTS
 * its outcome — the UI needs to know it saved. Upserts on (key, season) WITHOUT
 * ignoreDuplicates so the contributor can update their own row (RLS permits). A conflict
 * with an auto row or another member's manual row is blocked by RLS → reason 'conflict'.
 */
export async function saveManualSeason(params: {
  key: string
  platform: string
  sport: string
  activeSeason: number
  season: HistorySeason
}): Promise<{ ok: true } | { ok: false; reason: 'conflict' | 'auth' | 'error' }> {
  const { key, platform, sport, activeSeason, season } = params
  if (!supabase || !key) return { ok: false, reason: 'error' }
  const uid = useAuthStore().user?.id
  if (!uid) return { ok: false, reason: 'auth' }

  const isFinal = isSeasonFinal(season.season, activeSeason)
  const rowValues = buildSnapshotRow({ key, platform, sport, uid, season, isFinal, source: 'manual' })
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(rowValues, { onConflict: 'league_snapshot_key,season' })
    if (error) {
      console.error('[historySnapshots] saveManualSeason blocked', error)
      return { ok: false, reason: 'conflict' }
    }
    return { ok: true }
  } catch (e) {
    console.error('[historySnapshots] saveManualSeason failed', e)
    return { ok: false, reason: 'error' }
  }
}

/** Delete the caller's own manual row for a season. RLS enforces source='manual' + owner. */
export async function deleteManualSeason(key: string, season: number): Promise<{ ok: boolean }> {
  if (!supabase || !key) return { ok: false }
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('league_snapshot_key', key)
      .eq('season', season)
    return { ok: !error }
  } catch (e) {
    console.error('[historySnapshots] deleteManualSeason failed', e)
    return { ok: false }
  }
}
