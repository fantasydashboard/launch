<template>
  <!-- Sleeper leagues -->
  <SleeperDraft v-if="isSleeper" />
  
  <!-- Yahoo/ESPN H2H Category leagues (any sport) -->
  <CategoryDraft v-else-if="isCategoryLeague" />
  
  <!-- Yahoo/ESPN Points leagues (any sport) -->
  <PointsDraft v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

// Lazy load components
const SleeperDraft = defineAsyncComponent(() => 
  import('@/views/DraftView.vue')
)

const CategoryDraft = defineAsyncComponent(() => 
  import('@/views/YahooCategoryDraftView.vue')
)

const PointsDraft = defineAsyncComponent(() => 
  import('@/views/YahooBaseballDraftView.vue')
)

// Check if it's a Sleeper league
const isSleeper = computed(() => 
  leagueStore.activePlatform === 'sleeper'
)

// Check for Yahoo or ESPN
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

// Get scoring type from multiple sources
const scoringType = computed(() => {
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
  
  if (isYahooOrEspn.value) {
    return 'head'
  }
  
  return ''
})

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  if (isSleeper.value) return false
  
  const st = (scoringType.value || '').toLowerCase()
  if (st === 'head' || st === 'roto' || st === 'headone' || st === 'headcategory' || st.includes('category') || st === 'h2h_category') {
    return true
  }
  
  // Also check yahooLeague
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const yahooSt = (league[0].scoring_type || '').toLowerCase()
    if (yahooSt === 'head' || yahooSt.includes('category') || yahooSt === 'headcategory') {
      return true
    }
  }
  
  return false
})
</script>
