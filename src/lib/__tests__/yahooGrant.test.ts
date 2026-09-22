import { describe, it, expect } from 'vitest'
import { readRefreshFailure } from '../yahooGrant'

/**
 * The asymmetry this function exists to respect.
 *
 * Calling a dead grant TRANSIENT costs a delay: the user keeps a connection that cannot load
 * anything until the next attempt. Calling a transient failure DEAD deletes a working
 * connection and makes somebody re-authorise for nothing. So anything we do not positively
 * recognise as a dead grant is transient.
 */
describe('readRefreshFailure', () => {
  it('reads an invalid_grant refusal as a dead grant', () => {
    expect(readRefreshFailure(400, '{"error":"invalid_grant"}')).toBe('grant-dead')
  })

  /* What Yahoo actually returns when the client credentials no longer match the token —
     the exact case a Client ID swap creates for every existing user at once. */
  it('reads rejected client credentials as a dead grant', () => {
    expect(readRefreshFailure(401, '{"error":"invalid_client"}')).toBe('grant-dead')
  })

  it('reads a revoked token as a dead grant', () => {
    expect(readRefreshFailure(400, '{"error":"invalid_token","error_description":"Token revoked"}'))
      .toBe('grant-dead')
  })

  it('treats a server error as transient, never as a reason to disconnect anyone', () => {
    expect(readRefreshFailure(500, 'Internal Server Error')).toBe('transient')
    expect(readRefreshFailure(502, '')).toBe('transient')
  })

  it('treats rate limiting as transient', () => {
    expect(readRefreshFailure(429, '{"error":"rate_limit"}')).toBe('transient')
  })

  /* A network failure has no status at all. It is the most common failure there is and it
     says nothing whatever about the grant. */
  it('treats a failure with no status as transient', () => {
    expect(readRefreshFailure(0, '')).toBe('transient')
  })

  /*
   * 403 is the ENTITLEMENT refusal — the application is not approved for the Fantasy API —
   * and it is emphatically not a token problem. Reading it as a dead grant would delete the
   * connection and tell the user to reconnect, which cannot possibly help and would loop them
   * forever. This is the live failure mode as of 2026-09: consent succeeds, the call 403s.
   */
  it('never reads an entitlement refusal as a dead grant', () => {
    expect(readRefreshFailure(403, '{"error":"This application is not authorized to perform this action"}'))
      .toBe('transient')
  })

  it('treats an unrecognised 4xx as transient rather than guessing', () => {
    expect(readRefreshFailure(418, 'teapot')).toBe('transient')
  })

  it('tolerates a body that is not JSON', () => {
    expect(readRefreshFailure(400, '<html>invalid_grant</html>')).toBe('grant-dead')
    expect(readRefreshFailure(400, '')).toBe('transient')
  })
})
