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

/** All stored season payloads for a league key. Returns [] on any failure. */
export async function fetchSnapshots(key: string): Promise<HistorySeason[]> {
  if (!supabase || !key) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('payload')
      .eq('league_snapshot_key', key)
    if (error || !data) return []
    return (data as { payload: HistorySeason }[]).map((r) => r.payload)
  } catch (e) {
    console.error('[historySnapshots] fetch failed', e)
    return []
  }
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

  const row = (s: HistorySeason, final: boolean) => ({
    league_snapshot_key: key,
    platform,
    sport,
    season: s.season,
    is_final: final,
    payload: s,
    contributor_user_id: uid,
  })

  const finalRows: ReturnType<typeof row>[] = []
  const currentRows: ReturnType<typeof row>[] = []
  for (const s of seasons) {
    const final = isSeasonFinal(s.season, activeSeason)
    ;(final ? finalRows : currentRows).push(row(s, final))
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
