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
 * NO VENDOR NARRATIVE. This used to say our approval was "still pending, with no date we can
 * promise" and badge the tile "Awaiting Yahoo approval". Both were true and neither was the
 * reader's problem: somebody choosing where to put their league does not need to know which
 * of our suppliers has not replied to us, and a product that explains its blockers sounds
 * like it is making excuses for them.
 *
 * What a reader needs is what they can do, which is use ESPN or Sleeper. The reason lives in
 * the admin panel and in yahoo-api's logs, where somebody can act on it.
 */
export const YAHOO_UNAVAILABLE_MESSAGE =
  "Yahoo leagues aren't supported yet. Your ESPN and Sleeper leagues work normally."

/** Short form, for a badge or a tile where the full sentence will not fit. */
export const YAHOO_UNAVAILABLE_SHORT = 'Not supported yet'
