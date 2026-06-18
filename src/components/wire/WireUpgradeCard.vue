<script setup lang="ts">
import Avatar from '@/components/trades/Avatar.vue'
import ValueBadge from '@/components/trades/ValueBadge.vue'

interface WirePlayer {
  name: string
  pos: string
  headshot?: string
  proLogo?: string
  value: number
}
defineProps<{
  u: {
    deltaEcw: number
    add: WirePlayer
    drop: WirePlayer | null
    fixesLabels: string[]
    holdsLabels: string[]
  }
  hero?: boolean
}>()
const onLogoError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border bg-dark-card"
    :class="hero ? 'border-primary/40' : 'border-dark-border'"
  >
    <!-- header: the gain + what it fills -->
    <div
      class="flex items-center justify-between gap-2 border-b border-dark-border/60 px-4 py-2"
      :class="hero ? 'bg-primary/[0.05]' : 'bg-[#F2B33A]/[0.03]'"
    >
      <span class="flex flex-wrap items-center gap-x-2 font-mono text-[11px] uppercase tracking-wide text-dark-textMuted">
        <b :class="hero ? 'text-primary' : 'text-[#ffd98a]'">Adds {{ u.deltaEcw.toFixed(1) }} cats/week</b>
        <span v-if="u.fixesLabels.length" class="text-[10px]">· fills {{ u.fixesLabels.join(' ') }}</span>
      </span>
      <span class="shrink-0 font-mono text-[12px] font-bold text-primary">+{{ u.deltaEcw.toFixed(1) }}/wk</span>
    </div>

    <!-- ADD -->
    <div class="flex items-center gap-2 px-4 pt-2.5">
      <span class="w-10 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">ADD</span>
      <Avatar :src="u.add.headshot" :label="u.add.name" cls="h-7 w-7 rounded-full" />
      <span class="font-display text-[15px] font-bold text-dark-text">{{ u.add.name }}</span>
      <img v-if="u.add.proLogo" :src="u.add.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
      <span class="font-mono text-[11px] text-dark-textMuted">{{ u.add.pos }}</span>
      <ValueBadge :value="u.add.value" />
    </div>

    <!-- DROP -->
    <div v-if="u.drop" class="flex items-center gap-2 px-4 pb-2.5 pt-1.5">
      <span class="w-10 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">DROP</span>
      <Avatar :src="u.drop.headshot" :label="u.drop.name" cls="h-6 w-6 rounded-full" />
      <span class="text-sm font-semibold text-dark-textSecondary">{{ u.drop.name }}</span>
      <img v-if="u.drop.proLogo" :src="u.drop.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
      <span class="font-mono text-[11px] text-dark-textMuted">{{ u.drop.pos }}</span>
      <ValueBadge :value="u.drop.value" />
    </div>
    <div v-else class="px-4 pb-2.5 pt-1 font-mono text-[10px] text-dark-textMuted">Open roster spot, no drop needed.</div>

    <!-- holds (cats the move keeps you strong in) -->
    <div
      v-if="u.holdsLabels.length"
      class="border-t border-dark-border/40 px-4 py-1.5 font-mono text-[10px] text-dark-textMuted"
    >
      holds {{ u.holdsLabels.join(' ') }}
    </div>
  </div>
</template>
