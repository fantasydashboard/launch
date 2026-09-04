// api/betting/providers.js
//
// Odds provider adapters. Every provider normalizes to the same two shapes so
// that swapping or adding a feed is this file and nothing else. That indirection
// is worth the small cost up front: the free tier we start on is not the feed we
// finish on, and the alternative is provider-shaped JSON leaking into the
// database schema and the Vue components.
//
//   normalizeEvent -> { id, provider, sport_key, league, commence_time, home_team, away_team }
//   normalizeQuote -> { event_id, market_key, player, outcome, point, book, american, observed_at }

// ── Books we treat as fair-value anchors ─────────────────────────────────────
// Kept in step with SHARP_BOOKS in src/services/betting/types.ts by hand. On The
// Odds API the useful detail is that BetOnline and LowVig sit in the 'us' region
// while Pinnacle is 'eu' only, and regions multiply the credit cost. So on a free
// tier the anchor is BetOnline plus LowVig at 1x cost, not Pinnacle at 2x. That
// is a real downgrade in anchor quality and the UI has to be honest that the
// beta is running on a second-best anchor.
//
// These are reference prices, not places anyone bets. That distinction is the
// whole reason a Florida-only build still works: you measure against the sharpest
// market you can see, and you place the wager wherever you are actually allowed to.
export const ANCHOR_BOOKS = ['pinnacle', 'betonlineag', 'lowvig', 'circasports', 'bookmaker']

// ── Where a Florida user can actually act ────────────────────────────────────
// Hard Rock is the only licensed sportsbook in Florida, and The Odds API carries
// a Florida-specific variant, so we get this state's real numbers rather than a
// national blend. Sleeper is not carried by any affordable feed, so PrizePicks
// and Underdog stand in for the pick'em market: same product, same player pool,
// lines that normally sit within half a point of each other.
export const FL_SPORTSBOOKS = ['hardrockbet_fl', 'hardrockbet']
export const DFS_APPS = ['prizepicks', 'underdog']
export const FL_BETTABLE = [...FL_SPORTSBOOKS, ...DFS_APPS]

// Regions needed to see all of the above. Each one multiplies the credit cost of
// every priced call, which is the single biggest constraint on the free tier:
//   us      anchor books (BetOnline, LowVig)
//   us2     Hard Rock Bet Florida
//   us_dfs  PrizePicks, Underdog
export const FL_REGIONS = ['us', 'us2', 'us_dfs']

// ── The Odds API ─────────────────────────────────────────────────────────────
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

function usageFromHeaders(headers) {
  const n = (h) => {
    const v = headers.get(h)
    return v === null ? null : Number(v)
  }
  // Provider-reported, never our own count. Tracking credits locally is how
  // people discover they are out of quota a week after they actually were.
  return {
    used: n('x-requests-used'),
    remaining: n('x-requests-remaining'),
    last: n('x-requests-last'),
  }
}

function normalizeOddsApiEvent(e, provider = 'theoddsapi') {
  return {
    id: `${provider}:${e.id}`,
    provider,
    sport_key: e.sport_key,
    league: e.sport_title || null,
    commence_time: e.commence_time,
    home_team: e.home_team || null,
    away_team: e.away_team || null,
  }
}

/**
 * Flatten one event's bookmaker tree into quote rows.
 *
 * Two shapes hide in here. Over/under props carry the player in `description`
 * and the side in `name`. Yes/no props (anytime touchdown scorer and friends)
 * put the player in `name` with no description at all. Reading `name` as the
 * outcome in both cases silently produces a market whose two "sides" are two
 * different players, which devigs to confident nonsense rather than failing.
 */
function normalizeOddsApiQuotes(event, provider = 'theoddsapi') {
  const rows = []
  const eventId = `${provider}:${event.id}`

  for (const book of event.bookmakers || []) {
    for (const market of book.markets || []) {
      const observedAt = market.last_update || book.last_update || new Date().toISOString()

      for (const o of market.outcomes || []) {
        const hasDescription = typeof o.description === 'string' && o.description.length > 0
        const isProp = market.key.startsWith('player_') || market.key.startsWith('batter_') || market.key.startsWith('pitcher_')

        let player = null
        let outcome = o.name

        if (hasDescription) {
          player = o.description
        } else if (isProp) {
          // Yes/no prop: the player is the outcome name and the side is implicit.
          player = o.name
          outcome = 'Yes'
        }

        if (typeof o.price !== 'number' || !Number.isFinite(o.price)) continue

        rows.push({
          event_id: eventId,
          market_key: market.key,
          player,
          outcome,
          point: typeof o.point === 'number' ? o.point : null,
          book: book.key,
          american: Math.round(o.price),
          // DFS pick'em apps do not price a leg individually; they publish a
          // payout multiplier for the whole entry. The provider returns it here
          // when includeMultipliers is on, and it is worth storing because a
          // hand-maintained payout table goes stale silently.
          multiplier: typeof o.multiplier === 'number' ? o.multiplier : null,
          observed_at: observedAt,
        })
      }
    }
  }
  return rows
}

async function oddsApiGet(path, params, apiKey) {
  const url = new URL(`${ODDS_API_BASE}${path}`)
  url.searchParams.set('apiKey', apiKey)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const started = Date.now()
  const resp = await fetch(url.toString())
  const usage = usageFromHeaders(resp.headers)
  const durationMs = Date.now() - started

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    return { ok: false, status: resp.status, error: body.slice(0, 500), usage, durationMs, data: null }
  }
  return { ok: true, status: resp.status, error: null, usage, durationMs, data: await resp.json() }
}

export const theOddsApi = {
  key: 'theoddsapi',

  /**
   * Upcoming events. This endpoint is FREE on The Odds API and it is the reason
   * a 500-credit month is workable at all: we discover the slate for nothing and
   * spend credits only on the specific games we actually want priced.
   */
  async listEvents({ apiKey, sportKey, commenceTimeTo }) {
    const res = await oddsApiGet(`/sports/${sportKey}/events`, {
      dateFormat: 'iso',
      commenceTimeTo,
    }, apiKey)
    if (!res.ok) return { ...res, events: [] }
    return { ...res, events: (res.data || []).map(e => normalizeOddsApiEvent(e, 'theoddsapi')) }
  },

  /**
   * Game lines across a whole slate in one call.
   * Cost: 1 credit per market per region. h2h+spreads+totals on 'us' is 3.
   */
  async fetchGameLines({ apiKey, sportKey, markets = ['h2h', 'totals'], regions = ['us'], eventIds }) {
    const res = await oddsApiGet(`/sports/${sportKey}/odds`, {
      regions: regions.join(','),
      markets: markets.join(','),
      oddsFormat: 'american',
      dateFormat: 'iso',
      eventIds: eventIds && eventIds.length ? eventIds.join(',') : undefined,
    }, apiKey)

    if (!res.ok) return { ...res, events: [], quotes: [] }
    const data = res.data || []
    return {
      ...res,
      events: data.map(e => normalizeOddsApiEvent(e, 'theoddsapi')),
      quotes: data.flatMap(e => normalizeOddsApiQuotes(e, 'theoddsapi')),
    }
  },

  /**
   * Player props for ONE event. Props are per-event only on this provider, and
   * cost 1 credit per market returned per region, so a five-market pull on one
   * game is five credits. This is the line item that eats a free tier, which is
   * why the caller passes an explicit budget rather than a game list.
   */
  async fetchEventProps({ apiKey, sportKey, eventId, markets, regions = ['us'] }) {
    const rawId = eventId.includes(':') ? eventId.split(':')[1] : eventId
    const res = await oddsApiGet(`/sports/${sportKey}/events/${rawId}/odds`, {
      regions: regions.join(','),
      markets: markets.join(','),
      oddsFormat: 'american',
      dateFormat: 'iso',
      // Only meaningful for the us_dfs region, and free to ask for otherwise.
      includeMultipliers: 'true',
    }, apiKey)

    if (!res.ok) return { ...res, events: [], quotes: [] }
    const e = res.data
    if (!e || !e.id) return { ...res, events: [], quotes: [] }
    return {
      ...res,
      events: [normalizeOddsApiEvent(e, 'theoddsapi')],
      quotes: normalizeOddsApiQuotes(e, 'theoddsapi'),
    }
  },
}

// ── Market sets ──────────────────────────────────────────────────────────────
// Deliberately short. Every market added multiplies the credit cost of every
// event pulled, and a screener showing four markets across six games it can
// price accurately is worth more than twenty markets across two.
// Three regions means every market here costs three credits per game, so this
// list got shorter when Florida got added. Receptions came out first: it is the
// lowest-variance market of the four and the one where DFS lines are hardest to
// beat, so it was paying the least rent.
export const NFL_PROP_MARKETS = [
  'player_pass_yds',
  'player_rush_yds',
  'player_reception_yds',
]

export const NFL_GAME_MARKETS = ['h2h', 'spreads', 'totals']

export const PROVIDERS = { theoddsapi: theOddsApi }
