<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWire } from '@/composables/useWire'

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
      <!-- 1. BIGGEST UPGRADE AVAILABLE (hero/accent card) -->
      <section
        v-if="vm.hero"
        class="rounded-xl border border-primary/40 bg-primary/[0.04] px-4 py-3 space-y-1.5"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">
          ★ Biggest upgrade available
        </p>

        <!-- Player name + position/team + delta -->
        <div class="flex items-center gap-2 font-mono text-[12px]">
          <span class="font-bold text-dark-text">+ {{ vm.hero.player.name }}</span>
          <span class="text-dark-textMuted">({{ vm.hero.player.position }}, {{ vm.hero.player.team }})</span>
          <span class="ml-auto shrink-0 font-bold text-primary">
            +{{ vm.hero.deltaEcw.toFixed(1) }} cats/wk
          </span>
        </div>

        <!-- Drop line -->
        <div v-if="vm.hero.dropName" class="font-mono text-[11px] text-dark-textMuted">
          drop {{ vm.hero.dropName }}
        </div>

        <!-- Fixes / holds labels -->
        <div
          v-if="vm.hero.fixesLabels.length || vm.hero.holdsLabels.length"
          class="font-mono text-[10px]"
        >
          <template v-if="vm.hero.fixesLabels.length">
            <span class="text-dark-textSecondary">fixes:</span>
            <span class="ml-1 text-dark-textMuted">{{ vm.hero.fixesLabels.join(' ') }}</span>
          </template>
          <template v-if="vm.hero.fixesLabels.length && vm.hero.holdsLabels.length">
            <span class="text-dark-textMuted"> · </span>
          </template>
          <template v-if="vm.hero.holdsLabels.length">
            <span class="text-dark-textMuted">holds: {{ vm.hero.holdsLabels.join(' ') }}</span>
          </template>
        </div>
      </section>

      <!-- 2. MORE UPGRADES -->
      <section
        v-if="vm.upgrades.length"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 space-y-2"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">More upgrades</p>

        <div
          v-for="u in vm.upgrades"
          :key="u.player.key"
          class="space-y-0.5"
        >
          <!-- Name row -->
          <div class="flex items-center gap-2 font-mono text-[11px]">
            <span class="text-dark-text">{{ u.player.name }}</span>
            <span class="text-dark-textMuted">({{ u.player.position }})</span>
            <span class="ml-auto shrink-0 font-bold text-primary">+{{ u.deltaEcw.toFixed(1) }} cats/wk</span>
          </div>
          <!-- Sub-line: drop + fixes -->
          <div
            v-if="u.dropName || u.fixesLabels.length"
            class="font-mono text-[10px] text-dark-textMuted"
          >
            <template v-if="u.dropName">drop {{ u.dropName }}</template>
            <template v-if="u.dropName && u.fixesLabels.length"> · </template>
            <template v-if="u.fixesLabels.length">fixes {{ u.fixesLabels.join(' ') }}</template>
          </div>
        </div>
      </section>

      <!-- 3. QUIET WIRE (no hero and no upgrades) -->
      <div
        v-else-if="!vm.hero"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center font-mono text-sm text-dark-textMuted"
      >
        The wire's quiet, nothing on it upgrades your roster right now.
      </div>

      <!-- 4. STREAM BOARD -->
      <section
        v-if="vm.streamBoard.starters.length || vm.streamBoard.relievers.length"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 space-y-2"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Stream board</p>

        <!-- Weak cats sub-line -->
        <p
          v-if="vm.streamBoard.weakCats.length"
          class="font-mono text-[10px] text-dark-textMuted"
        >
          for your weak cats: {{ vm.streamBoard.weakCats.map(c => c.label).join(' ') }}
        </p>

        <!-- Starters -->
        <div v-if="vm.streamBoard.starters.length" class="space-y-1.5">
          <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">starters</p>
          <div
            v-for="s in vm.streamBoard.starters"
            :key="s.player.key"
            class="flex flex-col gap-0.5"
          >
            <div class="flex items-center gap-2 font-mono text-[11px]">
              <span class="font-bold text-dark-text">{{ s.player.name }}</span>
              <span class="text-dark-textMuted">({{ s.player.team }})</span>
              <span
                v-if="s.twoStart"
                class="shrink-0 rounded border border-[#1f6f86] px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[#5ec8e6]"
              >TWO-START</span>
            </div>
            <div class="font-mono text-[10px] text-dark-textMuted">{{ s.rationale }}</div>
          </div>
        </div>

        <!-- Relievers -->
        <div v-if="vm.streamBoard.relievers.length" class="space-y-1.5">
          <p class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">relievers</p>
          <div
            v-for="r in vm.streamBoard.relievers"
            :key="r.player.key"
            class="flex flex-col gap-0.5"
          >
            <div class="flex items-center gap-2 font-mono text-[11px]">
              <span class="font-bold text-dark-text">{{ r.player.name }}</span>
              <span class="text-dark-textMuted">({{ r.player.team }})</span>
            </div>
            <div class="font-mono text-[10px] text-dark-textMuted">{{ r.rationale }}</div>
          </div>
        </div>
      </section>

      <!-- 5. WHO TO DROP -->
      <section
        v-if="vm.drops.length"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 space-y-2"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Who to drop</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="d in vm.drops"
            :key="d.key"
            class="inline-flex items-center gap-1 rounded bg-dark-border/60 px-2 py-1 font-mono text-[10px] text-dark-textSecondary"
          >
            <span class="font-semibold">{{ d.name }}</span>
            <span v-if="d.reason" class="opacity-70">· {{ d.reason }}</span>
          </span>
        </div>
      </section>
    </template>
  </div>
</template>
