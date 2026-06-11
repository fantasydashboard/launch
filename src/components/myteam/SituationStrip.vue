<script setup lang="ts">
defineProps<{
  teamName: string
  record: string // e.g. "57-64-11"
  rank: number // 0 = unknown / not yet wired
  numTeams: number
  verdict: string | null // terse one-line read, or null to omit
  // Top available add for the biggest hole — the "do this next" step for the
  // weakness the verdict names. Null when no meaningful add exists. isRatio rows
  // show the value as a level, not a "+" delta (a "+" reads as worse on a rate).
  holeAdd?: { name: string; statValue: number; label: string; isRatio: boolean } | null
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

    <router-link
      v-if="holeAdd"
      to="/players"
      class="inline-flex items-baseline gap-1.5 text-sm text-dark-textSecondary transition-colors hover:text-dark-text"
    >
      <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Fix it</span>
      <span>Add <span class="font-semibold text-dark-text">{{ holeAdd.name }}</span></span>
      <span class="font-mono tabular-nums text-primary">{{ holeAdd.isRatio ? '' : '+' }}{{ holeAdd.statValue }} {{ holeAdd.label }}</span>
    </router-link>
  </header>
</template>
