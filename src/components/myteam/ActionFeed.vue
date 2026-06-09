<script setup lang="ts">
import type { Recommendation } from '@/recommendations/types'

defineProps<{ recommendations: Recommendation[] }>()

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
      class="flex items-center gap-3 px-4 py-3 hover:bg-dark-border/20 transition-colors"
    >
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="severityDot[rec.severity]" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold text-dark-text">{{ rec.headline }}</span>
        <span class="block text-xs text-dark-textMuted">{{ rec.detail }}</span>
      </span>
      <span class="shrink-0 text-dark-textMuted" aria-hidden="true">&rarr;</span>
    </router-link>
  </div>
</template>
