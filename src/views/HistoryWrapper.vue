<template>
  <YahooBaseballHistoryView v-if="isYahooBaseball" />
  <HistoryView v-else />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'
import HistoryView from './HistoryView.vue'
import YahooBaseballHistoryView from './YahooBaseballHistoryView.vue'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

const isYahooBaseball = computed(() => {
  const result = leagueStore.activePlatform === 'yahoo' && sportStore.currentSport === 'baseball'
  console.log('HistoryWrapper - isYahooBaseball:', result, 'platform:', leagueStore.activePlatform, 'sport:', sportStore.currentSport)
  return result
})

onMounted(() => {
  console.log('HistoryWrapper mounted - platform:', leagueStore.activePlatform, 'sport:', sportStore.currentSport)
})
</script>
