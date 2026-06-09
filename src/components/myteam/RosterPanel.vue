<script setup lang="ts">
import { computed } from 'vue'
import type { RosterPlayer } from '@/composables/useMyRoster'
import type { PlayerContribution } from '@/myteam/types'
import type { DropAnalysis } from '@/myteam/dropCandidates'

const props = defineProps<{
  players: RosterPlayer[]
  categories: { statId: string; label: string; name: string }[]
  contributions?: PlayerContribution[]
  drops?: DropAnalysis
}>()

interface ContribChip {
  statId: string
  label: string
}

interface RosterRow {
  player: RosterPlayer
  plus: ContribChip[]
  minus: ContribChip[]
  // Single muted chip for a player's best category when they have no plus chips
  // (so the row isn't blank). Null when they have plus chips or no contributed cat.
  topChip: ContribChip | null
  overallValue: number
  dropReason: string | null
  isWeakLink: boolean
}

// statId -> short category label (e.g. "HR", "ERA") for chip text.
const labelByStatId = computed(() => {
  const map = new Map<string, string>()
  for (const c of props.categories) map.set(c.statId, c.label)
  return map
})

// playerKey -> its contribution record.
const contribByKey = computed(() => {
  const map = new Map<string, PlayerContribution>()
  for (const c of props.contributions ?? []) map.set(c.playerKey, c)
  return map
})

// playerKey -> drop reason (title/tooltip text).
const dropReasonByKey = computed(() => {
  const map = new Map<string, string>()
  for (const c of props.drops?.candidates ?? []) map.set(c.playerKey, c.reason)
  return map
})

// Build rows with per-category plus/minus chips, drop/weak-link tags, and an
// overall value (mean percentile across contributed cats). Sort best contributors
// first by overallValue; drop candidates fall to the bottom (lowest value).
const rows = computed<RosterRow[]>(() => {
  const weakLink = props.drops?.weakLink ?? null

  const built = props.players.map((player) => {
    const contrib = contribByKey.value.get(player.playerKey)
    const plus: ContribChip[] = []
    const minus: ContribChip[] = []
    if (contrib) {
      for (const c of contrib.contribs) {
        const label = labelByStatId.value.get(c.statId) || c.statId
        if (c.tier === 'plus') plus.push({ statId: c.statId, label })
        else if (c.tier === 'minus') minus.push({ statId: c.statId, label })
      }
    }
    // When a player has no plus chips, surface their best category as a muted chip
    // so the row reads as something other than "—". Null topStatId => truly blank.
    let topChip: ContribChip | null = null
    if (plus.length === 0 && contrib?.topStatId) {
      topChip = {
        statId: contrib.topStatId,
        label: labelByStatId.value.get(contrib.topStatId) || contrib.topStatId,
      }
    }
    return {
      player,
      plus,
      minus,
      topChip,
      overallValue: contrib?.overallValue ?? 0,
      dropReason: dropReasonByKey.value.get(player.playerKey) ?? null,
      isWeakLink: weakLink !== null && player.playerKey === weakLink,
    }
  })

  return built.sort((a, b) => b.overallValue - a.overallValue)
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

      <!-- Name + position · team, with drop / weak-link tags -->
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2">
          <span class="truncate text-sm font-sans font-semibold text-dark-text">
            {{ row.player.name }}
          </span>
          <span
            v-if="row.isWeakLink"
            class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#FF5C5C] bg-[#FF5C5C]/10"
          >weak link</span>
          <span
            v-else-if="row.dropReason"
            :title="row.dropReason"
            class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-dark-textMuted bg-dark-border/60"
          >drop?</span>
        </span>
        <span class="block text-xs text-dark-textMuted">
          {{ row.player.position }}<template v-if="row.player.team"> · {{ row.player.team }}</template>
        </span>
      </span>

      <!-- Per-category contribution chips -->
      <span class="flex shrink-0 flex-wrap items-center justify-end gap-1 max-w-[55%]">
        <span
          v-for="chip in row.plus"
          :key="'p-' + chip.statId"
          class="rounded px-1.5 py-0.5 font-mono text-xs text-primary bg-primary/10"
        >{{ chip.label }}</span>
        <span
          v-for="chip in row.minus"
          :key="'m-' + chip.statId"
          class="rounded px-1.5 py-0.5 font-mono text-xs text-[#FF5C5C] bg-[#FF5C5C]/10"
        >{{ chip.label }}</span>
        <span
          v-if="row.topChip"
          class="rounded px-1.5 py-0.5 font-mono text-xs text-dark-textMuted bg-dark-border/60"
        >{{ row.topChip.label }}</span>
        <span
          v-if="row.plus.length === 0 && row.minus.length === 0 && !row.topChip"
          class="font-mono text-xs text-dark-textMuted"
        >—</span>
      </span>
    </div>
  </div>
</template>
