/**
 * What we are allowed to keep, and for how long.
 *
 * The Yahoo Developer API Terms require that Yahoo user data obtained through
 * their APIs be removed within 24 hours unless Yahoo has explicitly identified
 * that data as storable indefinitely. Nothing in our integration has that
 * identification, so nothing Yahoo's API gives us may be persisted server-side.
 *
 * Two things follow, and the second is the one worth stating out loud:
 *
 * 1. API-derived Yahoo rows are not written at all. A 24-hour purge job would
 *    also satisfy the letter of the rule, but it leaves a window where the data
 *    exists, and it fails silently the first time the job does not run. Not
 *    writing cannot fail that way.
 *
 * 2. Hand-entered history is NOT covered and is kept. A season a user typed in
 *    themselves was not "obtained through the Yahoo APIs" — it is their own
 *    record of their own league. Deleting it would be over-compliance that costs
 *    the user something real and buys Yahoo nothing.
 *
 * ESPN and Sleeper are unaffected; their terms are not this one.
 */

/** The window Yahoo's terms allow, in hours. Documentation, not a schedule. */
export const YAHOO_RETENTION_HOURS = 24

export type SnapshotSource = 'auto' | 'manual'

const isYahoo = (platform: string) => (platform ?? '').toLowerCase() === 'yahoo'

/**
 * May this row be persisted server-side?
 *
 * `auto` means we read it from the platform's API. `manual` means a human typed
 * it in. Only the first is Yahoo's data to govern.
 */
export function mayPersist(platform: string, source: SnapshotSource = 'auto'): boolean {
  if (!isYahoo(platform)) return true
  return source === 'manual'
}

/** Why a write was skipped, for the one log line that explains an empty table. */
export function retentionReason(platform: string, source: SnapshotSource = 'auto'): string {
  return mayPersist(platform, source)
    ? ''
    : `Yahoo API data is not persisted: the Yahoo Developer API Terms require removal within ${YAHOO_RETENTION_HOURS}h and none of this data is identified by Yahoo as storable indefinitely.`
}
