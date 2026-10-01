import { normalizeProTeam } from './proTeam'
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
/* v2: the cached shape gained kickoffs. A v1 entry read back under the new shape would look
   like a successful fetch that found no kickoff times, which silently disables seat ordering
   for six hours — a new key expires the old ones instead. */
const CACHE_KEY = 'ufd:nflGameLines:v2'
const TTL_MS = 6 * 60 * 60 * 1000
const TIMEOUT_MS = 12000

/** NFL team abbreviation -> this week's kickoff, ms since epoch. */
export type Kickoffs = Record<string, number>

interface Cached { at: number; implied: ImpliedTotals; kickoffs: Kickoffs }

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
      const abbr = normalizeProTeam(c?.team?.abbreviation)
      if (abbr && c?.homeAway) teams[c.homeAway] = abbr
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

/**
 * Each team -> when its game this week kicks off.
 *
 * Teams on a bye are simply ABSENT, because the scoreboard only lists games being played. That
 * absence is load-bearing: a caller distinguishes "on a bye, never locks" from "we could not
 * read the scoreboard" by whether the whole map is empty, so an unparseable date is dropped
 * rather than defaulted to anything.
 */
export function kickoffsFromScoreboard(payload: any): Kickoffs {
  const out: Kickoffs = {}
  for (const event of payload?.events ?? []) {
    const comp = event?.competitions?.[0]
    const at = Date.parse(String(comp?.date ?? event?.date ?? ''))
    if (!Number.isFinite(at)) continue
    for (const c of comp?.competitors ?? []) {
      const abbr = normalizeProTeam(c?.team?.abbreviation)
      if (abbr) out[abbr] = at
    }
  }
  return out
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Cached
    if (!c || Date.now() - c.at > TTL_MS) return null
    if (!c.implied || !c.kickoffs) return null
    return c
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
      const abbr = normalizeProTeam(c?.team?.abbreviation)
      if (abbr) out[abbr] = state
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

/**
 * The week's slate: implied totals and kickoff times, from ONE read of the scoreboard.
 *
 * Both move on the scale of days, so they share the six-hour cache. They are fetched together
 * because they come out of the same payload, and fetching it twice to answer two questions
 * about the same sixteen games is a round trip spent on nothing.
 *
 * An empty result is "we could not read it", never "there are no games" — every consumer has
 * to treat it that way, because guessing the other way empties a roster or reseats a lineup on
 * no evidence.
 */
async function getWeekSlate(): Promise<{ implied: ImpliedTotals; kickoffs: Kickoffs }> {
  if (memo && Date.now() - memo.at <= TTL_MS) return memo
  const cached = readCache()
  if (cached) {
    memo = cached
    return cached
  }

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, { signal: ctl.signal })
    if (!res.ok) return { implied: {}, kickoffs: {} }
    const payload = await res.json()
    const implied = impliedFromScoreboard(payload)
    const kickoffs = kickoffsFromScoreboard(payload)
    /* Cached when EITHER half came back. A week ESPN has not priced yet still has a schedule,
       and dropping the whole payload over missing odds took the kickoffs down with it. */
    if (!Object.keys(implied).length && !Object.keys(kickoffs).length) return { implied: {}, kickoffs: {} }
    memo = { at: Date.now(), implied, kickoffs }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(memo)) } catch { /* private mode */ }
    return memo
  } catch {
    return { implied: {}, kickoffs: {} }
  } finally {
    clearTimeout(timer)
  }
}

export async function getImpliedTeamTotals(): Promise<ImpliedTotals> {
  return (await getWeekSlate()).implied
}

/** This week's kickoff per NFL team, or an empty map when the scoreboard cannot be read. */
export async function getKickoffs(): Promise<Kickoffs> {
  return (await getWeekSlate()).kickoffs
}
