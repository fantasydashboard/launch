import type { TeamSchedule } from '@/football/scheduleDifficulty'

/**
 * The season's fixtures, week by week, from ESPN's public scoreboard.
 *
 * WHY THE WHOLE SEASON. A rest-of-season difficulty needs every remaining game, and a bye is
 * only discoverable by a team's ABSENCE from a week — which you cannot see by fetching one
 * week at a time and asking who is playing.
 *
 * The same endpoint already powers implied totals and game state, so this adds a source we
 * have and not one we do not. Eighteen small requests, cached hard: a fixture list does not
 * change once published, and the one thing that would change it — a flexed game — moves a
 * kickoff time rather than an opponent.
 */

export type SeasonSchedule = Record<string, TeamSchedule>

const ENDPOINT = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
const CACHE_KEY = 'ufd:nflSeasonSchedule'
const TTL_MS = 24 * 60 * 60 * 1000
const TIMEOUT_MS = 12000
export const REGULAR_SEASON_WEEKS = 18

interface Cached { at: number; season: number; schedule: SeasonSchedule }
let memo: Cached | null = null

/** Fold one week's scoreboard into the schedule map. */
export function addWeek(schedule: SeasonSchedule, week: number, payload: any): SeasonSchedule {
  for (const event of payload?.events ?? []) {
    const comp = event?.competitions?.[0]
    const sides = (comp?.competitors ?? [])
      .map((c: any) => String(c?.team?.abbreviation ?? '').toUpperCase())
      .filter(Boolean)
    if (sides.length !== 2) continue
    const [a, b] = sides
    ;(schedule[a] ??= {})[week] = b
    ;(schedule[b] ??= {})[week] = a
  }
  return schedule
}

function readCache(season: number): SeasonSchedule | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Cached
    if (!c || c.season !== season || Date.now() - c.at > TTL_MS) return null
    return c.schedule
  } catch {
    return null
  }
}

/**
 * Every fixture of the regular season. Empty when the scoreboard cannot be read.
 *
 * An empty map means every consumer shows no difficulty at all, which is the behaviour that
 * existed before this file — never a board full of teams ranked on nothing.
 */
export async function getSeasonSchedule(season: number): Promise<SeasonSchedule> {
  if (memo && memo.season === season && Date.now() - memo.at <= TTL_MS) return memo.schedule
  const cached = readCache(season)
  if (cached) {
    memo = { at: Date.now(), season, schedule: cached }
    return cached
  }

  const schedule: SeasonSchedule = {}
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS * 2)
  try {
    /* Sequential rather than parallel: eighteen simultaneous requests to a public endpoint is
       the kind of thing that gets an origin rate-limited, and nothing here is urgent. */
    for (let w = 1; w <= REGULAR_SEASON_WEEKS; w++) {
      const res = await fetch(`${ENDPOINT}?week=${w}&seasontype=2&dates=${season}`, { signal: ctl.signal })
      if (!res.ok) continue
      addWeek(schedule, w, await res.json())
    }
    if (!Object.keys(schedule).length) return {}
    memo = { at: Date.now(), season, schedule }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(memo)) } catch { /* private mode */ }
    return schedule
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}
