<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import CategoryMatchupsView from '@/views/CategoryMatchupsView.vue'

const leagueStore = useLeagueStore()

const isCategoryLeague = computed(() => {
  const st = (leagueStore.currentLeague?.scoring_type || '').toLowerCase()
  if (st === 'head' || st.includes('category') || st === 'headcategory' || st === 'h2h_category') return true
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  const savedSt = (saved?.scoring_type || '').toLowerCase()
  return savedSt === 'head' || savedSt.includes('category') || savedSt === 'headcategory' || savedSt === 'h2h_category'
})
</script>

<template>
  <CategoryMatchupsView v-if="isCategoryLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    Matchup is available for category leagues in this preview.
  </div>
</template>
