<template>
  <!-- Sleeper leagues -->
  <SleeperProjections v-if="isSleeper" />
  
  <!-- Yahoo/ESPN H2H Category leagues (any sport) -->
  <CategoryProjections v-else-if="isCategoryLeague" />
  
  <!-- Yahoo/ESPN Points leagues (any sport) -->
  <PointsProjections v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()

// Track scoring type
const scoringType = ref<string>('')

// Lazy load components
const SleeperProjections = defineAsyncComponent(() => 
  import('@/views/ProjectionsView.vue')
)

const CategoryProjections = defineAsyncComponent(() => 
  import('@/views/YahooCategoryProjectionsView.vue')
)

const PointsProjections = defineAsyncComponent(() => 
  import('@/views/YahooBaseballProjectionsView.vue')
)

// Check if it's a Sleeper league
const isSleeper = computed(() => 
  leagueStore.activePlatform === 'sleeper'
)

// Check for Yahoo or ESPN
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  if (isSleeper.value) return false
  
  const st = scoringType.value.toLowerCase()
  if ((st.includes('head') && !st.includes('point')) || st.includes('category') || st === 'headcategory' || st === 'h2h_category') {
    return true
  }
  
  // Also check yahooLeague
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const yahooSt = (league[0].scoring_type || '').toLowerCase()
    if (yahooSt === 'head' || yahooSt.includes('category') || yahooSt === 'headcategory') {
      return true
    }
  }
  
  // Check saved leagues
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  if (saved) {
    const savedSt = (saved.scoring_type || '').toLowerCase()
    if (savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category') {
      return true
    }
  }
  
  return false
})

// Load scoring type
async function loadScoringType() {
  if (isSleeper.value || !leagueStore.activeLeagueId) return
  
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
