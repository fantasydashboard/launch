<script setup lang="ts">
import type { Add } from '@/players/types'

defineProps<{ add: Add; statLabel: string }>()
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3">
    <img
      v-if="add.player.headshot"
      :src="add.player.headshot"
      :alt="add.player.name"
      class="h-8 w-8 rounded-full bg-dark-border object-cover"
    />
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold text-dark-text">{{ add.player.name }}</span>
      <span class="block text-xs text-dark-textMuted">
        {{ add.player.position }} · {{ add.player.team }} · {{ Math.round(add.player.percentOwned) }}% owned
      </span>
    </span>
    <span class="shrink-0 text-right">
      <span class="block font-mono text-sm font-bold tabular-nums text-primary">{{ add.statValue }}</span>
      <span class="block font-mono text-xs tabular-nums text-dark-textMuted">{{ statLabel }}</span>
    </span>
  </div>
</template>
