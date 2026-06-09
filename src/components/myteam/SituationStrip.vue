<script setup lang="ts">
defineProps<{
  teamName: string
  record: string // e.g. "57-64-11"
  rank: number // 0 = unknown / not yet wired
  numTeams: number
  winProb: number | null // 0-100 for this week, or null if no live matchup
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-dark-card border border-dark-border px-4 py-3">
    <span class="text-base font-bold text-dark-text">{{ teamName }}</span>
    <span class="text-sm text-dark-textMuted">{{ record }}</span>
    <span v-if="rank > 0" class="text-sm text-dark-textMuted">Rank {{ rank }} / {{ numTeams }}</span>
    <span v-if="winProb !== null" class="text-sm text-dark-textMuted">
      This week: <span class="font-semibold text-dark-text">{{ Math.round(winProb) }}%</span> win prob
    </span>
  </div>
</template>
