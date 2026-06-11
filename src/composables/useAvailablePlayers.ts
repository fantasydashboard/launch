import { ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { normalizeFreeAgent } from '@/players/fromYahoo'
import type { AvailablePlayer } from '@/players/types'

export function useAvailablePlayers() {
  const players = ref<AvailablePlayer[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  async function load(count = 150) {
    const leagueStore = useLeagueStore()
    // Resolve leagueKey the same way MyTeamView.vue resolves it when calling
    // loadSeasonData(id): use activeLeagueId directly, matching
    // useFullSeasonCategoryData's load(leagueKey: string) contract.
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const requestedId = leagueKey
    loading.value = true
    try {
      const { yahooService } = await import('@/services/yahoo')
      // The free-agent fetch intermittently returns empty (Yahoo rate-limiting);
      // an empty pool starves the Your Move recommendations. Retry a few times and
      // never overwrite an already-loaded pool with an empty result.
      let raw: any[] = []
      for (let attempt = 0; attempt < 3; attempt++) {
        raw = (await yahooService.getTopFreeAgents(String(leagueKey), count)) || []
        // Bail out if the active league changed while fetching (stale-league guard).
        if (leagueStore.activeLeagueId !== requestedId) return
        if (raw.length > 0) break
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
      }
      if (raw.length === 0) {
        if (players.value.length === 0) console.warn('[useAvailablePlayers] free-agent pool empty after retries')
        return
      }
      players.value = raw.map(normalizeFreeAgent)
      loaded.value = true
    } catch (e) {
      console.error('[useAvailablePlayers] load failed', e)
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return { players, loading, loaded, load }
}
