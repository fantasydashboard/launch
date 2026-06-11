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
}

/** Normalize a player name for matching (lowercase, strip accents + punctuation). */
export function normalizePitcherName(name: string): string {
  // NFD decomposes accents into base letter + combining mark; the [^a-z\s] strip
  // then drops the combining marks, so "Jesús" -> "jesus" without a unicode literal.
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse a raw statsapi /schedule response into our WeekSchedule shape. Pure; tested. */
export function parseSchedule(data: unknown): WeekSchedule {
  const gamesByTeam: Record<string, number> = {}
  const startsByPitcher: Record<string, ProbableStart[]> = {}
  const dates = (data as { dates?: unknown[] })?.dates ?? []
  for (const day of dates as { games?: unknown[] }[]) {
    for (const game of (day.games ?? []) as Record<string, any>[]) {
      const home = game?.teams?.home?.team?.abbreviation as string | undefined
      const away = game?.teams?.away?.team?.abbreviation as string | undefined
      const date = (game?.gameDate as string) ?? ''
      if (home) gamesByTeam[home] = (gamesByTeam[home] ?? 0) + 1
      if (away) gamesByTeam[away] = (gamesByTeam[away] ?? 0) + 1
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
  return { gamesByTeam, startsByPitcher }
}

const EMPTY: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {} }
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
