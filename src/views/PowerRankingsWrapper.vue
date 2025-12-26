<template>
  <!-- Yahoo Baseball H2H Categories -->
  <YahooCategoryPowerRankings v-if="isYahooBaseballCategories" />
  
  <!-- Yahoo Baseball Points -->
  <YahooBaseballPowerRankings v-else-if="isYahooBaseballPoints" />
  
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

const isYahooBaseball = computed(() => 
  leagueStore.activePlatform === 'yahoo' && sportStore.activeSport === 'baseball'
)

const isPointsLeague = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  return st.includes('point') || st === 'headpoint'
})

const isYahooBaseballCategories = computed(() => 
  isYahooBaseball.value && !isPointsLeague.value
)

const isYahooBaseballPoints = computed(() => 
  isYahooBaseball.value && isPointsLeague.value
)

// Load league settings to determine type
async function loadLeagueType() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || leagueStore.activePlatform !== 'yahoo') return
  
  try {
    if (authStore.user?.id) {
      await yahooService.initialize(authStore.user.id)
    }
    
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings) {
      scoringType.value = settings.scoring_type || 'head'
      console.log('Power Rankings - League scoring type:', scoringType.value)
    }
  } catch (e) {
    console.error('Error loading league type:', e)
  }
}

watch(() => leagueStore.activeLeagueId, () => {
  if (isYahooBaseball.value) {
    loadLeagueType()
  }
}, { immediate: true })

onMounted(() => {
  if (isYahooBaseball.value) {
    loadLeagueType()
  }
})
</script>
