import type { SkaterRow, IceRow } from '@/hockey/nhlRates'
import { getNhlSchedule } from './nhlSchedule'

/**
 * The NHL's own bulk stat feeds, fetched whole rather than one request per player.
 *
 * Three GETs against `api.nhle.com/stats/rest/en` plus the schedule this codebase already
 * trusts for hockey (`nhlSchedule.ts`) are everything `nhlRates.ts` needs. No auth, no key,
 * no proxy — the same class of source as Sleeper's draft feed.
 *
 * PAGING IS THE LOAD-BEARING DETAIL. Each stats endpoint reports `total` (~940 for skaters,
 * ~98 for goalies) alongside only `limit` rows per request. A version that fetches page one
 * and stops produces a complete-looking board — it renders, it sorts, nothing throws — while
 * quietly rating a fifth of the league. That is the bug this file exists to not ship.
 */

const STATS_BASE = 'https://api.nhle.com/stats/rest/en'
const PAGE_LIMIT = 100

/** `goalie/summary`'s own shape — not defined by Task 1, since rateSkaters never consumes it. */
export interface GoalieRow {
  playerId: number
  goalieFullName: string
  teamAbbrevs: string
  gamesStarted: number
  wins: number
  losses: number
  saves: number
  shotsAgainst: number
  goalsAgainst: number
  goalsAgainstAverage: number
  savePct: number
  shutouts: number
  timeOnIce: number
}

/**
 * In-memory only, per session, keyed by endpoint + season (stats) or date (schedule).
 *
 * Deliberately not the shared `cache.ts` service, which persists to localStorage — a season's
 * stats and a single date's slate are exactly the kind of thing that must go stale the moment
 * the tab closes, not the kind meant to survive a reload.
 */
const statsCache = new Map<string, unknown[]>()
const teamsCache = new Map<string, Set<string>>()

/**
 * Page a `stats/rest` endpoint to completion.
 *
 * `cayenneExp` is the query language this API actually uses for filtering; it must be
 * URL-encoded as a whole because it contains its own `=` and spaces (`seasonId=X and
 * gameTypeId=2`) that would otherwise be read as query-string syntax rather than the filter's
 * literal text.
 */
async function fetchAllRows<T>(path: string, seasonId: string): Promise<T[]> {
  const cacheKey = `${path}:${seasonId}`
  const cached = statsCache.get(cacheKey)
  if (cached) return cached as T[]

  const cayenneExp = encodeURIComponent(`seasonId=${seasonId} and gameTypeId=2`)
  const rows: T[] = []
  let start = 0
  let total = Infinity

  while (start < total) {
    const url = `${STATS_BASE}/${path}?limit=${PAGE_LIMIT}&start=${start}&cayenneExp=${cayenneExp}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${path} responded ${res.status}`)
    const json = await res.json()
    const data: T[] = Array.isArray(json?.data) ? json.data : []
    rows.push(...data)
    total = typeof json?.total === 'number' ? json.total : rows.length
    // An empty page before `start` reaches `total` would otherwise spin forever.
    if (data.length === 0) break
    start += PAGE_LIMIT
  }

  statsCache.set(cacheKey, rows)
  return rows
}

/** Every skater's season totals. Feeds `rateSkaters` in `hockey/nhlRates.ts`. */
export async function fetchSkaterSummary(seasonId: string): Promise<SkaterRow[]> {
  try {
    return await fetchAllRows<SkaterRow>('skater/summary', seasonId)
  } catch (err) {
    console.warn('[nhlStats] fetchSkaterSummary failed, returning empty roster', err)
    return []
  }
}

/** Every skater's ice time, joined onto `SkaterRow` by `playerId` for the power-play signal. */
export async function fetchSkaterIce(seasonId: string): Promise<IceRow[]> {
  try {
    return await fetchAllRows<IceRow>('skater/timeonice', seasonId)
  } catch (err) {
    console.warn('[nhlStats] fetchSkaterIce failed, returning empty ice time', err)
    return []
  }
}

/** Every goalie's season totals. The rate model for these belongs to a later task. */
export async function fetchGoalieSummary(seasonId: string): Promise<GoalieRow[]> {
  try {
    return await fetchAllRows<GoalieRow>('goalie/summary', seasonId)
  } catch (err) {
    console.warn('[nhlStats] fetchGoalieSummary failed, returning empty roster', err)
    return []
  }
}

/**
 * Team abbreviations with a game on `date` ('YYYY-MM-DD').
 *
 * Delegates to `getNhlSchedule`, which already carries two lessons this file would otherwise
 * have to relearn: the schedule endpoint answers with a whole week from the date given, and a
 * preseason fixture (`gameType 1`) is not a game a fantasy roster can start into. Both are
 * filtered there already; recomputing them here would risk drifting from that fix.
 */
export async function fetchPlayingTeams(date: string): Promise<Set<string>> {
  const cached = teamsCache.get(date)
  if (cached) return cached

  try {
    const schedule = await getNhlSchedule(date, date)
    const teams = new Set<string>(
      Object.keys(schedule.gamesByTeam).filter((team) => schedule.gamesByTeam[team] > 0)
    )
    teamsCache.set(date, teams)
    return teams
  } catch (err) {
    console.warn('[nhlStats] fetchPlayingTeams failed, returning empty slate', err)
    return new Set()
  }
}
