import { HOCKEY_SLOT_ACCEPTS, FORWARD_POSITIONS } from './hockeyPositions'

/**
 * Value over replacement for hockey.
 *
 * WHY NOT buildFootballVor. Structurally that engine is sport-agnostic — it takes points and
 * positions and computes replacement from the league's own slots — and reusing it was the
 * plan. It cannot be used, for one specific reason worth recording so nobody tries again:
 * it normalises every position through `canonicalPosition`, and that maps "D" to "DEF"
 * because in football D means a team defence.
 *
 * In hockey D is a defenceman. Routed through that function, every defenceman in the league
 * would be relabelled as a football team defence, then measured against a DEF slot no hockey
 * league has — so the whole position would get a replacement level of zero and rank as though
 * free. Silent, and wrong in the direction that loses you a draft.
 *
 * The replacement arithmetic is NOT shared either, though I assumed it would be and wrote
 * that down before testing it. computeReplacementDetail computes its startable counts only
 * for a hardcoded football list — QB, RB, WR, TE, K, DEF — so every hockey pool fell through
 * to index nought and the replacement level came out as THE BEST PLAYER IN THE POOL. Value
 * over replacement was therefore zero for everybody, including the best forward alive. The
 * test caught it; the assumption did not survive contact.
 *
 * So the level is computed here, and it is four lines: sort the pool, count the seats the
 * league actually starts, and take the first man who misses out.
 *
 * WHAT HOCKEY ADDS. Football's flex is one slot taking three positions. Hockey's is two
 * overlapping ones — a forward slot that takes any of C, LW and RW, and a utility slot that
 * takes those plus defencemen — and both are usually deeper than the strict positional slots.
 * A league running nine forwards and one utility starts almost all its skaters through slots
 * that do not care which position a player is, so measuring a centre against other centres
 * would invent a scarcity the lineup does not have.
 */

export interface HockeyVorRow {
  playerKey: string
  position: string
  points: number
  vor: number
  /** The bucket he was actually measured against — see expandSlots. */
  pool: string
}

export interface HockeyVorInput {
  /** Rest-of-season points by player key, already scored with the league's weights. */
  points: Record<string, number>
  positionByKey: Record<string, string>
  /** Starting slots only, e.g. { F: 9, D: 5, G: 2, UTIL: 1 }. */
  slots: Record<string, number>
  teams: number
  /**
   * Players already off the board.
   *
   * Passing it removes them from the pools AND spends the seats they took. Omit it and the
   * board is a preseason ranking with rows hidden, which is what this was before.
   *
   * THE EFFECT IS REAL BUT NARROWER THAN IT SOUNDS, and the narrow part is worth stating
   * because it is easy to claim otherwise. If a draft follows this board exactly, the
   * replacement level does not move AT ALL — and that is arithmetic, not a bug. Removing the
   * top K of a pool and shrinking its seats by K lands the index on the same player it was
   * already on. The measured case: twelve goalies taken strictly in our order moved the
   * goalie level from 97.6 to 97.6.
   *
   * What moves it is a draft that DEPARTS from our ordering — a reach, a keeper, a league
   * that rates somebody differently. Twelve goalies gone with eight of them reaches moved the
   * same level from 97.6 to 107.0, and the best goalie left was priced accordingly. Since
   * real drafts depart from any one board constantly, this fires often; it just does not fire
   * because of volume alone.
   */
  drafted?: Set<string>
}

/**
 * Which pool a position competes in, given the league's slots.
 *
 * A position with its own slot is measured against its own kind. One that only ever reaches
 * the lineup through a shared slot is measured against everybody eligible for that slot,
 * because that is who he is actually beating for the seat.
 */
export function poolForPosition(position: string, slots: Record<string, number>): string {
  if (slots[position] > 0) return position
  if (FORWARD_POSITIONS.has(position) && (slots.F ?? 0) > 0) return 'F'
  if ((slots.UTIL ?? 0) > 0 && (HOCKEY_SLOT_ACCEPTS.UTIL ?? []).includes(position)) return 'UTIL'
  return position
}

/**
 * Collapse the league's slots onto those pools, so the replacement maths counts the right
 * number of seats.
 *
 * The utility slot is folded into whichever pools can fill it rather than standing alone: one
 * UTIL opening in a league with a forward slot is a tenth forward seat in practice, and
 * leaving it as its own one-deep position would set a replacement level off the single best
 * player in the league.
 */
export function expandSlots(slots: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [slot, n] of Object.entries(slots)) {
    if (!n || n <= 0) continue
    if (slot === 'UTIL') continue
    out[slot] = (out[slot] ?? 0) + n
  }
  const util = slots.UTIL ?? 0
  if (util > 0) {
    /* Skaters share it. Splitting it evenly across the pools that can fill it is cruder than
       solving for who actually takes it, and deliberately so — the alternative is a lineup
       optimisation inside a replacement-level calculation, and the error either way is a
       fraction of one roster spot. */
    const eligible = Object.keys(out).filter((s) => s === 'F' || s === 'D' || s === 'C' || s === 'LW' || s === 'RW')
    if (eligible.length) {
      for (const s of eligible) out[s] = (out[s] ?? 0) + util / eligible.length
    } else {
      out.UTIL = util
    }
  }
  return out
}

/**
 * VOR for every player with points.
 *
 * Goalies are measured against goalies and nobody else, which needs no special case here —
 * no shared slot accepts them, so `poolForPosition` leaves them in their own pool. That is
 * worth stating because it is the one position where the answer being right is an accident
 * of the data rather than a rule written down.
 */
export function buildHockeyVor(input: HockeyVorInput): Record<string, HockeyVorRow> {
  const { points, positionByKey, slots, teams, drafted } = input

  const poolByKey: Record<string, string> = {}
  const byPool = new Map<string, number[]>()
  /* Seats already spent, per pool — the other half of the draft-board calculation. */
  const goneByPool = new Map<string, number>()
  for (const [key, pts] of Object.entries(points)) {
    const position = String(positionByKey[key] ?? '').toUpperCase()
    if (!position || !Number.isFinite(pts)) continue
    const pool = poolForPosition(position, slots)
    poolByKey[key] = pool
    if (drafted?.has(key)) {
      goneByPool.set(pool, (goneByPool.get(pool) ?? 0) + 1)
      continue                      // out of the pool he is no longer available in
    }
    byPool.set(pool, [...(byPool.get(pool) ?? []), pts])
  }

  /*
   * Replacement level: the best player who does NOT get a starting job.
   *
   * Seats are the league's openings times the number of teams, so in an eight-team league
   * starting nine forwards the 73rd forward is the first man nobody starts, and that is what
   * every forward is priced against. Rounded because the utility slot splits into fractions.
   *
   * Where every player in a pool is startable the index runs off the end, and the worst man
   * in the pool stands in — a shallow position where everyone starts has no replacement to
   * speak of, and zero would say the opposite.
   */
  const seats = expandSlots(slots)
  const levels: Record<string, number> = {}
  for (const [pool, arr] of byPool) {
    const sorted = [...arr].sort((a, b) => b - a)
    /*
     * Seats still open, not seats that ever existed.
     *
     * Nine forward openings across eight teams is 72 forward jobs, and every forward already
     * taken has spent one. So the man who misses out is the 72nd MINUS the ones gone, counted
     * among those still available — which is why a run on one position re-prices it and the
     * others immediately.
     *
     * Floored at one rather than nought. Once more players at a pool are gone than there are
     * seats, everyone left is a bench player and the honest replacement level is the best of
     * them; an index of nought would say that literally and collapse every remaining player
     * at that position to a VOR of zero, destroying the ordering exactly when a drafter is
     * still choosing between them.
     */
    const total = Math.round((seats[pool] ?? 0) * teams)
    const idx = Math.max(1, total - (goneByPool.get(pool) ?? 0))
    levels[pool] = sorted[idx] ?? sorted[sorted.length - 1] ?? 0
  }

  const out: Record<string, HockeyVorRow> = {}
  for (const [key, pts] of Object.entries(points)) {
    const pool = poolByKey[key]
    if (!pool) continue
    /* A drafted player keeps his pool for the seat arithmetic above but gets no row: he is
       not available, and pricing him would put him back on the board. */
    if (drafted?.has(key)) continue
    out[key] = {
      playerKey: key,
      position: String(positionByKey[key] ?? '').toUpperCase(),
      points: pts,
      vor: pts - (levels[pool] ?? 0),
      pool,
    }
  }
  return out
}
