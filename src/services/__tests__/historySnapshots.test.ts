import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HistorySeason } from '@/history/types'

// Controllable mock Supabase client. vi.hoisted so it's ready when vi.mock factories run.
const { upsert, del, selectEq, from, authRef } = vi.hoisted(() => {
  const upsert = vi.fn(() => Promise.resolve({ error: null }))
  const selectEq = vi.fn(() => Promise.resolve({ data: [] as any[], error: null }))
  // delete().eq(key).eq(season) → resolves { error }
  const del = vi.fn(() => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }))
  const from = vi.fn(() => ({
    upsert,
    select: () => ({ eq: selectEq }),
    delete: del,
  }))
  const authRef = { user: { id: 'user-1' } as { id: string } | null }
  return { upsert, del, selectEq, from, authRef }
})
vi.mock('@/lib/supabase', () => ({ supabase: { from } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: authRef.user }) }))

import {
  leagueSnapshotKey,
  snapshotSeasons,
  saveManualSeason,
  deleteManualSeason,
  fetchSnapshotRows,
} from '../historySnapshots'

function season(year: number): HistorySeason {
  return {
    season: year,
    teams: [
      {
        teamKey: 'A',
        teamName: 'A',
        wins: 1,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        rank: 1,
        madePlayoffs: false,
        champion: false,
      },
    ],
  }
}

describe('leagueSnapshotKey', () => {
  it('builds a stable ESPN key from sport + leagueId', () => {
    expect(leagueSnapshotKey({ platform: 'espn', sport: 'Baseball', leagueId: '12345' })).toBe(
      'espn:baseball:12345',
    )
  })
  it('extracts the Yahoo league number from a league_key', () => {
    expect(leagueSnapshotKey({ platform: 'yahoo', sport: 'baseball', leagueKey: '431.l.98765' })).toBe(
      'yahoo:baseball:98765',
    )
  })
  it('builds a Sleeper key from the chain root', () => {
    expect(leagueSnapshotKey({ platform: 'sleeper', rootLeagueId: 'abc123' })).toBe('sleeper:abc123')
  })
  it('falls back to the whole key when a Yahoo key lacks .l.', () => {
    expect(leagueSnapshotKey({ platform: 'yahoo', sport: 'baseball', leagueKey: 'weirdkey' })).toBe(
      'yahoo:baseball:weirdkey',
    )
  })
})

describe('snapshotSeasons', () => {
  beforeEach(() => {
    upsert.mockClear()
    from.mockClear()
  })
  it('locks finished seasons (ignoreDuplicates) and overwrites the active one', async () => {
    await snapshotSeasons({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      seasons: [season(2025), season(2026) /* active */],
    })
    // Two upsert calls: one for final rows, one for current rows.
    expect(upsert).toHaveBeenCalledTimes(2)
    const calls = upsert.mock.calls
    const finalCall = calls.find((c) => c[1].ignoreDuplicates === true)!
    const currentCall = calls.find((c) => c[1].ignoreDuplicates === false)!
    expect(finalCall[1].onConflict).toBe('league_snapshot_key,season')
    expect(finalCall[0].map((r: any) => r.season)).toEqual([2025])
    expect(finalCall[0][0].is_final).toBe(true)
    expect(finalCall[0][0].contributor_user_id).toBe('user-1')
    expect(currentCall[0].map((r: any) => r.season)).toEqual([2026])
    expect(currentCall[0][0].is_final).toBe(false)
  })
  it('writes only a final upsert when every season is in the past', async () => {
    await snapshotSeasons({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      seasons: [season(2024), season(2025)],
    })
    // Both seasons predate the active one → one final upsert, no current upsert.
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert.mock.calls[0][1].ignoreDuplicates).toBe(true)
    expect(upsert.mock.calls[0][0].map((r: any) => r.season)).toEqual([2024, 2025])
  })
  it('does not upsert when there are no seasons', async () => {
    await snapshotSeasons({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      seasons: [],
    })
    expect(upsert).not.toHaveBeenCalled()
  })
  it('logs when an upsert resolves with a Supabase error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    upsert.mockResolvedValueOnce({ error: { message: 'rls' } })
    await snapshotSeasons({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      seasons: [season(2024)],
    })
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})

describe('saveManualSeason', () => {
  beforeEach(() => {
    upsert.mockClear()
    upsert.mockResolvedValue({ error: null })
    authRef.user = { id: 'user-1' }
  })
  it('writes a manual, final row for a past season', async () => {
    const res = await saveManualSeason({
      key: 'espn:baseball:1',
      platform: 'espn',
      sport: 'baseball',
      activeSeason: 2026,
      season: season(2019),
    })
    expect(res).toEqual({ ok: true })
    expect(upsert).toHaveBeenCalledTimes(1)
    const [rows, opts] = upsert.mock.calls[0]
    const row = Array.isArray(rows) ? rows[0] : rows
    expect(row).toMatchObject({
      league_snapshot_key: 'espn:baseball:1',
      season: 2019,
      source: 'manual',
      is_final: true,
      contributor_user_id: 'user-1',
    })
    // Upsert must be able to UPDATE the caller's own row → not ignoreDuplicates.
    expect(opts.onConflict).toBe('league_snapshot_key,season')
    expect(opts.ignoreDuplicates).not.toBe(true)
  })
  it('returns reason "auth" when logged out', async () => {
    authRef.user = null
    const res = await saveManualSeason({
      key: 'k', platform: 'espn', sport: 'baseball', activeSeason: 2026, season: season(2019),
    })
    expect(res).toEqual({ ok: false, reason: 'auth' })
    expect(upsert).not.toHaveBeenCalled()
  })
  it('returns reason "conflict" when the upsert is blocked (RLS)', async () => {
    upsert.mockResolvedValueOnce({ error: { message: 'permission denied' } })
    const res = await saveManualSeason({
      key: 'k', platform: 'espn', sport: 'baseball', activeSeason: 2026, season: season(2019),
    })
    expect(res).toEqual({ ok: false, reason: 'conflict' })
  })
})

describe('deleteManualSeason', () => {
  beforeEach(() => del.mockClear())
  it('issues a delete for the key + season', async () => {
    const res = await deleteManualSeason('espn:baseball:1', 2019)
    expect(res).toEqual({ ok: true })
    expect(del).toHaveBeenCalledTimes(1)
  })
})

describe('fetchSnapshotRows', () => {
  beforeEach(() => selectEq.mockClear())
  it('maps rows to season/source/contributor/payload', async () => {
    selectEq.mockResolvedValueOnce({
      data: [
        { season: 2019, source: 'manual', contributor_user_id: 'u2', payload: season(2019) },
        { season: 2020, source: 'auto', contributor_user_id: 'u3', payload: season(2020) },
      ],
      error: null,
    })
    const rows = await fetchSnapshotRows('espn:baseball:1')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ season: 2019, source: 'manual', contributorUserId: 'u2' })
    expect(rows[0].payload.season).toBe(2019)
    expect(rows[1]).toMatchObject({ season: 2020, source: 'auto', contributorUserId: 'u3' })
  })
  it('returns [] on a Supabase error', async () => {
    selectEq.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    expect(await fetchSnapshotRows('k')).toEqual([])
  })
})
