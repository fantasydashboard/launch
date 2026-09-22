/**
 * What a failed Yahoo token refresh actually means.
 *
 * WHY THIS IS ITS OWN DECISION. A refresh can fail because the grant behind the token is gone
 * — revoked, expired past recovery, or issued to a Client ID we no longer use — or because
 * Yahoo was briefly unreachable. Those need opposite responses, and the store used to give
 * both the same one: log to the console and return null. The connection stayed green, the
 * league list came back empty, and nobody was ever told to reconnect.
 *
 * THE ASYMMETRY DECIDES THE DEFAULT. Calling a dead grant transient costs a delay — the user
 * keeps a connection that loads nothing until the next attempt, then gets prompted. Calling a
 * transient failure dead deletes a working connection and sends somebody through
 * re-authorisation for nothing. So the rule is positive recognition only: if we cannot name
 * the refusal, it is transient.
 *
 * WHY THIS MATTERS RIGHT NOW. Yahoo's Fantasy entitlement is granted against a CLIENT ID, and
 * ours was never approved, so the fix is a brand new app with new credentials. The hour those
 * credentials change, every stored refresh token in the database was minted under the old
 * client and Yahoo will refuse all of them at once. That is the single largest batch of dead
 * grants this product will ever see, and it needs to produce a clean "reconnect Yahoo" rather
 * than a silent empty state.
 *
 * 403 IS NOT A TOKEN PROBLEM. It is the entitlement refusal — "this application is not
 * authorized to perform this action" — and reconnecting cannot possibly fix it. Treating it as
 * a dead grant would delete the connection, prompt a reconnect, succeed at consent, fail again
 * at the same 403, and loop forever. The distinction is load-bearing rather than pedantic.
 */
export type RefreshOutcome = 'grant-dead' | 'transient'

/** Yahoo's names for "this grant is finished". Matched in the raw body: the payload is
 *  sometimes JSON, sometimes an HTML error page, and the word is what is reliable. */
const DEAD_GRANT_CODES = [
  'invalid_grant',
  'invalid_client',
  'invalid_token',
  'token_expired',
  'token revoked',
]

export function readRefreshFailure(status: number, body: string): RefreshOutcome {
  // Only the statuses that CAN mean a dead grant are eligible. A 500 carrying the word
  // "invalid_grant" in an unrelated stack trace must not disconnect anybody.
  if (status !== 400 && status !== 401) return 'transient'

  const text = (body || '').toLowerCase()
  return DEAD_GRANT_CODES.some((code) => text.includes(code)) ? 'grant-dead' : 'transient'
}
