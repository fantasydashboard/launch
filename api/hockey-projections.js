// api/hockey-projections.js
//
// ESPN's NHL projections, reduced to something a browser can actually load.
//
// WHY THIS EXISTS. The projections live on ESPN's game-level player endpoint, and that
// endpoint answers with THIRTY-FOUR MEGABYTES: 8,174 players, every one carrying several
// seasons of splits, of which 456 have the full-season projection we want. Sending that to a
// phone to extract 100KB is not a trade worth making.
//
// It cannot be narrowed at the source. `limit`, `filterPercOwned` and `filterRanksForRankTypes`
// are all accepted without complaint and all ignored — the response is byte-identical at
// 34,578,699 with or without them. Those filters work on ESPN's LEAGUE-scoped endpoints,
// which is where the rest of this codebase uses them; the game-level one honours only the
// stat-source filter, and that is what pulls the stats in rather than trimming them.
//
// So the fetch happens once here and the reduction happens server-side. Roughly 34MB in,
// ~120KB out.
//
// CORS is not the reason. ESPN reflects the Origin header and would happily serve a browser
// directly; size is the whole problem.

const ESPN = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/fhl/seasons'

/* Asking for the projected split is what makes ESPN include stats at all. Without this the
   same URL returns 868KB of names and no numbers. */
const STAT_FILTER = JSON.stringify({
  players: {
    filterStatsForCurrentSeasonOnly: { value: true },
    filterStatsForSplitTypeIds: { value: [0] },
    filterStatsForSourceIds: { value: [1] },
  },
})

/* Kept in step with src/hockey/hockeyPositions.ts. Ids outside this map are dropped rather
   than passed through: fifteen of them carry real projections that nothing in the data
   identifies, and shipping an unnamed number invites somebody to score it as if they knew
   what it was. */
const STAT_BY_ID = {
  13: 'G', 14: 'A', 16: 'PTS', 29: 'SOG', 30: 'GP',
  1: 'W', 2: 'L', 3: 'SA', 4: 'GA', 6: 'SV', 7: 'SHO', 10: 'GAA', 11: 'SVPCT', 34: 'GS',
}
const POSITION_BY_ID = { 1: 'C', 2: 'LW', 3: 'RW', 4: 'D', 5: 'G' }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const season = String(req.query?.season || '').match(/^\d{4}$/)
    ? String(req.query.season)
    : String(new Date().getFullYear() + 1)   // the NHL season is named for the year it ends

  try {
    const upstream = await fetch(
      `${ESPN}/${season}/players?scoringPeriodId=0&view=kona_player_info`,
      { headers: { 'x-fantasy-filter': STAT_FILTER, 'User-Agent': 'Mozilla/5.0' } },
    )
    if (!upstream.ok) {
      return res.status(502).json({ error: `ESPN returned ${upstream.status}` })
    }
    const raw = await upstream.json()
    const rows = Array.isArray(raw) ? raw : (raw?.players ?? [])

    const players = []
    for (const row of rows) {
      const p = row?.player ?? row
      const position = POSITION_BY_ID[p?.defaultPositionId]
      if (!position) continue           // unknown position: absent, never defaulted
      const split = (p.stats ?? []).find(
        (s) => s?.statSourceId === 1 && s?.statSplitTypeId === 0,
      )
      if (!split) continue              // no projection is no opinion — drop, do not zero

      const stats = {}
      for (const [id, v] of Object.entries(split.stats ?? {})) {
        const key = STAT_BY_ID[Number(id)]
        if (key && Number.isFinite(v)) stats[key] = Number(v)
      }
      if (!Object.keys(stats).length) continue

      players.push({
        playerKey: String(p.id),
        name: p.fullName || `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
        position,
        proTeamId: p.proTeamId ?? null,
        stats,
      })
    }

    /*
     * A projection set changes on the scale of days, not minutes, and the upstream fetch is
     * 34MB — so this caches hard at the edge. Nothing here is personal or league-specific,
     * which is what makes a shared cache safe.
     */
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400')
    return res.status(200).json({ season: Number(season), count: players.length, players })
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) })
  }
}
