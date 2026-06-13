<script setup lang="ts">
import { ref } from 'vue'
// A player headshot or team logo with a clean monogram fallback on missing/broken src
// (fantasy headshots/logos are frequently absent). Self-contained per instance.
defineProps<{ src?: string; label: string; cls?: string }>()
const failed = ref(false)
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="label"
    @error="failed = true"
    :class="['shrink-0 bg-dark-border object-cover', cls ?? 'h-7 w-7 rounded-full']"
  />
  <span
    v-else
    aria-hidden="true"
    :class="['flex shrink-0 items-center justify-center bg-dark-border font-display text-[11px] font-bold text-dark-textSecondary', cls ?? 'h-7 w-7 rounded-full']"
    >{{ (label || '?').charAt(0) }}</span
  >
</template>
