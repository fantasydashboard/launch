<template>
  <!-- H2H Category leagues (any platform, any sport) -->
  <CategoryDraft v-if="isCategoryLeague" />
  
  <!-- Points leagues (any platform, any sport) -->
  <PointsDraft v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

// Lazy load components - these work for ALL platforms
const CategoryDraft = defineAsyncComponent(() => 
  import('@/views/YahooCategoryDraftView.vue')
)

const PointsDraft = defineAsyncComponent(() => 
  import('@/views/YahooBaseballDraftView.vue')
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
  
  // Check yahooLeague
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]?.scoring_type) {
    return league[0].scoring_type
  }
  
  return ''
})

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') return false
  
  const st = (scoringType.value || '').toLowerCase()
  if (st === 'head' || st === 'roto' || st === 'headone' || st === 'headcategory' || st.includes('category') || st === 'h2h_category') {
    return true
  }
  
  return false
})
</script>
