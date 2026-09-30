<!--
  Today is the daily optimiser. Football does not have days — it has a week, and This Week is
  the same product in that unit: the matchup, the optimal lineup, the closest calls, the board.

  So a football league never renders this page. The nav already hides the tab, but a league
  switch keeps the route, so a manager sitting on Today with a hockey league who picks a
  football one used to land on a daily board announcing that eight of his starters had no game
  TONIGHT — true of the evening, irrelevant to his week, and alarming in red.

  A REDIRECT, NOT A MESSAGE. The first fix put a stub here explaining that football is weekly
  and offering a link. That is a page whose only content is an apology for existing, and it
  made the reader do the work of pressing the button we already knew he needed. He asked for
  Today; This Week is what Today means in football.

  Waits for a league before deciding. `activeSport` DEFAULTS to football before anything is
  loaded, so redirecting on it directly would bounce a hockey manager off his own daily board
  during hydration.
-->
<template>
  <TodayView v-if="!isFootball" />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import TodayView from '@/views/TodayView.vue'

const router = useRouter()
const leagueStore = useLeagueStore()

/* Only once a league is actually resolved — see the note above about the football default. */
const isFootball = computed(
  () => !!leagueStore.activeLeagueId && leagueStore.activeSport === 'football',
)

watch(isFootball, (football) => {
  if (football) router.replace('/this-week')
}, { immediate: true })
</script>
