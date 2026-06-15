<script setup lang="ts">
import { computed } from 'vue'
import { fitBand } from '@/trades/fitScore'

// Two-sided trade FIT, shown as a pair of coarse 4-segment bars: how well the deal fits YOU
// (green) and THEM (amber). Coarse on purpose — fit is a judgment from projections, not a
// measurement, so we band it rather than print a false-precision number. A fuller "Them" bar
// means they're more likely to accept; a full "You" / low "Them" is a lopsided steal in your favor.
const props = defineProps<{ you: number; them: number }>()

const SEGMENTS = 4
const youBand = computed(() => fitBand(props.you)) // 0..4
const themBand = computed(() => fitBand(props.them))
const label = (b: number): string => (b >= 4 ? 'strong' : b >= 3 ? 'good' : b >= 2 ? 'fair' : 'slight')
</script>

<template>
  <span class="inline-flex items-center gap-3" :title="`fit — you: ${label(youBand)}, them: ${label(themBand)}`">
    <span class="inline-flex items-center gap-1">
      <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">you</span>
      <span class="flex gap-0.5">
        <span v-for="i in SEGMENTS" :key="i" class="h-1.5 w-2.5 rounded-[1px]"
          :class="i <= youBand ? 'bg-primary' : 'bg-dark-border'" />
      </span>
    </span>
    <span class="inline-flex items-center gap-1">
      <span class="font-mono text-[9px] uppercase tracking-wider text-dark-textMuted/70">them</span>
      <span class="flex gap-0.5">
        <span v-for="i in SEGMENTS" :key="i" class="h-1.5 w-2.5 rounded-[1px]"
          :class="i <= themBand ? 'bg-[#F2B33A]' : 'bg-dark-border'" />
      </span>
    </span>
  </span>
</template>
