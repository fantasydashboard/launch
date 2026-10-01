import { supabase } from '@/lib/supabase'

export interface PublishedWeekly {
  season: number; week: number; source_name: string; body: string; published_at: string
}

/* The table is newer than the generated Database types, hence the narrow cast. */
const table = () => (supabase as any)?.from('weekly_rankings')

/** The list for exactly this week, or null. Never last week's: the board falls back instead. */
export async function fetchPublishedWeekly(
  sport: 'football', season: number, week: number,
): Promise<PublishedWeekly | null> {
  try {
    const t = table()
    if (!t) return null
    const { data, error } = await t
      .select('season, week, source_name, body, published_at')
      .eq('sport', sport).eq('season', season).eq('week', week)
      .maybeSingle()
    if (error) { console.warn('[weeklyRankings] fetch failed', error.message); return null }
    return (data as PublishedWeekly) ?? null
  } catch (e) {
    console.warn('[weeklyRankings] fetch threw', e)
    return null
  }
}

export async function publishWeekly(row: {
  sport: 'football'; season: number; week: number; source_name: string; body: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const t = table()
    if (!t) return { ok: false, error: 'Database not configured' }
    const { data: auth } = await (supabase as any).auth.getUser()
    const { error } = await t.upsert(
      { ...row, published_by: auth?.user?.id ?? null, published_at: new Date().toISOString() },
      { onConflict: 'sport,season,week' },
    )
    return error ? { ok: false, error: error.message } : { ok: true }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}
