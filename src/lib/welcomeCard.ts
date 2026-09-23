/**
 * Whether to greet somebody who has just connected a league.
 *
 * WHAT THIS REPLACED. A five-step modal tour, fired on first league add and remembered in
 * localStorage. Two problems, and the copy was only the second one.
 *
 * It described a product that no longer exists: "full access to power rankings, matchup
 * analytics, league history and shareable graphics" — promising FULL ACCESS to somebody about
 * to meet a Season Pass wall, and omitting the four decisions that pass actually sells. It
 * pitched "Best Batters / Pitchers" to football leagues. Nobody noticed, because a modal that
 * narrates the whole product drifts every time the product changes and nothing fails when it
 * does. Five screens of telling, shown at the exact moment somebody wanted to look at their
 * league, is also the worst possible time to be talked at.
 *
 * AND IT GREETED VETERANS. localStorage records a fact about a BROWSER, not about a person, so
 * a customer of a year opening the site on a new phone was welcomed to the product. Whether
 * somebody is new is a question the ACCOUNT can answer: they have exactly one league, and it
 * is the one that just connected.
 */
export function shouldWelcome(input: { leagueCount: number; seenBefore: boolean }): boolean {
  if (input.seenBefore) return false
  // Exactly one: none means nothing connected, more than one means they have been here before.
  return input.leagueCount === 1
}
