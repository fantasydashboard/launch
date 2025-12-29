<template>
  <!-- Yahoo Baseball H2H Categories -->
  <YahooCategoryHistoryView v-if="isYahooCategoryBaseball" />
  
  <!-- Yahoo Baseball Points -->
  <YahooBaseballHistoryView v-else-if="isYahooBaseball" />
  
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

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)

// Check if it's a H2H Category league (scoring_type: 'head')
const isYahooCategoryBaseball = computed(() => {
  if (!isYahooBaseball.value) return false
  
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    return league[0].scoring_type === 'head'
  }
  return false
})
</script>
