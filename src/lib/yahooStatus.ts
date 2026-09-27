/**
 * Whether Yahoo Fantasy can actually return data, in one place.
 *
 * GRANTED 2026-09-27, after two months dark. OAuth and API ACCESS are two separate grants:
 * developer.yahoo.com issues the Client ID, and sports.yahoo.com/developer/access grants
 * permission for those credentials to call the Fantasy API. We had the first and not the
 * second, so sign-in completed, tokens were issued, and every Fantasy call returned 403
 * "not authorized to perform this action". Applied 2026-07-28, resubmitted 2026-08-25
 * disclosing commercial use, approved 2026-09-27. Confirmed by a real call through the
 * yahoo-api function — the same path a league load takes — returning HTTP 200 and a
 * populated fantasy_content body, not by an email saying so.
 *
 * WHY THE FLAG STAYS. The entitlement is Yahoo's to withdraw and it has been withdrawn once
 * already, with no status page, ticket or support address to chase. Flipping this back to
 * false is the whole mitigation: every surface reads it, so the app degrades to "ESPN and
 * Sleeper work normally" in one edit rather than in a scramble across components.
 *
 * The messages below stay for the same reason, and because services/yahoo.ts still needs one
 * for a 403 — a live entitlement can lapse mid-session, and that path must stay graceful.
 *
 * The check that proves it lives in the admin panel: "Check now" makes a real call rather
 * than reporting what this constant says, so it can contradict us. That is the point of it.
 */
export const YAHOO_API_AVAILABLE = true

/**
 * What we tell people, everywhere.
 *
 * NO VENDOR NARRATIVE. This once said our approval was "still pending, with no date we can
 * promise" and badged the tile "Awaiting Yahoo approval". Both were true and neither was the
 * reader's problem: somebody choosing where to put their league does not need to know which
 * of our suppliers has not replied to us, and a product that explains its blockers sounds
 * like it is making excuses for them.
 *
 * What a reader needs is what they can do, which is use ESPN or Sleeper. The reason lives in
 * the admin panel and in yahoo-api's logs, where somebody can act on it.
 *
 * "Down" rather than "not supported yet" was a deliberate call by the owner, and it was the
 * right one: the wording promised a return, and the connection did return. It is now also
 * literally accurate — a 403 after 2026-09-27 is an entitlement that lapsed, not one we never
 * had.
 */
export const YAHOO_UNAVAILABLE_MESSAGE =
  'The Yahoo connection is down. Your ESPN and Sleeper leagues work normally.'

/** Short form, for a badge or a tile where the full sentence will not fit. */
export const YAHOO_UNAVAILABLE_SHORT = 'Connection down'
