<template>
  <!-- Yahoo Baseball H2H Categories -->
  <YahooCategoryMatchups v-if="isYahooCategoryBaseball" />
  
  <!-- Yahoo Baseball Points -->
  <YahooBaseballMatchups v-else-if="isYahooBaseball" />
  
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
