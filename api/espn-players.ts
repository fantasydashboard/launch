import type { VercelRequest, VercelResponse } from '@vercel/node'

// Proxy for ESPN Fantasy Baseball players API — avoids browser CORS
// Returns full player array including id, ownership, and fullName for dual matching
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const season = (req.query.season as string) || new Date().getFullYear().toString()

  try {
    const url = `https://fantasy.espn.com/apis/v3/games/flb/seasons/${season}/players?view=players_wl`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Fantasy-Platform': 'kona-PROD',
        'X-Fantasy-Source': 'kona',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://fantasy.espn.com',
        'Referer': 'https://fantasy.espn.com/baseball/players',
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `ESPN API ${response.status}`, season, url })
    }

    const data = await response.json()

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Proxy failed', season })
  }
}
