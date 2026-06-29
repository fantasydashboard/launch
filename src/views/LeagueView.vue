<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ scoring?: 'points' | 'category' }>(), { scoring: 'points' })
const isCategory = computed(() => props.scoring === 'category')
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">League</h1>
      <p class="font-mono text-xs text-dark-textMuted">How you stack up against the field.</p>
    </header>
    <!-- Standings + Landscape added in later tasks -->
    <span v-if="false">{{ isCategory }}</span>
  </div>
</template>
