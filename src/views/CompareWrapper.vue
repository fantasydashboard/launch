<template>
  <!-- Loading state while determining scoring type -->
  <div v-if="isLoading" class="flex items-center justify-center py-20">
    <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
  </div>
  
  <!-- Yahoo Baseball Categories -->
  <YahooCategoryCompare v-else-if="isYahooCategoryBaseball" :key="'category-' + detectedScoringType" />
  
  <!-- Yahoo Baseball Points -->
  <YahooBaseballCompare v-else-if="isYahooPointsBaseball" :key="'points-' + detectedScoringType" />
  
  <!-- Sleeper Football (default) -->
  <SleeperCompare v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watch, ref, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()
const isLoading = ref(true)
const detectedScoringType = ref('')

// Lazy load components
const YahooCategoryCompare = defineAsyncComponent(() => 
  import('@/views/YahooCategoryCompareView.vue')
)

const YahooBaseballCompare = defineAsyncComponent(() => 
  import('@/views/YahooBaseballCompareView.vue')
)

const SleeperCompare = defineAsyncComponent(() => 
  import('@/views/PerformanceComparisonView.vue')
)

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)

// Detect scoring type - check multiple sources including cache
async function detectScoringType() {
  const activeId = leagueStore.activeLeagueId
  console.log('[CompareWrapper] Detecting scoring type for activeId:', activeId)
  
  // Try currentLeague first
  if (leagueStore.currentLeague?.scoring_type) {
    console.log('[CompareWrapper] Found scoring_type in currentLeague:', leagueStore.currentLeague.scoring_type)
    return leagueStore.currentLeague.scoring_type
  }
  
  if (activeId) {
    // Check saved leagues
    const saved = leagueStore.savedLeagues.find(l => 
      l.yahoo_league_key === activeId || l.league_id === activeId
    )
    if (saved?.scoring_type) {
      console.log('[CompareWrapper] Found scoring_type in savedLeagues:', saved.scoring_type)
      return saved.scoring_type
    }
    
    // Check yahooLeagues (fetched from API)
    const yahooLeagues = leagueStore.yahooLeagues || []
    const yahooLeague = yahooLeagues.find((l: any) => l.league_key === activeId)
    if (yahooLeague?.scoring_type) {
      console.log('[CompareWrapper] Found scoring_type in yahooLeagues:', yahooLeague.scoring_type)
      return yahooLeague.scoring_type
    }
    
    // CRITICAL: Check Yahoo service cache directly
    try {
      console.log('[CompareWrapper] Checking Yahoo cache for league metadata...')
      const metadata = await yahooService.getLeagueMetadata(activeId)
      console.log('[CompareWrapper] Metadata result:', metadata)
      if (metadata?.scoring_type) {
        console.log('[CompareWrapper] Found scoring_type in Yahoo metadata:', metadata.scoring_type)
        return metadata.scoring_type
      } else {
        // scoring_type missing from cache - this means old cache format
        // Force a fresh fetch by calling the API directly
        console.log('[CompareWrapper] scoring_type missing from cached metadata, forcing fresh fetch...')
        // Clear cache and refetch (the service will refetch on next call)
        // We need to wait for data to propagate - try yahooLeagues after a short delay
        await new Promise(resolve => setTimeout(resolve, 500))
        const refreshedLeagues = leagueStore.yahooLeagues || []
        const refreshedLeague = refreshedLeagues.find((l: any) => l.league_key === activeId)
        if (refreshedLeague?.scoring_type) {
          console.log('[CompareWrapper] Found scoring_type after refresh:', refreshedLeague.scoring_type)
          return refreshedLeague.scoring_type
        }
      }
    } catch (e) {
      console.log('[CompareWrapper] Could not get metadata from Yahoo cache:', e)
    }
  }
  
  // Default for Yahoo leagues we can't determine
  if (leagueStore.activePlatform === 'yahoo') {
    console.log('[CompareWrapper] Could not determine scoring type, defaulting to head (category)')
    return 'head'
  }
  
  return 'sleeper' // For non-Yahoo leagues
}

const isCategoryLeague = computed(() => {
  const st = detectedScoringType.value
  if (!st) return false // Unknown, don't render yet
  // 'head' = H2H Categories, 'roto' = Rotisserie, 'headone' = H2H One-Win - all category-based
  // 'headpoint' and 'point' are points-based
  return st === 'head' || st === 'roto' || st === 'headone'
})

const isYahooCategoryBaseball = computed(() => 
  isYahooBaseball.value && isCategoryLeague.value && detectedScoringType.value !== ''
)

const isYahooPointsBaseball = computed(() => 
  isYahooBaseball.value && !isCategoryLeague.value && detectedScoringType.value !== '' && detectedScoringType.value !== 'sleeper'
)

// Initialize scoring type detection
onMounted(async () => {
  if (isYahooBaseball.value) {
    detectedScoringType.value = await detectScoringType()
    console.log('[CompareWrapper] Final scoring type:', detectedScoringType.value)
  } else {
    detectedScoringType.value = 'sleeper'
  }
  isLoading.value = false
})

// Re-detect if league changes
watch(() => leagueStore.activeLeagueId, async (newId, oldId) => {
  if (newId !== oldId && isYahooBaseball.value) {
    isLoading.value = true
    detectedScoringType.value = await detectScoringType()
    isLoading.value = false
  }
})

// Debug logging
watch([isYahooBaseball, isCategoryLeague, detectedScoringType], ([yahoo, category, st]) => {
  console.log('CompareWrapper routing:', {
    isYahooBaseball: yahoo,
    isCategoryLeague: category,
    scoringType: st,
    isLoading: isLoading.value,
    willLoadCategoryView: yahoo && category && st !== '',
    willLoadPointsView: yahoo && !category && st !== '' && st !== 'sleeper'
  })
}, { immediate: true })
</script>
