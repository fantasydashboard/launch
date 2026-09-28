import { normalizeName } from './normalizeName'

/**
 * Which ESPN row belongs to which rated skater.
 *
 * WHY THIS IS ITS OWN FILE. It used to be four lines inside mergeHockeyProjections — a Map keyed
 * by `name|position` — and those four lines silently mispriced 66 skaters for as long as the
 * board has existed. A join is a rule with edge cases, it deserves tests, and it could not have
 * them while it was an anonymous expression in the middle of a merge.
 *
 * THE FAILURE IT FIXES. The NHL's feed and ESPN's disagree about which wing a winger plays:
 * Zach Hyman is an L to one and an RW to the other, Jake Guentzel a C and an LW, Frank Vatrano an
 * L and an RW. On a name-AND-position key every one of those missed. Missing was not the
 * damaging part — the damaging part is what happened next. An unjoined rate row got a key of its
 * own under the `nhl:` prefix, ESPN's row stayed in the board as an unclaimed player carrying
 * ESPN's own projection, and every consumer that filters out `nhl:` keys (every social card, via
 * scripts/hockey-board-export.ts) therefore showed ESPN's numbers and threw ours away. The board
 * advertised our model and printed somebody else's, for 66 players, with nothing to say so.
 *
 * It put Frank Vatrano — who finished 109th of 110 left wings on 1.82 fantasy points a game —
 * thirteenth. ESPN had him at 296 partial points against our rate model's 220.
 *
 * WHY POSITION IS STILL IN THE KEY. There are two Elias Petterssons, a forward and a defenceman,
 * on the same team. Joining on name alone hands the defenceman a first-line scoring projection.
 * So this is a ladder rather than a looser key: the exact match first, then two narrower rules,
 * and a refusal when nothing can distinguish two men with one name. A player left unmatched keeps
 * his own rate and his availability falls back to his own history, which is merely less precise.
 * A player matched to the wrong row is confidently wrong, which is worse.
 */

/** The NHL says L and R where ESPN says LW and RW. Nothing else needs translating. */
export const ESPN_POSITION: Record<string, string> = { C: 'C', L: 'LW', R: 'RW', D: 'D' }

export interface RateLike {
  playerId: number
  name: string
  /** The NHL's code: C, L, R, D. */
  position: string
}

export interface EspnLike {
  name: string
  /** ESPN's spelling: C, LW, RW, D. */
  position: string
  /** Every slot ESPN says he can be started at, when the feed carries it. */
  eligible?: string[]
}

export interface JoinRungs {
  /** Name and position agree outright. */
  exact: number
  /** Position disagrees, but ESPN lists ours among the slots he is eligible for. */
  eligible: number
  /** Position disagrees and nothing else does — one man of that name on each side. */
  uniqueName: number
  /** Two men could be meant, so no claim is made. */
  refused: number
  /** ESPN does not carry him at all. Not a failure: ESPN lists 454 of 940 rated skaters. */
  noEspnRow: number
}

export interface JoinResult<E> {
  byPlayerId: Map<number, E>
  rungs: JoinRungs
}

/**
 * Join ESPN's rows onto rated skaters.
 *
 * Each ESPN row is claimed at most once. Two rate rows sharing a name would otherwise both take
 * the same row, and the second would inherit the first's expected games — which is how one
 * Pettersson ends up playing the other's season.
 */
export function joinEspnRows<R extends RateLike, E extends EspnLike>(
  rates: R[],
  espn: E[],
): JoinResult<E> {
  const byPlayerId = new Map<number, E>()
  const rungs: JoinRungs = { exact: 0, eligible: 0, uniqueName: 0, refused: 0, noEspnRow: 0 }

  const byNamePos = new Map<string, E>()
  const byName = new Map<string, E[]>()
  for (const p of espn) {
    const n = normalizeName(p.name)
    byNamePos.set(`${n}|${p.position}`, p)
    const a = byName.get(n)
    if (a) a.push(p)
    else byName.set(n, [p])
  }

  /* How many rate rows answer to each name, so an ambiguous one can be recognised as such. */
  const rateNameCount = new Map<string, number>()
  for (const r of rates) {
    const n = normalizeName(r.name)
    rateNameCount.set(n, (rateNameCount.get(n) ?? 0) + 1)
  }

  const claimed = new Set<E>()

  /*
   * TWO PASSES, AND THE ORDER MATTERS. Every exact match is settled before any looser rule runs,
   * so a player who agrees with ESPN outright can never lose his row to a namesake arriving by a
   * weaker rung.
   */
  const unresolved: R[] = []
  for (const r of rates) {
    const pos = ESPN_POSITION[r.position]
    /* A position with no translation — a goalie, most often — is not guessed at. Goalies are
       projected by src/hockey/goalieProjection.ts and joined by name elsewhere. */
    if (!pos) continue
    const hit = byNamePos.get(`${normalizeName(r.name)}|${pos}`)
    if (hit && !claimed.has(hit)) {
      byPlayerId.set(r.playerId, hit)
      claimed.add(hit)
      rungs.exact++
    } else {
      unresolved.push(r)
    }
  }

  for (const r of unresolved) {
    const pos = ESPN_POSITION[r.position]
    const n = normalizeName(r.name)
    const all = byName.get(n) ?? []
    if (!all.length) {
      /* ESPN does not carry him. Not a failure — ESPN lists 454 of 940 rated skaters, and the
         rest are rated on their NHL record alone, which is what the rate model is for. */
      rungs.noEspnRow++
      continue
    }
    const cands = all.filter((p) => !claimed.has(p))
    if (!cands.length) {
      /* Every row of that name was taken by a namesake who matched exactly. That is the
         ambiguous case, not the absent one: the other Elias Pettersson has his row. */
      rungs.refused++
      continue
    }

    /* Rung 2: ESPN itself says he can be started at the position we have him at. That is ESPN
       agreeing with us about the player while disagreeing about which label to lead with. */
    const byElig = cands.filter((p) => Array.isArray(p.eligible) && p.eligible.includes(pos))
    if (byElig.length === 1) {
      byPlayerId.set(r.playerId, byElig[0])
      claimed.add(byElig[0])
      rungs.eligible++
      continue
    }

    /* Rung 3: one man of that name on each side, so there is nobody else it could be. The
       position disagreement is then a labelling difference and nothing more. */
    if (cands.length === 1 && rateNameCount.get(n) === 1) {
      byPlayerId.set(r.playerId, cands[0])
      claimed.add(cands[0])
      rungs.uniqueName++
      continue
    }

    rungs.refused++
  }

  return { byPlayerId, rungs }
}
