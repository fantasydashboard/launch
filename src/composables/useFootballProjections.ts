import { ref, watch, type Ref } from 'vue'
import { sleeperService } from '@/services/sleeper'
import { fetchSeasonProjectionStats } from '@/services/footballProjections'
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
      projByKey.value = buildFootballProjectionsByKey(
        inputs.players.value,
        summed,
        sleeperMeta,
        inputs.scoring.value,
      )
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
