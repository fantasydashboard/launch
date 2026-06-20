<script setup lang="ts">
import { ref } from 'vue'
defineProps<{
  teamName: string
  teamAvatar?: string // team logo URL; falls back to a monogram when missing/broken
  record: string // e.g. "57-64-11"
  verdict: string | null // terse one-line read, or null to omit
}>()

// Fantasy team logos are frequently missing or broken (user uploads); fall back to a
// clean monogram on load error rather than a broken-image icon.
const logoFailed = ref(false)
</script>

<template>
  <header class="space-y-3">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <img
        v-if="teamAvatar && !logoFailed"
        :src="teamAvatar"
        :alt="teamName"
        @error="logoFailed = true"
        class="h-9 w-9 shrink-0 rounded-lg bg-dark-border object-cover"
      />
      <span
        v-else
        aria-hidden="true"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dark-border font-display text-base font-bold text-dark-textSecondary"
        >{{ teamName.charAt(0) }}</span
      >
      <h1 class="text-xl sm:text-2xl font-display font-bold text-dark-text">{{ teamName }}</h1>
      <span class="text-sm font-mono tabular-nums text-dark-textSecondary">{{ record }}</span>
    </div>

    <!-- Rank lives in the Playoff Race card and the hole-add in the Wire triage
         card below — the header is just identity + the one-line season verdict. -->
    <p v-if="verdict" class="text-sm text-dark-textSecondary">{{ verdict }}</p>
  </header>
</template>
