import type { WeekSchedule } from './mlbSchedule'

/**
 * Who plays, and when, from the NHL's own public API.
 *
 * WHY THIS IS THE FOUNDATION FOR EVERYTHING DAILY. A hockey manager's question is "who do I
 * start tonight", and that cannot be answered from a projection alone — a 200-point winger
 * is worth nothing on a night his team is idle. Every daily surface depends on knowing the
 * slate, and until now the codebase had exactly one schedule, MLB's. The volume edge on the
 * Matchup was reading it for hockey and reporting baseball fixtures as hockey games, which is
 * why that panel is currently hidden rather than translated.
 *
 * api-web.nhle.com is public, unauthenticated and returns a full week from one date. No key,
 * no proxy, no scraping — the same class of source as Sleeper's draft feed, and the reason
 * hockey's daily layer is tractable at all.
 *
 * ABBREVIATIONS ALREADY AGREE, which is the part that could easily have gone wrong. The NHL
 * writes BOS, UTA, NYR, SJS; ESPN's fantasy rosters write the same, bar the handful its
 * proTeams table shortens (LA, NJ, SJ, TB, UTA). Both spellings are keyed so a roster's
 * abbreviation always resolves to its games — the identical failure mlbSchedule documents
 * for OAK/ATH and ARI/AZ, where a mismatched abbreviation silently means "no games today"
 * and the player quietly disappears from every daily surface.
 */

const API = 'https://api-web.nhle.com/v1/schedule'

/**
 * Both spellings of every club whose sources disagree.
 *
 * ESPN's proTeams table shortens five of them. Keying only one spelling means a Kings player
 * looks idle every night of the season, and nothing about that failure announces itself.
 */
const ABBR_VARIANTS: Record<string, string[]> = {
  LAK: ['LAK', 'LA'], LA: ['LA', 'LAK'],
  NJD: ['NJD', 'NJ'], NJ: ['NJ', 'NJD'],
  SJS: ['SJS', 'SJ'], SJ: ['SJ', 'SJS'],
  TBL: ['TBL', 'TB'], TB: ['TB', 'TBL'],
  UTA: ['UTA', 'UTAH'], UTAH: ['UTAH', 'UTA'],
  WSH: ['WSH', 'WAS'], WAS: ['WAS', 'WSH'],
}

/** Every spelling a source might use for this club. */
export function nhlAbbrVariants(abbr: string): string[] {
  const up = String(abbr || '').trim().toUpperCase()
  return ABBR_VARIANTS[up] ?? [up]
}

/**
 * Turn the NHL's week payload into the shape the daily surfaces already consume.
 *
 * `startsByPitcher` stays EMPTY and that is deliberate. Baseball publishes probable starters
 * days ahead; the NHL does not publish starting goalies on any schedule endpoint, and a
 * guessed starter is worse than an absent one — it would put a backup in a lineup on a night
 * he never dressed. Goalie starts belong to a separate source, if one ever proves reliable.
 *
 * PRESEASON GAMES ARE NOT GAMES. Verified against the live endpoint on 2026-09-20: every one
 * of that week's 58 fixtures came back `gameType: 1`, and this counted all of them. A hockey
 * Today page would have reported seven games on a night the regular season had not begun,
 * ranked players by a per-game rate they cannot earn, and marked a correctly-benched star as
 * a seat with no game — all of it confidently wrong in the same direction. The first
 * `gameType: 2` fixture of 2026-27 is 2026-10-04.
 */
/** NHL game types: 1 preseason, 2 regular season, 3 playoffs. Fantasy counts the last two. */
const COUNTING_GAME_TYPES = new Set([2, 3])

export function parseNhlSchedule(data: unknown, from: string, to: string): WeekSchedule {
  const out: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }
  const week = (data as any)?.gameWeek
  if (!Array.isArray(week)) return out

  for (const day of week) {
    const date = String(day?.date ?? '')
    /* The endpoint answers with a whole week from the date asked for, so days past the range
       must be dropped or "today" quietly becomes "the next seven days". */
    if (!date || date < from || date > to) continue

    for (const game of day?.games ?? []) {
      /* Absent is not "counts": a payload with no gameType is not assumed to be a real game,
         for the same reason an unnamed stat id is not assumed to be zero. */
      if (!COUNTING_GAME_TYPES.has(Number(game?.gameType))) continue
      const home = String(game?.homeTeam?.abbrev ?? '').toUpperCase()
      const away = String(game?.awayTeam?.abbrev ?? '').toUpperCase()
      if (!home || !away) continue
      for (const side of [home, away]) {
        for (const variant of nhlAbbrVariants(side)) {
          out.gamesByTeam[variant] = (out.gamesByTeam[variant] ?? 0) + 1
          out.homeTeamByTeam[variant] = home
        }
      }
    }
  }
  return out
}

/**
 * The slate between two dates, inclusive. Dates are YYYY-MM-DD.
 *
 * Returns an empty schedule rather than throwing: a daily board with no slate should say
 * "nobody plays tonight", which is a real answer in a sport with dark days, and is
 * indistinguishable to the reader from a fetch that failed only if we let it be.
 */
export async function getNhlSchedule(from: string, to: string): Promise<WeekSchedule> {
  try {
    const res = await fetch(`${API}/${from}`)
    if (!res.ok) return { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }
    return parseNhlSchedule(await res.json(), from, to)
  } catch {
    return { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }
  }
}
