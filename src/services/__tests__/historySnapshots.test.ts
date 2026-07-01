import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HistorySeason } from '@/history/types'

// Capture upsert calls through a mock Supabase client.
// Use vi.hoisted so variables are available when vi.mock factories run.
const { upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn(() => Promise.resolve({ error: null }))
  const from = vi.fn(() => ({
    upsert,
    select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
  }))
  return { upsert, from }
})
vi.mock('@/lib/supabase', () => ({ supabase: { from } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { id: 'user-1' } }) }))

import { leagueSnapshotKey, snapshotSeasons } from '../historySnapshots'

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
})
