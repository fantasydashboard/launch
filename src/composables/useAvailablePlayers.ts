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
      const raw = await yahooService.getTopFreeAgents(String(leagueKey), count)
      // Bail out if the active league changed while fetching (stale-league guard,
      // mirroring the guard in useFullSeasonCategoryData.load).
      if (leagueStore.activeLeagueId !== requestedId) return
      players.value = (raw || []).map(normalizeFreeAgent)
      loaded.value = true
    } catch (e) {
      console.error('[useAvailablePlayers] load failed', e)
    } finally {
      if (leagueStore.activeLeagueId === requestedId) loading.value = false
    }
  }

  return { players, loading, loaded, load }
}
