/**
 * Hockey positions, lineup slots and stat identifiers, as ESPN actually publishes them.
 *
 * HOW THESE WERE ESTABLISHED. ESPN documents none of this — its `proSettings` endpoint for
 * the `fhl` game returns no position table and no stat table. So every mapping here was
 * derived from the live projection feed and a real league's settings, and the derivation is
 * recorded beside each one. Nothing below is a guess carried forward from another sport.
 *
 * Positions came from `defaultPositionId` on 377 projected players, confirmed by who tops
 * each: 1 MacKinnon, 2 Boldy, 3 Kucherov, 4 Werenski, 5 Askarov.
 *
 * Slots came from the share of each position carrying each `eligibleSlots` entry across the
 * whole pool. The answer was unambiguous — every cell is 100% or 0%, never in between:
 *
 *      slot 0: C 100%                        -> C
 *      slot 1: LW 100%                       -> LW
 *      slot 2: RW 100%                       -> RW
 *      slot 3: C/LW/RW 100%, D 0%            -> FORWARD
 *      slot 4: D 100%                        -> D
 *      slot 5: G 100%                        -> G
 *      slot 6: C/LW/RW/D 100%, G 0%          -> UTIL (any skater)
 *      slot 7: everyone                      -> BENCH
 *      slot 8: everyone                      -> IR
 *
 * The 1-3% cross-eligibility at slots 1 and 2 is real dual-position players, not noise: a
 * centre who also plays the wing carries both. Slot 10 sits at ~1% for every skater position
 * and is deliberately unmapped — a slot almost nobody is eligible for is not one we can name
 * from evidence, and naming it wrongly would seat players in a chair that does not exist.
 */

/** ESPN `defaultPositionId` -> position. */
export const HOCKEY_POSITION_BY_ID: Record<number, string> = {
  1: 'C',
  2: 'LW',
  3: 'RW',
  4: 'D',
  5: 'G',
}

export const SKATER_POSITIONS = new Set(['C', 'LW', 'RW', 'D'])
export const FORWARD_POSITIONS = new Set(['C', 'LW', 'RW'])

/** ESPN lineup slot id -> our slot name. See the derivation above. */
export const HOCKEY_SLOT_BY_ID: Record<number, string> = {
  0: 'C',
  1: 'LW',
  2: 'RW',
  3: 'F',
  4: 'D',
  5: 'G',
  6: 'UTIL',
  7: 'BENCH',
  8: 'IR',
}

/** Which positions each slot will actually take. */
export const HOCKEY_SLOT_ACCEPTS: Record<string, string[]> = {
  C: ['C'],
  LW: ['LW'],
  RW: ['RW'],
  F: ['C', 'LW', 'RW'],
  D: ['D'],
  G: ['G'],
  UTIL: ['C', 'LW', 'RW', 'D'],
}

/** Slots that hold players who are not in the lineup. */
export const NON_STARTING_SLOTS = new Set(['BENCH', 'IR'])

/**
 * ESPN stat id -> unified key.
 *
 * The CONFIRMED block was verified two ways: arithmetic identities in the projection payload
 * (goals + assists = points; shots against - goals against = saves), and a real league's
 * `scoringItems`, which assigns a points value to the same ids. Both agree.
 *
 * The UNVERIFIED block is the honest part. These ids carry non-zero projections and some
 * carry league scoring weights, but nothing in the data identifies WHICH stat each one is —
 * MacKinnon's 31 is 62 and his 32 is 42, and hits, blocks, power-play points and
 * short-handed points are all plausible for both. They are deliberately left out of the map
 * rather than guessed at: a mislabelled stat does not crash, it produces a ranking that is
 * quietly wrong, which is worse.
 */
export const HOCKEY_STAT_BY_ID: Record<number, string> = {
  // ── skaters ──
  13: 'G',        // goals    — league scores it 2.0; MacKinnon 53
  14: 'A',        // assists  — league scores it 1.0; MacKinnon 80
  16: 'PTS',      // points   — 53 + 80 = 133 exactly
  29: 'SOG',      // shots    — league scores it 0.1; MacKinnon 367
  30: 'GP',       // games played — 82 for a full season

  // ── goalies ──
  1: 'W',         // wins     — league scores it 4.0
  2: 'L',         // losses
  3: 'SA',        // shots against
  4: 'GA',        // goals against — league scores it -2.0, the only negative
  6: 'SV',        // saves    — 1046 SA - 121 GA = 925 exactly; league scores it 0.2
  7: 'SHO',       // shutouts — league scores it 3.0
  10: 'GAA',      // goals-against average — 121 / (TOI/3600) = 3.48
  11: 'SVPCT',    // save percentage — 925 / 1046 = 0.884
  34: 'GS',       // games started — the number streaming actually turns on
}

/**
 * Stat ids that appear with projections and scoring weights but that we cannot yet NAME.
 *
 * Exported so a caller can tell "we have no value for this" apart from "this stat is zero",
 * and so the gap is visible in code rather than remembered by whoever wrote it.
 */
export const HOCKEY_STAT_UNVERIFIED = new Set([9, 15, 17, 18, 19, 20, 21, 23, 31, 32, 35, 36, 37, 38, 39])

/**
 * Categories that are better when LOWER, for H2H category leagues.
 *
 * Goals-against average and save percentage are the hockey equivalent of ERA and WHIP, and
 * the category engine already knows how to handle a lower-is-better column — this is only
 * the list of which ones they are. Note SVPCT is NOT here: a higher save percentage is
 * better, and only GAA runs backwards.
 */
export const LOWER_IS_BETTER = new Set(['GAA', 'GA', 'L'])

/** Position from an ESPN `defaultPositionId`. Empty when unknown — never guessed. */
export function hockeyPosition(defaultPositionId: number | null | undefined): string {
  return HOCKEY_POSITION_BY_ID[Number(defaultPositionId)] ?? ''
}

/** Slot name from an ESPN lineup slot id. Empty when unmapped (see slot 10 above). */
export function hockeySlot(slotId: number | null | undefined): string {
  return HOCKEY_SLOT_BY_ID[Number(slotId)] ?? ''
}

/** True when this slot puts the player in the scoring lineup. */
export function isStartingSlot(slot: string): boolean {
  return !!slot && !NON_STARTING_SLOTS.has(slot)
}

/**
 * Turn ESPN's `lineupSlotCounts` into the `{ slot: count }` shape assignSlots wants.
 *
 * Bench and IR are dropped: they are roster capacity, not lineup openings, and feeding them
 * to the optimiser would have it "starting" players who are by definition not starting.
 */
export function startingSlotsFromEspn(lineupSlotCounts: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, count] of Object.entries(lineupSlotCounts ?? {})) {
    if (!count || count <= 0) continue
    const slot = hockeySlot(Number(id))
    if (!slot || NON_STARTING_SLOTS.has(slot)) continue
    out[slot] = (out[slot] ?? 0) + count
  }
  return out
}
