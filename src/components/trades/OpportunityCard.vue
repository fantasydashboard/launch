<script setup lang="ts">
import { ref } from 'vue'
import Avatar from '@/components/trades/Avatar.vue'
import ValueBadge from '@/components/trades/ValueBadge.vue'
import FitMeter from '@/components/trades/FitMeter.vue'
import type { TradeOpportunity, Intent } from '@/trades/opportunities'

const props = defineProps<{ opp: TradeOpportunity }>()
const expanded = ref(false)
const copied = ref(false)
const onLogoError = (e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }
async function copyPitch() {
  if (!props.opp.pitch) return
  try {
    await navigator.clipboard?.writeText(props.opp.pitch)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* clipboard unavailable — no-op */ }
}

const INTENT_LABEL: Record<Intent, string> = {
  winWin: 'win-win', steal: 'steal', consolidate: '2-for-1', buyLow: 'buy-low', sellHigh: 'sell-high',
}
// win-win green; steal/leverage amber; the rest muted — no new colour semantics.
const intentClass = (i: Intent): string =>
  i === 'winWin' ? 'text-primary' : i === 'steal' ? 'text-[#F2B33A]' : 'text-dark-textMuted'
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
    <!-- header: headline + intent flags + two-sided fit -->
    <div class="flex items-center justify-between gap-2 border-b border-dark-border/60 bg-[#F2B33A]/[0.04] px-4 py-2">
      <span class="flex flex-wrap items-center gap-x-2 font-mono text-[11px] uppercase tracking-wide text-[#F2B33A]">
        <b class="text-[#ffd98a]">{{ opp.headline }}</b>
        <span v-for="i in opp.intents" :key="i" class="text-[10px]" :class="intentClass(i)">· {{ INTENT_LABEL[i] }}</span>
      </span>
      <FitMeter :you="opp.fit.you" :them="opp.fit.them" />
    </div>

    <!-- GET -->
    <div v-for="(g, gi) in opp.get" :key="'g' + gi" class="flex items-center gap-2 px-4" :class="gi === 0 ? 'pt-2.5' : 'pt-1'">
      <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-primary">{{ gi === 0 ? 'GET' : '' }}</span>
      <Avatar :src="g.headshot" :label="g.name" cls="h-7 w-7 rounded-full" />
      <span class="font-display text-[15px] font-bold text-dark-text">{{ g.name }}</span>
      <img v-if="g.proLogo" :src="g.proLogo" alt="" @error="onLogoError" class="h-4 w-4 shrink-0 object-contain" />
      <span class="font-mono text-[11px] text-dark-textMuted">{{ g.pos }}</span>
      <ValueBadge :value="g.value" />
      <span v-if="gi === 0" class="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-dark-textMuted">
        from <Avatar :src="opp.partnerLogo" :label="opp.partner" cls="h-4 w-4 rounded" /> {{ opp.partner }}
      </span>
    </div>

    <!-- GIVE -->
    <div v-for="(g, gi) in opp.give" :key="'v' + gi" class="flex items-center gap-2 px-4" :class="gi === 0 ? 'pt-1.5 pb-1' : 'pb-1'" :style="gi === opp.give.length - 1 ? 'padding-bottom:0.75rem' : ''">
      <span class="w-9 shrink-0 font-mono text-[10px] font-bold tracking-wider text-dark-textMuted">{{ gi === 0 ? 'GIVE' : '' }}</span>
      <Avatar :src="g.headshot" :label="g.name" cls="h-6 w-6 rounded-full" />
      <span class="text-sm font-semibold text-dark-textSecondary">{{ g.name }}</span>
      <img v-if="g.proLogo" :src="g.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
      <span class="font-mono text-[11px] text-dark-textMuted">{{ g.pos }}</span>
      <ValueBadge :value="g.value" />
    </div>

    <!-- expand: why this works (helps/hurts per team) + pitch -->
    <button class="flex w-full items-center gap-1 border-t border-dark-border/40 px-4 py-1.5 text-left font-mono text-[10px] text-dark-textMuted hover:text-dark-textSecondary"
      @click="expanded = !expanded">
      <span>{{ expanded ? '▾' : '▸' }} why this works</span>
    </button>
    <div v-if="expanded" class="space-y-1 border-t border-dark-border/40 px-4 py-2 font-mono text-[10px]">
      <div class="flex flex-wrap items-center gap-x-3">
        <span class="w-10 text-dark-textMuted/70">YOU</span>
        <span v-if="opp.you.fillsPos">fill <b class="text-[#ffd98a]">{{ opp.you.fillsPos }}</b></span>
        <span>gain <span class="text-primary">{{ opp.you.fillsCats.join(' · ') || '—' }}</span></span>
        <span>cost <span class="text-[#F2B33A]">{{ opp.you.hurtsCats.join(' · ') || '—' }}</span></span>
      </div>
      <div class="flex flex-wrap items-center gap-x-3">
        <span class="w-10 text-dark-textMuted/70">THEM</span>
        <span v-if="opp.them.fillsPos">fill <b class="text-[#ffd98a]">{{ opp.them.fillsPos }}</b></span>
        <span>gain <span class="text-primary">{{ opp.them.fillsCats.join(' · ') || '—' }}</span></span>
        <span>cost <span class="text-[#F2B33A]">{{ opp.them.hurtsCats.join(' · ') || '—' }}</span></span>
      </div>
      <div v-if="opp.pitch" class="mt-1.5 flex items-start gap-2 border-t border-dark-border/40 pt-2">
        <span class="w-10 shrink-0 text-dark-textMuted/70">PITCH</span>
        <span class="min-w-0 flex-1 text-[11px] text-dark-textSecondary">{{ opp.pitch }}</span>
        <button class="shrink-0 text-dark-textMuted hover:text-primary" :title="copied ? 'copied' : 'copy pitch'"
          @click="copyPitch">{{ copied ? '✓ copied' : 'copy' }}</button>
      </div>
    </div>
  </div>
</template>
