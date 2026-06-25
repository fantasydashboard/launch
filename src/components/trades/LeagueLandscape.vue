<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LandscapeView } from '@/composables/useLeagueLandscape'

// League heatmap: every team's rank in each category / at each position, your column pinned.
// Scan for complementary trade partners — green where they're strong, red where they're weak.
const props = defineProps<{ view: LandscapeView }>()

const mode = ref<'cat' | 'pos'>('cat')
const rows = computed(() => (mode.value === 'cat' ? props.view.categoryRows : props.view.positionRows))

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
// Rank -> heatmap tone. Top third = strength (green), bottom third = weakness (red), else faint.
// Intensity scales within the band so 1st reads stronger than 4th.
const cellStyle = (rank: number | null) => {
  const n = props.view.numTeams
  if (rank == null || n < 2) return { cls: 'text-dark-textMuted/40', bg: 'transparent' }
  const frac = (n - rank) / (n - 1) // 1 = best, 0 = worst
  if (frac >= 0.66) return { cls: 'text-primary', bg: `rgba(163, 230, 53, ${0.10 + frac * 0.22})` }
  if (frac <= 0.34) return { cls: 'text-[#f26d6d]', bg: `rgba(242, 109, 109, ${0.10 + (1 - frac) * 0.22})` }
  return { cls: 'text-dark-textSecondary', bg: 'rgba(120,130,150,0.06)' }
}
</script>

<template>
  <section class="space-y-2">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Trade Landscape</h2>
      <!-- Category / Position toggle -->
      <div class="flex overflow-hidden rounded-md border border-dark-border text-[10px] font-mono uppercase tracking-wider">
        <button
          class="px-2.5 py-1 transition-colors"
          :class="mode === 'cat' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
          @click="mode = 'cat'"
        >Categories</button>
        <button
          class="border-l border-dark-border px-2.5 py-1 transition-colors"
          :class="mode === 'pos' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
          @click="mode = 'pos'"
        >Positions</button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-xl border border-dark-border bg-dark-card">
      <table class="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr>
            <th class="sticky left-0 z-10 bg-dark-card px-3 py-2 text-left font-medium text-dark-textMuted"></th>
            <th
              v-for="t in view.teams"
              :key="t.key"
              :title="t.name"
              class="px-1.5 py-2 text-center font-semibold"
              :class="t.isMe ? 'text-primary' : 'text-dark-textMuted'"
            >{{ t.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key" class="border-t border-dark-border/40">
            <th class="sticky left-0 z-10 bg-dark-card px-3 py-1.5 text-left font-semibold text-dark-textSecondary">{{ row.label }}</th>
            <td
              v-for="(rank, i) in row.ranks"
              :key="i"
              class="px-1.5 py-1.5 text-center tabular-nums"
              :class="[cellStyle(rank).cls, view.teams[i].isMe ? 'ring-1 ring-inset ring-primary/40' : '']"
              :style="{ backgroundColor: cellStyle(rank).bg }"
              :title="rank ? `${view.teams[i].name} · ${ord(rank)} of ${view.numTeams}` : `${view.teams[i].name} · none`"
            >{{ rank ?? '·' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="font-mono text-[9px] text-dark-textMuted">
      each cell = that team's rank ({{ mode === 'cat' ? 'all-season category standing' : "best body's value at the position" }}) ·
      <span class="text-primary">green</span> = strong, <span class="text-[#f26d6d]">red</span> = weak · your column highlighted ·
      a partner who's green where you're red (and red where you're green) is your best trade fit
    </p>
  </section>
</template>
