<script setup lang="ts">
// Buy-low (a player you GET, due to rebound) / sell-high (a player you GIVE, due to cool off).
// "xStats" appears when expected stats (Statcast luck) confirm the call.
defineProps<{ dir: 'buy' | 'sell'; confirmed?: boolean }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider"
    :class="dir === 'buy' ? 'text-primary' : 'text-[#F2B33A]'"
  >
    {{ dir === 'buy' ? '▲ buy-low' : '▼ sell-high' }}
    <span v-if="confirmed" class="font-normal text-dark-textMuted" title="expected stats agree">· xStats</span>
  </span>
</template>
