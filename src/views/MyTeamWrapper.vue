<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { isYahooCategoryLeague } from '@/composables/useIsCategoryLeague'
import { getLeagueType } from '@/config/sports'
import MyTeamView from '@/views/MyTeamView.vue'
import PointsMyTeamView from '@/views/PointsMyTeamView.vue'

const leagueStore = useLeagueStore()

// The active league's scoring_type, from the live signal first then the saved row.
const scoringType = computed(() => {
  const live = leagueStore.currentLeague?.scoring_type
  if (live) return live
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return saved?.scoring_type
})

const isCategoryLeague = computed(() => isYahooCategoryLeague(scoringType.value))
// Points = H2H points / total points. Roto is out of scope (a different model).
const isPointsLeague = computed(() => getLeagueType(scoringType.value) === 'points')
</script>

<template>
  <MyTeamView v-if="isCategoryLeague" />
  <PointsMyTeamView v-else-if="isPointsLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    My Team is available for category and points leagues in this preview. (Roto coming soon.)
  </div>
</template>
