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

/**
 * Whether hockey's Draft Board belongs in the tab bar.
 *
 * Same question as the Draft Room above, different answer to "when". That one reads Sleeper's
 * league status; ESPN publishes nothing equivalent, so this asks the sport instead: have the
 * games started? A board that prices a pool you draft against by hand has no readers once
 * there is a season to play, and it was sitting second in the bar in February.
 *
 * `seasonStarted` comes from the NHL feed the hockey pages already load — the current season
 * either has box scores in it or it does not. Unknown reads as "not started", so the tab
 * shows: somebody mid-draft with no way onto the board is a worse failure than a tab nobody
 * needed in March, and the answer arrives within a second of the page loading.
 *
 * The route stays live either way, the same as every other tab this file takes down.
 */
export function showsHockeyBoardTab(input: {
  sport?: string | null
  platform?: string | null
  seasonStarted?: boolean
}): boolean {
  if (input.sport !== 'hockey' || input.platform !== 'espn') return false
  return !input.seasonStarted
}
