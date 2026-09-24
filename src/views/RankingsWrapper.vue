<!--
  Which rankings page a reader gets, by sport.

  The same split PlayersWrapper already makes, and for the same reason: the two boards are not
  one board with different labels. Football ranks on value over replacement because a points
  league HAS an exchange rate; hockey ranks on standard deviations across the scored columns
  because a category league does not. Branching inside one template would mean a page arguing
  with itself about what its own numbers mean.

  Everything that is not football or hockey falls to the football board for now, which is
  honest about where the work has reached rather than pretending at four sports.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import RankingsView from '@/views/RankingsView.vue'
import HockeyRankingsView from '@/views/HockeyRankingsView.vue'

const leagueStore = useLeagueStore()
const isHockey = computed(() => leagueStore.activeSport === 'hockey')
</script>

<template>
  <HockeyRankingsView v-if="isHockey" />
  <RankingsView v-else />
</template>
