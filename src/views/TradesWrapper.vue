<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { isYahooCategoryLeague } from '@/composables/useIsCategoryLeague'
import TradesView from '@/views/TradesView.vue'

const leagueStore = useLeagueStore()

const isCategoryLeague = computed(() => {
  // ESPN leagues pass through; TradesView detects H2H_CATEGORY via the ESPN composable.
  if (leagueStore.activePlatform === 'espn') return true
  if (isYahooCategoryLeague(leagueStore.currentLeague?.scoring_type)) return true
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return isYahooCategoryLeague(saved?.scoring_type)
})
</script>

<template>
  <TradesView v-if="isCategoryLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    Trade targets are available for category leagues in this preview.
  </div>
</template>
