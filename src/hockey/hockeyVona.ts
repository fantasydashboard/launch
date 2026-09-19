import { simulateSurvival, type SurvivalPlayer } from '@/draft/room/survival'
import { priorFromAdp, DEFAULT_LOOKAHEAD_ROUNDS } from '@/draft/room/adpPrior'
import type { HockeyBoardRow } from './hockeyBoard'

/**
 * What waiting actually costs you.
 *
 * A draft board ranked by value over replacement answers "who is best". It does not answer
 * the question a drafter is really asking on the clock, which is "who will still be here at
 * my next pick". Those give different picks constantly: the best player available is often
 * one nobody else wants for another two rounds, and taking him spends a pick you could have
 * spent on the man who will certainly be gone.
 *
 * VONA — value over NEXT AVAILABLE — is the difference. For each position, simulate the
 * picks between now and your next turn, see who is left, and measure this player against the
 * best of them. A forward worth 210 with another 205 waiting for you is worth 5 right now;
 * a goalie worth 160 with a 110 behind him is worth 50. The second pick is the one to make,
 * and no ranking by value alone can tell you that.
 *
 * THE SIMULATION IS THE FOOTBALL ROOM'S, UNCHANGED. `simulateSurvival` never knew what sport
 * it was looking at — it takes positions from the data, draws from an injected prior, and
 * reaches down the ADP board with a decay calibrated against 1,371 real picks. What hockey
 * had to supply was the prior, because tendencies are built from draft history and a first
 * season has none. See adpPrior.
 */

export interface HockeyVonaInput {
  rows: HockeyBoardRow[]
  /** Draft slots picking between now and my next turn, in order. */
  upcomingSlots: number[]
  teams: number
  /** Runs and seed exposed so a caller can trade accuracy for speed, and so tests are fixed. */
  runs?: number
  seed?: number
}

export interface HockeyVonaResult {
  /** playerKey -> probability he is still there at my next pick. */
  survival: Record<string, number>
  /** playerKey -> value over the best at his position expected to survive. */
  vona: Record<string, number>
  /** position -> expected best value still available at my next pick. */
  expectedBest: Record<string, number>
  /** How many picks the simulation walked. Zero means it could not run. */
  picksSimulated: number
}

const EMPTY: HockeyVonaResult = { survival: {}, vona: {}, expectedBest: {}, picksSimulated: 0 }

/**
 * Survival and VONA for the current board.
 *
 * Returns empty rather than approximate when there is nothing to simulate — no upcoming
 * picks, or a board the market never priced. A VONA computed against no simulation is a
 * number with no meaning attached, and it would sit in the same column as one that means
 * something.
 */
export function buildHockeyVona(input: HockeyVonaInput): HockeyVonaResult {
  const { rows, upcomingSlots, teams } = input
  if (!rows?.length || !upcomingSlots?.length) return EMPTY
  if (!rows.some((r) => typeof r.adp === 'number')) return EMPTY

  const available: SurvivalPlayer[] = rows.map((r) => ({
    playerKey: r.playerKey,
    position: r.position,
    adp: typeof r.adp === 'number' ? r.adp : null,
    value: r.value,
    projected: r.projected,
  }))

  /*
   * One prior, shared by every upcoming slot.
   *
   * Football gives each manager their own, drawn from what that manager has historically
   * done. Hockey has no history yet, so every seat draws from the same read of the market —
   * and pretending otherwise by jittering it per slot would be inventing a difference we
   * cannot observe.
   */
  const prior = priorFromAdp(available, Math.max(1, teams * DEFAULT_LOOKAHEAD_ROUNDS))
  const priorForSlot = () => prior

  const sim = simulateSurvival({
    available,
    upcomingSlots,
    priorForSlot,
    runs: input.runs ?? 500,
    seed: input.seed ?? 1,
  })

  /*
   * VONA against the expected best SURVIVOR at his own position.
   *
   * A player with nobody behind him gets his full value as VONA — correctly, because if he
   * is the last of his kind the cost of waiting is all of him. That is not a degenerate case
   * to guard against; it is the exact situation a draft board exists to shout about.
   */
  const vona: Record<string, number> = {}
  for (const r of rows) {
    const best = sim.expectedBestAtPosition[r.position]
    vona[r.playerKey] = r.value - (Number.isFinite(best) ? best : 0)
  }

  return {
    survival: sim.survival,
    vona,
    expectedBest: sim.expectedBestAtPosition,
    picksSimulated: upcomingSlots.length,
  }
}
