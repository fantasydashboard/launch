<template>
  <!-- Yahoo Baseball Categories -->
  <YahooCategoryCompare v-if="isYahooCategoryBaseball" />
  
  <!-- Yahoo Baseball Points -->
  <YahooBaseballCompare v-else-if="isYahooPointsBaseball" />
  
  <!-- Sleeper Football (default) -->
  <SleeperCompare v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooCategoryCompare = defineAsyncComponent(() => 
  import('@/views/YahooCategoryCompareView.vue')
)

const YahooBaseballCompare = defineAsyncComponent(() => 
  import('@/views/YahooBaseballCompareView.vue')
)

const SleeperCompare = defineAsyncComponent(() => 
  import('@/views/PerformanceComparisonView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)

// Check if it's a category league
// Yahoo scoring types: 'head' = H2H Categories, 'roto' = Rotisserie, 'point' = Points, 'headpoint' = H2H Points
const scoringType = computed(() => {
  // Try multiple places to find scoring_type
  if (leagueStore.currentLeague?.scoring_type) {
    return leagueStore.currentLeague.scoring_type
  }
  
  const activeId = leagueStore.activeLeagueId
  if (activeId) {
    const saved = leagueStore.savedLeagues.find(l => 
      l.yahoo_league_key === activeId || l.league_id === activeId
    )
    if (saved?.scoring_type) {
      return saved.scoring_type
    }
  }
  
  // Default to 'head' (category) for Yahoo if we can't determine
  if (leagueStore.activePlatform === 'yahoo') {
    return 'head'
  }
  
  return ''
})

const isCategoryLeague = computed(() => {
  const st = scoringType.value
  // 'head' = H2H Categories, 'roto' = Rotisserie, 'headone' = H2H One-Win - all category-based
  return st === 'head' || st === 'roto' || st === 'headone'
})

const isYahooCategoryBaseball = computed(() => 
  isYahooBaseball.value && isCategoryLeague.value
)

const isYahooPointsBaseball = computed(() => 
  isYahooBaseball.value && !isCategoryLeague.value
)

// Debug logging
watch([isYahooBaseball, isCategoryLeague, scoringType], ([yahoo, category, st]) => {
  console.log('CompareWrapper routing:', {
    isYahooBaseball: yahoo,
    isCategoryLeague: category,
    scoringType: st,
    willLoadCategoryView: yahoo && category,
    willLoadPointsView: yahoo && !category
  })
}, { immediate: true })
</script>
