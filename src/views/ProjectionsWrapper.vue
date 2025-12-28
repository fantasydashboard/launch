<template>
  <!-- Yahoo Baseball H2H Categories -->
  <YahooCategoryProjections v-if="isYahooBaseballCategories" />
  
  <!-- Yahoo Baseball Points -->
  <YahooBaseballProjections v-else-if="isYahooBaseball" />
  
  <!-- Sleeper Football (default) -->
  <SleeperProjections v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Track scoring type
const scoringType = ref<string>('')

// Lazy load components
const YahooCategoryProjections = defineAsyncComponent(() => 
  import('@/views/YahooCategoryProjectionsView.vue')
)

const YahooBaseballProjections = defineAsyncComponent(() => 
  import('@/views/YahooBaseballProjectionsView.vue')
)

const SleeperProjections = defineAsyncComponent(() => 
  import('@/views/ProjectionsView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)

const isYahooBaseballCategories = computed(() => {
  if (!isYahooBaseball.value) return false
  // Check if it's a category league (not points)
  const st = scoringType.value.toLowerCase()
  return st.includes('head') && !st.includes('point')
})

// Load scoring type on mount
onMounted(async () => {
  if (isYahooBaseball.value && leagueStore.activeLeagueId) {
    try {
      const settings = await yahooService.getLeagueScoringSettings(leagueStore.activeLeagueId)
      if (settings) {
        scoringType.value = settings.scoring_type || ''
      }
    } catch (e) {
      console.error('Error loading scoring type:', e)
    }
  }
})
</script>
