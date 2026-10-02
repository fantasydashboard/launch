<script setup lang="ts">
defineProps<{ byNight: { date: string; plays: boolean; open: number }[]; usable: number; games: number }>()
</script>
<template>
  <span class="inline-flex items-center gap-1.5" :title="`${usable.toFixed(1)} usable of ${games} games this week`">
    <span v-for="n in byNight" :key="n.date" class="inline-block h-2.5 w-2.5 rounded-full border"
      :class="!n.plays ? 'border-dark-border'
        : n.open >= 0.5 ? 'border-[#4FC3F7] bg-[#4FC3F7]'
        : n.open > 0 ? 'border-[#4FC3F7]/50 bg-[#4FC3F7]/40'
        : 'border-dashed border-dark-textMuted'"
      :title="n.plays && n.open === 0 ? 'He plays, but your lineup is full that night' : undefined" />
    <span class="ml-1 font-mono text-[10px] text-dark-textMuted">{{ usable.toFixed(1) }} of {{ games }}</span>
  </span>
</template>
