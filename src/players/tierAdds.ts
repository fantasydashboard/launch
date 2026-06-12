import type { CandidateAction } from '@/myteam/yourMove/types'
import { displayLift } from '@/myteam/yourMove/displayLift'

// A move adding fewer than this many displayed percentage points isn't worth
// surfacing at all — it's rounding error, not a recommendation. (The Players page
// stops here instead of padding to a fixed count.)
export const ADD_MIN_LIFT = 3
// At or above this it's a real move; between MIN and STRONG it's a "smaller edge"
// shown in a quieter, subordinate tier.
export const ADD_STRONG_LIFT = 5

export interface TieredAdds {
  strong: CandidateAction[]
  smaller: CandidateAction[]
}

/**
 * Split ranked adds into the meaningful tier and the "smaller edges" tier, dropping
 * anything below the floor. Tiering is on the DISPLAYED (shaped) lift so the cut lines
 * up with the numbers the user sees. Input is assumed already sorted by lift desc.
 */
export function tierAdds(ranked: CandidateAction[]): TieredAdds {
  const shown = ranked
    .map((a) => ({ a, lift: displayLift(a.winProbLift) }))
    .filter((x) => x.lift >= ADD_MIN_LIFT)
  return {
    strong: shown.filter((x) => x.lift >= ADD_STRONG_LIFT).map((x) => x.a),
    smaller: shown.filter((x) => x.lift < ADD_STRONG_LIFT).map((x) => x.a),
  }
}
