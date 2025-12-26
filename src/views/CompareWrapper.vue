<template>
  <!-- Yahoo Baseball Points -->
  <YahooBaseballCompare v-if="isYahooBaseball" />
  
  <!-- Sleeper Football (default) -->
  <SleeperCompare v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooBaseballCompare = defineAsyncComponent(() => 
  import('@/views/YahooBaseballCompareView.vue')
)

const SleeperCompare = defineAsyncComponent(() => 
  import('@/views/PerformanceComparisonView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)
</script>
