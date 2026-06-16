<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { isYahooCategoryLeague } from '@/composables/useIsCategoryLeague'
import MatchupBattlePlanView from '@/views/MatchupBattlePlanView.vue'

const leagueStore = useLeagueStore()

const isCategoryLeague = computed(() => {
  if (isYahooCategoryLeague(leagueStore.currentLeague?.scoring_type)) return true
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return isYahooCategoryLeague(saved?.scoring_type)
})
</script>

<template>
  <MatchupBattlePlanView v-if="isCategoryLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    Matchup is available for category leagues in this preview.
  </div>
</template>
