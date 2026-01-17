<template>
  <!-- Sleeper leagues (football only for now) -->
  <SleeperMatchups v-if="isSleeper" />
  
  <!-- Yahoo/ESPN H2H Category leagues (any sport) -->
  <CategoryMatchups v-else-if="isCategoryLeague" />
  
  <!-- Yahoo/ESPN Points leagues (any sport) -->
  <PointsMatchups v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

// Lazy load components
const SleeperMatchups = defineAsyncComponent(() => 
  import('@/views/MatchupsView.vue')
)

const CategoryMatchups = defineAsyncComponent(() => 
  import('@/views/YahooCategoryMatchupsView.vue')
)

const PointsMatchups = defineAsyncComponent(() => 
  import('@/views/YahooBaseballMatchupsView.vue')
)

// Check if it's a Sleeper league
const isSleeper = computed(() => 
  leagueStore.activePlatform === 'sleeper'
)

// Detect if it's a category league based on scoring_type
const isCategoryLeague = computed(() => {
  // Check yahooLeague first (works for both Yahoo and ESPN)
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
