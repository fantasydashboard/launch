// api/yahoo-buzzindex.js
// Vercel serverless proxy for Yahoo Fantasy Baseball Transaction Trends (buzzindex).
// Fetches Yahoo's HTML page server-side (avoiding browser CORS), parses the player
// table, and returns clean JSON so the client never touches Yahoo directly.
//
// Endpoint: GET /api/yahoo-buzzindex
// Query params:
//   date      — YYYY-MM-DD  (defaults to today)
//   pos       — ALL | C | 1B | 2B | 3B | SS | OF | Util | SP | RP | P
//   trendtab  — O (today) | W (last 7 days) | M (last month)
//   sort      — BI_T (trades, default) | BI_A (adds) | BI_D (drops)
//   season    — 4-digit year (defaults to current year)

export default async function handler(req, res) {
  // CORS — allow UFD origin
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const {
    date     = new Date().toISOString().slice(0, 10),
    pos      = 'ALL',
    trendtab = 'W',
    sort     = 'BI_T',
    sdir     = '1',
  } = req.query

  const yahooUrl =
    `https://baseball.fantasysports.yahoo.com/b1/buzzindex` +
    `?date=${encodeURIComponent(date)}` +
    `&pos=${encodeURIComponent(pos)}` +
    `&src=combined` +
    `&bimtab=A` +
    `&trendtab=${encodeURIComponent(trendtab)}` +
    `&sort=${encodeURIComponent(sort)}` +
    `&sdir=${sdir}` +
    `&pspid=782205891` +
    `&activity=players_sort_click`

  try {
    const yahooRes = await fetch(yahooUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         'https://baseball.fantasysports.yahoo.com/',
        'Cache-Control':   'no-cache',
      },
    })

    // Yahoo redirects to login page if auth required — detect that
    const finalUrl = yahooRes.url || ''
    if (finalUrl.includes('login') || finalUrl.includes('signin')) {
      return res.status(401).json({
        error: 'auth_required',
        message: 'Yahoo requires authentication for this endpoint. Pass a valid Yahoo session cookie.',
      })
    }

    if (!yahooRes.ok) {
      return res.status(yahooRes.status).json({
        error: 'yahoo_error',
        message: `Yahoo returned HTTP ${yahooRes.status}`,
        url: yahooUrl,
      })
    }

    const html = await yahooRes.text()

    // Detect login redirect in body (Yahoo sometimes 200s but serves login page)
    if (html.includes('login.yahoo.com') || html.includes('id="login-username"')) {
      return res.status(401).json({
        error: 'auth_required',
        message: 'Yahoo is returning a login page. The buzzindex endpoint may require a session cookie.',
      })
    }

    // ── Parse the player table ─────────────────────────────────────────────
    // Yahoo's buzzindex table structure (as of 2026):
    //   Each player row contains:
    //     - .ysf-player-name anchor with player name
    //     - <span class="ysf-player-detail-item"> with "TEAM - POS"
    //     - Several <td> cells: %Ros, %Start, Drops, Adds, Trades, Total
    //
    // We extract all <tr> blocks that contain a player name link, then
    // pull the relevant cells by position in the row.

    const players = []

    // Split on table rows
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch

    while ((rowMatch = rowPattern.exec(html)) !== null) {
      const row = rowMatch[1]

      // Must contain a player name link — skip header/footer rows
      const nameMatch = row.match(/class="[^"]*ysf-player-name[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/)
        || row.match(/<a[^>]*title="([^"]+)"[^>]*class="[^"]*name[^"]*"/)
        || row.match(/<a[^>]*class="[^"]*Fw\(b\)[^"]*"[^>]*>([^<]+)<\/a>/)

      if (!nameMatch) continue

      const name = nameMatch[1].trim()
      if (!name || name.length < 2) continue

      // Team + position — "LAA - OF" or "NYY - SP,RP"
      const teamPosMatch = row.match(/([A-Z]{2,4})\s*[-–]\s*((?:[A-Z0-9]{1,5}[,]?)+)/)
      const team     = teamPosMatch?.[1]?.trim() || ''
      const position = teamPosMatch?.[2]?.trim().replace(/,$/, '') || ''

      // Extract all numeric <td> values
      const tdNums = []
      const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let tdMatch
      const rowForTd = row
      const tempPattern = new RegExp('<td[^>]*>([\\s\\S]*?)<\\/td>', 'gi')
      let m
      while ((m = tempPattern.exec(rowForTd)) !== null) {
        const raw = m[1].replace(/<[^>]+>/g, '').trim()
        const num = parseFloat(raw)
        if (!isNaN(num) && num >= 0) tdNums.push(num)
      }

      // Yahoo column order: %Ros, %Start, Drops, Adds, Trades, Total
      // Trades is typically the 5th numeric column (index 4)
      // We also try to find the largest reasonable number as a fallback
      let trades = 0
      if (tdNums.length >= 5) {
        trades = tdNums[4]  // 5th numeric col = Trades
      } else if (tdNums.length > 0) {
        // Fallback: pick the largest value that looks like a trade count (< 5000)
        trades = Math.max(...tdNums.filter(n => n < 5000 && n === Math.floor(n)))
      }

      // Sanity check — skip rows with no meaningful data
      if (trades > 0 || position) {
        players.push({ name, team, position, trades: Math.round(trades) })
      }
    }

    // Sort by trades descending
    players.sort((a, b) => b.trades - a.trades)

    if (players.length === 0) {
      // Return a debug payload so we can see what came back
      return res.status(200).json({
        players: [],
        debug: {
          htmlLength: html.length,
          htmlSample: html.slice(0, 1000),
          url: yahooUrl,
          note: 'Parsed 0 players — HTML structure may have changed. Check htmlSample.',
        },
      })
    }

    // Cache for 5 minutes — buzzindex data doesn't change second-to-second
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return res.status(200).json({
      players: players.slice(0, 25),
      total: players.length,
      url: yahooUrl,
      trendtab,
      date,
      pos,
    })

  } catch (err) {
    console.error('[yahoo-buzzindex] Error:', err)
    return res.status(500).json({
      error: 'proxy_error',
      message: err.message || 'Unknown error',
      url: yahooUrl,
    })
  }
}
