<template>
  <!-- H2H Category leagues (any platform, any sport) -->
  <CategoryHistory v-if="isCategoryLeague" />
  
  <!-- Points leagues (any platform, any sport) -->
  <PointsHistory v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

// Lazy load components - these work for ALL platforms
const CategoryHistory = defineAsyncComponent(() => 
  import('@/views/YahooCategoryHistoryView.vue')
)

const PointsHistory = defineAsyncComponent(() => 
  import('@/views/YahooBaseballHistoryView.vue')
)

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') return false
  
  // Check yahooLeague
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const st = (league[0].scoring_type || '').toLowerCase()
    if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category') {
      return true
    }
  }
  
  // Check currentLeague
  const st = (leagueStore.currentLeague?.scoring_type || '').toLowerCase()
  if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category') {
    return true
  }
  
  // Check saved leagues
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  if (saved) {
    const savedSt = (saved.scoring_type || '').toLowerCase()
    if (savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category') {
      return true
    }
  }
  
  return false
})
</script>
