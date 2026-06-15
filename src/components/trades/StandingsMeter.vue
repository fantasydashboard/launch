<script setup lang="ts">
import { computed } from 'vue'
// Standings impact meter: how many weekly categories this swap gains you. ~+2.0 cats/week = full.
const props = defineProps<{ delta: number }>()
const bands = computed(() => Math.max(0, Math.min(4, Math.round((props.delta / 2.0) * 4))))
</script>

<template>
  <span class="inline-flex items-center gap-1" :title="`+${props.delta.toFixed(1)} categories per week`">
    <span class="font-mono text-[10px] text-dark-textMuted">YOU</span>
    <span class="inline-flex gap-0.5">
      <i v-for="n in 4" :key="n" class="h-1.5 w-2 rounded-[1px]"
        :class="n <= bands ? 'bg-primary' : 'bg-dark-border'" />
    </span>
  </span>
</template>
