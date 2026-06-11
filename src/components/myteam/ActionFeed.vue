<script setup lang="ts">
import type { Recommendation } from '@/recommendations/types'

defineProps<{
  recommendations: Recommendation[]
  // Optional: top available add per category, keyed by statId. When a row's
  // statId has an entry, the delta line "Add {name} -> {value} {label}" is
  // rendered beneath the headline (weakness feed only). isRatio rows (ERA/WHIP/
  // OBA/AVG) show the value as a level, not a "+" delta (a "+" reads as worse on
  // a lower-is-better rate).
  addsByStatId?: Record<string, { name: string; statValue: number; label: string; isRatio: boolean }>
  // Optional: gap tier per statId, used to show "winnable" / "punt?" inline tags.
  tierByStatId?: Record<string, 'strong' | 'winnable' | 'safe' | 'lost'>
}>()

const severityDot: Record<Recommendation['severity'], string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-emerald-400',
}
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border divide-y divide-dark-border/60">
    <p v-if="recommendations.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
      No moves flagged this week.
    </p>
    <router-link
      v-for="rec in recommendations"
      :key="rec.id"
      :to="rec.evidenceRoute"
      data-test="rec-row"
      class="flex items-center gap-3 px-4 py-3 hover:bg-dark-border/20 transition-colors focus-visible:outline-none focus-visible:bg-dark-border/30 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="severityDot[rec.severity]" aria-hidden="true" />
      <span class="sr-only">{{ rec.severity }} priority</span>
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-1.5">
          <span
            class="text-sm font-mono tabular-nums font-semibold"
            :class="rec.kind === 'category-strength' ? 'text-primary' : 'text-dark-text'"
          >{{ rec.headline }}</span>
          <span
            v-if="tierByStatId && tierByStatId[rec.statId] === 'winnable'"
            class="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono font-semibold leading-none"
            style="background: rgba(242,179,58,0.15); color: #F2B33A;"
          >winnable</span>
        </span>
        <span class="block text-xs text-dark-textMuted">{{ rec.detail }}</span>
        <span
          v-if="addsByStatId && addsByStatId[rec.statId]"
          class="block text-xs text-dark-textMuted mt-0.5"
        >Add <span class="text-dark-text">{{ addsByStatId[rec.statId].name }}</span>
          <span class="text-dark-textMuted"> &#x2192; </span><span class="font-mono tabular-nums text-primary font-semibold">{{ addsByStatId[rec.statId].isRatio ? '' : '+' }}{{ addsByStatId[rec.statId].statValue }}</span>
          <span class="text-dark-textMuted"> {{ addsByStatId[rec.statId].label }}</span>
        </span>
      </span>
      <span class="shrink-0 text-dark-textMuted" aria-hidden="true">&rarr;</span>
    </router-link>
  </div>
</template>
