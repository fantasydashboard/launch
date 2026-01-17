<template>
  <!-- Loading state while determining scoring type -->
  <div v-if="isLoading" class="flex items-center justify-center py-20">
    <LoadingSpinner size="xl" />
  </div>
  
  <!-- H2H Category leagues (any platform, any sport) -->
  <CategoryCompare v-else-if="isCategoryLeague" :key="'category-' + detectedScoringType" />
  
  <!-- Points leagues (any platform, any sport) -->
  <PointsCompare v-else :key="'points-' + detectedScoringType" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watch, ref, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const isLoading = ref(true)
const detectedScoringType = ref('')

// Lazy load components - these work for ALL platforms
const CategoryCompare = defineAsyncComponent(() => 
  import('@/views/YahooCategoryCompareView.vue')
)

const PointsCompare = defineAsyncComponent(() => 
  import('@/views/YahooBaseballCompareView.vue')
)

// Detect scoring type - check multiple sources
async function detectScoringType() {
  const activeId = leagueStore.activeLeagueId
  
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') {
    return 'headpoint'
  }
  
  // For ESPN, get from currentLeague or savedLeagues
  if (leagueStore.activePlatform === 'espn') {
    const saved = leagueStore.savedLeagues.find(l => l.league_id === activeId)
    return saved?.scoring_type || leagueStore.currentLeague?.scoring_type || 'head'
  }
  
  // Try currentLeague first
  if (leagueStore.currentLeague?.scoring_type) {
    return leagueStore.currentLeague.scoring_type
  }
  
  if (activeId) {
    // Check saved leagues
    const saved = leagueStore.savedLeagues.find(l => 
      l.yahoo_league_key === activeId || l.league_id === activeId
    )
    if (saved?.scoring_type) {
      return saved.scoring_type
    }
    
    // Check yahooLeagues
    const yahooLeagues = leagueStore.yahooLeagues || []
    const yahooLeague = yahooLeagues.find((l: any) => l.league_key === activeId)
    if (yahooLeague?.scoring_type) {
      return yahooLeague.scoring_type
    }
    
    // Check Yahoo service cache
    try {
      const metadata = await yahooService.getLeagueMetadata(activeId)
      if (metadata?.scoring_type) {
        return metadata.scoring_type
      }
    } catch (e) {
      console.log('[CompareWrapper] Could not get metadata from Yahoo cache')
    }
  }
  
  // Default for Yahoo/ESPN leagues
  if (leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn') {
    return 'head'
  }
  
  return 'headpoint'
}

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  // Sleeper is always points
  if (leagueStore.activePlatform === 'sleeper') return false
  
  const st = detectedScoringType.value
  if (!st) return false
  return st === 'head' || st === 'roto' || st === 'headone' || st === 'headcategory' || st.includes('category') || st === 'h2h_category'
})

// Initialize scoring type detection
onMounted(async () => {
  detectedScoringType.value = await detectScoringType()
  isLoading.value = false
})

// Re-detect if league changes
watch(() => leagueStore.activeLeagueId, async (newId, oldId) => {
  if (newId !== oldId) {
    isLoading.value = true
    detectedScoringType.value = await detectScoringType()
    isLoading.value = false
  }
})
</script>
