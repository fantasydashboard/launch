import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import type { CandidateAction, MoveCandidate, ScoredContext } from '@/myteam/yourMove/types'
import { addGenerator } from '@/myteam/yourMove/generators/addGenerator'
import { streamGenerator } from '@/myteam/yourMove/generators/streamGenerator'
import { startSitGenerator } from '@/myteam/yourMove/generators/startSitGenerator'
import { buildMoves } from '@/myteam/yourMove/buildMoves'
import { rankMoves } from '@/myteam/yourMove/rankMoves'
import type { RosterSlotPlayer } from '@/myteam/yourMove/pairDrop'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'

// A this-week category is worth chasing if it's a coin-flip, or a loss still within
// reach (we're not yet hopelessly behind). Hopeless cats aren't "moves."
const LOSS_IN_REACH_PCT = 30
const EMPTY_SCHEDULE: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {} }

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Surface the ranked short stack of "Your Move" recommendations. Generators emit
 * raw candidates (adds, streams, start/sit); buildMoves nets each against the
 * player you'd drop or sit and keeps only believable, honestly-flipped swaps.
 */
export function useYourMove(inputs: {
  catSpecs: Ref<CatSpec[]>
  freeAgents: Ref<AvailablePlayer[]>
  roster: Ref<RosterSlotPlayer[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  seasonFraction: Ref<number>
}): { moves: ComputedRef<CandidateAction[]> } {
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

    const cats = inputs.catSpecs.value
    const days = snap.daysRemaining
    const fraction = inputs.seasonFraction.value
    const ctx: ScoredContext = {
      cats,
      categoryIds: snap.categories.map((c) => c.statId),
      myStats: snap.myStats,
      oppStats: snap.oppStats,
      days,
      platform: snap.platform,
    }
    const flippableCatIds = snap.categories
      .filter((c) => c.status === 'tossup' || (c.status === 'loss' && c.myWinPct >= LOSS_IN_REACH_PCT))
      .map((c) => c.statId)

    const benched = inputs.roster.value
      .filter((p) => !p.started)
      .map((p) => ({ playerKey: p.playerKey, name: p.name, team: p.team, position: p.position, stats: p.stats }))

    const candidates: MoveCandidate[] = [
      ...addGenerator(inputs.freeAgents.value, cats, days, fraction),
      ...streamGenerator(inputs.freeAgents.value, schedule.value.startsByPitcher, cats, fraction),
      ...startSitGenerator(benched, cats, days, fraction),
    ]

    const built = buildMoves(candidates, inputs.roster.value, flippableCatIds, cats, ctx, fraction)
    return rankMoves(built, { maxMoves: 4, liftFloor: 1 })
  })

  return { moves }
}
