<script setup lang="ts">
import { computed } from 'vue'
import type { CandidateAction } from '@/myteam/yourMove/types'

const props = defineProps<{
  moves: CandidateAction[]
  loading?: boolean
  record?: { wins: number; losses: number } | null
  labelByStatId?: Record<string, string>
}>()

const VERB: Record<CandidateAction['kind'], string> = { add: 'Add', stream: 'Stream', startSit: 'Start' }
const verb = (m: CandidateAction) => VERB[m.kind]
// What you give up: a roster drop for add/stream, a lineup sit for start/sit.
const counterVerb = (m: CandidateAction) => (m.kind === 'startSit' ? 'sit' : 'drop')
const lift = (m: CandidateAction) => Math.max(0, Math.round(m.winProbLift))
const label = (statId: string) => props.labelByStatId?.[statId] ?? statId

// Group into the Today layer (daily plays) and the longer-term roster-upgrade layer.
const groups = computed(() =>
  [
    { key: 'today', label: 'Today · daily plays', moves: props.moves.filter((m) => m.layer === 'today') },
    { key: 'longTerm', label: 'Worth rostering', moves: props.moves.filter((m) => m.layer !== 'today') },
  ].filter((g) => g.moves.length > 0),
)
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
      <div v-for="(g, gi) in groups" :key="g.key" :class="gi > 0 ? 'mt-4' : ''">
        <p class="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">{{ g.label }}</p>

        <template v-for="(m, mi) in g.moves" :key="m.player.key">
          <!-- Hero: the single top move (first move of the first group) -->
          <router-link
            v-if="gi === 0 && mi === 0"
            to="/players"
            class="block rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:border-primary"
          >
            <div class="flex items-baseline justify-between gap-3">
              <span class="min-w-0 truncate font-display text-lg font-bold text-dark-text">
                {{ verb(m) }} {{ m.player.name }}
                <span v-if="m.counterparty" class="font-sans text-xs font-normal text-dark-textMuted"
                  >· {{ counterVerb(m) }} {{ m.counterparty.name }}</span
                >
              </span>
              <span class="shrink-0 font-mono text-lg font-bold text-primary tabular-nums">+{{ lift(m) }}%</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-1">
              <span class="font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">flips</span>
              <span
                v-for="c in m.categories"
                :key="c"
                class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary"
                >{{ label(c) }}</span
              >
            </div>
            <p v-if="m.rationale" class="mt-1 font-mono text-[11px] text-dark-textMuted">{{ m.rationale }}</p>
          </router-link>

          <!-- Next-best: compact row -->
          <router-link
            v-else
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
      </div>
    </template>
  </section>
</template>
