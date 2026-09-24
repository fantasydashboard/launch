export interface SkaterRow {
  playerId: number
  skaterFullName: string
  positionCode: string
  teamAbbrevs: string
  gamesPlayed: number
  goals: number
  assists: number
  points: number
  plusMinus: number
  penaltyMinutes: number
  ppPoints: number
  shots: number
}

export interface IceRow {
  playerId: number
  gamesPlayed: number
  ppTimeOnIcePerGame: number
  timeOnIcePerGame?: number
}

export interface SkaterRate {
  playerId: number
  name: string
  position: string
  team: string
  gamesPlayed: number
  /** Per-game rates, shrunk toward the positional baseline when the sample is thin. */
  perGame: Record<string, number>
  /** Power-play seconds per game. The opportunity signal. */
  ppSecondsPerGame: number
  /** 0..1 — how much of `perGame` is the player's own record rather than the baseline. */
  confidence: number
}

const CATEGORIES = ['goals', 'assists', 'points', 'plusMinus', 'penaltyMinutes', 'ppPoints', 'shots'] as const
type Category = (typeof CATEGORIES)[number]
type CatTotals = Record<Category, number>

/**
 * The dial between two failure modes this product has now met on both sides of the puck.
 *
 * rosBlend (src/football/rosBlend.ts) exists because a board built on a frozen preseason
 * projection cannot learn from what a player actually does. The mirror failure is a board
 * that learns too fast: two games of a hot streak is not a season rate, and a winger who
 * scored on opening night is not a goal-a-game player. SHRINK_GAMES is how many games of
 * positional-baseline weight get blended against a player's own total — at gp = SHRINK_GAMES
 * a player is exactly half his own record and half the baseline, and confidence (gp / (gp +
 * SHRINK_GAMES)) exposes that same weight so a surface can say so rather than imply certainty
 * it doesn't have.
 */
export const SHRINK_GAMES = 10

/**
 * Placeholder prior used ONLY when there is no other player anywhere in the input with a
 * game played — i.e. before a single game has been played league-wide. It is not tuned from
 * real historical NHL data (that's future work); it exists so a preseason board shows a
 * plausible per-game shape instead of an all-zero row that reads as a verdict on the player.
 */
const DEFAULT_BASELINE: CatTotals = {
  goals: 0.5,
  assists: 1.0,
  points: 1.5,
  plusMinus: 0,
  penaltyMinutes: 0.5,
  ppPoints: 0.3,
  shots: 3.0,
}

function isDefenceman(positionCode: string): boolean {
  return positionCode === 'D'
}

function zeroTotals(): CatTotals {
  return { goals: 0, assists: 0, points: 0, plusMinus: 0, penaltyMinutes: 0, ppPoints: 0, shots: 0 }
}

/** Games-weighted totals across rows that have played at least one game. */
function sumGroup(rows: SkaterRow[]): { totals: CatTotals; games: number } {
  const totals = zeroTotals()
  let games = 0
  for (const row of rows) {
    if (row.gamesPlayed <= 0) continue
    games += row.gamesPlayed
    for (const cat of CATEGORIES) totals[cat] += row[cat]
  }
  return { totals, games }
}

/**
 * The group's games-weighted per-game rate with `row` itself removed from the pool.
 *
 * Without this, a group of exactly one player (the player being rated) has a baseline that
 * is, by definition, that player's own rate — which makes the shrinkage formula an identity
 * (own * gp + own * k) / (gp + k) === own, no matter what SHRINK_GAMES is. A baseline has to
 * come from OTHER players, or it isn't a baseline. Returns null when nothing is left to
 * average, so the caller can fall through to a wider pool.
 */
function leaveOneOut(sum: { totals: CatTotals; games: number }, row: SkaterRow): CatTotals | null {
  let games = sum.games
  const totals = { ...sum.totals }
  if (row.gamesPlayed > 0) {
    games -= row.gamesPlayed
    for (const cat of CATEGORIES) totals[cat] -= row[cat]
  }
  if (games <= 0) return null
  const rate = zeroTotals()
  for (const cat of CATEGORIES) rate[cat] = totals[cat] / games
  return rate
}

export function rateSkaters(skaters: SkaterRow[], ice: IceRow[] = []): SkaterRate[] {
  if (skaters.length === 0) return []

  const iceByPlayer = new Map<number, IceRow>()
  for (const row of ice) iceByPlayer.set(row.playerId, row)

  const defencemen = skaters.filter((s) => isDefenceman(s.positionCode))
  const forwards = skaters.filter((s) => !isDefenceman(s.positionCode))

  const defenceSum = sumGroup(defencemen)
  const forwardSum = sumGroup(forwards)
  const allSum = sumGroup(skaters)

  return skaters.map((row) => {
    const ownGroupSum = isDefenceman(row.positionCode) ? defenceSum : forwardSum
    // Own position group (minus self) -> whole league (minus self) -> hardcoded prior.
    const baseline = leaveOneOut(ownGroupSum, row) ?? leaveOneOut(allSum, row) ?? DEFAULT_BASELINE

    const gp = row.gamesPlayed
    const perGame: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      // A player with 0 games has no observed rate, whatever total happens to sit on the row.
      const ownContribution = gp > 0 ? row[cat] : 0
      perGame[cat] = (ownContribution + baseline[cat] * SHRINK_GAMES) / (gp + SHRINK_GAMES)
    }

    const iceRow = iceByPlayer.get(row.playerId)

    return {
      playerId: row.playerId,
      name: row.skaterFullName,
      position: row.positionCode,
      team: row.teamAbbrevs,
      gamesPlayed: gp,
      perGame,
      ppSecondsPerGame: iceRow ? iceRow.ppTimeOnIcePerGame : 0,
      confidence: gp / (gp + SHRINK_GAMES),
    }
  })
}
