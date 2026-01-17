<template>
  <!-- H2H Category leagues (any platform, any sport) -->
  <CategoryProjections v-if="isCategoryLeague" />
  
  <!-- Points leagues (any platform, any sport) -->
  <PointsProjections v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()

// Track scoring type
const scoringType = ref<string>('')

// Lazy load components - these work for ALL platforms
const CategoryProjections = defineAsyncComponent(() => 
  import('@/views/YahooCategoryProjectionsView.vue')
)

const PointsProjections = defineAsyncComponent(() => 
  import('@/views/YahooBaseballProjectionsView.vue')
)

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') return false
  
  const st = scoringType.value.toLowerCase()
  if ((st.includes('head') && !st.includes('point')) || st.includes('category') || st === 'headcategory' || st === 'h2h_category') {
    return true
  }
  
  // Check yahooLeague
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
  if (!leagueStore.activeLeagueId) return
  
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') {
    scoringType.value = 'headpoint'
    return
  }
  
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
