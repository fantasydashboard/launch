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

/* Kept in step with src/hockey/hockeyPositions.ts — that file carries the derivation for
   every line, and this is a copy because a Vercel function cannot import from src.
   Ids outside this map are dropped rather than passed through, so an id ESPN adds next
   season arrives as a visible absence instead of an unlabelled number somebody scores as
   if they knew what it was.

   THIS LIST WAS HALF THIS LENGTH AND THAT WAS A REAL COST, NOT A COSMETIC ONE. The test
   league pays for hits, blocked shots, power-play points, short-handed points and overtime
   losses — five stats this endpoint used to drop on the floor. Every total it served was
   short by all five, and a blocked shot at half a point is worth about 60 points a season
   to a defenceman, which is most of the gap between a good one and a replaceable one. */
const STAT_BY_ID = {
  // skaters
  13: 'G', 14: 'A', 15: 'PLUSMINUS', 16: 'PTS', 17: 'PIM',
  18: 'PPG', 19: 'PPA', 20: 'SHG', 21: 'SHA',
  26: 'TOI', 27: 'TOIG', 29: 'SOG', 30: 'GP',
  31: 'HITS', 32: 'BLK', 33: 'DPTS',
  35: 'STG', 36: 'STA', 37: 'STP', 38: 'PPP', 39: 'SHP',
  // goalies
  0: 'DEC', 1: 'W', 2: 'L', 3: 'SA', 4: 'GA', 6: 'SV', 7: 'SHO',
  8: 'TOI', 9: 'OTL', 10: 'GAA', 11: 'SVPCT', 12: 'WINPCT', 34: 'GP2',
}
const POSITION_BY_ID = { 1: 'C', 2: 'LW', 3: 'RW', 4: 'D', 5: 'G' }

/*
 * AN ADP IS ONLY A PRICE IF THE ROOM ACTUALLY DRAFTS HIM.
 *
 * ESPN gives EVERY projected player an averageDraftPosition, and 218 of 456 of them sit in a
 * tight band at 227-232 — which is one past the end of a standard ten-team, twenty-three-round
 * draft. That is a placeholder for "undrafted", not a price. Every one of those players is
 * owned in under 10% of leagues.
 *
 * Read as real, the placeholder manufactured enormous fake disagreements: the board reported
 * Anthony Stolarz as thirty-two rounds of value because we ranked him 40th and "the market"
 * ranked him 230th, when the market had simply never priced him. A signal that fires hardest
 * on the players nobody wants is worse than no signal.
 *
 * Ownership is the gate rather than the band, because it is a statement about the world
 * instead of an artefact detector: below 10% he goes undrafted in nine leagues out of ten, so
 * an average taken over the few where he went is not a price. Players owned 50%+ span ADP 1.8
 * to 218.5 — real, and untouched.
 */
const ADP_MIN_OWNERSHIP = 10

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

      /*
       * THE MARKET AND THE INJURY, WHICH THIS USED TO THROW AWAY.
       *
       * ESPN publishes an average draft position for every projected player — 456 of 456,
       * MacKinnon at 1.77 — plus an auction value, ownership, and an injury designation. This
       * endpoint carried name, position, team and stats and dropped the rest, which left the
       * board unable to say anything about what the ROOM thinks, and unable to flag a player
       * who is not playing. Cale Makar sat sixth with no mark on him while listed OUT.
       *
       * No injury DISCOUNT is applied anywhere downstream, and that is deliberate: ESPN's
       * projection already accounts for it. Makar is projected 78 games rather than 82,
       * Bedard 64, Merzlikins 39. Discounting a projection that has already been discounted
       * would charge the same injury twice.
       */
      const own = p.ownership || {}
      players.push({
        playerKey: String(p.id),
        name: p.fullName || `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
        position,
        proTeamId: p.proTeamId ?? null,
        stats,
        adp: Number.isFinite(own.averageDraftPosition)
          && Number(own.percentOwned) >= ADP_MIN_OWNERSHIP
          ? own.averageDraftPosition : null,
        auctionValue: Number.isFinite(own.auctionValueAverage) ? own.auctionValueAverage : null,
        percentOwned: Number.isFinite(own.percentOwned) ? own.percentOwned : null,
        /* ACTIVE is the overwhelming majority and says nothing; null keeps the payload honest
           about which players carry a designation at all. */
        injuryStatus: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : null,
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
