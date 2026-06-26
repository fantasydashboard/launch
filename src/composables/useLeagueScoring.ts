import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import {
  normalizeYahooWeights,
  normalizeEspnWeights,
  defaultWeights,
  weightsAreUsable,
  type ScoringSource,
} from '@/myteam/pointsScoring'

/**
 * Fetches the active points league's real scoring weights and normalizes them
 * into the unified weight map projectPlayerPoints() consumes.
 *
 * Yahoo settings carry stat names + position_type, so that path is robust.
 * ESPN reports bare statIds (no names) on an inconsistent enumeration, so its
 * normalization is best-effort — when it yields too little, we fall back to the
 * sport defaults and flag `source: 'default'`. The ?ptsaudit panel surfaces the
 * raw vs normalized weights so a real league can be reconciled.
 */
export function useLeagueScoring() {
  const weights = ref<Record<string, number>>(defaultWeights())
  const source = ref<ScoringSource>('default')
  const rawDump = ref<unknown>(null) // raw platform settings, for ?ptsaudit
  const ready = ref(false)
  const loading = ref(false)

  async function load() {
    if (loading.value) return
    loading.value = true
    try {
      const leagueStore = useLeagueStore()
      const platform = leagueStore.activePlatform
      const leagueKey = String(leagueStore.activeLeagueId ?? '')
      if (!leagueKey) return

      if (platform === 'yahoo') {
        const { yahooService } = await import('@/services/yahoo')
        const settings: any = await yahooService.getLeagueSettings(leagueKey)
        rawDump.value = { stat_categories: settings?.stat_categories, stat_modifiers: settings?.stat_modifiers }
        const w = normalizeYahooWeights(settings?.stat_categories, settings?.stat_modifiers)
        if (weightsAreUsable(w)) {
          weights.value = w
          source.value = 'yahoo'
        }
      } else if (platform === 'espn') {
        const parts = leagueKey.split('_') // espn_{sport}_{leagueId}_{season}
        if (parts[0] === 'espn' && parts.length >= 4) {
          const authStore = useAuthStore()
          const platformsStore = usePlatformsStore()
          const { espnService } = await import('@/services/espn')
          if (authStore.user?.id) await espnService.initialize(authStore.user.id)
          const creds = platformsStore.getEspnCredentials()
          if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)
          const scoring: any = await espnService.getScoringSettings(
            parts[1] as any,
            parts[2],
            parseInt(parts[3], 10),
          )
          rawDump.value = { scoringItems: scoring?.scoringItems }
          const w = normalizeEspnWeights(scoring?.scoringItems)
          if (weightsAreUsable(w)) {
            weights.value = w
            source.value = 'espn'
          }
        }
      }
    } catch (e) {
      console.error('[useLeagueScoring] load failed', e)
    } finally {
      ready.value = true
      loading.value = false
    }
  }

  return { weights, source, rawDump, ready, loading, load }
}
