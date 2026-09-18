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
 * EVERY ENTRY WAS DERIVED FROM DATA, AND THE DERIVATION IS ON THE LINE. Two kinds of
 * evidence: arithmetic identities that held across the whole 456-player projection set, and
 * a rank check — sorting the pool by an id and seeing whether the names at the top are the
 * players who actually lead that category. An identity alone fixes a stat's ARITHMETIC but
 * not its NAME; the rank check is what supplies the name. Both are quoted below.
 *
 * This map was half this size and carried a companion list of fifteen ids marked "we cannot
 * name these". That list is now empty, and the note explaining why it existed is worth
 * keeping: the reason those ids looked unidentifiable was that they were being read one at a
 * time. Read as a SET they solve immediately, because the ids come in closed algebraic
 * families — a 2x2 of goals and assists crossed with power play and short handed, summing
 * two different ways to the same total. No single column identifies itself; the grid does.
 */
export const HOCKEY_STAT_BY_ID: Record<number, string> = {
  // ── skaters ──
  13: 'G',        // goals    — league scores it 2.0; MacKinnon 53
  14: 'A',        // assists  — league scores it 1.0; MacKinnon 80
  15: 'PLUSMINUS',// the ONLY id that goes negative: range -38 to +53, MacKinnon top
  16: 'PTS',      // points   — 13 + 14 = 16 for 396 of 398 skaters
  17: 'PIM',      // penalty minutes — top 5 are Zadorov, Wilson, Greer, Olivier, D'Astous
  18: 'PPG',      // power-play goals   — forwards 5.4 avg, D 1.6
  19: 'PPA',      // power-play assists — forwards 8.5, D 6.8
  20: 'SHG',      // short-handed goals   — 155 league-wide, max 4
  21: 'SHA',      // short-handed assists — 156 league-wide, max 4
  26: 'TOI',      // time on ice, seconds — 26 / 30 = 27 for 396 of 398
  27: 'TOIG',     // time on ice per game, seconds — ~1086 is 18:06
  29: 'SOG',      // shots    — league scores it 0.1; MacKinnon 367
  30: 'GP',       // games played — 82 for a full season
  31: 'HITS',     // top 5 Trenin, Sherwood, Cuylle, Kolesar, McBain; F and D both ~80 avg
  32: 'BLK',      // top 5 ALL defencemen; D average 124 against forwards' 41
  33: 'DPTS',     // points by a defenceman — nonzero for 115 D and zero for all 283 forwards
  35: 'STG',      // special-teams goals   — 18 + 20
  36: 'STA',      // special-teams assists — 19 + 21
  37: 'STP',      // special-teams points  — 35 + 36, and also 38 + 39
  38: 'PPP',      // power-play points   — 18 + 19; 4,885 league-wide
  39: 'SHP',      // short-handed points — 20 + 21;   311 league-wide, which is what fixes
                  //   the orientation: power play outnumbers short handed 16 to 1

  // ── goalies ──
  0: 'DEC',       // decisions — 1 + 2 + 9 for 57 of 58 goalies
  1: 'W',         // wins     — league scores it 4.0
  2: 'L',         // losses
  3: 'SA',        // shots against
  4: 'GA',        // goals against — league scores it -2.0, the only negative
  6: 'SV',        // saves    — 1046 SA - 121 GA = 925 exactly; league scores it 0.2
  7: 'SHO',       // shutouts — league scores it 3.0
  8: 'TOI',       // time on ice, seconds — 8 / 0 is 59.3 minutes, one full game per decision
  9: 'OTL',       // overtime losses — the third term of the decisions identity above
  10: 'GAA',      // goals-against average — 121 / (TOI/3600) = 3.48
  11: 'SVPCT',    // save percentage — 6 / 3 for 57 of 57
  12: 'WINPCT',   // 1 / 0 for 56 of 57
  /*
   * 34 IS NOT GAMES STARTED, WHICH IS WHAT THIS MAP USED TO CLAIM.
   *
   * For all 398 skaters it equals games played exactly, and a skater does not "start". For
   * goalies it is zero for fifteen of them — including Lindgren, Demko and Stolarz, who are
   * projected 37, 52 and 43 appearances — so read as starts it would call three starting
   * goalies unstartable. Where it is nonzero it sits just under games played, so it is
   * plausibly starts with a lot of gaps, but "plausibly" is not a basis for pricing a
   * position. Goalie volume comes from GP, and DEC above is the verified alternative.
   */
  34: 'GP2',
}

/**
 * Stat ids that appear with projections and scoring weights but that we cannot yet NAME.
 *
 * EMPTY, AND KEPT. Every id in the feed now has a derivation beside it in the map above.
 * The export stays because the machinery that reports the gap is worth more than the gap
 * being currently zero: ESPN adds stats between seasons, and the first new id to arrive
 * should surface as "we cannot name this" rather than be silently dropped.
 */
export const HOCKEY_STAT_UNVERIFIED = new Set<number>([])

/**
 * Stats that are a RATE or a ROLLUP of other stats in the same payload.
 *
 * These are real and correctly named, but they must never be summed alongside their own
 * components. PTS is goals plus assists; PPP is power-play goals plus power-play assists;
 * STP is those two totals again from the other direction. A league is free to score any of
 * them — that is its business, and applying a weight the league set is not double counting.
 * What this set exists to prevent is US adding them together on our own initiative, in a
 * category league where the categories are inferred rather than priced.
 */
export const HOCKEY_DERIVED_STATS = new Set([
  'PTS', 'DPTS', 'STG', 'STA', 'STP', 'PPP', 'SHP',
  'TOI', 'TOIG', 'GAA', 'SVPCT', 'WINPCT', 'DEC', 'GP2',
])

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
