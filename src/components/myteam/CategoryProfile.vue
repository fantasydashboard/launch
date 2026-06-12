<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CategoryGap } from '@/myteam/types'
import { ordinal } from '@/recommendations/ordinal'

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
}

// Tier presentation. Order = how the sections stack (battleground first: it's where
// the matchup is won). Each tier owns a DISTINCT color so "out of reach" can never be
// mistaken for mid-pack (the old gray-for-both problem).
const TIER_META: Record<
  CategoryGap['tier'],
  { label: string; order: number; fill: string; dot: string }
> = {
  winnable: { label: 'Battleground', order: 0, fill: 'bg-[#F2B33A]', dot: 'text-[#F2B33A]' },
  strong: { label: 'Your edge', order: 1, fill: 'bg-primary', dot: 'text-primary' },
  safe: { label: 'Holding', order: 2, fill: 'bg-dark-textMuted/60', dot: 'text-dark-textSecondary' },
  lost: { label: 'Out of reach', order: 3, fill: 'bg-red-500/45', dot: 'text-red-400' },
}

function gapNote(gap: CategoryGap): string {
  // Only the battleground (winnable) carries a gap note — those are the close, actionable
  // cats. Strengths and out-of-reach don't need a "how far" number.
  if (gap.tier === 'winnable' && gap.gapUp != null) {
    return gap.gapUp === 0 ? `tied · ${ordinal(gap.rank - 1)}` : `${gap.gapUp}w from ${ordinal(gap.rank - 1)}`
  }
  return ''
}

const rows = computed<ProfileRow[]>(() => {
  const labelFor = new Map(props.categories.map((c) => [c.statId, c.label]))
  return props.gaps.map((gap) => ({
    statId: gap.statId,
    label: labelFor.get(gap.statId) || gap.statId,
    rank: gap.rank,
    numTeams: gap.numTeams,
    tier: gap.tier,
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
  }))
})

// Group rows into ordered tier sections; sort within a section by rank (best first).
const sections = computed(() => {
  const byTier = new Map<CategoryGap['tier'], ProfileRow[]>()
  for (const row of rows.value) {
    const arr = byTier.get(row.tier) ?? []
    arr.push(row)
    byTier.set(row.tier, arr)
  }
  return (['winnable', 'strong', 'safe', 'lost'] as const)
    .filter((tier) => byTier.has(tier))
    .map((tier) => ({
      tier,
      label: TIER_META[tier].label,
      rows: byTier.get(tier)!.slice().sort((a, b) => a.rank - b.rank),
    }))
})

// "Out of reach" cats are decided, not decisions — collapse them by default to keep the
// profile scannable (they're already surfaced under "Where you're losing").
const showLost = ref(false)
const lostCount = computed(() => rows.value.filter((r) => r.tier === 'lost').length)
const visibleSections = computed(() =>
  sections.value.filter((s) => s.tier !== 'lost' || showLost.value),
)
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border overflow-hidden">
    <template v-for="section in visibleSections" :key="section.tier">
      <!-- Tier header -->
      <div class="flex items-center gap-2 px-4 pt-3 pb-1">
        <span class="font-mono text-[10px] uppercase tracking-wider" :class="TIER_META[section.tier].dot">
          {{ section.label }}
        </span>
        <span class="h-px flex-1 bg-dark-border/40"></span>
      </div>

      <div v-for="row in section.rows" :key="row.statId" class="px-4 py-1.5">
        <div class="flex items-center gap-3">
          <!-- Category label -->
          <span class="w-10 shrink-0 text-xs font-mono text-dark-textSecondary truncate">{{ row.label }}</span>

          <!-- Standing bar: longer = better (1st full, last empty) -->
          <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-border/50">
            <div
              class="absolute inset-y-0 left-0 rounded-full"
              :class="TIER_META[row.tier].fill"
              :style="{ width: `${row.fillPct}%` }"
            />
          </div>

          <!-- Rank -->
          <span class="w-6 shrink-0 text-right text-xs font-mono tabular-nums text-dark-text">{{ row.rank }}</span>
          <!-- Battleground gap note (close cats only) -->
          <span
            class="w-24 shrink-0 text-right text-[11px] font-mono text-[#F2B33A]"
            :class="{ 'opacity-0': !row.gapNote }"
          >{{ row.gapNote || '·' }}</span>
        </div>

        <!-- Top available add for this category (the merged-in "do this next"). -->
        <p v-if="row.add" class="mt-0.5 pl-[3.25rem] font-mono text-[11px] text-dark-textMuted">
          Add <span class="text-dark-text">{{ row.add.name }}</span>
          <span class="text-primary">{{ row.add.isRatio ? '' : '+' }}{{ row.add.statValue }} {{ row.add.label }}</span>
        </p>
      </div>
    </template>

    <!-- Collapsed "out of reach" toggle -->
    <button
      v-if="lostCount > 0"
      type="button"
      class="flex w-full items-center gap-2 px-4 py-2 text-left font-mono text-[11px] text-dark-textMuted transition-colors hover:text-dark-textSecondary"
      @click="showLost = !showLost"
    >
      <span>{{ showLost ? 'Hide' : 'Show' }} {{ lostCount }} out of reach</span>
      <span>{{ showLost ? '▴' : '▾' }}</span>
    </button>

    <p v-if="rows.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">No category data available.</p>

    <!-- Legend -->
    <p
      v-if="rows.length > 0"
      class="border-t border-dark-border/40 px-4 py-2 font-mono text-[11px] text-dark-textMuted"
    >
      bar = standing (longer is better) ·
      <span class="text-[#F2B33A]">battleground</span> ·
      <span class="text-primary">edge</span> ·
      <span class="text-red-400">out of reach</span>
    </p>
  </div>
</template>
