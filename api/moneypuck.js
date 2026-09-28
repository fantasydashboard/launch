// api/moneypuck.js
//
// MoneyPuck's season summaries, relayed and reduced.
//
// WHY RELAYED. It is a CSV over HTTPS with no access-control header, so a browser cannot read
// it. Same reason api/nhl-stats.js exists.
//
// WHY REDUCED. The file is 3.5MB of 120-odd columns across five game situations for every
// skater, and we want four fields from one situation. Sending the rest costs a reader seconds
// on a phone to deliver nothing.
//
// WHAT IT IS FOR. Expected goals. Measured over three seasons, a skater's goals predict his
// next season at r = 0.815 and his expected goals at r = 0.812 — neither better than the
// other. An even blend of the two predicts at 0.834, in both season pairs. The two know
// different things: a goal total carries finishing, an xG total carries the chances that
// produced it, and averaging beats picking. See src/hockey/expectedGoals.ts.

const SEASONS = /^\d{4}$/

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const season = String(req.query?.season ?? '')
  if (!SEASONS.test(season)) {
    return res.status(400).json({ error: 'season must be four digits, e.g. 2025 for 2025-26' })
  }

  const url = `https://moneypuck.com/moneypuck/playerData/seasonSummary/${season}/regular/skaters.csv`
  try {
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!upstream.ok) {
      return res.status(502).json({ error: `MoneyPuck returned ${upstream.status}` })
    }
    const text = await upstream.text()
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return res.status(502).json({ error: 'MoneyPuck returned no rows' })

    const head = lines[0].split(',')
    const at = (name) => head.indexOf(name)
    const iId = at('playerId'), iSit = at('situation'), iName = at('name')
    const iGp = at('games_played'), iG = at('I_F_goals'), iXg = at('I_F_xGoals')
    if ([iId, iSit, iGp, iG, iXg].some((i) => i < 0)) {
      /* Named, so a column rename upstream is diagnosable rather than an empty list. */
      return res.status(502).json({ error: 'MoneyPuck is missing a column this needs', head: head.slice(0, 40) })
    }

    const players = []
    for (const line of lines.slice(1)) {
      const c = line.split(',')
      if (c[iSit] !== 'all') continue          // one situation; the others are subsets of it
      const gp = Number(c[iGp])
      if (!Number.isFinite(gp) || gp <= 0) continue
      players.push({
        playerId: Number(c[iId]),
        name: c[iName],
        gamesPlayed: gp,
        goals: Number(c[iG]) || 0,
        xGoals: Number(c[iXg]) || 0,
      })
    }

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400')
    return res.status(200).json({ season: Number(season), count: players.length, players })
  } catch (e) {
    return res.status(502).json({ error: String(e?.message ?? e) })
  }
}
