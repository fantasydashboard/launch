<template>
  <!-- Sleeper leagues -->
  <SleeperPowerRankings v-if="isSleeper" />
  
  <!-- Yahoo/ESPN H2H Category leagues (any sport) -->
  <CategoryPowerRankings v-else-if="isCategoryLeague" />
  
  <!-- Yahoo/ESPN Points leagues (any sport) -->
  <PointsPowerRankings v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// League scoring type
const scoringType = ref<string>('')

// Lazy load components
const SleeperPowerRankings = defineAsyncComponent(() => 
  import('@/views/PowerRankingsView.vue')
)

const CategoryPowerRankings = defineAsyncComponent(() => 
  import('@/views/YahooCategoryPowerRankingsView.vue')
)

const PointsPowerRankings = defineAsyncComponent(() => 
  import('@/views/YahooBaseballPowerRankingsView.vue')
)

// Check if it's a Sleeper league
const isSleeper = computed(() => 
  leagueStore.activePlatform === 'sleeper'
)

// Check for Yahoo OR ESPN platform
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

// Detect if it's a category league
const isCategoryLeague = computed(() => {
  if (isSleeper.value) return false
  
  const st = (scoringType.value || '').toLowerCase()
  if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category' || st.includes('roto')) {
    return true
  }
  
  // Also check yahooLeague and saved leagues
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const yahooSt = (league[0].scoring_type || '').toLowerCase()
    if (yahooSt === 'head' || yahooSt.includes('category') || yahooSt === 'headcategory') {
      return true
    }
  }
  
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  if (saved) {
    const savedSt = (saved.scoring_type || '').toLowerCase()
    if (savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category') {
      return true
    }
  }
  
  return false
})

// Load league settings to determine type
async function loadLeagueType() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || !isYahooOrEspn.value) return
  
  // For ESPN, get scoring type from league store
  if (leagueStore.activePlatform === 'espn') {
    const savedLeague = leagueStore.savedLeagues?.find(l => l.league_id === leagueKey)
    scoringType.value = savedLeague?.scoring_type || leagueStore.currentLeague?.scoring_type || 'head'
    return
  }
  
  // For Yahoo, fetch from service
  try {
    if (authStore.user?.id) {
      await yahooService.initialize(authStore.user.id)
    }
    
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings) {
      scoringType.value = settings.scoring_type || 'head'
    }
  } catch (e) {
    console.error('Error loading league type:', e)
  }
}

watch(() => leagueStore.activeLeagueId, () => {
  if (isYahooOrEspn.value) {
    loadLeagueType()
  }
}, { immediate: true })

onMounted(() => {
  if (isYahooOrEspn.value) {
    loadLeagueType()
  }
})
</script>
