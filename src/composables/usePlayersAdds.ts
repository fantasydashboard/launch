import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import type { CandidateAction, MoveCandidate, ScoredContext } from '@/myteam/yourMove/types'
import type { RosterSlotPlayer } from '@/myteam/yourMove/pairDrop'
import { addGenerator } from '@/myteam/yourMove/generators/addGenerator'
import { streamGenerator } from '@/myteam/yourMove/generators/streamGenerator'
import { buildMoves } from '@/myteam/yourMove/buildMoves'
import { projectRemainingWeek } from '@/myteam/yourMove/projectRemainingWeek'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'

// A this-week category is worth chasing if it's a coin-flip or a loss still within
// reach. Matches Your Move so the two surfaces agree on what counts as winnable.
const LOSS_IN_REACH_PCT = 30
const EMPTY_SCHEDULE: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {} }

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The Players page's ranked add universe: every available free agent (waiver add) and
 * every streamable starter, each netted against the player you'd drop, scored by this
 * week's win-probability lift, sorted best first.
 *
 * Unlike Your Move (a STACK of moves you make together, each claiming a distinct drop),
 * the Players list is a set of ALTERNATIVES — you'd make one of them — so every add is
 * netted against your single weakest same-side droppable (it recurs across rows). That's
 * `buildMoves`, not `buildRankedMoves`. Free agents carry FanGraphs ROS projections so
 * the ranking and the displayed stat lines are believable, not lucky small samples.
 */
export function usePlayersAdds(inputs: {
  catSpecs: Ref<CatSpec[]>
  freeAgents: Ref<AvailablePlayer[]>
  // playerKey -> FanGraphs ROS stats (mapped to league stat ids). Null/absent per
  // player falls back to extrapolated season-to-date inside the generators.
  fgStatsByKey: Ref<Record<string, Record<string, number> | null>>
  roster: Ref<RosterSlotPlayer[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  seasonFraction: Ref<number>
}): { adds: ComputedRef<CandidateAction[]> } {
  const weekSchedule = ref<WeekSchedule>(EMPTY_SCHEDULE)

  watch(
    () => inputs.snapshot.value,
    async (snap) => {
      if (!snap || snap.completed) {
        weekSchedule.value = EMPTY_SCHEDULE
        return
      }
      const start = new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + Math.max(0, snap.daysRemaining))
      weekSchedule.value = await getWeekSchedule(ymd(start), ymd(end))
    },
    { immediate: true },
  )

  const adds = computed<CandidateAction[]>(() => {
    const snap = inputs.snapshot.value
    if (!snap || snap.completed) return []
    if (snap.platform !== 'yahoo' && snap.platform !== 'espn') return []

    const cats = inputs.catSpecs.value
    const days = snap.daysRemaining
    const fraction = inputs.seasonFraction.value
    const fg = inputs.fgStatsByKey.value
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
    if (flippableCatIds.length === 0) return []

    const candidates: MoveCandidate[] = [
      ...addGenerator(inputs.freeAgents.value, cats, days, fraction, fg),
      ...streamGenerator(inputs.freeAgents.value, weekSchedule.value.startsByPitcher, cats, fraction, fg),
    ]

    // Each candidate netted against the weakest same-side droppable (recurring).
    const moves = buildMoves(
      candidates,
      inputs.roster.value,
      flippableCatIds,
      cats,
      ctx,
      (p) => projectRemainingWeek(p.stats, null, cats, days, fraction),
      'longTerm',
    )

    // A pitcher with a probable start is generated as BOTH an add and a stream, so the
    // same player can surface twice. Keep one row per player — the higher-lift version,
    // preferring the schedule-aware stream on a tie.
    const byPlayer = new Map<string, CandidateAction>()
    for (const mv of moves) {
      const prev = byPlayer.get(mv.player.key)
      const better = !prev || mv.winProbLift > prev.winProbLift || (mv.winProbLift === prev.winProbLift && mv.kind === 'stream' && prev.kind !== 'stream')
      if (better) byPlayer.set(mv.player.key, mv)
    }

    // The win-prob model saturates: over one week any decent start flips ERA/WHIP
    // decisively, so every same-category arm ties on lift. Break ties by projected
    // quality in the flipped cats (direction-aware) so the BEST arm leads — otherwise
    // the hero is arbitrary (a 4.56 ERA arm above a 3.90 one).
    const faByKey = new Map(inputs.freeAgents.value.map((f) => [f.playerKey, f]))
    const lowerByStat = new Map(cats.map((c) => [c.statId, c.lowerIsBetter]))
    const quality = (a: CandidateAction): number => {
      const fa = faByKey.get(a.player.key)
      if (!fa) return 0
      const eff = toEffectiveStats(fa.stats, fg[a.player.key] ?? null, cats, fraction)
      let q = 0
      for (const statId of a.categories) {
        const v = eff[statId]
        if (v === undefined || !Number.isFinite(v)) continue
        q += lowerByStat.get(statId) ? -v : v
      }
      return q
    }
    return [...byPlayer.values()].sort((a, b) => b.winProbLift - a.winProbLift || quality(b) - quality(a))
  })

  return { adds }
}
