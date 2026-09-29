/**
 * Which sports the Today board serves, in one place.
 *
 * WHY IT IS A MODULE AND NOT A `const` IN useToday. It was a const in useToday, and the file
 * also carried a second, older predicate — `isBaseball` — from when baseball was the only daily
 * sport. When hockey was added, the ESPN loader moved to the new predicate and the YAHOO loader
 * was left on the old one:
 *
 *     function maybeLoadEspn()  { if (!isDaily.value) return ... }      // migrated
 *     function maybeLoadYahoo() { if (!isBaseball.value) return ... }   // not migrated
 *
 * That is not a missing feature, it is a deadlock. `boardInputsReady` waits on
 * `yahooRosterLoaded && yahooFaLoaded`, and those flags are set by the loaders that the stale
 * gate turned off — so a Yahoo hockey league sat on "Reading today's slate…" forever, in both
 * points and category leagues, with no error and nothing in the console.
 *
 * Two predicates meaning almost the same thing is the bug. There is now one, it is named for
 * what it decides, and `isBaseball` survives in useToday only for the genuinely baseball-only
 * concepts — probable starters, the FanGraphs join, the opposing-pitcher adjustment.
 *
 * WHAT MAKES A SPORT DAILY: a roster that plays on a schedule rather than once a week, so that
 * "who do I start tonight" is a different question from "who do I start this week". Football is
 * never daily and has its own weekly surface for that reason.
 */
export const DAILY_SPORTS = new Set(['baseball', 'hockey'])

/** Whether Today applies to this sport at all. Every per-platform loader must gate on THIS. */
export function isDailySport(sport: string | null | undefined): boolean {
  return DAILY_SPORTS.has(String(sport ?? ''))
}
