<script setup lang="ts">
// Your OPTIMAL starting lineup vs the league. Each opening shows who you'd actually start
// (multi-eligible bodies solved into one slot apiece) and how that starter ranks against
// every team's starter at the same opening. The headline grades the whole lineup.
interface Row {
  slot: string
  starterName: string | null
  rank: number | null
  numTeams: number
  strong: boolean
  weak: boolean
}
defineProps<{ lineup: { lineupRank: number | null; numTeams: number; rows: Row[] } }>()

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const rankTone = (r: Row) => (r.rank == null ? 'text-[#f26d6d]' : r.strong ? 'text-primary' : r.weak ? 'text-[#f26d6d]' : 'text-dark-text')
// Headline tone: top third of the league = strength, bottom third = weakness.
const gradeTone = (rank: number | null, n: number) =>
  rank == null ? 'text-dark-text' : rank <= Math.ceil(n / 3) ? 'text-primary' : rank > (n * 2) / 3 ? 'text-[#f26d6d]' : 'text-[#F2B33A]'
</script>

<template>
  <section class="space-y-2">
    <h2 class="text-sm font-display font-semibold uppercase tracking-wide text-dark-textMuted">Positions</h2>
    <div class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
      <!-- Aggregate grade: where your best legal lineup projects vs every team's best legal lineup. -->
      <div v-if="lineup.lineupRank" class="mb-2 border-b border-dark-border/40 pb-2">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Your best lineup projects</p>
        <p class="mt-0.5 font-mono">
          <span class="font-display text-2xl font-bold tabular-nums" :class="gradeTone(lineup.lineupRank, lineup.numTeams)">{{ ord(lineup.lineupRank) }}</span>
          <span class="text-[11px] text-dark-textMuted"> of {{ lineup.numTeams }}</span>
        </p>
      </div>

      <div
        v-for="(r, i) in lineup.rows"
        :key="r.slot + '-' + i"
        class="flex items-center gap-3 py-1.5 font-mono text-[11px]"
      >
        <span class="w-12 shrink-0 font-bold text-dark-textSecondary">{{ r.slot }}</span>
        <!-- PROMINENT league rank at the opening -->
        <span class="w-24 shrink-0 tabular-nums">
          <template v-if="r.rank">
            <span class="text-[15px] font-bold" :class="rankTone(r)">{{ ord(r.rank) }}</span>
            <span class="text-[10px] text-dark-textMuted"> of {{ r.numTeams }}</span>
          </template>
          <span v-else class="text-[12px] font-bold text-[#f26d6d]">—</span>
        </span>
        <!-- the body you'd start there -->
        <span class="min-w-0 flex-1 truncate" :class="r.starterName ? 'text-dark-textSecondary' : 'text-[#f26d6d]'">
          {{ r.starterName || 'no startable option' }}
        </span>
      </div>
      <p class="mt-2 font-mono text-[9px] text-dark-textMuted">
        your best legal lineup, one slot per body · rank = your starter vs every team's starter at that slot · green = strength · red = weakness
      </p>
    </div>
  </section>
</template>
