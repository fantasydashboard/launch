<template>
  <YahooBaseballHistoryView v-if="isYahooBaseball" />
  <HistoryView v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'
import HistoryView from './HistoryView.vue'
import YahooBaseballHistoryView from './YahooBaseballHistoryView.vue'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

const isYahooBaseball = computed(() => {
  return leagueStore.activePlatform === 'yahoo' && sportStore.currentSport === 'baseball'
})
</script>
