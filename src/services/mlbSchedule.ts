// Thin wrapper over the public MLB Stats API (statsapi.mlb.com, no auth) for the
// current fantasy week's schedule + probable pitchers. Powers stream recommendations
// ("Your Move"). Degrades to an empty schedule on any failure so the page never breaks.

export interface ProbableStart {
  pitcherName: string
  teamAbbr: string
  opponentAbbr: string
  date: string
}

export interface WeekSchedule {
  // MLB team abbr -> number of games in the date range.
  gamesByTeam: Record<string, number>
  // normalized pitcher name -> their probable starts in the range.
  startsByPitcher: Record<string, ProbableStart[]>
  // Each team (all abbr variants) -> the home team abbr of their game in range (park venue).
  // On multiple games the latest wins; fine for the single-day "today" use.
  homeTeamByTeam: Record<string, string>
}

// Team-abbreviation variants across data sources. statsapi (the schedule) uses
// ATH / AZ where ESPN and Yahoo carry OAK / ARI on the rostered players, and a few
// other clubs differ by source. We key gamesByTeam by EVERY variant so a player's
// team abbr always resolves to its games — otherwise the daily "plays today" layer
// silently misses those teams (this was killing ESPN's today layer for OAK/ARI).
const TEAM_ABBR_VARIANTS: Record<string, string[]> = {
  ATH: ['ATH', 'OAK'],
  AZ: ['AZ', 'ARI'],
  CWS: ['CWS', 'CHW'],
  WSH: ['WSH', 'WAS'],
  SD: ['SD', 'SDP'],
  SF: ['SF', 'SFG'],
  TB: ['TB', 'TBR'],
  KC: ['KC', 'KCR'],
}
export function teamAbbrVariants(abbr: string): string[] {
  return TEAM_ABBR_VARIANTS[abbr] ?? [abbr]
}

/** Normalize a player name for matching (lowercase, strip accents + punctuation,
 *  drop a trailing generational suffix so "Hunter Brown Jr" == "Hunter Brown"). */
export function normalizePitcherName(name: string): string {
  // NFD decomposes accents into base letter + combining mark; the [^a-z\s] strip
  // then drops the combining marks, so "Jesús" -> "jesus" without a unicode literal.
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ (jr|sr|ii|iii|iv)$/, '')
}

/** First-initial + last-name key, e.g. "hunter brown" -> "h brown". Used as a
 *  fallback when two sources spell the first name differently (ESPN "Cristopher"
 *  vs a feed's "Christopher"). */
function initialLastKey(normalized: string): string {
  const parts = normalized.split(' ').filter(Boolean)
  if (parts.length < 2) return normalized
  return `${parts[0][0]} ${parts[parts.length - 1]}`
}

/**
 * Probable starts for a pitcher, tolerant of cross-source name differences:
 * exact normalized match first, then a first-initial + last-name fallback — but the
 * fallback is used ONLY when it resolves to exactly one pitcher in the schedule, so we
 * never stream the wrong arm on an ambiguous last name.
 */
export function lookupStarts(schedule: WeekSchedule, name: string): ProbableStart[] {
  const norm = normalizePitcherName(name)
  const exact = schedule.startsByPitcher[norm]
  if (exact) return exact
  const want = initialLastKey(norm)
  let hit: ProbableStart[] | null = null
  let count = 0
  for (const key of Object.keys(schedule.startsByPitcher)) {
    if (initialLastKey(key) === want) {
      hit = schedule.startsByPitcher[key]
      count++
    }
  }
  return count === 1 && hit ? hit : []
}

/** Parse a raw statsapi /schedule response into our WeekSchedule shape. Pure; tested. */
export function parseSchedule(data: unknown): WeekSchedule {
  const gamesByTeam: Record<string, number> = {}
  const startsByPitcher: Record<string, ProbableStart[]> = {}
  const homeTeamByTeam: Record<string, string> = {}
  const dates = (data as { dates?: unknown[] })?.dates ?? []
  for (const day of dates as { games?: unknown[] }[]) {
    for (const game of (day.games ?? []) as Record<string, any>[]) {
      const home = game?.teams?.home?.team?.abbreviation as string | undefined
      const away = game?.teams?.away?.team?.abbreviation as string | undefined
      const date = (game?.gameDate as string) ?? ''
      // Key by every abbreviation variant so ESPN/Yahoo team codes resolve too.
      if (home) for (const v of teamAbbrVariants(home)) gamesByTeam[v] = (gamesByTeam[v] ?? 0) + 1
      if (away) for (const v of teamAbbrVariants(away)) gamesByTeam[v] = (gamesByTeam[v] ?? 0) + 1
      if (home) {
        for (const v of teamAbbrVariants(home)) homeTeamByTeam[v] = home
        if (away) for (const v of teamAbbrVariants(away)) homeTeamByTeam[v] = home
      }
      const record = (
        side: 'home' | 'away',
        teamAbbr: string | undefined,
        oppAbbr: string | undefined,
      ) => {
        const pitcher = game?.teams?.[side]?.probablePitcher
        const full = pitcher?.fullName as string | undefined
        if (!full || !teamAbbr) return
        const key = normalizePitcherName(full)
        ;(startsByPitcher[key] ??= []).push({
          pitcherName: full,
          teamAbbr,
          opponentAbbr: oppAbbr ?? '',
          date,
        })
      }
      record('home', home, away)
      record('away', away, home)
    }
  }
  return { gamesByTeam, startsByPitcher, homeTeamByTeam }
}

const EMPTY: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }
const memo = new Map<string, WeekSchedule>()

/**
 * Fetch the week's schedule (inclusive date range, YYYY-MM-DD) with probable pitchers.
 * Memoized per range for the session; returns an empty schedule on any error
 * (network, CORS, parse) so callers degrade gracefully.
 */
export async function getWeekSchedule(startDate: string, endDate: string): Promise<WeekSchedule> {
  const key = `${startDate}_${endDate}`
  const cached = memo.get(key)
  if (cached) return cached
  try {
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${startDate}&endDate=${endDate}&hydrate=probablePitcher,team`
    const res = await fetch(url)
    if (!res.ok) return EMPTY
    const parsed = parseSchedule(await res.json())
    memo.set(key, parsed)
    return parsed
  } catch (e) {
    console.warn('[mlbSchedule] schedule fetch failed; streaming recs disabled this load', e)
    return EMPTY
  }
}

/**
 * Where the baseball season stands, for the same reason hockey needed it.
 *
 * The daily board is built around tonight, so outside the season it collapses to one line:
 * "no games today — the board lights up when games resume". On 29 September 2026 that line
 * is on screen for every baseball league in the product, and the 2026 regular season ended
 * on the 27th. Nothing is going to resume. The page is describing a pause that is actually
 * an ending.
 *
 * Unlike the NHL, statsapi sends `access-control-allow-origin: *` — the schedule call above
 * already reads it straight from the page — so this needs no relay.
 *
 * `days` stays empty: the seasons endpoint carries milestones, not fixtures, and the opening
 * night game count is not worth a second request for a line that reads fine without it.
 */
export interface MlbSeasonWindow {
  preSeasonStart: string | null
  regularSeasonStart: string | null
  regularSeasonEnd: string | null
  days: { date: string; games: number }[]
}

const mlbWindowCache = new Map<number, Promise<MlbSeasonWindow | null>>()

export async function getMlbSeasonWindow(seasonYear: number): Promise<MlbSeasonWindow | null> {
  const hit = mlbWindowCache.get(seasonYear)
  if (hit) return hit
  const p = (async () => {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/seasons?sportId=1&season=${seasonYear}`)
      if (!res.ok) return null
      const j: any = await res.json()
      const s = (j?.seasons ?? [])[0]
      if (!s) return null
      return {
        preSeasonStart: s.preSeasonStartDate ?? null,
        regularSeasonStart: s.regularSeasonStartDate ?? null,
        regularSeasonEnd: s.regularSeasonEndDate ?? null,
        days: [],
      }
    } catch {
      /* Null, never a fabricated window: reporting "the season has not started" from a dropped
         request would hide a live board on a day games are being played. */
      return null
    }
  })()
  mlbWindowCache.set(seasonYear, p)
  return p
}

export function clearMlbSeasonWindowCache(): void {
  mlbWindowCache.clear()
}
