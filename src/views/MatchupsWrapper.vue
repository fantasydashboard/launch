<template>
  <!-- Roto leagues: Category Race page -->
  <RotoRace v-if="isRotoLeague" />

  <!-- H2H Category leagues -->
  <CategoryMatchups v-else-if="isCategoryLeague" />

  <!-- Points leagues -->
  <PointsMatchups v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useLeagueStore } from '@/stores/league'

const leagueStore = useLeagueStore()

const RotoRace = defineAsyncComponent(() =>
  import('@/views/RotoRaceView.vue')
)

const CategoryMatchups = defineAsyncComponent(() =>
  import('@/views/CategoryMatchupsView.vue')
)

const PointsMatchups = defineAsyncComponent(() =>
  import('@/views/PointsMatchupsView.vue')
)

// Detect roto league
const isRotoLeague = computed(() => {
  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    if (league[0].scoring_type?.toLowerCase().includes('roto')) return true
  }
  if (leagueStore.currentLeague?.scoring_type?.toLowerCase().includes('roto')) return true
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  if (saved?.scoring_type?.toLowerCase().includes('roto')) return true
  return false
})

// Detect H2H category league
const isCategoryLeague = computed(() => {
  if (isRotoLeague.value) return false

  const league = leagueStore.yahooLeague
  if (Array.isArray(league) && league[0]) {
    const st = (league[0].scoring_type || '').toLowerCase()
    if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category') return true
  }
  const st = (leagueStore.currentLeague?.scoring_type || '').toLowerCase()
  if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category') return true
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  if (saved) {
    const savedSt = (saved.scoring_type || '').toLowerCase()
    if (savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category') return true
  }
  return false
})
</script>
