<script setup lang="ts">
import { computed } from 'vue'
import { useMatchupBattlePlan } from '@/composables/useMatchupBattlePlan'
import type { StakesMode } from '@/myteam/seasonStakes'
import Avatar from '@/components/trades/Avatar.vue'
import MatchupWinProbChart from '@/components/matchup/MatchupWinProbChart.vue'

const { vm, cadence, override, trend } = useMatchupBattlePlan()

const STAKES_OPTIONS: Array<{ value: StakesMode | 'auto'; label: string }> = [
  { value: 'auto', label: 'auto' },
  { value: 'clinch', label: 'clinch' },
  { value: 'maximize', label: 'maximize' },
  { value: 'must-win', label: 'must-win' },
  { value: 'coast', label: 'coast' },
]

const noMatchup = computed(
  () =>
    vm.value.ready &&
    vm.value.swingMoves.length === 0 &&
    vm.value.coinFlips.length === 0 &&
    vm.value.leaning.length === 0 &&
    vm.value.volumeCats.length === 0 &&
    vm.value.banked.length === 0 &&
    vm.value.conceded.length === 0 &&
    vm.value.swing.length === 0,
)
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6 space-y-3">
    <!-- Page header -->
    <header class="space-y-1">
      <h1 class="font-display text-2xl font-bold text-dark-text">Matchup</h1>
      <p class="font-mono text-xs text-dark-textMuted">Win this week — fight the contested categories.</p>
    </header>

    <!-- Loading state -->
    <div v-if="!vm.ready" class="rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted">
      Loading your matchup…
    </div>

    <!-- No active matchup -->
    <div v-else-if="noMatchup" class="rounded-xl border border-dark-border bg-dark-card px-4 py-6 text-center text-sm text-dark-textMuted">
      No active matchup this week.
    </div>

    <template v-else>
      <!-- 1. VERSUS HEADER -->
      <section class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <!-- vs row -->
        <div class="flex items-center justify-between gap-3">
          <!-- Me (left) -->
          <div class="flex items-center gap-2">
            <Avatar :src="vm.me.avatar" :label="vm.me.name" cls="h-8 w-8 rounded-lg" />
            <div>
              <div class="text-[13px] font-bold text-dark-text">{{ vm.me.name }}</div>
              <div class="font-mono text-lg font-extrabold leading-none text-[#5ec8e6]">{{ vm.me.winPct }}%</div>
            </div>
          </div>

          <!-- Center meta + cadence toggle -->
          <div class="flex flex-col items-center gap-1.5">
            <div class="font-mono text-[10px] text-dark-textMuted">Week {{ vm.week }} · ⚔ · {{ vm.daysLeft }}d left</div>
            <!-- Daily/Weekly toggle -->
            <div class="inline-flex items-center gap-0.5 rounded-md border border-dark-border p-0.5 font-mono text-[9px]">
              <button
                type="button"
                class="rounded px-2 py-0.5 transition-colors"
                :class="cadence === 'daily' ? 'bg-dark-border text-dark-text' : 'text-dark-textMuted hover:text-dark-textSecondary'"
                @click="cadence = 'daily'"
              >daily</button>
              <button
                type="button"
                class="rounded px-2 py-0.5 transition-colors"
                :class="cadence === 'weekly' ? 'bg-dark-border text-dark-text' : 'text-dark-textMuted hover:text-dark-textSecondary'"
                @click="cadence = 'weekly'"
              >weekly</button>
            </div>
          </div>

          <!-- Opp (right) -->
          <div class="flex flex-row-reverse items-center gap-2">
            <Avatar :src="vm.opp.avatar" :label="vm.opp.name" cls="h-8 w-8 rounded-lg" />
            <div class="text-right">
              <div class="text-[13px] font-bold text-dark-text">{{ vm.opp.name }}</div>
              <div class="font-mono text-lg font-extrabold leading-none text-[#e69a4a]">{{ vm.opp.winPct }}%</div>
            </div>
          </div>
        </div>

        <!-- Subline -->
        <div class="mt-1.5 text-center font-mono text-[10px] text-dark-textMuted">
          {{ vm.tiePct }}% tie · projected {{ vm.projWins }}–{{ vm.projLosses }}
        </div>
      </section>

      <!-- 1b. WIN-PROBABILITY TREND — real captured history + flat projection -->
      <section v-if="trend.points.length" class="rounded-xl border border-dark-border bg-dark-card px-4 pt-3 pb-1">
        <div class="flex items-center justify-between">
          <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Win-probability trend</p>
          <p class="font-mono text-[9px] text-dark-textMuted">solid = actual · dotted = projected</p>
        </div>
        <MatchupWinProbChart
          :points="trend.points"
          :projected="trend.projected"
          :me-name="vm.me.name"
          :opp-name="vm.opp.name"
        />
        <p v-if="trend.points.length < 2" class="-mt-1 mb-1 text-center font-mono text-[9px] text-dark-textMuted">
          Building your history — the solid line fills in each day you check.
        </p>
      </section>

      <!-- 2. STAKES READ -->
      <section class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 space-y-2">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Stakes</p>
        <p class="font-mono text-[11px] text-dark-text">{{ vm.stakes.reasoning }}</p>
        <!-- Goal override segmented control -->
        <p class="mb-1 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">goal</p>
        <div class="flex flex-wrap items-center gap-0.5 rounded-md border border-dark-border bg-dark-bg p-0.5 w-fit">
          <button
            v-for="opt in STAKES_OPTIONS"
            :key="opt.value"
            type="button"
            class="rounded px-2 py-0.5 font-mono text-[9px] transition-colors"
            :class="override === opt.value ? 'bg-dark-border text-dark-text' : 'text-dark-textMuted hover:text-dark-textSecondary'"
            @click="override = opt.value"
          >{{ opt.label }}</button>
        </div>
      </section>

      <!-- 3. YOUR PATH (hero/accent card) -->
      <section class="rounded-xl border border-primary/40 bg-primary/[0.04] px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">★ Your path</p>
        <p class="mt-1.5 font-mono text-[12px] text-dark-text">{{ vm.path }}</p>
      </section>

      <!-- 4. VOLUME EDGE (hidden when read is empty) -->
      <section v-if="vm.volume.read || vm.volumeCats.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Volume edge</p>
        <p v-if="vm.volume.read" class="mt-1.5 font-mono text-[11px] text-dark-text">{{ vm.volume.read }}</p>
        <!-- In-play volume cats: won by games, not a waiver move -->
        <div v-if="vm.volumeCats.length" class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="font-mono text-[9px] uppercase tracking-widest text-dark-textMuted">in play</span>
          <span
            v-for="vcat in vm.volumeCats"
            :key="vcat.statId"
            class="inline-flex items-center gap-1 rounded bg-dark-border/60 px-2 py-1 font-mono text-[10px] text-dark-textSecondary"
          >
            <span class="font-semibold">{{ vcat.label }}</span>
            <span class="opacity-70">{{ vcat.myWinPct }}%</span>
          </span>
        </div>
      </section>

      <!-- 5. MOVES THAT SWING IT (the to-do list — one row per move) -->
      <section v-if="vm.swingMoves.length" class="rounded-xl border border-primary/40 bg-primary/[0.04] px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-primary">★ Moves that swing it</p>
        <div class="mt-2 space-y-2">
          <div v-for="(m, i) in vm.swingMoves" :key="i" class="font-mono text-[11px]">
            <!-- Action + lift -->
            <div class="flex items-center gap-1.5 text-dark-text">
              <span
                v-if="m.today"
                class="shrink-0 rounded border border-[#1f6f86] px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[#5ec8e6]"
              >TODAY</span>
              <span class="min-w-0 truncate">{{ m.text }}</span>
              <span class="ml-auto shrink-0 font-bold text-primary">+{{ m.lift }}%</span>
            </div>
            <!-- Cats it swings -->
            <div class="mt-0.5 text-[10px] text-dark-textMuted">
              swings {{ m.cats.map((c) => `${c.label} ${c.myWinPct}%`).join(' · ') }}
            </div>
          </div>
        </div>
      </section>

      <!-- 6. COIN-FLIPS (the tight 45–55 holds with no lever — they decide the week) -->
      <section v-if="vm.coinFlips.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-[#F2B33A]">Coin-flips · let them ride</p>
        <p class="mt-1 font-mono text-[9px] text-dark-textMuted">No move beats your lineup here — these come down to the games.</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="c in vm.coinFlips"
            :key="c.statId"
            class="inline-flex items-center gap-1 rounded bg-[#F2B33A]/[0.08] px-2 py-1 font-mono text-[10px] text-[#F2B33A]"
          >
            <span class="font-semibold">{{ c.label }}</span>
            <span class="opacity-70">{{ c.myWinPct }}%</span>
          </span>
        </div>
      </section>

      <!-- 6b. LEANING (near-decided contested cats) — de-emphasized -->
      <section v-if="vm.leaning.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Leaning · lower priority</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="l in vm.leaning"
            :key="l.statId"
            class="inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px]"
            :class="l.dir === 'win'
              ? 'bg-primary/[0.07] text-primary/80'
              : 'bg-[#ff6b6b]/[0.07] text-[#ff6b6b]/80'"
          >
            <span class="font-semibold">{{ l.label }}</span>
            <span class="opacity-70">{{ l.myWinPct }}%</span>
          </span>
        </div>
      </section>

      <!-- 7. LINEUP CHECK — a card only when there's a problem to fix -->
      <section
        v-if="vm.lineupCheck && !vm.lineupCheck.ok"
        class="rounded-xl border border-[#F2B33A]/40 bg-dark-card px-4 py-3"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Lineup check</p>
        <p class="mt-1.5 font-mono text-[11px] text-[#F2B33A]">⚠ {{ vm.lineupCheck.message }}</p>
      </section>

      <!-- 8. LEDGER — banked / worth-a-swing / conceded, compact reference -->
      <section
        v-if="vm.banked.length || vm.swing.length || vm.conceded.length"
        class="rounded-xl border border-dark-border bg-dark-card px-4 py-3 space-y-1.5 font-mono text-[10px]"
      >
        <div v-if="vm.banked.length" class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span class="w-20 shrink-0 uppercase tracking-widest text-dark-textMuted">Banked</span>
          <span class="text-primary">{{ vm.banked.map((b) => b.label).join('  ·  ') }}</span>
        </div>
        <div v-if="vm.swing.length" class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span class="w-20 shrink-0 uppercase tracking-widest text-dark-textMuted">Swing</span>
          <span class="text-dark-textSecondary">{{ vm.swing.map((s) => s.label).join('  ·  ') }}</span>
        </div>
        <div v-if="vm.conceded.length" class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span class="w-20 shrink-0 uppercase tracking-widest text-dark-textMuted">Conceded</span>
          <span class="text-[#ff6b6b]/70 line-through">{{ vm.conceded.map((c) => c.label).join('  ·  ') }}</span>
        </div>
      </section>

      <!-- Lineup OK: a quiet footnote, not a card -->
      <p
        v-if="vm.lineupCheck && vm.lineupCheck.ok"
        class="px-1 font-mono text-[10px] text-dark-textMuted"
      >✓ {{ vm.lineupCheck.message }}</p>
    </template>
  </div>
</template>
