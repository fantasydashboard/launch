// api/espn-players.ts
// Uses Node https module instead of fetch — works in all Node.js versions on Vercel
import https from 'https'

function httpsGet(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = new URL(url)
    const req = https.request(
      {
        hostname: options.hostname,
        path: options.pathname + options.search,
        method: 'GET',
        headers: { ...headers, host: options.hostname },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => resolve(body))
      }
    )
    req.on('error', reject)
    req.end()
  })
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const season = req.query?.season || new Date().getFullYear().toString()
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Fantasy-Platform': 'kona-PROD',
    'X-Fantasy-Source': 'kona',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Origin': 'https://fantasy.espn.com',
    'Referer': 'https://fantasy.espn.com/baseball/players',
  }

  const urls = [
    `https://fantasy.espn.com/apis/v3/games/flb/seasons/${season}/players?view=players_wl`,
    `https://fantasy.espn.com/apis/v3/games/flb/seasons/${parseInt(season) - 1}/players?view=players_wl`,
  ]

  const errors: string[] = []

  for (const url of urls) {
    try {
      const body = await httpsGet(url, headers)
      const data = JSON.parse(body)
      const players = Array.isArray(data) ? data : (data.players || [])
      if (!players.length) { errors.push(`${url}: empty`); continue }

      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.status(200).json(data)
      return
    } catch (err: any) {
      errors.push(`${url}: ${err.message}`)
    }
  }

  res.status(500).json({ error: 'ESPN fetch failed', attempts: errors })
}
