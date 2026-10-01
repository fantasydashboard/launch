// src/services/__tests__/weeklyRankings.test.ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: null }))
import { fetchPublishedWeekly, publishWeekly } from '../weeklyRankings'

describe('weeklyRankings without a client', () => {
  it('fetch returns null so the board falls back to Sleeper', async () => {
    expect(await fetchPublishedWeekly('football', 2026, 4)).toBeNull()
  })
  it('publish reports an error instead of throwing', async () => {
    const r = await publishWeekly({ sport: 'football', season: 2026, week: 4, source_name: 'x.csv', body: 'x' })
    expect(r.ok).toBe(false)
  })
})
