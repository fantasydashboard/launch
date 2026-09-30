import { mergeHockeyProjections, type MergeInput, type MergeResult } from './hockeyProjectionSource'
import type { NhlFeed } from '@/composables/useNhlFeed'

/**
 * The whole feed, merged — the only way any surface should ask for projections.
 *
 * WHY IT EXISTS. mergeHockeyProjections takes the feed's parts as separate arguments, and two
 * of them are optional with a reasonable-sounding note attached: historyGames is "optional:
 * without it the feed's number stands alone", goalieProjections "absent, the feed's numbers
 * still stand — losing this costs accuracy, never a board". Both true, and both an invitation
 * that two of the four callers accepted without meaning to.
 *
 * useHockeyRankings and useHockeyBoard passed all four. useHockeyValue and useHockeyWire passed
 * espn and rates only. So the Today page and The Wire were pricing the same players, in the
 * same league, off a different model from the rankings and draft boards — and a product that
 * disagrees with itself about who is good is worse than one that says nothing.
 *
 * What it cost, concretely. Without historyGames a skater's games come from the pool's centre
 * instead of his own record: Anton Frondell, who has played twelve NHL games, was projected for
 * 67 on the Today page and 20 on the rankings board. Without goalieProjections the goalie model
 * — the measured persistence constants, the ESPN depth-chart starts, the whole reason goalies
 * stopped being the worst thing on the board — never reached the Today page at all; it showed
 * ESPN's raw numbers.
 *
 * The argument list is the bug, so this removes it. Every caller wants the same thing.
 */
export function mergeFeed(
  feed: NhlFeed,
  leagueKeys?: string[],
  /* Injected for the test, which needs to see what was handed over rather than what came back. */
  merge: (input: MergeInput) => MergeResult = mergeHockeyProjections,
): MergeResult {
  const input: MergeInput = {
    espn: feed.espn,
    rates: feed.rates,
    historyGames: feed.historyGames,
    goalieProjections: feed.goalieProjections,
  }
  /* Absent rather than empty: `missing` means "columns this league scores that we cannot
     price", and an empty list is a different claim from no list at all. */
  if (leagueKeys) input.leagueKeys = leagueKeys
  return merge(input)
}
