<template>
  <!-- Loading state while determining scoring type -->
  <div v-if="isLoading" class="flex items-center justify-center py-20">
    <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
  </div>
  
  <!-- Yahoo/ESPN Baseball Categories -->
  <YahooCategoryCompare v-else-if="isCategoryBaseball" :key="'category-' + detectedScoringType" />
  
  <!-- Yahoo/ESPN Baseball Points -->
  <YahooBaseballCompare v-else-if="isPointsBaseball" :key="'points-' + detectedScoringType" />
  
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

// Check for Yahoo or ESPN
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

const isBaseball = computed(() => 
  isYahooOrEspn.value && sportStore.activeSport === 'baseball'
)

// Detect scoring type - check multiple sources including cache
async function detectScoringType() {
  const activeId = leagueStore.activeLeagueId
  console.log('[CompareWrapper] Detecting scoring type for activeId:', activeId)
  
  // For ESPN, get from currentLeague or savedLeagues
  if (leagueStore.activePlatform === 'espn') {
    const saved = leagueStore.savedLeagues.find(l => l.league_id === activeId)
    const st = saved?.scoring_type || leagueStore.currentLeague?.scoring_type || 'head'
    console.log('[CompareWrapper] ESPN scoring type:', st)
    return st
  }
  
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
      }
    } catch (e) {
      console.log('[CompareWrapper] Could not get metadata from Yahoo cache:', e)
    }
  }
  
  // Default for Yahoo/ESPN leagues we can't determine
  if (isYahooOrEspn.value) {
    console.log('[CompareWrapper] Could not determine scoring type, defaulting to head (category)')
    return 'head'
  }
  
  return 'sleeper' // For non-Yahoo/ESPN leagues
}

const isCategoryLeague = computed(() => {
  const st = detectedScoringType.value
  if (!st) return false
  // 'head' = H2H Categories, 'roto' = Rotisserie, 'headone' = H2H One-Win, 'headcategory' = ESPN categories
  return st === 'head' || st === 'roto' || st === 'headone' || st === 'headcategory' || st.includes('category')
})

const isCategoryBaseball = computed(() => 
  isBaseball.value && isCategoryLeague.value && detectedScoringType.value !== ''
)

const isPointsBaseball = computed(() => 
  isBaseball.value && !isCategoryLeague.value && detectedScoringType.value !== '' && detectedScoringType.value !== 'sleeper'
)

// Initialize scoring type detection
onMounted(async () => {
  if (isBaseball.value) {
    detectedScoringType.value = await detectScoringType()
    console.log('[CompareWrapper] Final scoring type:', detectedScoringType.value)
  } else {
    detectedScoringType.value = 'sleeper'
  }
  isLoading.value = false
})

// Re-detect if league changes
watch(() => leagueStore.activeLeagueId, async (newId, oldId) => {
  if (newId !== oldId && isBaseball.value) {
    isLoading.value = true
    detectedScoringType.value = await detectScoringType()
    isLoading.value = false
  }
})

// Debug logging
watch([isBaseball, isCategoryLeague, detectedScoringType], ([baseball, category, st]) => {
  console.log('CompareWrapper routing:', {
    isBaseball: baseball,
    isCategoryLeague: category,
    scoringType: st,
    isLoading: isLoading.value,
    platform: leagueStore.activePlatform
  })
}, { immediate: true })
</script>
