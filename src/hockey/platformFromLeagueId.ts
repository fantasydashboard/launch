/**
 * Which platform a league id belongs to, from its own shape.
 *
 * The store already decides this in `selectLeague` and keeps it in `activePlatform`, but a
 * composable that only receives an id should not reach into the store to find out — and reading
 * a pinia store inside a computed re-resolves it on every evaluation. The id carries the answer.
 *
 * WHAT IT IS FOR. usePointsValue hands a league id to useHockeyValue, which fetches the league's
 * scoring. Sending a Yahoo key to ESPN's settings endpoint resolves to nothing, and a hockey
 * league with no weights is priced at nothing — no number beside any player on the Today page.
 */
export type LeaguePlatform = 'espn' | 'yahoo' | 'sleeper'

/** `{game}.l.{league}`: a numeric game id on older Yahoo leagues, a code such as `nhl` on newer. */
const YAHOO_KEY = /^(?:\d+|[a-z]+)\.l\.\d+$/

export function platformFromLeagueId(leagueId: string | null | undefined): LeaguePlatform {
  const id = String(leagueId ?? '')
  if (id.startsWith('espn_')) return 'espn'
  if (YAHOO_KEY.test(id)) return 'yahoo'
  return 'sleeper'
}
