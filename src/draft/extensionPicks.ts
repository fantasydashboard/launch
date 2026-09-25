/**
 * Turning what a draft room says into a player the board knows.
 *
 * WHY THIS LIVES IN THE APP AND NOT THE EXTENSION. The extension's job is to read what is
 * already being delivered to the user's browser and hand it over verbatim — a name, maybe a
 * position, maybe a team. It has no projections, no league, and no idea which of two players
 * called Elias Pettersson is on the board. Matching belongs where the players are, which is
 * here, next to the projections being matched against and inside a test runner.
 *
 * It also means a platform redesign breaks one small file in the extension rather than the
 * matching logic, and that the matcher can be fixed without asking anybody to update anything.
 *
 * THE RULE THAT MATTERS: an unmatched pick is reported, never guessed. A pick credited to the
 * wrong player is worse than one left unmarked, because the board goes on ranking a man who is
 * gone and recommends him at the top — confidently, with a number beside him. An unmarked pick
 * shows up as one extra name in a list the user is already reading; a miscredited one is
 * invisible until it costs a round.
 */

/** What a draft-room adapter can promise. Deliberately loose: platforms volunteer different things. */
export interface RawPick {
  playerName: string
  position?: string
  /** Pro team abbreviation, when the room shows one. */
  team?: string
  /** Overall pick number, when the room shows one. */
  pickNumber?: number
  /** The fantasy team that made the pick, when the room shows one. */
  byTeam?: string
}

/** A player the board can actually cross off. */
export interface BoardPlayer {
  playerKey: string
  name: string
  position: string
  team?: string
}

export type PickMatch =
  | { status: 'matched'; playerKey: string; pick: RawPick }
  /** Nobody on the board answers to that name. */
  | { status: 'unknown'; pick: RawPick }
  /** More than one does, and nothing in the pick separates them. */
  | { status: 'ambiguous'; pick: RawPick; candidates: string[] }

/**
 * A name reduced to what two sources can agree on.
 *
 * Diacritics because a draft room writes "Tim Stützle" and a feed writes "Tim Stutzle";
 * punctuation because "T.J. Oshie" and "TJ Oshie" are one man; suffixes because "Kenneth
 * Walker III" is how ESPN lists him and "Kenneth Walker" is how Sleeper does.
 *
 * Nothing fuzzier than that. Edit distance would eventually join two different players under
 * one key, and the whole point of this file is that a wrong match is the expensive error.
 */
export function normalizePickName(name: string): string {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Draft rooms abbreviate. "C. McDavid" and "Connor McDavid" are the same pick, and a room that
 * shows the short form shows it for everybody, so this cannot be treated as a rare case.
 *
 * An initial matches a full first name only when the surname already matches, which is what
 * keeps it from being a fuzzy matcher: "C. McDavid" can only ever find McDavids.
 */
function keyVariants(name: string): string[] {
  const n = normalizePickName(name)
  if (!n) return []
  const parts = n.split(' ')
  if (parts.length < 2) return [n]
  const last = parts[parts.length - 1]
  return [n, `${parts[0][0]} ${last}`]
}

/**
 * Index a board once, then match many picks against it.
 *
 * Built per board rather than per pick because a draft asks this two hundred times in an hour
 * and the board does not change between them.
 */
export function indexBoard(players: BoardPlayer[]) {
  /* Every key a player can be reached by -> the players reachable by it. A list, not a single
     player, because collisions are the thing this exists to detect rather than to resolve. */
  const byKey = new Map<string, BoardPlayer[]>()
  const add = (k: string, p: BoardPlayer) => {
    if (!k) return
    byKey.set(k, [...(byKey.get(k) ?? []), p])
  }
  for (const p of players) {
    for (const v of keyVariants(p.name)) add(v, p)
  }
  return byKey
}

const samePosition = (a?: string, b?: string) => {
  if (!a || !b) return false
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '')
  return norm(a) === norm(b)
}

const sameTeam = (a?: string, b?: string) => {
  if (!a || !b) return false
  return a.toUpperCase().trim() === b.toUpperCase().trim()
}

/**
 * One pick, against an indexed board.
 *
 * When a name reaches more than one player, the pick's own position and team are used to
 * separate them — that is exactly what those fields are for, and it is how the two Elias
 * Petterssons stay apart. If they do not separate, the answer is `ambiguous`, not a coin toss.
 */
export function matchPick(pick: RawPick, index: ReturnType<typeof indexBoard>): PickMatch {
  const tried = keyVariants(pick.playerName)
  let hits: BoardPlayer[] = []
  for (const k of tried) {
    const found = index.get(k)
    if (found?.length) { hits = found; break }
  }

  if (!hits.length) return { status: 'unknown', pick }
  if (hits.length === 1) return { status: 'matched', playerKey: hits[0].playerKey, pick }

  const byPos = hits.filter((h) => samePosition(h.position, pick.position))
  if (byPos.length === 1) return { status: 'matched', playerKey: byPos[0].playerKey, pick }

  const pool = byPos.length ? byPos : hits
  const byTeam = pool.filter((h) => sameTeam(h.team, pick.team))
  if (byTeam.length === 1) return { status: 'matched', playerKey: byTeam[0].playerKey, pick }

  return { status: 'ambiguous', pick, candidates: pool.map((h) => h.playerKey) }
}

export interface MatchRunResult {
  /** Keys to cross off, in the order the picks arrived, with no duplicates. */
  keys: string[]
  /** Every pick that could not be resolved, so a surface can SAY so rather than lose it. */
  unresolved: Exclude<PickMatch, { status: 'matched' }>[]
}

/**
 * A whole draft's worth of picks.
 *
 * Duplicates are dropped rather than counted twice: the socket can replay, a reconnect can
 * resend the backlog, and the DOM fallback re-reads rows it has already seen. Crossing a
 * player off twice is harmless; letting the count drift is not, because the count is what the
 * status line reports and what the user trusts.
 */
export function matchPicks(picks: RawPick[], players: BoardPlayer[]): MatchRunResult {
  const index = indexBoard(players)
  const keys: string[] = []
  const seen = new Set<string>()
  const unresolved: MatchRunResult['unresolved'] = []

  for (const p of picks) {
    const m = matchPick(p, index)
    if (m.status === 'matched') {
      if (!seen.has(m.playerKey)) { seen.add(m.playerKey); keys.push(m.playerKey) }
    } else {
      unresolved.push(m)
    }
  }
  return { keys, unresolved }
}
