<script setup lang="ts">
import { computed } from 'vue'
import type { RosterPlayer } from '@/composables/useMyRoster'

const props = defineProps<{
  players: RosterPlayer[]
  categories: { statId: string; label: string; name: string }[]
}>()

interface StandoutStat {
  statId: string
  label: string
  value: number
}

interface RosterRow {
  player: RosterPlayer
  standouts: StandoutStat[]
}

// Sort by total_points desc when present, else keep input order.
// Then attach each player's top 2 standout category stats (highest raw value
// among the league's scoring categories).
const rows = computed<RosterRow[]>(() => {
  const sorted = props.players
    .slice()
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))

  return sorted.map((player) => {
    const standouts: StandoutStat[] = props.categories
      .map((cat) => ({
        statId: cat.statId,
        label: cat.label,
        value: Number(player.stats?.[cat.statId] ?? 0),
      }))
      .filter((s) => Number.isFinite(s.value) && s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)

    return { player, standouts }
  })
})
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border divide-y divide-dark-border/40">
    <p v-if="rows.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
      No roster data available.
    </p>

    <div
      v-for="row in rows"
      :key="row.player.playerKey"
      class="flex items-center gap-3 px-4 py-2.5"
    >
      <!-- Headshot -->
      <img
        v-if="row.player.headshot"
        :src="row.player.headshot"
        :alt="row.player.name"
        loading="lazy"
        class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover"
      />
      <span
        v-else
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border text-xs font-mono text-dark-textMuted"
        aria-hidden="true"
      >{{ row.player.position || '—' }}</span>

      <!-- Name + position · team -->
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-sans font-semibold text-dark-text">
          {{ row.player.name }}
        </span>
        <span class="block text-xs text-dark-textMuted">
          {{ row.player.position }}<template v-if="row.player.team"> · {{ row.player.team }}</template>
        </span>
      </span>

      <!-- Top 2 standout stats -->
      <span class="flex shrink-0 items-center gap-4">
        <span
          v-for="stat in row.standouts"
          :key="stat.statId"
          class="text-right"
        >
          <span class="block font-mono text-sm font-semibold tabular-nums text-dark-text">{{ stat.value }}</span>
          <span class="block font-mono text-[10px] uppercase tracking-wide tabular-nums text-dark-textMuted">{{ stat.label }}</span>
        </span>
      </span>
    </div>
  </div>
</template>
