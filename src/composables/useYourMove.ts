import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import type { CandidateAction, MoveCandidate, ScoredContext } from '@/myteam/yourMove/types'
import { addGenerator } from '@/myteam/yourMove/generators/addGenerator'
import { streamGenerator } from '@/myteam/yourMove/generators/streamGenerator'
import { startSitGenerator } from '@/myteam/yourMove/generators/startSitGenerator'
import { dailyCandidates } from '@/myteam/yourMove/dailyCandidates'
import { buildMoves } from '@/myteam/yourMove/buildMoves'
import { rankMoves } from '@/myteam/yourMove/rankMoves'
import { projectGames, projectRemainingWeek } from '@/myteam/yourMove/projectRemainingWeek'
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
 * "Your Move" recommendations in two layers: Today (daily-league plays — stream a
 * starter pitching today, fill an open slot for one game) and longer-term roster
 * upgrades over the rest of the week. Each candidate is a believable swap, netted
 * against the player you'd drop/sit projected over the SAME horizon.
 */
export function useYourMove(inputs: {
  catSpecs: Ref<CatSpec[]>
  freeAgents: Ref<AvailablePlayer[]>
  roster: Ref<RosterSlotPlayer[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  seasonFraction: Ref<number>
}): { moves: ComputedRef<CandidateAction[]> } {
  const weekSchedule = ref<WeekSchedule>(EMPTY_SCHEDULE)
  const todaySchedule = ref<WeekSchedule>(EMPTY_SCHEDULE)

  watch(
    () => inputs.snapshot.value,
    async (snap) => {
      if (!snap || snap.completed) {
        weekSchedule.value = EMPTY_SCHEDULE
        todaySchedule.value = EMPTY_SCHEDULE
        return
      }
      const start = new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + Math.max(0, snap.daysRemaining))
      const todayStr = ymd(start)
      ;[todaySchedule.value, weekSchedule.value] = await Promise.all([
        getWeekSchedule(todayStr, todayStr),
        getWeekSchedule(todayStr, ymd(end)),
      ])
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
    const playsToday = (team: string) => (todaySchedule.value.gamesByTeam[team] ?? 0) > 0

    // Today: a one-day play costs only the counterparty's today (often 0 if off).
    const todayMoves = rankMoves(
      buildMoves(
        dailyCandidates(inputs.freeAgents.value, benched, todaySchedule.value, cats, fraction),
        inputs.roster.value,
        flippableCatIds,
        cats,
        ctx,
        (p) => projectGames(p.stats, null, cats, playsToday(p.team) ? 1 : 0, fraction),
        'today',
      ),
      { maxMoves: 3, liftFloor: 1 },
    )

    // Longer term: a real roster upgrade over the rest of the week.
    const weekCandidates: MoveCandidate[] = [
      ...addGenerator(inputs.freeAgents.value, cats, days, fraction),
      ...streamGenerator(inputs.freeAgents.value, weekSchedule.value.startsByPitcher, cats, fraction),
      ...startSitGenerator(benched, cats, days, fraction),
    ]
    const longTermMoves = rankMoves(
      buildMoves(
        weekCandidates,
        inputs.roster.value,
        flippableCatIds,
        cats,
        ctx,
        (p) => projectRemainingWeek(p.stats, null, cats, days, fraction),
        'longTerm',
      ),
      { maxMoves: 3, liftFloor: 1 },
    )

    // Don't repeat a player across layers (Today wins).
    const seen = new Set(todayMoves.map((m) => m.player.key))
    return [...todayMoves, ...longTermMoves.filter((m) => !seen.has(m.player.key))]
  })

  return { moves }
}
