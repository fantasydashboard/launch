import { ref, watch, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats, fetchWeekProjectionStats } from '@/services/footballProjections'
import { getSeasonLines } from '@/services/playerUsage'
import { buildRosPoints } from '@/football/rosBlend'
import {
  buildFootballProjectionsByKey,
  resolveSleeperIds,
  type ProjPlayer,
  type FootballProjection,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'
import { byeWeekByPlayer } from '@/football/footballBye'
import { byeWeeks } from '@/football/scheduleDifficulty'
import { getSeasonSchedule, REGULAR_SEASON_WEEKS } from '@/services/nflSchedule'

/**
 * The football fgByKey analog. Given the active league's players, its scoring settings,
 * and the season, produces Record<playerKey, { stats, points }> from Sleeper NFL
 * full-season projections. `enabled` gates it to football leagues.
 */
export function useFootballProjections(inputs: {
  players: Ref<ProjPlayer[]>
  scoring: Ref<Record<string, number>>
  season: Ref<string>
  enabled: Ref<boolean>
}) {
  const projByKey = ref<Record<string, FootballProjection>>({})
  const loading = ref(false)

  async function load() {
    if (!inputs.enabled.value || inputs.players.value.length === 0) {
      projByKey.value = {}
      return
    }
    loading.value = true
    try {
      const state = await sleeperService.getNflState()
      const season = inputs.season.value || state.season
      const [summed, playersMap] = await Promise.all([
        fetchSeasonProjectionStats(season),
        sleeperService.getPlayers(),
      ])
      const sleeperMeta: Record<string, SleeperPlayerMeta> = {}
      const teamById: Record<string, string> = {}
      for (const [id, pl] of Object.entries(playersMap)) {
        sleeperMeta[id] = { name: (pl as any)?.full_name || '', position: (pl as any)?.position || '' }
        teamById[id] = ((pl as any)?.team || '').toUpperCase()
      }
      const built = buildFootballProjectionsByKey(
        inputs.players.value,
        summed,
        sleeperMeta,
        inputs.scoring.value,
      )

      /*
       * Update the forecast with the season so far, here rather than in each consumer.
       *
       * useFootballVor blends its own copy, and leaving this one raw would put `vorRos` and
       * `valueByKey.total` on different scales AND different beliefs — the trade engine would
       * rank candidates by an updated number and then solve lineups with a stale full-season
       * one, which is precisely the "choosing players by your numbers and scoring the result
       * with ours" failure the trades page warns about.
       *
       * getSeasonLines is memoised for half a day, so the second caller costs nothing.
       */
      const currentWeek = Number(state.week) || 1
      let lines: Awaited<ReturnType<typeof getSeasonLines>> = []
      try { lines = await getSeasonLines(season, currentWeek) } catch { /* prior alone */ }

      /*
       * The bye, so a rest-of-season total counts the games he PLAYS rather than the weeks that
       * pass. Two players of equal quality are not equally valuable when one still owes you a
       * week off — which is a trade question as much as a ranking one. An unreadable schedule
       * leaves the map empty and the blend unchanged.
       */
      let byeWeekByKey: Record<string, number | null> = {}
      try {
        const idByKey = resolveSleeperIds(inputs.players.value, sleeperMeta)
        const proTeamByKey = Object.fromEntries(
          Object.entries(idByKey).map(([key, id]) => [key, teamById[id] ?? '']),
        )
        const schedule = await getSeasonSchedule(Number(season))
        byeWeekByKey = byeWeekByPlayer(byeWeeks(schedule, REGULAR_SEASON_WEEKS), proTeamByKey)
      } catch { /* no schedule, no adjustment */ }

      /*
       * A second opinion that updates. Everything feeding the blend above descends from a
       * preseason forecast frozen in August, so the only thing that could move a player was his
       * own box scores. Sleeper's projection for the UPCOMING week already reflects the depth
       * chart, the injury and the role, and rosBlend averages its rate in. A failed fetch leaves
       * the map empty, which changes nothing.
       */
      let forwardRateByKey: Record<string, number> = {}
      try {
        const wkStats = await fetchWeekProjectionStats(season, currentWeek)
        const wkProj = buildFootballProjectionsByKey(
          inputs.players.value, wkStats, sleeperMeta, inputs.scoring.value,
        )
        for (const [k, v] of Object.entries(wkProj)) forwardRateByKey[k] = v.points
      } catch { /* no forward week, no second opinion */ }

      const ros = buildRosPoints({
        seasonProjection: Object.fromEntries(Object.entries(built).map(([k, v]) => [k, v.points])),
        lines,
        currentWeek,
        byeWeekByKey,
        forwardRateByKey,
      })
      for (const [k, v] of Object.entries(built)) {
        const r = ros[k]
        if (r) v.points = r.pointsRos
      }
      projByKey.value = built
    } catch (e) {
      console.error('[useFootballProjections] load failed', e)
      projByKey.value = {}
    } finally {
      loading.value = false
    }
  }

  watch([inputs.enabled, inputs.players, inputs.season], load, { immediate: true })

  return { projByKey, loading, load }
}
