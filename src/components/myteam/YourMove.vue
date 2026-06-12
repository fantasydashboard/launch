<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CandidateAction } from '@/myteam/yourMove/types'
import { displayLift } from '@/myteam/yourMove/displayLift'

const props = defineProps<{
  moves: CandidateAction[]
  loading?: boolean
  record?: { wins: number; losses: number } | null
  labelByStatId?: Record<string, string>
  // playerKey -> headshot URL, for the featured (hero) move's face.
  headshotByKey?: Map<string, string>
  cadence?: 'daily' | 'weekly'
}>()

// Player headshots are only shown on the hero card (the compact rows stay terse).
// Fall back to a monogram when the URL is missing or fails to load.
const failedHeadshots = ref(new Set<string>())
const face = (m: CandidateAction): string | null =>
  failedHeadshots.value.has(m.player.key) ? null : props.headshotByKey?.get(m.player.key) ?? null
const emit = defineEmits<{ 'update:cadence': ['daily' | 'weekly'] }>()

const VERB: Record<CandidateAction['kind'], string> = { add: 'Add', stream: 'Stream', startSit: 'Start' }
const verb = (m: CandidateAction) => VERB[m.kind]
// What you give up: a roster drop for add/stream, a lineup sit for start/sit.
const counterVerb = (m: CandidateAction) => (m.kind === 'startSit' ? 'sit' : 'drop')

// Displayed lift is shaped (compressed above a believable single-swap ceiling); see
// displayLift. Shared with the Players page so the same move reads the same number.
const lift = (m: CandidateAction) => displayLift(m.winProbLift)
const label = (statId: string) => props.labelByStatId?.[statId] ?? statId

// Group into the Today layer (daily plays) and the longer-term layer. In a weekly
// league there is no Today layer, and the longer-term layer is the set-your-week list.
// The longer-term label follows its CONTENT: "Worth rostering" only when it holds a
// waiver add/stream; when every move is a start/sit (e.g. ESPN, no add layer), it's
// a lineup action, so call it "Set your lineup" rather than mislabel it as a pickup.
const longTermLabel = computed(() => {
  if (props.cadence === 'weekly') return 'Set your week'
  const longTerm = props.moves.filter((m) => m.layer !== 'today')
  const hasPickup = longTerm.some((m) => m.kind === 'add' || m.kind === 'stream')
  return hasPickup ? 'Worth rostering' : 'Set your lineup'
})
// Today stays first — in a daily league the time-sensitive play is the priority, even
// when a longer-term add has a bigger lift. Moves within a layer arrive lift-desc
// (buildRankedMoves), and EACH group features its own top move (see template), so no
// group ever shows a compact row beating its own boxed hero — the old "lower number in
// the big card" problem — without burying the urgent Today play.
const groups = computed(() =>
  [
    { key: 'today', label: 'Today · daily plays', moves: props.moves.filter((m) => m.layer === 'today') },
    {
      key: 'longTerm',
      label: longTermLabel.value,
      moves: props.moves.filter((m) => m.layer !== 'today'),
    },
  ].filter((g) => g.moves.length > 0),
)
// In a daily league with moves but no Today layer, the daily/weekly toggle would look
// broken (same list either way). Say so plainly: nothing is time-sensitive today, the
// moves below set up the week. Only in daily mode — weekly intentionally has no Today.
const noTodayPlay = computed(
  () =>
    (props.cadence ?? 'daily') === 'daily' &&
    props.moves.length > 0 &&
    !groups.value.some((g) => g.key === 'today'),
)
</script>

<template>
  <section>
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 class="text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">Your Move</h2>
      <!-- Daily leagues get a Today layer; weekly leagues set the lineup for the week. -->
      <div class="flex overflow-hidden rounded-md border border-dark-border font-mono text-[10px] uppercase tracking-wider">
        <button
          v-for="opt in (['daily', 'weekly'] as const)"
          :key="opt"
          type="button"
          class="px-2 py-0.5 transition-colors"
          :class="(cadence ?? 'daily') === opt ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-textSecondary'"
          @click="emit('update:cadence', opt)"
        >
          {{ opt }}
        </button>
      </div>
    </div>
    <!-- The % is each move's added chance to win THIS WEEK's matchup — same metric as
         the band below, so they read as one story. -->
    <p v-if="moves.length" class="-mt-1 mb-2.5 font-mono text-[10px] text-dark-textMuted">
      % = added chance to win this week
    </p>

    <!-- Loading: a single skeleton, never blank -->
    <div
      v-if="loading && moves.length === 0"
      class="h-16 animate-pulse rounded-xl border border-dark-border bg-dark-card"
    ></div>

    <!-- Empty: calm and explicit, never a forced bad action or a blank box -->
    <div v-else-if="moves.length === 0" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
      <p class="text-sm text-dark-text">No swing moves right now.</p>
      <p class="mt-0.5 text-xs text-dark-textMuted">
        Nothing on the wire clearly beats your roster this {{ (cadence ?? 'daily') === 'weekly' ? 'week' : 'day' }} —
        stand pat.<template v-if="record"> You're {{ record.wins }}-{{ record.losses }} this week.</template>
      </p>
    </div>

    <template v-else>
      <!-- Daily league, but nothing to do TODAY — be explicit so the toggle reads true. -->
      <p v-if="noTodayPlay" class="mb-2.5 font-mono text-[11px] text-dark-textMuted">
        No time-sensitive plays today — the moves below set up your week.
      </p>
      <div v-for="(g, gi) in groups" :key="g.key" :class="gi > 0 ? 'mt-4' : ''">
        <p class="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">{{ g.label }}</p>

        <template v-for="(m, mi) in g.moves" :key="m.player.key">
          <!-- Hero: each group features its own top move (first move = highest lift in
               that layer), so Today and Worth-rostering each get a standout card. -->
          <router-link
            v-if="mi === 0"
            to="/players"
            class="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:border-primary"
          >
            <!-- Featured player's face (hero only); monogram fallback. -->
            <img
              v-if="face(m)"
              :src="face(m) || ''"
              :alt="m.player.name"
              @error="failedHeadshots.add(m.player.key)"
              class="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-dark-border object-cover"
            />
            <span
              v-else
              aria-hidden="true"
              class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-border font-display text-sm font-bold text-dark-textSecondary"
              >{{ m.player.name.charAt(0) }}</span
            >
            <div class="min-w-0 flex-1">
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
            </div>
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
