<script setup lang="ts">
import { computed } from 'vue'
import type { CandidateAction } from '@/myteam/yourMove/types'

const props = defineProps<{
  moves: CandidateAction[]
  loading?: boolean
  record?: { wins: number; losses: number } | null
  labelByStatId?: Record<string, string>
}>()

const hero = computed(() => props.moves[0] ?? null)
const rest = computed(() => props.moves.slice(1))

const VERB: Record<CandidateAction['kind'], string> = { add: 'Add', stream: 'Stream', startSit: 'Start' }
const verb = (m: CandidateAction) => VERB[m.kind]
// What you give up: a roster drop for add/stream, a lineup sit for start/sit.
const counterVerb = (m: CandidateAction) => (m.kind === 'startSit' ? 'sit' : 'drop')
const lift = (m: CandidateAction) => Math.max(0, Math.round(m.winProbLift))
const label = (statId: string) => props.labelByStatId?.[statId] ?? statId
</script>

<template>
  <section>
    <h2 class="mb-2 text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">
      Your Move
    </h2>

    <!-- Loading: a single skeleton, never blank -->
    <div
      v-if="loading && moves.length === 0"
      class="h-16 animate-pulse rounded-xl border border-dark-border bg-dark-card"
    ></div>

    <!-- Empty: calm, never a forced bad action -->
    <div
      v-else-if="moves.length === 0"
      class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-sm text-dark-textMuted"
    >
      No swing moves right now.<template v-if="record"> You're {{ record.wins }}-{{ record.losses }} this week.</template>
    </div>

    <template v-else>
      <!-- Hero: the single highest-leverage move -->
      <router-link
        v-if="hero"
        to="/players"
        class="block rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:border-primary"
      >
        <div class="flex items-baseline justify-between gap-3">
          <span class="min-w-0 truncate font-display text-lg font-bold text-dark-text">
            {{ verb(hero) }} {{ hero.player.name }}
            <span v-if="hero.counterparty" class="font-sans text-xs font-normal text-dark-textMuted"
              >· {{ counterVerb(hero) }} {{ hero.counterparty.name }}</span
            >
          </span>
          <span class="shrink-0 font-mono text-lg font-bold text-primary tabular-nums">+{{ lift(hero) }}%</span>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-1">
          <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">flips</span>
          <span
            v-for="c in hero.categories"
            :key="c"
            class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary"
            >{{ label(c) }}</span
          >
        </div>
        <p v-if="hero.rationale" class="mt-1 font-mono text-[11px] text-dark-textMuted">{{ hero.rationale }}</p>
      </router-link>

      <!-- Next-best: de-emphasized -->
      <router-link
        v-for="m in rest"
        :key="m.player.key"
        to="/players"
        class="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-dark-border bg-dark-card px-4 py-2 transition-colors hover:border-primary/40"
      >
        <span class="min-w-0 truncate text-sm text-dark-textSecondary">
          <span class="font-semibold text-dark-text">{{ verb(m) }} {{ m.player.name }}</span>
          <span v-if="m.counterparty" class="text-xs text-dark-textMuted">· {{ counterVerb(m) }} {{ m.counterparty.name }}</span>
          <span class="ml-2 font-mono text-[11px] text-dark-textMuted">{{ m.categories.map(label).join(' ') }}</span>
        </span>
        <span class="shrink-0 font-mono text-sm text-primary tabular-nums">+{{ lift(m) }}%</span>
      </router-link>
    </template>
  </section>
</template>
