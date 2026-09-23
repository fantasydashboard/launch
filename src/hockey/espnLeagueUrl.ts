/**
 * Getting an ESPN league out of whatever the user pasted.
 *
 * WHY A URL AT ALL. The hockey board reads its league from the store's active league, which
 * means the only way to point it at anything is to connect that league first. That is the
 * right flow for the season and the wrong one for testing: a mock draft, a friend's league,
 * last year's draft to replay — none of those are leagues you want saved, and all of them are
 * a URL you already have in the address bar.
 *
 * WHAT ESPN'S URLS ACTUALLY LOOK LIKE. The league id is a query parameter on every fantasy
 * surface — league, team, draft, settings — and the season is `seasonId` when present. The
 * sport is the first path segment. None of that is guessed: it is read off the URL rather
 * than inferred, and anything missing comes back absent rather than defaulted, because a
 * league id defaulted to the wrong number is a board full of the wrong players.
 */

export interface EspnLeagueRef {
  /** ESPN's numeric league id, as a string. */
  leagueId: string
  /** The sport segment from the path, when the URL carried one. */
  sport?: 'hockey' | 'football' | 'baseball' | 'basketball'
  /**
   * The season, when the URL said so.
   *
   * Absent rather than guessed. Hockey and basketball are named for the year the season ENDS,
   * football and baseball for the year it starts, so a default picked here would be wrong for
   * half the sports and wrong by a whole season — which reads as an empty league rather than
   * as an error.
   */
  season?: number
}

const SPORTS = ['hockey', 'football', 'baseball', 'basketball'] as const
type Sport = (typeof SPORTS)[number]

/** ESPN league ids are plain integers, and short ones are real — league 1 exists. */
const BARE_ID = /^\d{1,12}$/

export function parseEspnLeagueUrl(input: string): EspnLeagueRef | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  /* A bare id, which is what people paste when they already know the number. */
  if (BARE_ID.test(trimmed)) return { leagueId: trimmed }

  /*
   * Parsed as a URL rather than pattern-matched, so a league id sitting in some other
   * parameter cannot be mistaken for the real one. `new URL` needs a scheme; people paste
   * `fantasy.espn.com/...` without one.
   */
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const params = url.searchParams
  /* ESPN has shipped both spellings across its surfaces. */
  const rawId = params.get('leagueId') ?? params.get('leagueID')
  if (!rawId || !BARE_ID.test(rawId)) return null

  const out: EspnLeagueRef = { leagueId: rawId }

  const segment = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  if (segment && (SPORTS as readonly string[]).includes(segment)) out.sport = segment as Sport

  const rawSeason = params.get('seasonId') ?? params.get('season')
  const season = Number(rawSeason)
  /* A plausible fantasy season and nothing else — a stray `season=1` is not one. */
  if (Number.isFinite(season) && season > 2000 && season < 2100) out.season = season

  return out
}

/** True when the string was meant to identify an ESPN league at all. */
export function looksLikeEspnLeague(input: string): boolean {
  return parseEspnLeagueUrl(input) !== null
}

/**
 * Which other platform a pasted URL belongs to, when it is not ESPN.
 *
 * The box used to answer anything it could not parse with "that doesn't look like an ESPN
 * league URL", which was true when ESPN was the only league this board could read and is
 * now actively misleading: somebody pastes a perfectly good Yahoo URL and is told it is not
 * a URL. Recognising the host lets the surface say the useful thing — that Yahoo cannot be
 * read without signing in, and that the rules can be entered by hand instead.
 *
 * Deliberately narrow. It answers null for anything it does not recognise, because the old
 * message is the right one for an actual typo.
 */
export function otherPlatformFromUrl(input: string): 'yahoo' | 'sleeper' | null {
  const text = String(input ?? '').toLowerCase()
  if (!text.includes('.')) return null
  if (text.includes('yahoo.com')) return 'yahoo'
  if (text.includes('sleeper.com') || text.includes('sleeper.app')) return 'sleeper'
  return null
}
