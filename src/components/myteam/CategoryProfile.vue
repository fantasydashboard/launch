<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryGap } from '@/myteam/types'
import { rankLabel } from '@/recommendations/ordinal'
import { isAccumulatorCat } from '@/myteam/contestedTiers'

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
const hasVolume = computed(() => rows.value.some((r) => r.volume))
const strengthOf = (rank: number, n: number): 'strong' | 'weak' | 'mid' => {
  if (rank <= Math.ceil(n / 3)) return 'strong'
  if (rank > (n * 2) / 3) return 'weak'
  return 'mid'
}
// Volume cats carry no strength/weakness colour — they're won by playing time, so a
// green "1st in AB" would read as a real edge it isn't. Neutral bar + muted rank.
const barFill = (rank: number, n: number, volume: boolean) => {
  if (volume) return 'bg-dark-textMuted/30'
  const s = strengthOf(rank, n)
  return s === 'strong' ? 'bg-primary' : s === 'weak' ? 'bg-[#f26d6d]/60' : 'bg-dark-textMuted/50'
}
const rankText = (rank: number, n: number, volume: boolean) => {
  if (volume) return 'text-dark-textMuted'
  const s = strengthOf(rank, n)
  return s === 'strong' ? 'text-primary' : s === 'weak' ? 'text-[#f26d6d]' : 'text-dark-text'
}
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border overflow-hidden py-2">
    <div v-for="row in sortedRows" :key="row.statId" class="px-4 py-1.5" :class="row.volume ? 'opacity-55' : ''">
      <div class="flex items-center gap-3">
        <!-- Category label -->
        <span class="w-10 shrink-0 text-xs font-mono text-dark-textSecondary truncate">{{ row.label }}</span>

        <!-- Standing bar: longer = better (1st full, last empty), coloured by strength -->
        <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-border/50">
          <div
            class="absolute inset-y-0 left-0 rounded-full"
            :class="barFill(row.rank, row.numTeams, row.volume)"
            :style="{ width: `${row.fillPct}%` }"
          />
        </div>

        <!-- Prominent rank: where you stand in this category vs every team, all season -->
        <span class="w-16 shrink-0 text-right font-mono tabular-nums">
          <span class="text-[13px] font-bold" :class="rankText(row.rank, row.numTeams, row.volume)">{{ rankLabel(row.rank) }}</span>
          <span class="text-[9px] text-dark-textMuted"> / {{ row.numTeams }}</span>
        </span>
      </div>

      <!-- Top available add for this category (the merged-in "do this next"). We name
           the best available arm/bat WITHOUT a number: a player's season total isn't
           the gain you'd get (you only accrue rest-of-season), and late in the year
           that overstates wildly — "+12 HR" with 2 weeks left really means ~+1. With
           no trustworthy remaining-season horizon to scale by, the honest signal is
           "this is the player to add for this category", not a fabricated magnitude. -->
      <p v-if="row.add" class="mt-0.5 pl-[3.25rem] font-mono text-[11px] text-dark-textMuted">
        Add <span class="text-dark-text">{{ row.add.name }}</span>
        <span class="text-primary"> · {{ row.add.label }}</span>
      </p>
      <!-- Positional cause: the roster slots dragging a weak category. -->
      <p
        v-if="!row.volume && strengthOf(row.rank, row.numTeams) !== 'strong' && draggersByStatId?.[row.statId]?.length"
        class="mt-0.5 pl-[3.25rem] font-mono text-[10px] text-dark-textMuted/80"
      >
        dragged by {{ draggersByStatId[row.statId].join(' · ') }}
      </p>
    </div>

    <p v-if="rows.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">No category data available.</p>

    <!-- Legend -->
    <p
      v-if="rows.length > 0"
      class="mt-1 border-t border-dark-border/40 px-4 py-2 font-mono text-[11px] text-dark-textMuted"
    >
      your rank in each category vs all {{ rows[0].numTeams }} teams, all season · longer bar = better ·
      <span class="text-primary">strength</span> · <span class="text-[#f26d6d]">weakness</span><template v-if="hasVolume"> ·
      <span class="text-dark-textMuted">volume cats dimmed (won by playing time)</span></template>
    </p>
  </div>
</template>
