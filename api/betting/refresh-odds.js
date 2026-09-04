// api/betting/refresh-odds.js
//
// Scheduled odds snapshot. Runs on a Vercel cron, writes raw prices into
// Supabase, and never computes an edge — the fair-value math lives client side
// in src/services/betting so it can be unit tested without a network.
//
// The whole design constraint here is the free tier. The Odds API gives 500
// credits a month and player props cost one credit per market per region per
// event, so a careless pull spends the month in an afternoon. Three defences:
//
//   1. Discover the slate with the /events endpoint, which is free.
//   2. Price the smallest useful set of games and markets, not everything.
//   3. Refuse to fire when the projected cost would break the monthly budget,
//      and log the refusal so it is visible rather than silent.
//
// Region note: this pulls three regions, because a Florida build needs all of
// them. 'us' carries the anchor books (BetOnline, LowVig), 'us2' carries Hard
// Rock Bet Florida, and 'us_dfs' carries PrizePicks and Underdog. Regions
// multiply the credit cost, so three regions means every prop market costs three
// credits per game. That is why this runs on game days only and prices three
// markets on three games rather than everything on everything.
//
// Pinnacle is 'eu' and would be a fourth region. Not worth it on the free tier.

import { createClient } from '@supabase/supabase-js'
import { theOddsApi, NFL_PROP_MARKETS, NFL_GAME_MARKETS, FL_REGIONS } from './providers.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ODDS_API_KEY = process.env.ODDS_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

// Leave headroom under the real 500 so a miscount never hits a hard wall
// mid-week, and so there is always budget left for a manual refresh.
const MONTHLY_CREDIT_BUDGET = Number(process.env.ODDS_MONTHLY_CREDIT_BUDGET || 400)

const SPORT_KEY = process.env.ODDS_SPORT_KEY || 'americanfootball_nfl'
const REGIONS = (process.env.ODDS_REGIONS || FL_REGIONS.join(',')).split(',')
// How many games to pull props for per run. Three games at three markets across
// three regions is 27 credits, and on a Thursday/Sunday/Monday schedule that is
// roughly 350 a month, which fits inside the 500-credit free tier with room for
// a few manual refreshes.
const MAX_PROP_EVENTS = Number(process.env.ODDS_MAX_PROP_EVENTS || 3)
// Only price games kicking off inside this window. Lines far out are wide and
// move a lot, so paying for them is paying for noise.
const LOOKAHEAD_HOURS = Number(process.env.ODDS_LOOKAHEAD_HOURS || 72)

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Credits already spent this calendar month, from our own log. */
async function creditsUsedThisMonth(db) {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)

  const { data, error } = await db
    .from('odds_fetch_log')
    .select('credits_used')
    .gte('started_at', start.toISOString())

  if (error) return { used: 0, error: error.message }
  return { used: (data || []).reduce((s, r) => s + (r.credits_used || 0), 0), error: null }
}

async function logFetch(db, row) {
  const { data } = await db.from('odds_fetch_log').insert(row).select('id').maybeSingle()
  return data?.id ?? null
}

async function persist(db, { events, quotes, fetchId }) {
  let written = 0

  if (events.length) {
    // Upsert: an event's kickoff time and teams can legitimately change.
    const { error } = await db.from('odds_events').upsert(
      events.map(e => ({ ...e, updated_at: new Date().toISOString() })),
      { onConflict: 'id' }
    )
    if (error) throw new Error(`odds_events upsert: ${error.message}`)
  }

  if (quotes.length) {
    // Insert, never upsert. Quotes are append-only history; the unique
    // constraint makes a repeated snapshot a no-op instead of an overwrite.
    const rows = quotes.map(q => ({ ...q, fetch_id: fetchId }))
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error, count } = await db
        .from('odds_quotes')
        .upsert(chunk, {
          onConflict: 'event_id,market_key,player,outcome,point,book,observed_at',
          ignoreDuplicates: true,
          count: 'exact',
        })
      if (error) throw new Error(`odds_quotes insert: ${error.message}`)
      written += count ?? chunk.length
    }
  }

  return written
}

async function authorize(req) {
  // Vercel cron sends the configured CRON_SECRET as a bearer token.
  const auth = req.headers?.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (CRON_SECRET && token === CRON_SECRET) return { ok: true, actor: 'cron' }

  // Manual refresh from the admin panel: a real Supabase session that has to
  // belong to an admin. Checked server side rather than trusting the caller,
  // because "admin" in the browser is a claim, not a fact.
  if (token) {
    const db = admin()
    const { data: userRes } = await db.auth.getUser(token)
    const uid = userRes?.user?.id
    if (uid) {
      const { data: profile } = await db
        .from('profiles').select('subscription_tier').eq('id', uid).maybeSingle()
      if (profile?.subscription_tier === 'admin') return { ok: true, actor: `admin:${uid}` }
    }
  }

  // No secret configured and no token: allow, matching how the existing
  // refresh-projections cron runs. Set CRON_SECRET in Vercel to close this.
  if (!CRON_SECRET) return { ok: true, actor: 'unauthenticated' }

  return { ok: false, actor: null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase env vars' })
  }
  if (!ODDS_API_KEY) {
    return res.status(500).json({ error: 'Missing ODDS_API_KEY' })
  }

  const auth = await authorize(req)
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' })

  const db = admin()
  const startedAt = Date.now()
  const summary = { actor: auth.actor, calls: [], eventsSeen: 0, quotesWritten: 0, creditsSpent: 0 }

  try {
    // ── Budget check before anything costs money ────────────────────────────
    const { used } = await creditsUsedThisMonth(db)
    const propMarketCount = NFL_PROP_MARKETS.length * REGIONS.length
    const gameMarketCount = NFL_GAME_MARKETS.length * REGIONS.length
    const projected = gameMarketCount + MAX_PROP_EVENTS * propMarketCount

    if (used + projected > MONTHLY_CREDIT_BUDGET) {
      await logFetch(db, {
        provider: 'theoddsapi', endpoint: 'budget-guard', sport_key: SPORT_KEY,
        ok: false, error: `Budget guard: ${used} used + ${projected} projected > ${MONTHLY_CREDIT_BUDGET}`,
        credits_used: 0, quotes_written: 0, duration_ms: Date.now() - startedAt,
      })
      return res.status(200).json({
        ok: true, skipped: 'monthly_budget',
        used, projected, budget: MONTHLY_CREDIT_BUDGET,
        note: 'No credits spent. Raise ODDS_MONTHLY_CREDIT_BUDGET or wait for the monthly reset.',
      })
    }

    // ── 1. Discover the slate. Free on this provider. ───────────────────────
    const until = new Date(Date.now() + LOOKAHEAD_HOURS * 3600 * 1000).toISOString()
    const eventsRes = await theOddsApi.listEvents({
      apiKey: ODDS_API_KEY, sportKey: SPORT_KEY,
      commenceTimeTo: until.replace(/\.\d{3}Z$/, 'Z'),
    })
    summary.calls.push({ endpoint: 'events', ok: eventsRes.ok, cost: eventsRes.usage.last ?? 0 })

    if (!eventsRes.ok) {
      await logFetch(db, {
        provider: 'theoddsapi', endpoint: 'events', sport_key: SPORT_KEY, ok: false,
        http_status: eventsRes.status, error: eventsRes.error,
        credits_used: eventsRes.usage.last ?? 0, credits_remaining: eventsRes.usage.remaining,
        duration_ms: eventsRes.durationMs,
      })
      return res.status(502).json({ error: 'events fetch failed', detail: eventsRes.error })
    }

    const upcoming = eventsRes.events
      .filter(e => new Date(e.commence_time) > new Date())
      .sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time))
    summary.eventsSeen = upcoming.length

    if (upcoming.length === 0) {
      return res.status(200).json({ ok: true, skipped: 'no_upcoming_events', ...summary })
    }

    // ── 2. Game lines for the whole slate in one call ───────────────────────
    const lines = await theOddsApi.fetchGameLines({
      apiKey: ODDS_API_KEY, sportKey: SPORT_KEY,
      markets: NFL_GAME_MARKETS, regions: REGIONS,
    })
    const linesFetchId = await logFetch(db, {
      provider: 'theoddsapi', endpoint: 'game-lines', sport_key: SPORT_KEY,
      markets: NFL_GAME_MARKETS, ok: lines.ok, http_status: lines.status, error: lines.error,
      credits_used: lines.usage.last ?? 0, credits_remaining: lines.usage.remaining,
      duration_ms: lines.durationMs,
    })
    summary.creditsSpent += lines.usage.last ?? 0
    summary.calls.push({ endpoint: 'game-lines', ok: lines.ok, cost: lines.usage.last ?? 0 })

    if (lines.ok) {
      summary.quotesWritten += await persist(db, {
        events: lines.events, quotes: lines.quotes, fetchId: linesFetchId,
      })
    }

    // ── 3. Props for the nearest few games only ─────────────────────────────
    for (const event of upcoming.slice(0, MAX_PROP_EVENTS)) {
      const props = await theOddsApi.fetchEventProps({
        apiKey: ODDS_API_KEY, sportKey: SPORT_KEY,
        eventId: event.id, markets: NFL_PROP_MARKETS, regions: REGIONS,
      })
      const fetchId = await logFetch(db, {
        provider: 'theoddsapi', endpoint: 'event-props', sport_key: SPORT_KEY,
        markets: NFL_PROP_MARKETS, ok: props.ok, http_status: props.status, error: props.error,
        credits_used: props.usage.last ?? 0, credits_remaining: props.usage.remaining,
        duration_ms: props.durationMs,
      })
      summary.creditsSpent += props.usage.last ?? 0
      summary.calls.push({ endpoint: 'event-props', eventId: event.id, ok: props.ok, cost: props.usage.last ?? 0 })

      if (!props.ok) continue

      summary.quotesWritten += await persist(db, {
        events: props.events.length ? props.events : [event],
        quotes: props.quotes,
        fetchId,
      })

      // Stop early rather than pushing past the budget mid-loop.
      const spent = used + summary.creditsSpent
      if (spent >= MONTHLY_CREDIT_BUDGET) {
        summary.stoppedEarly = 'monthly_budget'
        break
      }
    }

    return res.status(200).json({
      ok: true,
      ...summary,
      creditsUsedThisMonth: used + summary.creditsSpent,
      budget: MONTHLY_CREDIT_BUDGET,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (err) {
    console.error('[refresh-odds]', err)
    await logFetch(db, {
      provider: 'theoddsapi', endpoint: 'handler', sport_key: SPORT_KEY, ok: false,
      error: String(err?.message || err), duration_ms: Date.now() - startedAt,
    }).catch(() => {})
    return res.status(500).json({ error: String(err?.message || err), ...summary })
  }
}
