<template>
  <!-- Yahoo/ESPN Baseball H2H Categories -->
  <YahooCategoryProjections v-if="isBaseballCategories" />
  
  <!-- Yahoo/ESPN Baseball Points -->
  <YahooBaseballProjections v-else-if="isBaseball" />
  
  <!-- Sleeper Football (default) -->
  <SleeperProjections v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, onMounted, watch } from 'vue'
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

// Check for Yahoo or ESPN
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

const isBaseball = computed(() => 
  isYahooOrEspn.value && sportStore.activeSport === 'baseball'
)

const isBaseballCategories = computed(() => {
  if (!isBaseball.value) return false
  const st = scoringType.value.toLowerCase()
  return st.includes('head') && !st.includes('point') || st.includes('category') || st === 'headcategory'
})

// Load scoring type
async function loadScoringType() {
  if (!isBaseball.value || !leagueStore.activeLeagueId) return
  
  // For ESPN, get from league store
  if (leagueStore.activePlatform === 'espn') {
    const savedLeague = leagueStore.savedLeagues?.find(l => l.league_id === leagueStore.activeLeagueId)
    scoringType.value = savedLeague?.scoring_type || leagueStore.currentLeague?.scoring_type || 'head'
    return
  }
  
  // For Yahoo
  try {
    const settings = await yahooService.getLeagueScoringSettings(leagueStore.activeLeagueId)
    if (settings) {
      scoringType.value = settings.scoring_type || ''
    }
  } catch (e) {
    console.error('Error loading scoring type:', e)
  }
}

watch(() => leagueStore.activeLeagueId, loadScoringType, { immediate: true })
onMounted(loadScoringType)
</script>
