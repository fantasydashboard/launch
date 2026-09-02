<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { isYahooCategoryLeague } from '@/composables/useIsCategoryLeague'
import { getLeagueType } from '@/config/sports'
import MatchupBattlePlanView from '@/views/MatchupBattlePlanView.vue'
import PointsMatchupView from '@/views/PointsMatchupView.vue'

const leagueStore = useLeagueStore()

const scoringType = computed(() => {
  const live = leagueStore.currentLeague?.scoring_type
  if (live) return live
  const saved = leagueStore.savedLeagues.find((l) => l.league_id === leagueStore.activeLeagueId)
  return saved?.scoring_type
})

/* Football's matchup now lives inside This Week, so the tab is gone — but the route is
   still linkable (bookmarks, old deep links, the Season Outlook card). Send those to the
   page that actually holds the answer instead of leaving a stranded duplicate. */
const router = useRouter()
watchEffect(() => {
  if (leagueStore.activeSport === 'football') router.replace('/this-week')
})

const isCategoryLeague = computed(() => isYahooCategoryLeague(scoringType.value))
const isPointsLeague = computed(() => getLeagueType(scoringType.value) === 'points')
</script>

<template>
  <MatchupBattlePlanView v-if="isCategoryLeague" />
  <PointsMatchupView v-else-if="isPointsLeague" />
  <div v-else class="mx-auto max-w-4xl px-4 py-10 text-center text-dark-textMuted">
    Matchup is available for category and points leagues in this preview. (Roto coming soon.)
  </div>
</template>
