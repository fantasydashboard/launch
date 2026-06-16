<script setup lang="ts">
import { computed } from 'vue'
import { useMatchupBattlePlan } from '@/composables/useMatchupBattlePlan'
import type { StakesMode } from '@/myteam/seasonStakes'
import Avatar from '@/components/trades/Avatar.vue'

const { vm, cadence, override } = useMatchupBattlePlan()

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
    vm.value.coinFlips.length === 0 &&
    vm.value.leaning.length === 0 &&
    vm.value.banked.length === 0 &&
    vm.value.conceded.length === 0 &&
    vm.value.swing.length === 0,
)

// "Fight these" only reads true when there's actually a lever to pull. When every
// coin-flip is held, the section is a read-out of what decides the week, not a
// to-do list — so the heading shouldn't imply action that isn't there.
const coinFlipsHaveMoves = computed(() => vm.value.coinFlips.some((c) => c.move))
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
      <section v-if="vm.volume.read" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Volume edge</p>
        <p class="mt-1.5 font-mono text-[11px] text-dark-text">{{ vm.volume.read }}</p>
      </section>

      <!-- 5. COIN-FLIPS (the tight 45–55 swing cats) -->
      <section v-if="vm.coinFlips.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-[#F2B33A]">
          Coin-flips · {{ coinFlipsHaveMoves ? 'fight these' : 'these decide the week' }}
        </p>
        <div class="mt-2 space-y-1">
          <div
            v-for="c in vm.coinFlips"
            :key="c.statId"
            class="flex items-center gap-2 font-mono text-[11px]"
          >
            <!-- Category label -->
            <span class="w-12 shrink-0 font-semibold text-dark-text">{{ c.label }}</span>
            <!-- Win pct -->
            <span class="w-10 shrink-0 text-[#F2B33A]">{{ c.myWinPct }}%</span>
            <!-- Move (the lever) — bright; otherwise a quiet hold marker -->
            <span v-if="c.move" class="flex min-w-0 flex-1 items-center gap-1.5 text-dark-textSecondary">
              <span
                v-if="c.move.today"
                class="shrink-0 rounded border border-[#1f6f86] px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-[#5ec8e6]"
              >TODAY</span>
              <span class="min-w-0 truncate">{{ c.move.text }}</span>
              <span class="ml-auto shrink-0 font-semibold text-primary">+{{ c.move.lift }}%</span>
            </span>
            <span v-else class="flex-1 text-[10px] text-dark-textMuted">hold — let it ride</span>
          </div>
        </div>
      </section>

      <!-- 5b. LEANING (near-decided contested cats + volume cats) — de-emphasized -->
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
            <span v-if="l.accumulator" class="opacity-60">· volume</span>
          </span>
        </div>
      </section>

      <!-- 6. LINEUP CHECK (only when non-null) -->
      <section
        v-if="vm.lineupCheck !== null"
        class="rounded-xl border bg-dark-card px-4 py-3"
        :class="vm.lineupCheck.ok ? 'border-dark-border' : 'border-[#F2B33A]/40'"
      >
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Lineup check</p>
        <p
          class="mt-1.5 font-mono text-[11px]"
          :class="vm.lineupCheck.ok ? 'text-primary' : 'text-[#F2B33A]'"
        >
          {{ vm.lineupCheck.ok ? '✓ ' : '⚠ ' }}{{ vm.lineupCheck.message }}
        </p>
      </section>

      <!-- 7a. BANKED -->
      <section v-if="vm.banked.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Banked</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="b in vm.banked"
            :key="b.statId"
            class="inline-block rounded bg-primary/10 px-2 py-1 font-mono text-[10px] font-semibold text-primary"
          >{{ b.label }}</span>
        </div>
      </section>

      <!-- 7b. CONCEDED -->
      <section v-if="vm.conceded.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Conceded · don't spend here</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="c in vm.conceded"
            :key="c.statId"
            class="inline-block rounded bg-[#ff6b6b]/10 px-2 py-1 font-mono text-[10px] font-semibold text-[#ff6b6b] line-through opacity-70"
          >{{ c.label }}</span>
        </div>
      </section>

      <!-- 7c. WORTH A SWING -->
      <section v-if="vm.swing.length" class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Worth a swing</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="s in vm.swing"
            :key="s.statId"
            class="inline-block rounded bg-dark-border px-2 py-1 font-mono text-[10px] font-semibold text-dark-textSecondary"
          >{{ s.label }}</span>
        </div>
      </section>
    </template>
  </div>
</template>
