import { computed, onMounted, watch, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { usePowerTrajectory } from './usePowerTrajectory'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildSeasonOutlook, type OutlookTeamMeta, type SeasonOutlook } from '@/myteam/seasonOutlook'
import type { FGProjection } from '@/services/projectionService'

/**
 * Reactive Season Outlook for the active points team. Owns the schedule/playoff-spots trajectory,
 * builds a per-week (schedule-neutral) points model for talent + strength, and hands both to the
 * pure buildSeasonOutlook. Inputs are passed in (the view already loads them) to avoid re-fetching.
 */
export function useSeasonOutlook(inputs: {
  pool: Ref<PointsPoolPlayer[]>
  fgByKey: Ref<Record<string, FGProjection | null>>
  rosterSlots: Ref<Record<string, number>>
  weights: Ref<Record<string, number>>
  myTeamKey: Ref<string>
  teamMeta: Ref<Record<string, OutlookTeamMeta>>
}): { outlook: Ref<SeasonOutlook | null> } {
  const leagueStore = useLeagueStore()
  const trajectory = usePowerTrajectory()

  const load = () => trajectory.load()
  onMounted(load)
  watch(() => leagueStore.activeLeagueId, load)

  const outlook = computed<SeasonOutlook | null>(() => {
    if (!inputs.pool.value.length || !Object.keys(inputs.rosterSlots.value).length) return null
    if (!inputs.myTeamKey.value || !Object.keys(inputs.teamMeta.value).length) return null

    const wl = trajectory.weeksLeft.value
    // usePowerTrajectory only fills playoffSpots for ESPN; mirror LeagueView's fallback so
    // Yahoo points leagues still get a seed/odds gate rather than being stuck at ready=false.
    const leagueSize = Object.keys(inputs.teamMeta.value).length
    const playoffSpots = trajectory.playoffSpots.value || Math.max(2, Math.round(leagueSize / 2))
    const model = buildPointsTeam(
      inputs.pool.value,
      inputs.fgByKey.value,
      inputs.weights.value,
      inputs.myTeamKey.value,
      inputs.rosterSlots.value,
      { basis: wl > 0 ? 'perWeek' : 'total', weeksLeft: wl },
    )

    return buildSeasonOutlook({
      myTeamKey: inputs.myTeamKey.value,
      teamMeta: inputs.teamMeta.value,
      standings: model.standings,
      talentRank: model.myLineupRank,
      schedule: trajectory.remainingSchedule.value,
      weeksLeft: wl,
      playoffSpots,
    })
  })

  return { outlook }
}
