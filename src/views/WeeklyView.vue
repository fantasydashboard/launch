<script setup lang="ts">
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { useWeeklyBoard } from '@/composables/useWeeklyBoard'

const { board, live, currentWeek, hasCurrentLineup, loading, myTeamName, myTeamLogo } = useWeeklyBoard()

const teamLogo = (abbr?: string) => nflTeamLogo(abbr)
const round = (n: number) => Math.round(n)
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <header class="mb-4">
      <h1 class="font-display text-2xl font-bold text-dark-text">This Week</h1>
      <p class="font-mono text-xs text-dark-textMuted">Set your lineup. Stream the edge.</p>
    </header>

    <div v-if="loading && !board" class="py-16 text-center text-dark-textMuted">Loading this week…</div>

    <!-- Offseason / no live week -->
    <div v-else-if="!live" class="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
      <p class="font-display text-sm font-semibold text-dark-text">No games this week</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">Weekly start/sit returns when the season kicks off — check My Team for rest-of-season value.</p>
    </div>

    <div v-else-if="!board" class="py-16 text-center text-dark-textMuted">Couldn't assemble this week's board.</div>

    <template v-else>
      <!--
        The fantasy matchup, at the top of the page you actually set your lineup on. It used
        to live on its own tab, computed from a different (baseball) model — so the margin
        there could not be checked against the rows here. Same weekly points now drive both.
      -->
      <section v-if="board.matchup" class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
        <div class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">Week {{ currentWeek }}</div>
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <img v-if="myTeamLogo" :src="myTeamLogo" alt="" @error="onLogoErr" class="h-9 w-9 shrink-0 rounded-lg bg-dark-border object-cover" />
            <div class="min-w-0">
              <div class="truncate text-[13px] font-bold text-dark-text">{{ myTeamName }}</div>
              <div class="font-mono text-lg font-extrabold leading-none text-primary">{{ round(board.matchup.myPoints) }}</div>
            </div>
          </div>
          <div class="shrink-0 text-center">
            <div class="font-mono text-[10px] text-dark-textMuted">projected</div>
            <div class="font-mono text-[11px] font-bold" :class="board.matchup.margin >= 0 ? 'text-primary' : 'text-[#FF5C5C]'">
              {{ board.matchup.margin >= 0 ? 'you +' : 'them +' }}{{ Math.abs(round(board.matchup.margin)) }}
            </div>
            <div class="font-mono text-[10px] text-dark-textMuted">{{ board.matchup.myWinPct }}% to win</div>
          </div>
          <div class="flex min-w-0 items-center justify-end gap-2 text-right">
            <div class="min-w-0">
              <div class="truncate text-[13px] font-bold text-dark-text">{{ board.matchup.opponentName }}</div>
              <div class="font-mono text-lg font-extrabold leading-none text-[#e69a4a]">{{ round(board.matchup.oppPoints) }}</div>
            </div>
            <img v-if="board.matchup.opponentLogo" :src="board.matchup.opponentLogo" alt="" @error="onLogoErr" class="h-9 w-9 shrink-0 rounded-lg bg-dark-border object-cover" />
          </div>
        </div>
      </section>

      <!-- A started player on a bye is points you forfeit outright — loudest thing on the page. -->
      <div v-if="board.byeStarters.length" class="mb-5 rounded-xl border border-[#FF5C5C]/40 bg-[#FF5C5C]/[0.06] px-4 py-3">
        <p class="font-display text-xs font-semibold uppercase tracking-wide text-[#FF5C5C]">
          {{ board.byeStarters.length }} starter{{ board.byeStarters.length > 1 ? 's' : '' }} on bye
        </p>
        <p class="mt-1 font-mono text-[11px] text-dark-textSecondary">
          {{ board.byeStarters.map((b) => b.name).join(' · ') }} — zero points unless you move them.
        </p>
      </div>

      <!-- 1. START/SIT MOVES -->
      <section v-if="board.moves.length" class="mb-5 rounded-xl border border-primary/40 bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-primary">★ Start / sit moves</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">your set lineup vs the best lineup for week {{ currentWeek }}</p>
        <template v-for="(m, i) in board.moves" :key="'mv-' + i">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2.5 last:border-0">
            <span class="min-w-0 flex-1 text-sm text-dark-text">
              <span class="font-mono text-[10px] uppercase text-primary">start</span> <span class="font-semibold">{{ m.startName }}</span>
              <span class="block text-xs text-dark-textMuted">
                <span class="font-mono text-[10px] uppercase">{{ m.kind === 'bye' ? 'bye — sub' : 'sit' }}</span> {{ m.sitName }}
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="font-mono text-sm font-bold text-primary">+{{ m.gain }}</span>
              <span class="block font-mono text-[9px] uppercase text-dark-textMuted">wk pts</span>
            </span>
          </div>
        </template>
      </section>
      <!-- Only claim the lineup is optimal when we actually know what's set (Sleeper). -->
      <p v-else-if="hasCurrentLineup" class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3 font-mono text-[11px] text-dark-textMuted">
        ✓ Your lineup is already optimal for week {{ currentWeek }}.
      </p>

      <!-- 2. OPTIMAL LINEUP -->
      <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Best lineup <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· week {{ currentWeek }} projections · pts/wk</span>
        </h2>
        <template v-for="s in board.starters" :key="'st-' + s.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ s.slot }}</span>
            <img v-if="s.headshot" :src="s.headshot" :alt="s.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ s.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ s.name }}
                <span v-if="s.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400" title="Healthy backup — the starter ahead of him is injured">step-up</span>
              </span>
              <span class="flex items-center gap-1 text-xs text-dark-textMuted">
                {{ s.position }}
                <template v-if="s.bye"> · <span class="text-[#FF5C5C]">BYE</span></template>
                <template v-else-if="s.opponent"> · {{ s.home ? 'vs' : '@' }} <img :src="teamLogo(s.opponent)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ s.opponent }}</template>
              </span>
            </span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(s.weekPoints) }}</span>
          </div>
        </template>
      </section>

      <!--
        Where the week is actually decided. The optimizer is confident about the top of a
        lineup and nearly indifferent at the bottom; only the second kind is worth a
        manager's attention, and "already optimal" was hiding it behind a checkmark.
      -->
      <section v-if="board.closeCalls.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Closest calls</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">near coin-flips — the projection barely separates these</p>
        <template v-for="(c, i) in board.closeCalls" :key="'cc-' + i">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ c.slot }}</span>
            <span class="min-w-0 flex-1 text-sm">
              <span class="text-dark-text">{{ c.startName }}</span>
              <span class="font-mono text-[11px] text-dark-textMuted"> {{ round(c.startPoints) }}</span>
              <span class="mx-1.5 text-dark-textMuted">over</span>
              <span class="text-dark-textMuted">{{ c.sitName }}</span>
              <span class="font-mono text-[11px] text-dark-textMuted"> {{ round(c.sitPoints) }}</span>
            </span>
            <span class="shrink-0 text-right font-mono text-[11px] text-dark-textMuted">by {{ c.gap.toFixed(1) }}</span>
          </div>
        </template>
      </section>

      <!-- 3. BENCH -->
      <section v-if="board.bench.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Bench</h2>
        <template v-for="b in board.bench" :key="'bn-' + b.playerKey">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-1.5 text-sm last:border-0">
            <span class="min-w-0 flex-1 truncate text-dark-textMuted">
              {{ b.name }} <span class="text-[11px]">{{ b.position }}</span>
              <span v-if="b.bye" class="ml-1 text-[10px] text-[#FF5C5C]">BYE</span>
            </span>
            <span class="w-12 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(b.weekPoints) }}</span>
          </div>
        </template>
      </section>

      <!-- 4. STREAMERS -->
      <section v-if="board.streamers.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Streamers</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">best free agents for week {{ currentWeek }}</p>
        <template v-for="r in board.streamers" :key="'sm-' + (r.player.playerKey ?? r.player.name)">
          <div class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
            <img v-if="r.player.headshot" :src="r.player.headshot" :alt="r.player.name" loading="lazy" @error="onLogoErr" class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[10px] text-dark-textMuted">{{ r.player.position }}</span>
            <span class="min-w-0 flex-1">
              <span class="truncate text-sm font-semibold text-dark-text">
                {{ r.player.name }}
                <span v-if="r.opportunity === 'backup-elevated'" class="ml-1 rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] uppercase text-amber-400">step-up</span>
              </span>
              <span class="text-xs text-dark-textMuted">{{ r.player.position }} · {{ r.player.team }}</span>
            </span>
            <span v-if="r.streamOf > 0" class="shrink-0 rounded bg-dark-border/50 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">startable {{ r.streamWeeks }}/{{ r.streamOf }}</span>
            <span class="w-12 shrink-0 text-right font-mono text-sm text-dark-text">{{ round(r.weekPoints) }}</span>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>
