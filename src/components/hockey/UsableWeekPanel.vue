<script setup lang="ts">
import { computed } from 'vue'
import type { Night, OpenMap } from '@/hockey/usableGames'
const props = defineProps<{
  nights: Night[]
  open: OpenMap
  picks: { key: string; name: string; position: string; usable: number; value: number; valueLabel: string; dropName?: string; gain?: string }[]
}>()
const day = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()
const cells = computed(() => props.nights.map((n) => {
  const o = props.open[n.date] ?? { C: 0, LW: 0, RW: 0, D: 0 }
  const f = o.C > 0 || o.LW > 0 || o.RW > 0
  return { date: n.date, label: day(n.date), f, d: o.D > 0 }
}))
const anyOpen = computed(() => cells.value.some((c) => c.f || c.d))
</script>
<template>
  <section class="mb-4 rounded-xl border border-dark-border bg-dark-card p-4">
    <p class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Your open spots this week</p>
    <div class="mb-3 grid grid-cols-7 gap-1">
      <div v-for="c in cells" :key="c.date" class="rounded-md py-1.5 text-center font-mono text-[10px]"
        :class="c.f || c.d ? 'bg-[#C6FF3A]/10 text-[#C6FF3A]' : 'bg-dark-bg text-dark-textMuted'">
        {{ c.label }}<br>{{ [c.f ? 'F' : '', c.d ? 'D' : ''].filter(Boolean).join('·') || '—' }}
      </div>
    </div>
    <p v-if="!anyOpen" class="text-sm text-dark-textMuted">Your lineup is full every night this week, so a pickup only helps as a swap.</p>
    <template v-else>
      <p v-if="!picks.length" class="text-sm text-dark-textMuted">No free agent has a usable game this week.</p>
      <p v-else class="mb-1 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Best pickups for those nights</p>
      <div v-for="p in picks" :key="p.key" class="flex items-center gap-2 border-b border-dark-border/50 py-1.5 text-sm">
        <span class="font-medium">{{ p.name }}</span>
        <span class="font-mono text-[10px] text-dark-textMuted">{{ p.position }}</span>
        <span v-if="p.dropName" class="font-mono text-[10px] text-dark-textMuted">· drop {{ p.dropName }}<template v-if="p.gain"> → {{ p.gain }}</template></span>
        <span class="ml-auto text-right font-mono text-sm text-[#4FC3F7]">{{ p.valueLabel }}<span class="block text-[10px] text-dark-textMuted">{{ p.usable.toFixed(1) }} usable</span></span>
      </div>
    </template>
  </section>
</template>
