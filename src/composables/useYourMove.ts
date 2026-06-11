import { computed, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import type { CandidateAction, ScoredContext } from '@/myteam/yourMove/types'
import { addGenerator } from '@/myteam/yourMove/generators/addGenerator'
import { rankMoves } from '@/myteam/yourMove/rankMoves'

// A this-week category is worth chasing if it's a coin-flip, or a loss still within
// reach (we're not yet hopelessly behind). Hopeless cats aren't "moves."
const LOSS_IN_REACH_PCT = 30

/**
 * Surface the ranked short stack of "Your Move" recommendations for this week's
 * matchup. Phase 1 runs the waiver-add generator; start/sit and streaming
 * generators slot in here in later phases.
 */
export function useYourMove(inputs: {
  catSpecs: Ref<CatSpec[]>
  freeAgents: Ref<AvailablePlayer[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  seasonFraction: Ref<number>
}): { moves: ComputedRef<CandidateAction[]> } {
  const moves = computed<CandidateAction[]>(() => {
    const snap = inputs.snapshot.value
    if (!snap || snap.completed) return []
    if (snap.platform !== 'yahoo' && snap.platform !== 'espn') return []

    const ctx: ScoredContext = {
      cats: inputs.catSpecs.value,
      categoryIds: snap.categories.map((c) => c.statId),
      myStats: snap.myStats,
      oppStats: snap.oppStats,
      days: snap.daysRemaining,
      platform: snap.platform,
    }

    const flippableCatIds = snap.categories
      .filter((c) => c.status === 'tossup' || (c.status === 'loss' && c.myWinPct >= LOSS_IN_REACH_PCT))
      .map((c) => c.statId)

    const candidates = addGenerator(
      inputs.freeAgents.value,
      flippableCatIds,
      ctx,
      inputs.seasonFraction.value,
    )

    return rankMoves(candidates, { maxMoves: 4, liftFloor: 1 })
  })

  return { moves }
}
