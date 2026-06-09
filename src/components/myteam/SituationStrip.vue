<script setup lang="ts">
defineProps<{
  teamName: string
  record: string // e.g. "57-64-11"
  rank: number // 0 = unknown / not yet wired
  numTeams: number
  verdict: string | null // terse one-line read, or null to omit
}>()
</script>

<template>
  <header class="space-y-3">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 class="text-xl sm:text-2xl font-display font-bold text-dark-text">{{ teamName }}</h1>
      <span class="text-sm font-mono tabular-nums text-dark-textSecondary">{{ record }}</span>
    </div>

    <div v-if="rank > 0" class="flex items-baseline gap-2 font-display">
      <span class="text-4xl sm:text-5xl font-bold tabular-nums text-primary leading-none">{{ rank }}</span>
      <span class="text-base font-mono tabular-nums text-dark-textMuted">of {{ numTeams }}</span>
    </div>

    <p v-if="verdict" class="text-sm text-dark-textSecondary">{{ verdict }}</p>
  </header>
</template>
