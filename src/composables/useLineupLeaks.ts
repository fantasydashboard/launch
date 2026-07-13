import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { CatSpec } from '@/myteam/value'
import type { RosterPlayer } from '@/composables/useMyRoster'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import { detectLeaks, type LineupLeak } from '@/myteam/lineupLeaks/detectLeaks'
import { needWeightsFromSnapshot, type EligiblePlayer } from '@/myteam/lineupLeaks/positionalValue'
import { sideOf } from '@/myteam/yourMove/helpedCats'
import { getWeekSchedule, lookupStarts, type WeekSchedule } from '@/services/mlbSchedule'

const EMPTY_SCHEDULE: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toEligible(
  p: RosterPlayer,
  roleValueByKey: Map<string, number>,
  helpsByKey: Map<string, Set<string>>,
): EligiblePlayer {
  const eligible =
    p.eligiblePositions && p.eligiblePositions.length
      ? p.eligiblePositions
      : String(p.position).split(/[,/]/).map((s) => s.trim()).filter(Boolean)
  return {
    playerKey: p.playerKey,
    name: p.name,
    team: p.team ?? '',
    eligiblePositions: eligible,
    stats: p.stats ?? {},
    roleValue: roleValueByKey.get(p.playerKey) ?? 0,
    helpsCats: helpsByKey.get(p.playerKey),
    status: p.status,
  }
}

/**
 * "Lineup Leaks": started hitters who are materially weaker, for the team's needs,
 * than a better eligible player sitting on the bench. v1 is bench-only (a free
 * start/sit), so it complements Your Move's adds/streams rather than duplicating
 * them, and it only fires where the lineup carries a real started/bench split
 * (Yahoo today; ESPN once its started flag is plumbed).
 */
export function useLineupLeaks(inputs: {
  rosterPlayers: Ref<RosterPlayer[]>
  catSpecs: Ref<CatSpec[]>
  snapshot: Ref<ThisWeekSnapshot | null>
  // 0-100 roster-badge value per player key — Leaks ranks by this single model so
  // it never contradicts the roster ordering.
  roleValueByKey: Ref<Map<string, number>>
  // Per player, the categories shown green (a strength) on the roster row — the leak
  // cites only these, so it never calls a category a strength here that's red there.
  helpsByKey: Ref<Map<string, Set<string>>>
  // player keys Your Move already surfaces, so we don't double-flag them.
  excludeKeys?: Ref<Set<string>>
  // Daily leagues set lineups each day; weekly leagues lock for the week. In a daily
  // league a bench pitcher is only a real "start them" if they pitch today.
  cadence: Ref<'daily' | 'weekly'>
}): { leaks: ComputedRef<LineupLeak[]> } {
  // Today's probable pitchers, so a daily-league leak never says "start" a SP who
  // isn't pitching today. Memoized in mlbSchedule, so this shares Your Move's fetch.
  const todaySchedule = ref<WeekSchedule>(EMPTY_SCHEDULE)
  watch(
    () => inputs.snapshot.value,
    async (snap) => {
      if (!snap || snap.completed) {
        todaySchedule.value = EMPTY_SCHEDULE
        return
      }
      const todayStr = ymd(new Date())
      todaySchedule.value = await getWeekSchedule(todayStr, todayStr)
    },
    { immediate: true },
  )

  const leaks = computed<LineupLeak[]>(() => {
    const snap = inputs.snapshot.value
    if (!snap) return []
    const rv = inputs.roleValueByKey.value
    const helps = inputs.helpsByKey.value
    const needWeights = needWeightsFromSnapshot(snap.categories)
    const starters = inputs.rosterPlayers.value.filter((p) => p.started === true).map((p) => toEligible(p, rv, helps))
    const bench = inputs.rosterPlayers.value.filter((p) => p.started === false).map((p) => toEligible(p, rv, helps))
    if (starters.length === 0 || bench.length === 0) return []

    // Weekly leagues evaluate the whole week, so season value is the right comparison.
    // Daily leagues set lineups per day: a bench pitcher is only startable today if
    // they have a probable start (hitters accrue any day their team plays).
    const sched = todaySchedule.value
    const isStartableToday = (p: EligiblePlayer): boolean => {
      if (inputs.cadence.value === 'weekly') return true
      if (sideOf(p.eligiblePositions.join('/')) !== 'pit') return true
      return lookupStarts(sched, p.name).length > 0
    }

    return detectLeaks(starters, bench, [], inputs.catSpecs.value, needWeights, {
      excludeKeys: inputs.excludeKeys?.value,
      isStartableToday,
    })
  })
  return { leaks }
}
