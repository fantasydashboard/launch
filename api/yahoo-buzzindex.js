// api/yahoo-buzzindex.js
// Vercel serverless proxy for Yahoo Fantasy Baseball Transaction Trends (buzzindex).
// Fetches Yahoo's HTML page server-side, parses the player table, returns clean JSON.
//
// Query params:
//   date      — YYYY-MM-DD  (defaults to today)
//   pos       — ALL | C | 1B | 2B | 3B | SS | OF | Util | SP | RP | P
//   trendtab  — O (today) | W (last 7 days) | M (last month)
//   sort      — BI_T (trades) | BI_A (adds) | BI_D (drops)
//   cookie    — Yahoo session cookie string (Y=...; T=...) — passed from admin UI

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const {
    date     = new Date().toISOString().slice(0, 10),
    pos      = 'ALL',
    trendtab = 'W',
    sort     = 'BI_T',
    sdir     = '1',
    cookie   = '',
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

  const headers = {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer':         'https://baseball.fantasysports.yahoo.com/',
    'Cache-Control':   'no-cache',
  }

  // Forward the Yahoo session cookie if provided
  if (cookie) headers['Cookie'] = decodeURIComponent(cookie)

  try {
    const yahooRes = await fetch(yahooUrl, { headers })

    const finalUrl = yahooRes.url || ''
    if (finalUrl.includes('login') || finalUrl.includes('signin')) {
      return res.status(401).json({ error: 'auth_required', message: 'Redirected to Yahoo login — session cookie may be expired or missing.' })
    }

    if (!yahooRes.ok) {
      return res.status(yahooRes.status).json({ error: 'yahoo_error', message: `Yahoo returned HTTP ${yahooRes.status}` })
    }

    const html = await yahooRes.text()

    if (html.includes('login.yahoo.com') || html.includes('id="login-username"')) {
      return res.status(401).json({ error: 'auth_required', message: 'Yahoo returned a login page — session cookie required or expired.' })
    }

    // ── Parse player rows ──────────────────────────────────────────────────
    const players = []
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch

    while ((rowMatch = rowPattern.exec(html)) !== null) {
      const row = rowMatch[1]

      // Must have a player name link
      const nameMatch =
        row.match(/class="[^"]*ysf-player-name[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/) ||
        row.match(/<a[^>]*title="([^"]+)"[^>]*class="[^"]*name[^"]*"/) ||
        row.match(/<a[^>]*class="[^"]*Fw\(b\)[^"]*"[^>]*>([^<]+)<\/a>/)

      if (!nameMatch) continue
      const name = nameMatch[1].trim()
      if (!name || name.length < 2) continue

      // Team + position ("LAA - OF")
      const teamPosMatch = row.match(/([A-Z]{2,4})\s*[-–]\s*((?:[A-Z0-9]{1,5}[,]?)+)/)
      const team     = teamPosMatch?.[1]?.trim() || ''
      const position = teamPosMatch?.[2]?.trim().replace(/,$/, '') || ''

      // Numeric <td> values — column order: %Ros, %Start, Drops, Adds, Trades, Total
      const tdNums = []
      const tdPat = new RegExp('<td[^>]*>([\\s\\S]*?)<\\/td>', 'gi')
      let m
      while ((m = tdPat.exec(row)) !== null) {
        const raw = m[1].replace(/<[^>]+>/g, '').trim()
        const num = parseFloat(raw)
        if (!isNaN(num) && num >= 0) tdNums.push(num)
      }

      // 5th numeric column = Trades
      let trades = 0
      if (tdNums.length >= 5) {
        trades = tdNums[4]
      } else if (tdNums.length > 0) {
        trades = Math.max(...tdNums.filter(n => n < 5000 && n === Math.floor(n)))
      }

      if (name) players.push({ name, team, position, trades: Math.round(trades) })
    }

    players.sort((a, b) => b.trades - a.trades)

    if (players.length === 0) {
      return res.status(200).json({
        players: [],
        debug: { htmlLength: html.length, htmlSample: html.slice(0, 1500), url: yahooUrl,
          note: 'Parsed 0 players — check htmlSample for structure clues.' },
      })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return res.status(200).json({ players: players.slice(0, 25), total: players.length, trendtab, date, pos })

  } catch (err) {
    console.error('[yahoo-buzzindex]', err)
    return res.status(500).json({ error: 'proxy_error', message: err.message })
  }
}
