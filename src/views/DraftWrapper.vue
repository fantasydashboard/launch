<template>
  <YahooCategoryDraftView v-if="isYahooCategoryBaseball" />
  <YahooBaseballDraftView v-else-if="isYahooPointsBaseball" />
  <DraftView v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooCategoryDraftView = defineAsyncComponent(() => 
  import('@/views/YahooCategoryDraftView.vue')
)

const YahooBaseballDraftView = defineAsyncComponent(() => 
  import('@/views/YahooBaseballDraftView.vue')
)

const DraftView = defineAsyncComponent(() => 
  import('@/views/DraftView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)

// Check if it's a category league (head or headpoint) vs points league (point or headpoint)
// Yahoo scoring types: 'head' = H2H Categories, 'roto' = Rotisserie, 'point' = Points, 'headpoint' = H2H Points
const isCategoryLeague = computed(() => {
  const scoringType = leagueStore.currentLeague?.scoring_type || 
                      leagueStore.savedLeagues.find(l => l.yahoo_league_key === leagueStore.activeLeagueId)?.scoring_type ||
                      ''
  // 'head' = H2H Categories, 'roto' = Rotisserie - both are category-based
  return scoringType === 'head' || scoringType === 'roto' || scoringType === 'headone'
})

const isYahooCategoryBaseball = computed(() => 
  isYahooBaseball.value && isCategoryLeague.value
)

const isYahooPointsBaseball = computed(() => 
  isYahooBaseball.value && !isCategoryLeague.value
)
</script>
