<script setup lang="ts">
import { computed } from 'vue'

// A player's 0–100 rest-of-season value, shown as a number + a fill meter so the
// direction is unmistakable: a fuller, greener bar = better (never read as a rank).
// Green→grey ramp stays clear of the green=surplus / amber=hole category semantics.
const props = defineProps<{ value: number }>()

const pct = computed(() => Math.max(0, Math.min(100, Math.round(props.value))))
const tier = computed(() => (pct.value >= 67 ? 'high' : pct.value >= 34 ? 'mid' : 'low'))
const numClass = computed(() =>
  tier.value === 'high' ? 'text-primary' : tier.value === 'mid' ? 'text-dark-textSecondary' : 'text-dark-textMuted',
)
const barClass = computed(() =>
  tier.value === 'high' ? 'bg-primary' : tier.value === 'mid' ? 'bg-dark-textSecondary' : 'bg-dark-textMuted/70',
)
</script>

<template>
  <span class="inline-flex items-center gap-1.5" :title="`value ${pct}/100 — higher is better`">
    <span class="font-mono text-[11px] tabular-nums" :class="numClass">{{ pct }}</span>
    <span class="relative h-1 w-7 shrink-0 overflow-hidden rounded-full bg-dark-border">
      <span class="absolute inset-y-0 left-0 rounded-full" :class="barClass" :style="{ width: pct + '%' }" />
    </span>
  </span>
</template>
