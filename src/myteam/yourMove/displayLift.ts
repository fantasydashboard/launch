// The raw win-prob lift is model-consistent but overstates confidence in a dead-even
// matchup (flipping two coin-flip cats with one swap can read as +24%). The projections
// feeding it are point estimates, not certainties, so we compress lifts above a
// believable single-swap ceiling — small/mid lifts pass through unchanged, and ORDER is
// preserved (we only shape the displayed number, never the ranking). Shared by Your Move
// and the Players page so the same move shows the same number on both.
const LIFT_SOFT_CAP = 10 // pp; linear regime below this
const LIFT_COMPRESS = 0.35 // slope above the cap

/** Shape a raw win-prob lift into the integer percentage points shown to the user. */
export function displayLift(winProbLift: number): number {
  if (!Number.isFinite(winProbLift)) return 0
  const raw = Math.max(0, winProbLift)
  const shaped = raw <= LIFT_SOFT_CAP ? raw : LIFT_SOFT_CAP + (raw - LIFT_SOFT_CAP) * LIFT_COMPRESS
  return Math.round(shaped)
}
