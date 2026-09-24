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

const STATS = 'https://api.nhle.com/stats/rest/en'
const WEB = 'https://api-web.nhle.com/v1'

/* Only the reports this product reads. An open relay would let anyone point our origin at
   arbitrary NHL paths, and the allowlist costs one line per legitimate addition. */
const ALLOWED = new Set(['skater/summary', 'skater/timeonice', 'skater/realtime', 'goalie/summary'])

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

const PAGE = 100
/* A full season is ~940 skaters. The ceiling is here so a malformed `total` cannot spin this
   function until it times out — it bounds the loop, it does not shape normal responses. */
const MAX_PAGES = 30

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')

  const { report, seasonId, schedule } = req.query ?? {}

  try {
    if (schedule) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(schedule))) {
        return res.status(400).json({ error: 'schedule must be YYYY-MM-DD' })
      }
      const r = await fetch(`${WEB}/schedule/${schedule}`)
      if (!r.ok) return res.status(r.status).json({ error: `NHL schedule ${r.status}` })
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
