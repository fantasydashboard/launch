<script setup lang="ts">
import { computed } from 'vue'
// Signed weekly-category-win delta for this trade. Reads like a ticker: +0.4/wk (good),
// even (wash), −0.3/wk (bad). Replaces the old 0–4 "YOU" bars, which were mislabelled and
// mis-calibrated (most real deals are < +0.5/wk, so the bars sat empty).
const props = defineProps<{ delta: number }>()
const rounded = computed(() => Math.round(props.delta * 10) / 10)
const label = computed(() =>
  rounded.value > 0 ? `+${rounded.value.toFixed(1)}/wk`
    : rounded.value < 0 ? `${rounded.value.toFixed(1)}/wk`
      : 'even',
)
const cls = computed(() =>
  rounded.value > 0 ? 'text-primary' : rounded.value < 0 ? 'text-[#ff6b6b]' : 'text-dark-textMuted',
)
</script>

<template>
  <span class="shrink-0 font-mono text-[11px] font-semibold tabular-nums" :class="cls"
    :title="`${rounded > 0 ? '+' : ''}${rounded.toFixed(1)} categories won per week`">{{ label }}</span>
</template>
