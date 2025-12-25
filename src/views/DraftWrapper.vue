<template>
  <YahooBaseballDraftView v-if="isYahooBaseball" />
  <DraftView v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooBaseballDraftView = defineAsyncComponent(() => 
  import('@/views/YahooBaseballDraftView.vue')
)

const DraftView = defineAsyncComponent(() => 
  import('@/views/DraftView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)
</script>
