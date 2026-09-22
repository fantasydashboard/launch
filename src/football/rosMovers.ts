/**
 * Who our rest-of-season board moved this week, and by how far.
 *
 * The board is rebuilt every week from the same preseason prior plus one more week of real
 * results, so it moves on its own — and the movement is the interesting part. "Jalen Coker,
 * WR29 to WR15" is a claim with a reason behind it; a static top fifty is a list anyone can
 * publish. This turns the first into something postable.
 *
 * NO STORED HISTORY. Last week's board is not remembered, it is REPLAYED: the same blend run
 * with the lines that existed a week ago. That means any past week can be regenerated, and
 * there is no snapshot to drift out of sync with the code that produced it.
 *
 * RANKS ARE POSITIONAL, never overall. "WR29 to WR15" is a sentence a manager can act on;
 * "overall 98 to overall 61" is a number that needs a paragraph of explanation.
 */

export interface MoverPlayer {
  playerKey: string
  name: string
  position: string
  team?: string
}

export interface Mover {
  playerKey: string
  name: string
  position: string
  team?: string
  /** Positional rank on last week's board. */
  from: number
  /** Positional rank on this week's. */
  to: number
  /** from − to. Positive is a climb, because up the board is up. */
  move: number
}

export interface RosMoversInput {
  /** Positional rank now, by player key. */
  current: Record<string, number>
  /** Positional rank on the replayed board from a week ago. */
  previous: Record<string, number>
  players: Record<string, MoverPlayer>
  /** How deep each position stays worth talking about. A position absent here is not ranked. */
  depth: Record<string, number>
  /** Smallest move worth a green arrow. */
  minMove?: number
  /** How many of each to return. */
  limit?: number
}

/** A one-slot shuffle is the board breathing. Three is the point where it is saying something. */
export const MIN_MOVE = 3
export const MOVER_LIMIT = 5

export function buildRosMovers(input: RosMoversInput): { risers: Mover[]; fallers: Mover[] } {
  const { current, previous, players, depth, minMove = MIN_MOVE, limit = MOVER_LIMIT } = input

  const risers: Mover[] = []
  const fallers: Mover[] = []

  for (const [key, to] of Object.entries(current ?? {})) {
    const from = previous?.[key]
    // Movement cannot be measured against a board he was not on.
    if (typeof from !== 'number') continue

    const player = players?.[key]
    // Never name a player we cannot name. A blank row on a graphic is worse than a missing one.
    if (!player?.name) continue

    const limitAtPosition = depth?.[player.position]
    if (typeof limitAtPosition !== 'number') continue

    const move = from - to

    /*
     * Relevance, judged at the end of the move that is being claimed: a riser has to have
     * arrived somewhere worth arriving, a faller has to have fallen from somewhere worth
     * holding. Below that depth a point of projection separates twenty players, so the largest
     * moves in the pool are nearly all down there — unfiltered they would crowd out every name
     * a reader recognises, which is the difference between a post and a wall of noise.
     */
    if (move >= minMove && to <= limitAtPosition) {
      risers.push({ ...player, from, to, move })
    } else if (move <= -minMove && from <= limitAtPosition) {
      fallers.push({ ...player, from, to, move })
    }
  }

  // Biggest move first; the better player breaks a tie, since he is the one worth naming.
  risers.sort((a, b) => b.move - a.move || a.to - b.to)
  fallers.sort((a, b) => a.move - b.move || a.from - b.from)

  return { risers: risers.slice(0, limit), fallers: fallers.slice(0, limit) }
}
