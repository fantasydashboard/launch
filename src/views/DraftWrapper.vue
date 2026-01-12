<template>
  <YahooCategoryDraftView v-if="isCategoryBaseball" />
  <YahooBaseballDraftView v-else-if="isPointsBaseball" />
  <DraftView v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

const leagueStore = useLeagueStore()
const sportStore = useSportStore()

// Lazy load components
const YahooCategoryDraftView = defineAsyncComponent(() => 
  import('@/views/YahooCategoryDraftView.vue')
)

const YahooBaseballDraftView = defineAsyncComponent(() => 
  import('@/views/YahooBaseballDraftView.vue')
)

const DraftView = defineAsyncComponent(() => 
  import('@/views/DraftView.vue')
)

// Check for Yahoo or ESPN
const isYahooOrEspn = computed(() => 
  leagueStore.activePlatform === 'yahoo' || leagueStore.activePlatform === 'espn'
)

const isBaseball = computed(() => 
  isYahooOrEspn.value && sportStore.activeSport === 'baseball'
)

// Check if it's a category league
const scoringType = computed(() => {
  // Try multiple places to find scoring_type
  // 1. Check currentLeague
  if (leagueStore.currentLeague?.scoring_type) {
    return leagueStore.currentLeague.scoring_type
  }
  
  // 2. Check savedLeagues
  const activeId = leagueStore.activeLeagueId
  if (activeId) {
    const saved = leagueStore.savedLeagues.find(l => 
      l.yahoo_league_key === activeId || l.league_id === activeId
    )
    if (saved?.scoring_type) {
      return saved.scoring_type
    }
  }
  
  // 3. For Yahoo/ESPN leagues, default to 'head' if we can't determine
  if (isYahooOrEspn.value) {
    return 'head'
  }
  
  return ''
})

const isCategoryLeague = computed(() => {
  const st = (scoringType.value || '').toLowerCase()
  // 'head' = H2H Categories, 'roto' = Rotisserie, 'headone' = H2H One-Win, 'headcategory' = ESPN
  return st === 'head' || st === 'roto' || st === 'headone' || st === 'headcategory' || st.includes('category')
})

const isCategoryBaseball = computed(() => 
  isBaseball.value && isCategoryLeague.value
)

const isPointsBaseball = computed(() => 
  isBaseball.value && !isCategoryLeague.value
)

// Debug logging
watch([isBaseball, isCategoryLeague, scoringType], ([baseball, category, st]) => {
  console.log('DraftWrapper routing:', {
    isBaseball: baseball,
    isCategoryLeague: category,
    scoringType: st,
    platform: leagueStore.activePlatform
  })
}, { immediate: true })
</script>
