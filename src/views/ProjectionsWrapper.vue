<template>
  <!-- Yahoo Baseball Points -->
  <YahooBaseballProjections v-if="isYahooBaseball" />
  
  <!-- Sleeper Football (default) -->
  <SleeperProjections v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooBaseballProjections = defineAsyncComponent(() => 
  import('@/views/YahooBaseballProjectionsView.vue')
)

const SleeperProjections = defineAsyncComponent(() => 
  import('@/views/ProjectionsView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)
</script>
