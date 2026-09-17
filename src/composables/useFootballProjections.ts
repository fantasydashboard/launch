import { ref, watch, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats } from '@/services/footballProjections'
import { getSeasonLines } from '@/services/playerUsage'
import { buildRosPoints } from '@/football/rosBlend'
import {
  buildFootballProjectionsByKey,
  type ProjPlayer,
  type FootballProjection,
  type SleeperPlayerMeta,
} from '@/football/buildFootballProjections'

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
      for (const [id, pl] of Object.entries(playersMap)) {
        sleeperMeta[id] = { name: (pl as any)?.full_name || '', position: (pl as any)?.position || '' }
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
      const ros = buildRosPoints({
        seasonProjection: Object.fromEntries(Object.entries(built).map(([k, v]) => [k, v.points])),
        lines,
        currentWeek,
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
