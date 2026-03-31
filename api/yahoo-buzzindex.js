// api/yahoo-buzzindex.js
// Vercel serverless proxy for Yahoo Fantasy Baseball Transaction Trends (buzzindex).
// Accepts GET (no cookie) or POST (cookie in body) to avoid URL encoding corruption.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  // Params come from query string; cookie comes from POST body to avoid & encoding issues
  const {
    date     = new Date().toISOString().slice(0, 10),
    pos      = 'ALL',
    trendtab = 'W',
    sort     = 'BI_T',
    sdir     = '1',
  } = req.query

  let cookie = ''
  if (req.method === 'POST' && req.body) {
    cookie = typeof req.body === 'string'
      ? req.body
      : (req.body.cookie || '')
  }

  const yahooUrl =
    `https://baseball.fantasysports.yahoo.com/b1/buzzindex` +
    `?date=${encodeURIComponent(date)}` +
    `&pos=${encodeURIComponent(pos)}` +
    `&src=combined&bimtab=A` +
    `&trendtab=${encodeURIComponent(trendtab)}` +
    `&sort=${encodeURIComponent(sort)}` +
    `&sdir=${sdir}` +
    `&pspid=782205891&activity=players_sort_click`

  const headers = {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer':         'https://baseball.fantasysports.yahoo.com/',
    'Cache-Control':   'no-cache',
  }
  if (cookie) {
    headers['Cookie'] = cookie
    console.log('[yahoo-buzzindex] Sending cookie length:', cookie.length, 'starts with:', cookie.slice(0,30))
  } else {
    console.log('[yahoo-buzzindex] No cookie provided')
  }

  try {
    const yahooRes = await fetch(yahooUrl, { headers })
    console.log('[yahoo-buzzindex] Yahoo status:', yahooRes.status, 'final url:', yahooRes.url?.slice(0,80))

    const finalUrl = yahooRes.url || ''
    if (finalUrl.includes('login') || finalUrl.includes('signin')) {
      return res.status(401).json({ error: 'auth_required', message: 'Redirected to Yahoo login page.' })
    }
    if (!yahooRes.ok) {
      return res.status(yahooRes.status).json({ error: 'yahoo_error', message: `Yahoo HTTP ${yahooRes.status}` })
    }

    const html = await yahooRes.text()
    console.log('[yahoo-buzzindex] HTML length:', html.length, 'contains login form:', html.includes('id="login-username"'))

    if (html.includes('login.yahoo.com') || html.includes('id="login-username"')) {
      return res.status(401).json({ error: 'auth_required', message: 'Yahoo returned a login page — cookie may be expired.' })
    }

    // ── Parse player rows ──────────────────────────────────────────────────
    const players = []
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch

    while ((rowMatch = rowPattern.exec(html)) !== null) {
      const row = rowMatch[1]
      const nameMatch =
        row.match(/class="[^"]*ysf-player-name[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/) ||
        row.match(/<a[^>]*title="([^"]+)"[^>]*class="[^"]*name[^"]*"/) ||
        row.match(/<a[^>]*class="[^"]*Fw\(b\)[^"]*"[^>]*>([^<]+)<\/a>/)
      if (!nameMatch) continue
      const name = nameMatch[1].trim()
      if (!name || name.length < 2) continue

      const teamPosMatch = row.match(/([A-Z]{2,4})\s*[-–]\s*((?:[A-Z0-9]{1,5},?)+)/)
      const team     = teamPosMatch?.[1]?.trim() || ''
      const position = teamPosMatch?.[2]?.trim().replace(/,$/, '') || ''

      const tdNums = []
      const tdPat = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let m
      const rowCopy = row
      const pat2 = new RegExp('<td[^>]*>([\s\S]*?)<\/td>', 'gi')
      let m2
      while ((m2 = pat2.exec(rowCopy)) !== null) {
        const raw = m2[1].replace(/<[^>]+>/g, '').trim()
        const num = parseFloat(raw)
        if (!isNaN(num) && num >= 0) tdNums.push(num)
      }

      let trades = 0
      if (tdNums.length >= 5) trades = tdNums[4]
      else if (tdNums.length > 0) trades = Math.max(...tdNums.filter(n => n < 5000 && n === Math.floor(n)))

      if (name) players.push({ name, team, position, trades: Math.round(trades) })
    }

    players.sort((a, b) => b.trades - a.trades)
    console.log('[yahoo-buzzindex] Parsed players:', players.length, players.slice(0,3).map(p=>p.name))

    if (players.length === 0) {
      return res.status(200).json({
        players: [],
        debug: {
          htmlLength: html.length,
          htmlSample: html.slice(0, 2000),
          url: yahooUrl,
          cookieProvided: !!cookie,
          note: 'Parsed 0 players — check htmlSample.'
        },
      })
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return res.status(200).json({ players: players.slice(0, 25), total: players.length, trendtab, date, pos })

  } catch (err) {
    console.error('[yahoo-buzzindex]', err)
    return res.status(500).json({ error: 'proxy_error', message: err.message })
  }
}
