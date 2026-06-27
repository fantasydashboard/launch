<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { getLeagueType } from '@/config/sports'
import WireView from '@/views/WireView.vue'
import PointsWireView from '@/views/PointsWireView.vue'

const leagueStore = useLeagueStore()
const scoringType = computed(() => {
  const live = leagueStore.currentLeague?.scoring_type
  if (live) return live
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return saved?.scoring_type
})
const isPointsLeague = computed(() => getLeagueType(scoringType.value) === 'points')
</script>

<template>
  <PointsWireView v-if="isPointsLeague" />
  <WireView v-else />
</template>
