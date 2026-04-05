// api/espn-players.ts — Vercel serverless proxy for ESPN Fantasy baseball ownership
// No @vercel/node dependency needed — uses plain handler signature

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const season = req.query?.season || new Date().getFullYear().toString()

  // Try multiple endpoint formats — ESPN changes these occasionally
  const attempts = [
    `https://fantasy.espn.com/apis/v3/games/flb/seasons/${season}/players?view=players_wl`,
    `https://fantasy.espn.com/apis/v3/games/flb/seasons/${season}/players?view=kona_player_info`,
    // Fallback to previous season if current isn't set up yet (happens early in season)
    `https://fantasy.espn.com/apis/v3/games/flb/seasons/${parseInt(season as string) - 1}/players?view=players_wl`,
  ]

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Fantasy-Platform': 'kona-PROD',
    'X-Fantasy-Source': 'kona',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Origin': 'https://fantasy.espn.com',
    'Referer': 'https://fantasy.espn.com/baseball/players',
  }

  const errors: string[] = []

  for (const url of attempts) {
    try {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        errors.push(`${url}: HTTP ${response.status}`)
        continue
      }
      const data = await response.json()
      // Validate we got actual player data
      const players = Array.isArray(data) ? data : (data.players || [])
      if (!players.length) {
        errors.push(`${url}: empty players array`)
        continue
      }

      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.status(200).json(data)
      return
    } catch (err: any) {
      errors.push(`${url}: ${err.message}`)
    }
  }

  // All attempts failed
  res.status(500).json({
    error: 'All ESPN endpoint attempts failed',
    attempts: errors,
    season,
  })
}
