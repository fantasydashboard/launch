import type { SkaterRow, IceRow } from '@/hockey/nhlRates'
import { getNhlSchedule } from './nhlSchedule'

/**
 * The NHL's own bulk stat feeds, fetched whole rather than one request per player.
 *
 * Read through `/api/nhl-stats`, NOT directly. The NHL sends no `access-control-allow-origin`
 * — it sends `vary: Origin`, so it knows about the header and declines — which means a browser
 * blocks every direct response. Sleeper, which this codebase does read directly, returns
 * `access-control-allow-origin: *`; they are not the same class of source, and an earlier
 * version of this comment said they were.
 *
 * PAGING IS THE LOAD-BEARING DETAIL, and it now lives in the relay. Each stats endpoint
 * reports `total` (~940 for skaters, ~98 for goalies) alongside only `limit` rows per request.
 * A version that fetches page one and stops produces a complete-looking board — it renders, it
 * sorts, nothing throws — while quietly rating a fifth of the league. Doing it once server-side
 * means no caller can reintroduce that.
 */

const RELAY = '/api/nhl-stats'

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

/** One report, whole. The relay pages it; this just asks for it and caches the answer. */
async function fetchAllRows<T>(path: string, seasonId: string): Promise<T[]> {
  const cacheKey = `${path}:${seasonId}`
  const cached = statsCache.get(cacheKey)
  if (cached) return cached as T[]

  const res = await fetch(`${RELAY}?report=${encodeURIComponent(path)}&seasonId=${encodeURIComponent(seasonId)}`)
  if (!res.ok) throw new Error(`${path} responded ${res.status}`)
  const json = await res.json()
  const rows: T[] = Array.isArray(json?.data) ? json.data : []

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
