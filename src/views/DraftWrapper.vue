<template>
  <YahooCategoryDraftView v-if="isYahooCategoryBaseball" />
  <YahooBaseballDraftView v-else-if="isYahooPointsBaseball" />
  <DraftView v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
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

// Check if it's a category league
// Yahoo scoring types: 'head' = H2H Categories, 'roto' = Rotisserie, 'point' = Points, 'headpoint' = H2H Points
const scoringType = computed(() => {
  // Try multiple places to find scoring_type
  // 1. Check currentLeague (may have it if loaded from Yahoo API)
  if (leagueStore.currentLeague?.scoring_type) {
    return leagueStore.currentLeague.scoring_type
  }
  
  // 2. Check savedLeagues by yahoo_league_key
  const activeId = leagueStore.activeLeagueId
  if (activeId) {
    const saved = leagueStore.savedLeagues.find(l => 
      l.yahoo_league_key === activeId || l.league_id === activeId
    )
    if (saved?.scoring_type) {
      return saved.scoring_type
    }
  }
  
  // 3. For Yahoo leagues, default to 'head' (most common) if we can't determine
  // This ensures category view loads for Yahoo baseball unless we know it's points
  if (leagueStore.activePlatform === 'yahoo') {
    return 'head' // Default to category for Yahoo
  }
  
  return ''
})

const isCategoryLeague = computed(() => {
  const st = scoringType.value
  // 'head' = H2H Categories, 'roto' = Rotisserie, 'headone' = H2H One-Win - all category-based
  // 'point' = Rotisserie Points, 'headpoint' = H2H Points - points-based
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
  console.log('DraftWrapper routing:', {
    isYahooBaseball: yahoo,
    isCategoryLeague: category,
    scoringType: st,
    activeLeagueId: leagueStore.activeLeagueId,
    activePlatform: leagueStore.activePlatform,
    currentLeagueScoringType: leagueStore.currentLeague?.scoring_type,
    willLoadCategoryView: yahoo && category
  })
}, { immediate: true })
</script>
