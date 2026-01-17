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
  import('@/views/CategoryProjectionsView.vue')
)

const PointsProjections = defineAsyncComponent(() => 
  import('@/views/PointsProjectionsView.vue')
)

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  console.log('[ProjectionsWrapper] ===== Checking isCategoryLeague =====')
  console.log('[ProjectionsWrapper] activePlatform:', leagueStore.activePlatform)
  console.log('[ProjectionsWrapper] activeLeagueId:', leagueStore.activeLeagueId)
  console.log('[ProjectionsWrapper] scoringType.value:', scoringType.value)
  
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') {
    console.log('[ProjectionsWrapper] -> Sleeper detected, returning false')
    return false
  }
  
  const st = scoringType.value.toLowerCase()
  if ((st.includes('head') && !st.includes('point')) || st.includes('category') || st === 'headcategory' || st === 'h2h_category') {
    console.log('[ProjectionsWrapper] -> Category league detected via scoringType:', st)
    return true
  }
  
  // Check yahooLeague
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const yahooSt = (league[0].scoring_type || '').toLowerCase()
    console.log('[ProjectionsWrapper] yahooLeague scoring_type:', yahooSt)
    if (yahooSt === 'head' || yahooSt.includes('category') || yahooSt === 'headcategory') {
      console.log('[ProjectionsWrapper] -> Category league detected via yahooLeague')
      return true
    }
  }
  
  // Check saved leagues
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  console.log('[ProjectionsWrapper] savedLeague:', saved ? { id: saved.league_id, scoring_type: saved.scoring_type } : 'NOT FOUND')
  if (saved) {
    const savedSt = (saved.scoring_type || '').toLowerCase()
    if (savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category') {
      console.log('[ProjectionsWrapper] -> Category league detected via savedLeague:', savedSt)
      return true
    }
  }
  
  console.log('[ProjectionsWrapper] -> No category indicators found, returning false')
  return false
})

// Load scoring type
async function loadScoringType() {
  console.log('[ProjectionsWrapper] loadScoringType called')
  console.log('[ProjectionsWrapper] activeLeagueId:', leagueStore.activeLeagueId)
  console.log('[ProjectionsWrapper] activePlatform:', leagueStore.activePlatform)
  
  if (!leagueStore.activeLeagueId) return
  
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') {
    scoringType.value = 'headpoint'
    return
  }
  
  // For ESPN, get from league store
  if (leagueStore.activePlatform === 'espn') {
    const savedLeague = leagueStore.savedLeagues?.find(l => l.league_id === leagueStore.activeLeagueId)
    console.log('[ProjectionsWrapper] ESPN savedLeague:', savedLeague)
    scoringType.value = savedLeague?.scoring_type || leagueStore.currentLeague?.scoring_type || 'head'
    console.log('[ProjectionsWrapper] ESPN scoringType set to:', scoringType.value)
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
onMounted(() => {
  console.log('[ProjectionsWrapper] ===== onMounted =====')
  loadScoringType()
})
</script>
