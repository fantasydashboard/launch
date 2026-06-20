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
    why?: string
    trend?: number
    add: WirePlayer
    drop: WirePlayer | null
    fit: { label: string; pct: number }[]
    fixesLabels: string[]
    holdsLabels: string[]
  }
  hero?: boolean
  compact?: boolean // alternatives: hide the (shared) drop + holds, just ADD + fit + gain
}>()
const onLogoError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <!-- COMPACT alternative: add and drop side by side, one gain, players get the room -->
  <div
    v-if="compact"
    class="rounded-xl border border-dark-border bg-dark-card px-4 py-3"
  >
    <div class="flex items-center gap-2">
      <!-- ADD player -->
      <Avatar :src="u.add.headshot" :label="u.add.name" cls="h-8 w-8 rounded-full" />
      <span class="font-display text-[14px] font-bold text-dark-text">{{ u.add.name }}</span>
      <img v-if="u.add.proLogo" :src="u.add.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
      <span class="font-mono text-[10px] text-dark-textMuted">{{ u.add.pos }}</span>
      <span v-if="(u.trend ?? 0) >= 3" class="rounded border border-[#F2B33A]/40 px-1 font-mono text-[9px] text-[#F2B33A]" title="rising ownership this week">▲ {{ u.trend }}%</span>
      <!-- swap -> drop player -->
      <template v-if="u.drop">
        <span class="px-1 font-mono text-[11px] text-dark-textMuted">for</span>
        <Avatar :src="u.drop.headshot" :label="u.drop.name" cls="h-6 w-6 rounded-full" />
        <span class="text-[13px] font-semibold text-dark-textSecondary">{{ u.drop.name }}</span>
        <img v-if="u.drop.proLogo" :src="u.drop.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
        <span class="font-mono text-[10px] text-dark-textMuted">{{ u.drop.pos }}</span>
      </template>
      <span class="ml-auto shrink-0 font-mono text-[12px] font-bold text-primary">+{{ u.deltaEcw.toFixed(1) }} cats/wk</span>
    </div>
    <!-- one-line why -->
    <p v-if="u.why" class="mt-1 pl-10 font-mono text-[10px] text-dark-textMuted">{{ u.why }}</p>
    <!-- category-fit bars under the add -->
    <div v-if="u.fit.length" class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-10">
      <span
        v-for="f in u.fit"
        :key="f.label"
        class="inline-flex items-center gap-1.5 font-mono text-[10px]"
        :title="`${f.label}: ${f.pct}/100 in this category`"
      >
        <span class="text-primary">{{ f.label }}</span>
        <span class="relative h-1 w-8 shrink-0 overflow-hidden rounded-full bg-dark-border">
          <span class="absolute inset-y-0 left-0 rounded-full bg-primary" :style="{ width: f.pct + '%' }" />
        </span>
      </span>
    </div>
  </div>

  <!-- HERO / full card: add over drop, one gain, fit bars, holds -->
  <div v-else class="overflow-hidden rounded-xl border border-primary/40 bg-dark-card px-4 py-3 space-y-1.5">
    <!-- ADD + the single gain -->
    <div class="flex items-center gap-2">
      <span class="w-10 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">ADD</span>
      <Avatar :src="u.add.headshot" :label="u.add.name" cls="h-8 w-8 rounded-full" />
      <span class="font-display text-[15px] font-bold text-dark-text">{{ u.add.name }}</span>
      <img v-if="u.add.proLogo" :src="u.add.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
      <span class="font-mono text-[11px] text-dark-textMuted">{{ u.add.pos }}</span>
      <ValueBadge :value="u.add.value" />
      <span v-if="(u.trend ?? 0) >= 3" class="rounded border border-[#F2B33A]/40 px-1 font-mono text-[9px] text-[#F2B33A]" title="rising ownership this week">▲ {{ u.trend }}%</span>
      <span class="ml-auto shrink-0 font-mono text-[13px] font-bold text-primary">+{{ u.deltaEcw.toFixed(1) }} cats/wk</span>
    </div>

    <!-- one-line why -->
    <p v-if="u.why" class="pl-[52px] font-mono text-[10px] text-dark-textMuted">{{ u.why }}</p>

    <!-- category-fit bars -->
    <div v-if="u.fit.length" class="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[52px]">
      <span
        v-for="f in u.fit"
        :key="f.label"
        class="inline-flex items-center gap-1.5 font-mono text-[10px]"
        :title="`${f.label}: ${f.pct}/100 in this category`"
      >
        <span class="text-primary">{{ f.label }}</span>
        <span class="relative h-1 w-8 shrink-0 overflow-hidden rounded-full bg-dark-border">
          <span class="absolute inset-y-0 left-0 rounded-full bg-primary" :style="{ width: f.pct + '%' }" />
        </span>
      </span>
    </div>

    <!-- DROP -->
    <div v-if="u.drop" class="flex items-center gap-2">
      <span class="w-10 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">DROP</span>
      <Avatar :src="u.drop.headshot" :label="u.drop.name" cls="h-7 w-7 rounded-full" />
      <span class="text-sm font-semibold text-dark-textSecondary">{{ u.drop.name }}</span>
      <img v-if="u.drop.proLogo" :src="u.drop.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
      <span class="font-mono text-[11px] text-dark-textMuted">{{ u.drop.pos }}</span>
      <ValueBadge :value="u.drop.value" />
    </div>
    <div v-else class="pl-[52px] font-mono text-[10px] text-dark-textMuted">Open roster spot, no drop needed.</div>

    <!-- holds -->
    <div v-if="u.holdsLabels.length" class="pl-[52px] font-mono text-[10px] text-dark-textMuted">
      holds {{ u.holdsLabels.join(' ') }}
    </div>
  </div>
</template>
