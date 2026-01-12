<template>
  <!-- Yahoo/ESPN Baseball H2H Categories -->
  <YahooCategoryPowerRankings v-if="isBaseballCategories" />
  
  <!-- Yahoo/ESPN Baseball Points -->
  <YahooBaseballPowerRankings v-else-if="isBaseballPoints" />
  
  <!-- Sleeper Football (default) -->
  <SleeperPowerRankings v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()
const authStore = useAuthStore()

// League scoring type
const scoringType = ref<string>('')

// Lazy load components
const YahooCategoryPowerRankings = defineAsyncComponent(() => 
  import('@/views/YahooCategoryPowerRankingsView.vue')
)

const YahooBaseballPowerRankings = defineAsyncComponent(() => 
  import('@/views/YahooBaseballPowerRankingsView.vue')
)

const SleeperPowerRankings = defineAsyncComponent(() => 
  import('@/views/PowerRankingsView.vue')
)

// Check for Yahoo OR ESPN platform (both use same views)
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

const isBaseball = computed(() => 
  isYahooOrEspn.value && sportStore.activeSport === 'baseball'
)

const isPointsLeague = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  // 'headpoint', 'point' = points-based leagues
  return st.includes('point') || st === 'headpoint'
})

const isCategoriesLeague = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  // 'head' = H2H Categories, 'roto' = Rotisserie, 'headcategory' = ESPN H2H Categories
  return st === 'head' || st.includes('category') || st.includes('roto') || st === 'headcategory'
})

const isBaseballCategories = computed(() => 
  isBaseball.value && isCategoriesLeague.value
)

const isBaseballPoints = computed(() => 
  isBaseball.value && isPointsLeague.value && !isCategoriesLeague.value
)

// Load league settings to determine type
async function loadLeagueType() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || !isYahooOrEspn.value) return
  
  // For ESPN, get scoring type from league store (already loaded)
  if (leagueStore.activePlatform === 'espn') {
    const savedLeague = leagueStore.savedLeagues?.find(l => l.league_id === leagueKey)
    scoringType.value = savedLeague?.scoring_type || leagueStore.currentLeague?.scoring_type || 'head'
    console.log('Power Rankings - ESPN scoring type:', scoringType.value)
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
      console.log('Power Rankings - Yahoo scoring type:', scoringType.value)
    }
  } catch (e) {
    console.error('Error loading league type:', e)
  }
}

watch(() => leagueStore.activeLeagueId, () => {
  if (isBaseball.value) {
    loadLeagueType()
  }
}, { immediate: true })

onMounted(() => {
  if (isBaseball.value) {
    loadLeagueType()
  }
})
</script>
