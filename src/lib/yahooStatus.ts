/**
 * Whether Yahoo Fantasy can actually return data, in one place.
 *
 * OAuth and API ACCESS are two separate grants and only the first one works. Signing in with
 * Yahoo completes, tokens are issued, and every Fantasy API call then returns 403 — because
 * developer.yahoo.com issues the Client ID while sports.yahoo.com/developer/access grants
 * permission for those credentials to call the Fantasy API, and we have never been given the
 * second. Applied 2026-07-28, no response; resubmitted 2026-08-25 disclosing commercial use.
 * There is no status page, ticket or support address to chase.
 *
 * The UI was reading `isYahooConnected` — which is only "a token exists" — and showing a green
 * "Connected" badge on a platform that cannot return a single league. Someone would pick
 * Yahoo, wait, and get the failure two screens later. Same shape as promising an extension
 * import that never answers: an affordance that describes our plumbing rather than the
 * reader's outcome.
 *
 * Flip the flag when access is granted. Nothing else needs to change.
 */
export const YAHOO_API_AVAILABLE = false

/**
 * What we tell people, everywhere.
 *
 * The previous wording said Yahoo "changed their API access" and called the outage
 * "temporary". Neither survives contact with the facts: nothing changed at Yahoo's end that
 * we know of — we asked for an entitlement and were never granted one — and after five weeks
 * with no status mechanism and no reply, "temporarily" promises a return we cannot promise.
 * Better to be plainly uncertain than confidently wrong.
 */
export const YAHOO_UNAVAILABLE_MESSAGE =
  "Yahoo Fantasy leagues can't be loaded right now. Yahoo requires separate approval to use " +
  'their Fantasy API and ours is still pending, with no date we can promise. Your ESPN and ' +
  'Sleeper leagues are unaffected.'

/** Short form, for a badge or a tile where the full sentence will not fit. */
export const YAHOO_UNAVAILABLE_SHORT = 'Awaiting Yahoo approval'
