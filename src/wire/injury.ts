/**
 * Injured-list / reserve-slot detection for The Wire.
 *
 * A player sitting in an IL (or NA/DL) reserve slot does NOT occupy an active
 * roster spot, so dropping them never opens a spot for a waiver add — you'd
 * still have to drop an active player. The Wire flags these players and keeps
 * them out of the "drop to make room" suggestions (see dropEligibility usage).
 *
 * ESPN exposes the reserve slot as the lineup-slot label ('IL' / 'IL+'); Yahoo
 * exposes it as the player status string ('IL10' / 'IL60' / 'NA' / ...). DTD
 * (day-to-day) players are NOT on IL — they still hold an active slot — so they
 * are deliberately excluded.
 */

/** Yahoo: status like 'IL10' / 'IL60' / 'NA' / 'DL' means a reserve slot. */
export function isYahooIL(status: string | undefined | null): boolean {
  const s = String(status ?? '').toUpperCase().trim()
  return s.startsWith('IL') || s === 'NA' || s === 'DL'
}

/** ESPN: lineup-slot label 'IL' / 'IL+' / 'NA' means a reserve slot. */
export function isEspnIL(lineupSlot: string | undefined | null): boolean {
  const s = String(lineupSlot ?? '').toUpperCase().trim()
  return s === 'IL' || s === 'IL+' || s === 'NA'
}
