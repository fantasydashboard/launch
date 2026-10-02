// api/nhl-stats.js
//
// The NHL's own data, relayed so a browser can actually read it.
//
// WHY THIS EXISTS. api.nhle.com and api-web.nhle.com send no `access-control-allow-origin`.
// They send `vary: Origin`, so they are aware of the header and decline to answer it. Compare
// Sleeper, which this codebase reads directly from the browser all day: it returns
// `access-control-allow-origin: *`. The NHL does not, so every direct fetch from a page is
// blocked by the browser after the response arrives.
//
// This is not the same problem api/hockey-projections.js solves. That one exists because
// ESPN's payload is 34MB and needs reducing; its own comment says CORS was never the issue
// there. Here CORS is the entire issue and the payload is small.
//
// It also fixes something already shipped: src/services/nhlSchedule.ts fetches api-web
// directly and carries a comment calling it "the same class of source as Sleeper's draft
// feed". It is not — Sleeper allows browsers and the NHL does not. Because that fetch fails
// soft to an empty week, a blocked request renders as "no games today" rather than as an
// error, which is the worst way for it to be wrong.
//
// Two shapes, one relay:
//   /api/nhl-stats?report=skater/summary&seasonId=20252026   -> paged stats, all rows
//   /api/nhl-stats?schedule=2026-10-08                        -> that date's game week
//   /api/nhl-stats?rosters=current                            -> every active NHL player

const STATS = 'https://api.nhle.com/stats/rest/en'
const WEB = 'https://api-web.nhle.com/v1'

/* Only the reports this product reads. An open relay would let anyone point our origin at
   arbitrary NHL paths, and the allowlist costs one line per legitimate addition. */
/* `skater/bios` carries birth dates, which is the only way the board can know a player's age —
   and without age there is no aging curve, so a 22-year-old and a 35-year-old are both
   projected as exactly what they were last year. Note the plural: `skater/bio` returns a 500
   with an HTML body, which a bare .json() reports as "Unexpected token '<'". */
const ALLOWED = new Set(['skater/summary', 'skater/timeonice', 'skater/realtime', 'goalie/summary', 'skater/bios'])

/*
 * The load-bearing query parameter.
 *
 * Without it the endpoint returns rows in NO GUARANTEED ORDER, and it re-orders between
 * requests — so page 2 is a slice of a different arrangement than page 1. Measured live on
 * 20252026: 940 rows came back carrying 933 distinct players, and the count moved run to run.
 * Seven players appeared twice and seven appeared not at all, at random, on every load.
 *
 * That failure is invisible from outside — the row count is right, the totals are right, and
 * the board looks complete. It is the reason paging lives in this file rather than in callers:
 * the fix has to be in the same place as the loop.
 */
const SORT = encodeURIComponent(JSON.stringify([{ property: 'playerId', direction: 'ASC' }]))

/* The 32 clubs, as the roster endpoint spells them. */
export const TEAMS = ['ANA', 'BOS', 'BUF', 'CAR', 'CBJ', 'CGY', 'CHI', 'COL', 'DAL', 'DET', 'EDM', 'FLA',
  'LAK', 'MIN', 'MTL', 'NJD', 'NSH', 'NYI', 'NYR', 'OTT', 'PHI', 'PIT', 'SEA', 'SJS', 'STL', 'TBL', 'TOR',
  'UTA', 'VAN', 'VGK', 'WPG', 'WSH']
/* Every club, or nothing. A missing club is not a league that shrank: every healthy player on it
   would read as off all rosters and vanish from the boards. Measured: a throttled pull that lost
   only Anaheim would have dropped Anaheim's whole lineup. A partial list is refused, not served. */
const MIN_TEAMS = TEAMS.length

/**
 * Who is on an NHL roster right now, as one compact list.
 *
 * WHY IT EXISTS. ESPN kept listing Anze Kopitar after he retired: a full-season projection on
 * LA, no injury tag, 1% owned, and so the top add on a category Wire. Nothing in a projection
 * feed says a player has stopped playing. The clubs' current rosters do. Thirty-two fetches
 * happen here, once per edge-cache window, so a page asks one question instead of thirty-two.
 */
export async function activeRosters(fetchImpl = fetch, retryMs = 700) {
  const players = []
  let teams = 0
  /* Four at a time, one retry on a throttle. The NHL answers a burst of thirty-two with 429s,
     and a pull that loses three clubs is refused outright — so pacing is what makes it land. */
  const get = (team) => fetchImpl(`${WEB}/roster/${team}/current`, { signal: AbortSignal.timeout(8000) })
  for (let i = 0; i < TEAMS.length; i += 4) {
    const batch = await Promise.all(TEAMS.slice(i, i + 4).map(async (team) => {
      try {
        let r = await get(team)
        if (r.status === 429) {
          await new Promise((done) => setTimeout(done, retryMs))
          r = await get(team)
        }
        if (!r.ok) return null
        const j = await r.json()
        return { team, j }
      } catch {
        return null
      }
    }))
    for (const got of batch) {
      if (!got) continue
      const list = ['forwards', 'defensemen', 'goalies'].flatMap((k) => (Array.isArray(got.j?.[k]) ? got.j[k] : []))
      if (!list.length) continue
      teams++
      for (const p of list) {
        const id = Number(p?.id)
        const last = String(p?.lastName?.default ?? '').trim()
        const name = `${p?.firstName?.default ?? ''} ${last}`.trim()
        if (Number.isFinite(id) && name) players.push({ id, name, last, team: got.team })
      }
    }
  }
  return { teams, players }
}

const PAGE = 100
/* A full season is ~940 skaters. The ceiling is here so a malformed `total` cannot spin this
   function until it times out — it bounds the loop, it does not shape normal responses. */
const MAX_PAGES = 30

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')

  const { report, seasonId, schedule, rosters } = req.query ?? {}

  try {
    if (rosters) {
      if (rosters !== 'current') return res.status(400).json({ error: 'rosters must be "current"' })
      const { teams, players } = await activeRosters()
      if (teams < MIN_TEAMS) {
        /* Briefly cached: an uncached failure has every page load fire thirty-two more requests
           at an upstream that is already refusing them. Five minutes, then it tries again. */
        res.setHeader('Cache-Control', 's-maxage=300')
        return res.status(502).json({ error: `only ${teams} of ${TEAMS.length} rosters answered` })
      }
      /* Rosters move by the day, not the minute — six hours keeps 32 fetches rare. */
      res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=21600')
      return res.status(200).json({ fetchedAt: new Date().toISOString(), teams, players })
    }

    if (schedule) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(schedule))) {
        return res.status(400).json({ error: 'schedule must be YYYY-MM-DD' })
      }
      /*
       * ONE RETRY ON A THROTTLE, then the edge cache.
       *
       * A date's fixtures are effectively immutable once the day starts, and this was proxied
       * fresh on every page load with no caching at any layer. The NHL rate-limits: it answered
       * 429 three times in a row during development, and every one of those became "no games
       * today" on somebody's lineup page. A single retry clears a momentary burst; s-maxage
       * means the next reader is served from the edge instead of asking again at all.
       */
      let r = await fetch(`${WEB}/schedule/${schedule}`)
      if (r.status === 429) {
        await new Promise((done) => setTimeout(done, 600))
        r = await fetch(`${WEB}/schedule/${schedule}`)
      }
      if (!r.ok) return res.status(r.status).json({ error: `NHL schedule ${r.status}` })
      /* Only a good answer is cached — caching the 429 would serve the outage to everyone. */
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
      return res.status(200).json(await r.json())
    }

    if (!report || !ALLOWED.has(String(report))) {
      return res.status(400).json({ error: `report must be one of ${[...ALLOWED].join(', ')}` })
    }
    if (!/^\d{8}$/.test(String(seasonId ?? ''))) {
      return res.status(400).json({ error: 'seasonId must be 8 digits, e.g. 20252026' })
    }

    /*
     * Paging is the load-bearing part.
     *
     * These endpoints answer with `total` (~940) beside only `limit` rows. A relay that
     * forwarded one page would hand back a complete-looking payload covering a fifth of the
     * league, and nothing downstream could tell. So the paging happens HERE, once, rather
     * than being re-implemented by every caller.
     */
    const exp = encodeURIComponent(`seasonId=${seasonId} and gameTypeId=2`)
    const data = []
    let total = 1
    for (let page = 0; page < MAX_PAGES && data.length < total; page++) {
      const url = `${STATS}/${report}?limit=${PAGE}&start=${page * PAGE}&cayenneExp=${exp}&sort=${SORT}`
      const r = await fetch(url)
      if (!r.ok) return res.status(r.status).json({ error: `NHL ${report} ${r.status}` })
      const j = await r.json()
      total = Number(j?.total ?? 0)
      const rows = Array.isArray(j?.data) ? j.data : []
      if (!rows.length) break
      data.push(...rows)
    }

    return res.status(200).json({ total, data })
  } catch (err) {
    console.error('[nhl-stats]', err)
    return res.status(502).json({ error: 'NHL upstream unavailable' })
  }
}
