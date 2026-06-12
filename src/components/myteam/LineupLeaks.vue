<script setup lang="ts">
import { computed } from 'vue'
import type { LineupLeak } from '@/myteam/lineupLeaks/detectLeaks'

const props = defineProps<{
  leaks: LineupLeak[]
  labelByStatId?: Record<string, string>
}>()

const MAX = 3
const shown = computed(() => props.leaks.slice(0, MAX))
const label = (statId: string) => props.labelByStatId?.[statId] ?? statId
const verb = (leak: LineupLeak) => (leak.better.source === 'bench' ? 'Start' : 'Add')
</script>

<template>
  <!-- Supplementary callout: only renders when there's a real positional leak. -->
  <section v-if="shown.length">
    <h2 class="text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">
      Lineup Leaks
    </h2>
    <p class="mb-2 mt-0.5 font-mono text-[10px] text-dark-textMuted">
      A stronger player is on your bench than in your lineup — start them.
    </p>
    <router-link
      v-for="leak in shown"
      :key="leak.starter.key"
      to="/players"
      class="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-dark-border bg-dark-card px-4 py-2 first:mt-0 transition-colors hover:border-[#F2B33A]/50"
    >
      <span class="min-w-0 truncate text-sm text-dark-textSecondary">
        <span class="font-mono text-[10px] uppercase tracking-wider text-[#F2B33A]">weak {{ leak.position }}</span>
        <span class="ml-2 text-dark-text">
          {{ verb(leak) }} <span class="font-semibold">{{ leak.better.name }}</span> over {{ leak.starter.name }}
        </span>
      </span>
      <span v-if="leak.categories.length" class="shrink-0 font-mono text-[11px] text-dark-textMuted">
        {{ leak.categories.map(label).join(' ') }}
      </span>
    </router-link>
  </section>
</template>
