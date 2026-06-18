<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWire } from '@/composables/useWire'
import Avatar from '@/components/trades/Avatar.vue'
import ValueBadge from '@/components/trades/ValueBadge.vue'
import WireUpgradeCard from '@/components/wire/WireUpgradeCard.vue'

const { vm, refresh } = useWire()

// If the league-wide data is slow/failing, show a retry instead of an endless
// "Reading the wire..." (the standings need the heavy rostered-pool fetch).
const slow = ref(false)
onMounted(() => {
  window.setTimeout(() => {
    slow.value = true
  }, 12000)
})
function retry() {
  slow.value = false
  refresh()
  window.setTimeout(() => {
    slow.value = true
  }, 12000)
}
const onLogoError = (e: Event) => {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 space-y-3">
    <!-- Page header -->
    <header class="space-y-1">
      <h1 class="font-display text-2xl font-bold text-dark-text">The Wire</h1>
      <p class="font-mono text-xs text-dark-textMuted">{{ vm.subtitle }}</p>
    </header>

    <!-- Loading state (with a per-piece breakdown + retry if it's slow) -->
    <div
      v-if="!vm.ready && vm.supported"
      class="rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted"
    >
      <p>Reading the wire...</p>
      <p class="mt-2 font-mono text-[10px] text-dark-textMuted">
        categories {{ vm.loadState.categories }} ·
        pool {{ vm.loadState.pool }} ·
        team {{ vm.loadState.teamFound ? 'ok' : '...' }} ·
        standings {{ vm.loadState.standings }}
      </p>
      <button
        v-if="slow"
        type="button"
        class="mt-3 rounded border border-dark-border px-3 py-1 font-mono text-[11px] text-dark-textSecondary hover:text-dark-text"
        @click="retry"
      >
        Taking a while. Retry
      </button>
    </div>

    <!-- Unsupported league type -->
    <div
      v-else-if="!vm.supported"
      class="rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted"
    >
      The Wire is available for category leagues.
    </div>

    <template v-else>
      <!-- 1. LEVERAGE HEADER (where you're strong vs your holes) -->
      <section
        v-if="vm.surplus.length || vm.holes.length"
        class="space-y-1.5 rounded-xl border border-dark-border bg-dark-card px-4 py-3"
      >
        <div v-if="vm.surplus.length" class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="w-16 shrink-0 font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Your edge</span>
          <span
            v-for="c in vm.surplus"
            :key="c.label"
            class="inline-block rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary"
          >{{ c.label }} · {{ c.rank }}</span>
        </div>
        <div v-if="vm.holes.length" class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="w-16 shrink-0 font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">To fix</span>
          <span
            v-for="c in vm.holes"
            :key="c.label"
            class="inline-block rounded bg-[#F2B33A]/10 px-2 py-0.5 font-mono text-[10px] text-[#F2B33A]"
          >{{ c.label }} · {{ c.rank }}</span>
        </div>
      </section>

      <!-- 2. BIGGEST UPGRADE (hero) -->
      <section v-if="vm.hero" class="space-y-2">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">★ Biggest upgrade available</p>
        <WireUpgradeCard :u="vm.hero" hero />
      </section>

      <!-- 3. MORE UPGRADES -->
      <section v-if="vm.upgrades.length" class="space-y-2">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">More upgrades</p>
        <p class="font-mono text-[9px] text-dark-textMuted">
          Other adds worth making. You'd make one of these.
        </p>
        <WireUpgradeCard v-for="(u, i) in vm.upgrades" :key="i" :u="u" compact />
      </section>

      <!-- Quiet wire -->
      <section
        v-else-if="!vm.hero"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted"
      >
        The wire's quiet, nothing on it upgrades your roster right now.
      </section>

      <!-- 4. STREAM BOARD -->
      <section
        v-if="vm.streamBoard.starters.length || vm.streamBoard.relievers.length"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-3"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Stream board</p>
        <p v-if="vm.streamBoard.weakCats.length" class="mt-1 font-mono text-[9px] text-dark-textMuted">
          for your weak cats: {{ vm.streamBoard.weakCats.map((c) => c.label).join(' ') }}
        </p>

        <template v-if="vm.streamBoard.starters.length">
          <p class="mt-3 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">Starters</p>
          <div
            v-for="s in vm.streamBoard.starters"
            :key="s.player.key"
            class="mt-1.5 flex items-center gap-2 font-mono text-[11px]"
          >
            <Avatar :src="s.headshot" :label="s.player.name" cls="h-6 w-6 rounded-full" />
            <span class="font-semibold text-dark-text">{{ s.player.name }}</span>
            <img v-if="s.proLogo" :src="s.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
            <span class="text-dark-textMuted">{{ s.rationale }}</span>
            <span
              v-if="s.twoStart"
              class="ml-auto shrink-0 rounded border border-[#1f6f86] px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[#5ec8e6]"
            >2-start</span>
          </div>
        </template>

        <template v-if="vm.streamBoard.relievers.length">
          <p class="mt-3 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">Relievers</p>
          <div
            v-for="r in vm.streamBoard.relievers"
            :key="r.player.key"
            class="mt-1.5 flex items-center gap-2 font-mono text-[11px]"
          >
            <Avatar :src="r.headshot" :label="r.player.name" cls="h-6 w-6 rounded-full" />
            <span class="font-semibold text-dark-text">{{ r.player.name }}</span>
            <img v-if="r.proLogo" :src="r.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
            <span class="text-dark-textMuted">{{ r.rationale }}</span>
          </div>
        </template>
      </section>

      <!-- 5. WHO TO DROP -->
      <section v-if="vm.drops.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Who to drop</p>
        <div
          v-for="d in vm.drops"
          :key="d.key"
          class="mt-2 flex items-center gap-2 font-mono text-[11px]"
        >
          <Avatar :src="d.headshot" :label="d.name" cls="h-6 w-6 rounded-full" />
          <span class="font-semibold text-dark-textSecondary">{{ d.name }}</span>
          <img v-if="d.proLogo" :src="d.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
          <span class="text-dark-textMuted">{{ d.pos }}</span>
          <span class="text-dark-textMuted">· {{ d.reason }}</span>
          <span class="ml-auto"><ValueBadge :value="d.value" /></span>
        </div>
      </section>
    </template>
  </div>
</template>
