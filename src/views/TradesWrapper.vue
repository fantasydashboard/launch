<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { isYahooCategoryLeague } from '@/composables/useIsCategoryLeague'
import { getLeagueType } from '@/config/sports'
import TradesView from '@/views/TradesView.vue'
import PointsTradesView from '@/views/PointsTradesView.vue'

const leagueStore = useLeagueStore()

const scoringType = computed(() => {
  const live = leagueStore.currentLeague?.scoring_type
  if (live) return live
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return saved?.scoring_type
})
// Points (H2H/total points) → the points finder. Roto is out of scope.
const isPointsLeague = computed(() => getLeagueType(scoringType.value) === 'points')
const isCategoryLeague = computed(() => {
  if (isPointsLeague.value) return false
  // ESPN category passes through; TradesView detects H2H_CATEGORY via the ESPN composable.
  if (leagueStore.activePlatform === 'espn') return true
  return isYahooCategoryLeague(scoringType.value)
})
</script>

<template>
  <PointsTradesView v-if="isPointsLeague" />
  <TradesView v-else-if="isCategoryLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    Trade targets are available for category and points leagues in this preview. (Roto coming soon.)
  </div>
</template>
