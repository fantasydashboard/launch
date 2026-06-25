<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWire } from '@/composables/useWire'
import Avatar from '@/components/trades/Avatar.vue'
import ValueBadge from '@/components/trades/ValueBadge.vue'
import WireUpgradeCard from '@/components/wire/WireUpgradeCard.vue'
import WireGrader from '@/components/wire/WireGrader.vue'

const { vm, refresh, grader } = useWire()

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
          <template v-for="c in vm.holes" :key="c.label">
            <!-- chase = an add can fix it here; punt / none = the wire has no lever, so route to Trades -->
            <span
              v-if="c.state === 'chase'"
              class="inline-flex items-center gap-1 rounded bg-[#F2B33A]/10 px-2 py-0.5 font-mono text-[10px] text-[#F2B33A]"
              title="an add on the wire can improve this"
            >●{{ c.label }} · {{ c.rank }}</span>
            <router-link
              v-else
              to="/trades"
              class="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] hover:underline"
              :class="c.state === 'punt' ? 'bg-[#f26d6d]/10 text-[#f26d6d]' : 'bg-dark-border/30 text-dark-textMuted'"
              :title="c.state === 'punt' ? 'near-last, nothing on the wire — fix it with a trade' : 'no wire lever here — winnable over time, or trade for it'"
            >{{ c.label }} · {{ c.rank }}<span v-if="c.state === 'punt'"> · punt</span> <span class="opacity-60">→</span></router-link>
          </template>
        </div>
        <p v-if="vm.holes.some((h) => h.state !== 'none')" class="pl-[4.5rem] font-mono text-[9px] text-dark-textMuted">
          ● an add can fix · "punt" = near-last on the wire → trade for it
        </p>
      </section>

      <!-- 1b. HEATING UP — rising-ownership players, grab before your league does -->
      <section
        v-if="vm.heatingUp.length"
        class="rounded-xl border border-[#F2B33A]/25 bg-dark-card px-4 py-3"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-[#F2B33A]">▲ Heating up</p>
        <p class="mt-0.5 font-mono text-[9px] text-dark-textMuted">Getting added across leagues — grab before yours does.</p>
        <div
          v-for="h in vm.heatingUp"
          :key="h.key"
          class="mt-2 flex items-center gap-2 font-mono text-[11px]"
        >
          <Avatar :src="h.headshot" :label="h.name" cls="h-6 w-6 rounded-full" />
          <span class="font-semibold text-dark-text">{{ h.name }}</span>
          <img v-if="h.proLogo" :src="h.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
          <span class="text-dark-textMuted">{{ h.pos }}</span>
          <span v-if="h.why" class="text-dark-textMuted">· {{ h.why }}</span>
          <span class="ml-auto shrink-0 font-mono text-[11px] font-bold text-[#F2B33A]">▲ {{ h.trend }}%</span>
        </div>
      </section>

      <!-- 2. BEST OVERALL (hero) — only when it's a real (non-marginal) upgrade -->
      <section v-if="vm.hero && !vm.slim" class="space-y-2">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">★ Best overall available</p>
        <WireUpgradeCard :u="vm.hero" hero />
      </section>

      <!-- 2b. BEST FOR YOUR HOLES — the best move that targets your weak cats, shown
           only when the overall best doesn't already address them (punt-vs-chase). -->
      <section v-if="vm.heroHoles && !vm.slim" class="space-y-2">
        <p class="font-mono text-[10px] uppercase tracking-widest text-[#F2B33A]">
          ◎ Best for your holes<span v-if="vm.holesLabel"> · {{ vm.holesLabel }}</span>
        </p>
        <p class="font-mono text-[9px] text-dark-textMuted">
          The overall pick above wins more total cats; this one targets your worst cats instead.
        </p>
        <WireUpgradeCard :u="vm.heroHoles" hero />
      </section>

      <!-- 3. MORE UPGRADES -->
      <section v-if="vm.hero && !vm.slim && vm.upgrades.length" class="space-y-2">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">More upgrades</p>
        <p class="font-mono text-[9px] text-dark-textMuted">
          Other adds worth making. You'd make one of these.
        </p>
        <WireUpgradeCard v-for="(u, i) in vm.upgrades" :key="i" :u="u" compact />
      </section>

      <!-- Slim pickings: strong roster, best available is only marginal. Show just
           the single closest move — a list of near-identical +0.1 rows is noise. -->
      <section v-else-if="vm.slim" class="space-y-2">
        <div class="rounded-xl border border-dark-border bg-dark-card px-4 py-4 text-center">
          <p class="font-mono text-[11px] text-dark-textSecondary">Your roster's in good shape.</p>
          <p class="mt-1 font-mono text-[10px] text-dark-textMuted">
            Nothing on the wire clearly upgrades it — closest move below.
          </p>
        </div>
        <WireUpgradeCard v-if="vm.hero" :u="vm.hero" compact />
      </section>

      <!-- Quiet wire -->
      <section
        v-else-if="!vm.hero"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted"
      >
        The wire's quiet, nothing on it upgrades your roster right now.
      </section>

      <!-- 3b. GRADE A MOVE (interactive add/drop grader) -->
      <WireGrader :adds="grader.adds.value" :drops="grader.drops.value" :grade="grader.grade" />

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
          <p class="mt-3 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">
            {{ vm.streamBoard.reliefTitle || 'Relievers' }} watch · best available arms
          </p>
          <div
            v-for="r in vm.streamBoard.relievers"
            :key="r.key"
            class="mt-1.5 flex items-center gap-2 font-mono text-[11px]"
          >
            <Avatar :src="r.headshot" :label="r.name" cls="h-6 w-6 rounded-full" />
            <span class="font-semibold text-dark-text">{{ r.name }}</span>
            <img v-if="r.proLogo" :src="r.proLogo" alt="" @error="onLogoError" class="h-3.5 w-3.5 shrink-0 object-contain" />
            <span class="text-dark-textMuted">{{ r.pos }}</span>
            <span v-if="r.trend >= 3" class="font-mono text-[9px] text-[#F2B33A]" title="rising ownership this week">▲{{ r.trend }}%</span>
            <span class="ml-auto shrink-0 text-primary">{{ r.proj }} proj</span>
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
          <span
            v-if="d.onIL"
            class="rounded border border-[#f2b33a]/50 px-1 font-mono text-[8px] uppercase tracking-wider text-[#f2b33a]"
          >IL</span>
          <span class="text-dark-textMuted">· {{ d.reason }}</span>
          <span class="ml-auto"><ValueBadge :value="d.value" /></span>
        </div>
      </section>
    </template>
  </div>
</template>
