<template>
  <!-- Yahoo Baseball Points -->
  <YahooBaseballMatchups v-if="isYahooBaseball" />
  
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
const YahooBaseballMatchups = defineAsyncComponent(() => 
  import('@/views/YahooBaseballMatchupsView.vue')
)

const SleeperMatchups = defineAsyncComponent(() => 
  import('@/views/MatchupsView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)
</script>
