<template>
  <!-- Redesign History: one view for every platform + scoring type.
       The old PointsHistoryView / CategoryHistoryView stay in the repo (unwired)
       for the later share-card / legacy port. -->
  <HistoryView />
</template>

<script setup lang="ts">
import HistoryView from '@/views/HistoryView.vue'
</script>
