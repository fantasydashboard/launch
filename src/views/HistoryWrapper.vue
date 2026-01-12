<template>
  <!-- Yahoo/ESPN Baseball H2H Categories -->
  <YahooCategoryHistoryView v-if="isCategoryBaseball" />
  
  <!-- Yahoo/ESPN Baseball Points -->
  <YahooBaseballHistoryView v-else-if="isBaseball" />
  
  <!-- Sleeper Football (default) -->
  <HistoryView v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooCategoryHistoryView = defineAsyncComponent(() => 
  import('@/views/YahooCategoryHistoryView.vue')
)

const YahooBaseballHistoryView = defineAsyncComponent(() => 
  import('@/views/YahooBaseballHistoryView.vue')
)

const HistoryView = defineAsyncComponent(() => 
  import('@/views/HistoryView.vue')
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
  
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const st = (league[0].scoring_type || '').toLowerCase()
    return st === 'head' || st.includes('category') || st === 'headcategory'
  }
  
  const st = (leagueStore.currentLeague?.scoring_type || '').toLowerCase()
  return st === 'head' || st.includes('category') || st === 'headcategory'
})
</script>
