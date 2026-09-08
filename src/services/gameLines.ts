import { impliedFromLine, type ImpliedTotals } from '@/football/gameEnvironment'

/**
 * This week's NFL spreads and totals, from ESPN's public scoreboard.
 *
 * WHY NOT THE ODDS FEED WE ALREADY PAY FOR. The betting beta pulls spreads and totals into
 * Supabase, but those tables are admin-only by RLS and the API runs on a monthly credit budget
 * — so a normal user's browser cannot read them, and widening that to every visitor would
 * spend a paid quota on a projection tweak. ESPN publishes the same two numbers for every game
 * with no key and no quota, and they were checked against an analyst's own published team
 * totals for the same week: 0.28 points of mean absolute difference across 23 quarterbacks.
 *
 * A line moves over days, not minutes, for this purpose. Cached for six hours, and total
 * failure returns an empty map — which every consumer treats as "no adjustment", never as
 * "average game". An unpriced game is unknown, not neutral.
 */
const ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
const CACHE_KEY = 'ufd:nflGameLines'
const TTL_MS = 6 * 60 * 60 * 1000
const TIMEOUT_MS = 12000

interface Cached { at: number; implied: ImpliedTotals }

let memo: Cached | null = null

/** Parse ESPN's `details` string — "CIN -3.5", or "EVEN" for a pick-em. */
export function parseSpread(details: string): { team: string; spread: number } | null {
  const m = /([A-Z]{2,4})\s*([-+]?\d+(?:\.\d+)?)/.exec(details ?? '')
  if (!m) return null
  return { team: m[1], spread: Math.abs(Number(m[2])) }
}

/** Turn one scoreboard payload into a team → implied total map. */
export function impliedFromScoreboard(payload: any): ImpliedTotals {
  const out: ImpliedTotals = {}
  for (const event of payload?.events ?? []) {
    const comp = event?.competitions?.[0]
    const odds = comp?.odds?.[0]
    const ou = Number(odds?.overUnder)
    if (!comp || !Number.isFinite(ou) || ou <= 0) continue

    const teams: Record<string, string> = {}
    for (const c of comp.competitors ?? []) {
      const abbr = c?.team?.abbreviation
      if (abbr && c?.homeAway) teams[c.homeAway] = String(abbr).toUpperCase()
    }
    const home = teams.home
    const away = teams.away
    if (!home || !away) continue

    const parsed = parseSpread(String(odds?.details ?? ''))
    // No readable spread means a pick-em as far as we are concerned: split it evenly rather
    // than drop a game we do have a total for.
    const spread = parsed?.spread ?? 0
    const favourite: 'home' | 'away' = parsed?.team === away ? 'away' : 'home'
    const split = impliedFromLine(ou, spread, favourite)
    out[home] = split.home
    out[away] = split.away
  }
  return out
}

function readCache(): ImpliedTotals | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Cached
    if (!c || Date.now() - c.at > TTL_MS) return null
    return c.implied
  } catch {
    return null
  }
}

/** Implied team totals for this week, or an empty map when unavailable. */
export async function getImpliedTeamTotals(): Promise<ImpliedTotals> {
  if (memo && Date.now() - memo.at <= TTL_MS) return memo.implied
  const cached = readCache()
  if (cached) {
    memo = { at: Date.now(), implied: cached }
    return cached
  }

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, { signal: ctl.signal })
    if (!res.ok) return {}
    const implied = impliedFromScoreboard(await res.json())
    if (!Object.keys(implied).length) return {}
    memo = { at: Date.now(), implied }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(memo)) } catch { /* private mode */ }
    return implied
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}
