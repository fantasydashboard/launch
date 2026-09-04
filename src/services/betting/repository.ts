// services/betting/repository.ts
//
// Reading stored odds back out of Supabase and assembling them into the Market
// shape the engine expects. Nothing here computes an edge; it only groups.

import { supabase } from '@/lib/supabase'
import type { Market, Quote } from './types'
import type { DfsOffer } from './picksBoard'

export interface OddsEvent {
  id: string
  sport_key: string
  league: string | null
  commence_time: string
  home_team: string | null
  away_team: string | null
}

export interface FetchHealth {
  lastRunAt: string | null
  lastRunOk: boolean | null
  lastError: string | null
  creditsRemaining: number | null
  creditsUsedThisMonth: number
}

/** Games that have not started yet, soonest first. */
export async function loadUpcomingEvents(sportKey?: string): Promise<OddsEvent[]> {
  if (!supabase) return []
  let q = supabase
    .from('odds_events')
    .select('id, sport_key, league, commence_time, home_team, away_team')
    .gt('commence_time', new Date().toISOString())
    .order('commence_time', { ascending: true })

  if (sportKey) q = q.eq('sport_key', sportKey)

  const { data, error } = await q
  if (error) {
    console.warn('[betting] loadUpcomingEvents:', error.message)
    return []
  }
  return (data || []) as OddsEvent[]
}

interface QuoteRow {
  event_id: string
  market_key: string
  player: string | null
  outcome: string
  point: number | null
  book: string
  american: number
  multiplier: number | null
  observed_at: string
}

/**
 * Latest price per book/side, grouped into markets.
 *
 * The grouping key includes the point, so an Over 68.5 at one book and an Over
 * 69.5 at another are two markets, not two prices for the same bet. That is
 * deliberate and it is the conservative reading: comparing across different
 * numbers would report an edge that is really just a different bet. Alternate
 * lines are a later feature and they need their own handling, not a looser key.
 */
export async function loadMarkets(eventIds: string[]): Promise<Market[]> {
  if (!supabase || eventIds.length === 0) return []

  const { data, error } = await supabase
    .from('odds_quotes_latest')
    .select('event_id, market_key, player, outcome, point, book, american, multiplier, observed_at')
    .in('event_id', eventIds)

  if (error) {
    console.warn('[betting] loadMarkets:', error.message)
    return []
  }

  const rows = (data || []) as QuoteRow[]
  const groups = new Map<string, Market>()

  for (const r of rows) {
    const key = [r.event_id, r.market_key, r.player ?? '', r.point ?? ''].join('|')

    if (!groups.has(key)) {
      groups.set(key, {
        eventId: r.event_id,
        marketKey: r.market_key,
        player: r.player,
        point: r.point,
        outcomes: [],
        quotes: [],
      })
    }

    const m = groups.get(key)!
    if (!m.outcomes.includes(r.outcome)) m.outcomes.push(r.outcome)

    const quote: Quote = {
      book: r.book,
      outcome: r.outcome,
      american: r.american,
      point: r.point,
      observedAt: r.observed_at,
    }
    m.quotes.push(quote)
  }

  // A market with one outcome cannot be devigged, so it is dropped here rather
  // than failing further down where the reason would be much less obvious.
  return [...groups.values()].filter(m => m.outcomes.length >= 2)
}

/**
 * Health of the odds pipeline: when it last ran, whether it worked, and how much
 * of the monthly credit allowance is gone. Surfaced in the UI because on a free
 * tier "the screener is empty" and "the screener is out of credits" look
 * identical from the outside, and confusing the two wastes an afternoon.
 */
export async function loadFetchHealth(): Promise<FetchHealth> {
  const empty: FetchHealth = {
    lastRunAt: null, lastRunOk: null, lastError: null,
    creditsRemaining: null, creditsUsedThisMonth: 0,
  }
  if (!supabase) return empty

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('odds_fetch_log')
    .select('ok, error, credits_used, credits_remaining, started_at')
    .gte('started_at', monthStart.toISOString())
    .order('started_at', { ascending: false })

  if (error || !data?.length) return empty

  const last = data[0]
  const withRemaining = data.find(r => r.credits_remaining !== null)

  return {
    lastRunAt: last.started_at,
    lastRunOk: last.ok,
    lastError: last.ok ? null : last.error,
    creditsRemaining: withRemaining?.credits_remaining ?? null,
    creditsUsedThisMonth: data.reduce((s, r) => s + (r.credits_used || 0), 0),
  }
}

/** Human label for a provider market key. Unknown keys pass through unchanged. */
const MARKET_LABELS: Record<string, string> = {
  h2h: 'Moneyline',
  spreads: 'Spread',
  totals: 'Game total',
  player_pass_yds: 'Passing yards',
  player_pass_tds: 'Passing TDs',
  player_rush_yds: 'Rushing yards',
  player_reception_yds: 'Receiving yards',
  player_receptions: 'Receptions',
  player_anytime_td: 'Anytime TD',
}

export function marketLabel(key: string): string {
  return MARKET_LABELS[key] || key.replace(/^player_/, '').replace(/_/g, ' ')
}

const BOOK_LABELS: Record<string, string> = {
  draftkings: 'DraftKings', fanduel: 'FanDuel', betmgm: 'BetMGM',
  betrivers: 'BetRivers', williamhill_us: 'Caesars', bovada: 'Bovada',
  betonlineag: 'BetOnline', lowvig: 'LowVig', pinnacle: 'Pinnacle',
  fanatics: 'Fanatics', betus: 'BetUS', circasports: 'Circa',
  hardrockbet: 'Hard Rock', hardrockbet_fl: 'Hard Rock (FL)',
  prizepicks: 'PrizePicks', underdog: 'Underdog', sleeper: 'Sleeper',
}

export function bookLabel(key: string): string {
  return BOOK_LABELS[key] || key
}

// ── Hand-entered DFS lines ───────────────────────────────────────────────────
// Sleeper publishes no picks API and no affordable feed carries it, so its lines
// are typed in. They are stored apart from the fetched quotes so that later it
// is always clear which numbers were observed and which were transcribed.

export interface ManualLineRow {
  id: string
  book: string
  player: string
  market_key: string
  point: number
  event_id: string | null
  note: string | null
  created_at: string
}

/** Most recent hand-entered line per book, player and stat. */
export async function loadManualLines(): Promise<DfsOffer[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('dfs_manual_lines_latest')
    .select('id, book, player, market_key, point, event_id, note, created_at')

  if (error) {
    console.warn('[betting] loadManualLines:', error.message)
    return []
  }

  return (data as ManualLineRow[] || [])
    .filter(r => r.event_id)
    .map(r => ({
      player: r.player,
      marketKey: r.market_key,
      eventId: r.event_id as string,
      book: r.book,
      point: Number(r.point),
      // Typed lines carry the moment they were entered as their observation
      // time, so the same staleness rules apply to them as to fetched ones.
      observedAt: r.created_at,
      manual: true,
    }))
}

export async function saveManualLine(input: {
  player: string
  marketKey: string
  point: number
  eventId: string
  book?: string
  note?: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' }

  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id ?? null

  const { error } = await supabase.from('dfs_manual_lines').insert({
    book: input.book || 'sleeper',
    player: input.player,
    market_key: input.marketKey,
    point: input.point,
    event_id: input.eventId,
    note: input.note ?? null,
    entered_by: userId,
  })

  return error ? { ok: false, error: error.message } : { ok: true }
}
