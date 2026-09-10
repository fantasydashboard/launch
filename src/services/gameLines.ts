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

/*
 * Game state moves on a scale of minutes, not hours — a Thursday game finishing has to reach
 * the page in this session, not six hours later — so it carries its own short TTL and is NOT
 * cached to localStorage. A stale "final" is worse than a refetch.
 */
const STATE_TTL_MS = 2 * 60 * 1000
let stateMemo: { at: number; states: Record<string, GameState> } | null = null

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
/** Whether a team's game this week has kicked off, and whether it is over. */
export type GameState = 'pre' | 'in' | 'post'

/**
 * Per-team game state, off the same scoreboard payload the totals come from.
 *
 * This exists because "has he scored yet" cannot be answered from a points map. Sleeper lists
 * EVERY rostered player in `players_points`, at 0.0, from the moment a week opens — so testing
 * presence marks a whole roster as having banked nothing, which is what shipped: both teams in
 * the matchup read 0, ranked in the hundreds, while every other team kept its projections.
 *
 * The scoreboard is the only honest source for it, and it is already being fetched.
 */
export function statesFromScoreboard(payload: any): Record<string, GameState> {
  const out: Record<string, GameState> = {}
  for (const event of payload?.events ?? []) {
    const comp = event?.competitions?.[0]
    const type = comp?.status?.type ?? event?.status?.type
    const raw = String(type?.state ?? '').toLowerCase()
    const state: GameState = raw === 'post' ? 'post' : raw === 'in' ? 'in' : 'pre'
    for (const c of comp?.competitors ?? []) {
      const abbr = c?.team?.abbreviation
      if (abbr) out[String(abbr).toUpperCase()] = state
    }
  }
  return out
}

/**
 * This week's per-team game state. Empty when the scoreboard cannot be read.
 *
 * An unknown game is unknown, never "finished" — the caller must fall back to the projection,
 * because guessing the other way silently zeroes a roster.
 */
export async function getGameStates(): Promise<Record<string, GameState>> {
  if (stateMemo && Date.now() - stateMemo.at <= STATE_TTL_MS) return stateMemo.states
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, { signal: ctl.signal })
    if (!res.ok) return {}
    const states = statesFromScoreboard(await res.json())
    stateMemo = { at: Date.now(), states }
    return states
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}

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
