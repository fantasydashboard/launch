<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CategoryGap } from '@/myteam/types'
import { rankLabel } from '@/recommendations/ordinal'
import { isAccumulatorCat } from '@/myteam/contestedTiers'
import CategoryRow from './CategoryRow.vue'

interface CatAdd {
  name: string
  statValue: number
  label: string
  isRatio: boolean
}

const props = defineProps<{
  gaps: CategoryGap[]
  categories: { statId: string; label: string }[]
  // Top available add per category we'd want to improve (non-strong tiers). Rendered
  // as a "do this next" line on weak rows — the merged-in "Where you're losing" action.
  addsByStatId?: Record<string, CatAdd>
  // Roster positions dragging each category (your weakest contributors there) — the
  // positional CAUSE of a category hole. Shown on battleground rows.
  draggersByStatId?: Record<string, string[]>
}>()

interface ProfileRow {
  statId: string
  label: string
  rank: number
  numTeams: number
  tier: CategoryGap['tier']
  fillPct: number // standing as a bar: 1st = full, last = empty (more = better)
  gapNote: string
  add: CatAdd | null
  volume: boolean // accumulator cat (AB/G/IP/BF…) — won by playing time, not roster
                  // quality. Kept in the list but dimmed so the actionable cats read
                  // as the signal instead of drowning in compilers.
}

function gapNote(gap: CategoryGap): string {
  // Only the battleground (winnable) carries a gap note — those are the close, actionable
  // cats. Strengths and out-of-reach don't need a "how far" number.
  if (gap.tier === 'winnable' && gap.gapUp != null) {
    return gap.gapUp === 0 ? `tied · ${rankLabel(gap.rank - 1)}` : `${gap.gapUp}w from ${rankLabel(gap.rank - 1)}`
  }
  return ''
}

const rows = computed<ProfileRow[]>(() => {
  const labelFor = new Map(props.categories.map((c) => [c.statId, c.label]))
  return props.gaps.map((gap) => {
    const label = labelFor.get(gap.statId) || gap.statId
    return {
    statId: gap.statId,
    label,
    rank: gap.rank,
    numTeams: gap.numTeams,
    tier: gap.tier,
    volume: isAccumulatorCat(label),
    // Fill tracks standing so longer = better. Min sliver keeps the tier color visible
    // even for last place (an empty bar would read as missing data, not "worst").
    fillPct: gap.numTeams > 1 ? Math.max(5, ((gap.numTeams - gap.rank) / (gap.numTeams - 1)) * 100) : 100,
    gapNote: gapNote(gap),
    // Show the add only where you'd actually chase it: the battleground (flip a close
    // one) and out-of-reach (your biggest holes). Strengths and mid-pack holding don't
    // need a pickup nudge.
    add:
      gap.tier === 'winnable' || gap.tier === 'lost'
        ? props.addsByStatId?.[gap.statId] ?? null
        : null,
    }
  })
})

// One flat list, strongest -> weakest (rank asc). No tier headers — My Team is a
// season standing vs the league, not a head-to-head matchup, so it reads simply as
// "your rank in each category". Colour carries strength; the rank is the headline.
const sortedRows = computed(() => rows.value.slice().sort((a, b) => a.rank - b.rank))
// Scoring cats lead; volume cats (won by playing time) are demoted to a collapsed group so
// the actionable categories aren't drowned by 8 low-signal playing-time rows.
const scoringRows = computed(() => sortedRows.value.filter((r) => !r.volume))
const volumeRows = computed(() => sortedRows.value.filter((r) => r.volume))
const showVolume = ref(false)
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border overflow-hidden py-2">
    <!-- Scoring categories: strongest -> weakest -->
    <CategoryRow v-for="row in scoringRows" :key="row.statId" :row="row" :draggers="draggersByStatId?.[row.statId]" />

    <!-- Volume cats (won by playing time) collapsed into a secondary group -->
    <template v-if="volumeRows.length">
      <button
        type="button"
        class="mt-1 flex w-full items-center gap-2 border-t border-dark-border/40 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted transition-colors hover:text-dark-textSecondary"
        @click="showVolume = !showVolume"
      >
        <span>{{ showVolume ? '▾' : '▸' }}</span>
        <span>volume · {{ volumeRows.length }}</span>
        <span class="font-normal normal-case tracking-normal text-dark-textMuted/60">won by playing time</span>
      </button>
      <div v-if="showVolume" class="border-t border-dark-border/20">
        <CategoryRow v-for="row in volumeRows" :key="row.statId" :row="row" :draggers="draggersByStatId?.[row.statId]" />
      </div>
    </template>

    <p v-if="rows.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">No category data available.</p>

    <!-- Legend -->
    <p
      v-if="rows.length > 0"
      class="mt-1 border-t border-dark-border/40 px-4 py-2 font-mono text-[11px] text-dark-textMuted"
    >
      your rank in each category vs all {{ rows[0].numTeams }} teams, all season · longer + brighter bar = better ·
      <span class="text-primary">strength</span> · <span class="text-[#f26d6d]">weakness</span>
    </p>
  </div>
</template>
