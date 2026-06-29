<script setup lang="ts">
/**
 * Team avatar that falls back to the team's initials when there's no logo URL or the
 * image fails to load — so a team with no ESPN/Yahoo avatar never leaves a blank circle.
 */
import { ref, computed, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string
    logo?: string
    size?: number // px (width = height)
    ring?: boolean // primary ring (used to mark YOU)
    dim?: boolean // fade non-highlighted avatars (matrix headers)
  }>(),
  { size: 32, ring: false, dim: false },
)

const failed = ref(false)
// Reset the error state if the logo url changes (e.g. switching leagues).
watch(
  () => props.logo,
  () => {
    failed.value = false
  },
)

const initials = computed(() => {
  const n = (props.name ?? '').trim()
  if (!n) return '?'
  const words = n.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
})
const showImg = computed(() => !!props.logo && !failed.value)
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-dark-border"
    :class="[
      ring ? 'ring-1 ring-primary ring-offset-[1px] ring-offset-dark-card' : '',
      dim && !ring ? 'opacity-70' : '',
    ]"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <img
      v-if="showImg"
      :src="logo"
      :alt="name ?? ''"
      class="h-full w-full rounded-full object-cover"
      @error="failed = true"
    />
    <span
      v-else
      class="font-mono font-semibold uppercase leading-none text-dark-textSecondary"
      :style="{ fontSize: Math.max(7, Math.round(size * 0.38)) + 'px' }"
    >{{ initials }}</span>
  </span>
</template>
