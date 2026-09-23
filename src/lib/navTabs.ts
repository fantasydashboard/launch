/**
 * Whether the Draft Room belongs in the tab bar.
 *
 * The nav was already sport- and platform-aware — the room reads live picks from Sleeper, so
 * it only ever appeared where it works — but it had no sense of WHEN. That put it second in
 * the bar in week three of the season, above the pages a reader actually opens, for every
 * Sleeper football league.
 *
 * Draft state is per-sport, not global: a hockey draft happens in September and a basketball
 * one in October, so "the draft is over" can only be asked of one league at a time. The route
 * stays live regardless — this is the same move My Team and Matchup got, off the bar and still
 * reachable — and the post-draft retrospective already lives in History.
 */
const DRAFT_LIVE = new Set(['pre_draft', 'drafting'])

export function showsDraftTab(input: {
  sport?: string | null
  platform?: string | null
  leagueStatus?: string | null
}): boolean {
  if (input.sport !== 'football' || input.platform !== 'sleeper') return false
  const status = String(input.leagueStatus ?? '')
  /* Unknown reads as "show it". A needless tab in a draft week is a smaller failure than a
     missing one: somebody mid-draft would have no way into the room at all. */
  if (!status) return true
  return DRAFT_LIVE.has(status)
}
