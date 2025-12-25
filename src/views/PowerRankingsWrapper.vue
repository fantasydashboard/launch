<template>
  <!-- Yahoo Baseball Points -->
  <YahooBaseballPowerRankings v-if="isYahooBaseball" />
  
  <!-- Sleeper Football (default) -->
  <SleeperPowerRankings v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooBaseballPowerRankings = defineAsyncComponent(() => 
  import('@/views/YahooBaseballPowerRankingsView.vue')
)

const SleeperPowerRankings = defineAsyncComponent(() => 
  import('@/views/PowerRankingsView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)
</script>
