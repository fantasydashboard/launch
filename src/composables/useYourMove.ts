import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import type { CandidateAction, ScoredContext } from '@/myteam/yourMove/types'
import { addGenerator } from '@/myteam/yourMove/generators/addGenerator'
import { streamGenerator } from '@/myteam/yourMove/generators/streamGenerator'
import { startSitGenerator, type BenchPlayer } from '@/myteam/yourMove/generators/startSitGenerator'
import { rankMoves } from '@/myteam/yourMove/rankMoves'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'

// A this-week category is worth chasing if it's a coin-flip, or a loss still within
// reach (we're not yet hopelessly behind). Hopeless cats aren't "moves."
const LOSS_IN_REACH_PCT = 30
const EMPTY_SCHEDULE: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {} }

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Surface the ranked short stack of "Your Move" recommendations for this week's
 * matchup: waiver adds (always) plus streaming starters (when the MLB schedule
 * loads). Start/sit slots in here in Phase 3.
 */
export function useYourMove(inputs: {
  catSpecs: Ref<CatSpec[]>
  freeAgents: Ref<AvailablePlayer[]>
  benchedPlayers: Ref<BenchPlayer[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  seasonFraction: Ref<number>
}): { moves: ComputedRef<CandidateAction[]> } {
  // The week's probable-pitcher schedule, loaded async; empty until then so the
  // add-only stack renders immediately and streaming fills in when ready.
  const schedule = ref<WeekSchedule>(EMPTY_SCHEDULE)

  watch(
    () => inputs.snapshot.value,
    async (snap) => {
      if (!snap || snap.completed) {
        schedule.value = EMPTY_SCHEDULE
        return
      }
      const start = new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + Math.max(0, snap.daysRemaining))
      schedule.value = await getWeekSchedule(ymd(start), ymd(end))
    },
    { immediate: true },
  )

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

    const fraction = inputs.seasonFraction.value
    const candidates = [
      ...addGenerator(inputs.freeAgents.value, flippableCatIds, ctx, fraction),
      ...streamGenerator(inputs.freeAgents.value, schedule.value.startsByPitcher, flippableCatIds, ctx, fraction),
      ...startSitGenerator(inputs.benchedPlayers.value, flippableCatIds, ctx, fraction),
    ]

    return rankMoves(candidates, { maxMoves: 4, liftFloor: 1 })
  })

  return { moves }
}
