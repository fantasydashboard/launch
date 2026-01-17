<template>
  <!-- H2H Category leagues (any platform, any sport) -->
  <CategoryMatchups v-if="isCategoryLeague" />
  
  <!-- Points leagues (any platform, any sport) -->
  <PointsMatchups v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

// Lazy load components - these work for ALL platforms (Sleeper, Yahoo, ESPN)
const CategoryMatchups = defineAsyncComponent(() => 
  import('@/views/YahooCategoryMatchupsView.vue')
)

const PointsMatchups = defineAsyncComponent(() => 
  import('@/views/YahooBaseballMatchupsView.vue')
)

// Detect if it's a category league based on scoring_type
const isCategoryLeague = computed(() => {
  // Check yahooLeague (works for Yahoo, ESPN, and Sleeper after transformation)
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
