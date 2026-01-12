<template>
  <!-- Yahoo/ESPN Baseball H2H Categories -->
  <YahooCategoryMatchups v-if="isCategoryBaseball" />
  
  <!-- Yahoo/ESPN Baseball Points -->
  <YahooBaseballMatchups v-else-if="isBaseball" />
  
  <!-- Sleeper Football (default) -->
  <SleeperMatchups v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooCategoryMatchups = defineAsyncComponent(() => 
  import('@/views/YahooCategoryMatchupsView.vue')
)

const YahooBaseballMatchups = defineAsyncComponent(() => 
  import('@/views/YahooBaseballMatchupsView.vue')
)

const SleeperMatchups = defineAsyncComponent(() => 
  import('@/views/MatchupsView.vue')
)

// Check for Yahoo or ESPN
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

const isBaseball = computed(() => 
  isYahooOrEspn.value && sportStore.activeSport === 'baseball'
)

// Check if it's a H2H Category league
const isCategoryBaseball = computed(() => {
  if (!isBaseball.value) return false
  
  // Check yahooLeague (works for both Yahoo and ESPN since we map ESPN to this format)
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const st = (league[0].scoring_type || '').toLowerCase()
    return st === 'head' || st.includes('category') || st === 'headcategory'
  }
  
  // Fallback to currentLeague
  const st = (leagueStore.currentLeague?.scoring_type || '').toLowerCase()
  return st === 'head' || st.includes('category') || st === 'headcategory'
})
</script>
