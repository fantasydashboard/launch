<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { getLeagueType } from '@/config/sports'
import WireView from '@/views/WireView.vue'
import PointsWireView from '@/views/PointsWireView.vue'
import HockeyWireView from '@/views/HockeyWireView.vue'

const leagueStore = useLeagueStore()
const scoringType = computed(() => {
  const live = leagueStore.currentLeague?.scoring_type
  if (live) return live
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return saved?.scoring_type
})
const isPointsLeague = computed(() => getLeagueType(scoringType.value) === 'points')
/*
 * Hockey category leagues get their own Wire.
 *
 * They used to fall through to WireView, which runs an engine that imports the MLB schedule,
 * FanGraphs matchers and a starting-pitcher stream board. It was not that hockey had no Wire;
 * it was that hockey was silently running baseball's, matching skaters against projections
 * that have never heard of them. A points hockey league was already handled — PointsWireView
 * branches on sport — which is what made the gap easy to miss.
 */
const isHockeyCategory = computed(
  () => leagueStore.activeSport === 'hockey' && !isPointsLeague.value,
)
</script>

<template>
  <HockeyWireView v-if="isHockeyCategory" />
  <PointsWireView v-else-if="isPointsLeague" />
  <WireView v-else />
</template>
