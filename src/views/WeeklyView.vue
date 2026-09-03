<script setup lang="ts">
import { nflTeamLogo } from '@/players/nflTeamLogo'
import { computed, ref, watch } from 'vue'
import { useWeeklyBoard } from '@/composables/useWeeklyBoard'
import { winPctFromMargin } from '@/football/weeklyBoard'

const { board, live, currentWeek, hasCurrentLineup, loading, myTeamName, myTeamLogo, stakes } = useWeeklyBoard()

/*
 * Header totals are summed from the ROUNDED row values, not rounded from the raw sum.
 * Rounding the true total gave 142 above a column of nine numbers that add to 143, and a
 * reader who checks the arithmetic — exactly the reader worth having — finds the page
 * contradicting itself. The margin is derived the same way so it agrees with both totals.
 */
const myTotal = computed(() => board.value?.starters.reduce((sum, s) => sum + Math.round(s.weekPoints), 0) ?? 0)
const oppTotal = computed(() => Math.round(board.value?.matchup?.oppPoints ?? 0))
const margin = computed(() => myTotal.value - oppTotal.value)
/* Win% from the margin the page PRINTS, not the raw one. Deriving it from the unrounded
   margin put "you +8" beside "60% to win" when eight points is 62%. */
const winPct = computed(() => winPctFromMargin(margin.value))

// Matchup detail: their lineup and the season read. Closed by default — the page's job is
// still your lineup, and this is the evidence behind the scoreboard above it.
const matchupOpen = ref(false)

/* The strategic read, restored from the Matchup page. Volume is a baseball lever — football
   gives both rosters one game each — so the football branch talks about the lineup instead. */
const path = computed(() => {
  const m = board.value?.matchup
  const st = stakes.value
  if (!m || !st) return ''
  const lever = winPct.value >= 55
    ? 'your starters carry it — just make sure none are on bye'
    : 'the margin is in your flex spots and any start/sit you get wrong'
  switch (st.mode) {
    case 'coast':
      return st.coastKind === 'eliminated'
        ? 'Out of reach for the bracket — conserve your moves, no need to chase this week.'
        : 'Locked into the bracket — rest your guys and pick your spots.'
    case 'must-win':
      return `Must-win — empty the tank: ${lever}.`
    case 'maximize':
      return `Every win is seeding — push: ${lever}.`
    case 'clinch':
      return winPct.value >= 55
        ? 'Comfortably in and favored — bank the win, no need to overspend.'
        : "Comfortably in but an underdog — your season's fine, so don't chase it."
    default:
      return winPct.value >= 55
        ? `You're favored — protect it: ${lever}.`
        : winPct.value <= 45
          ? `Underdog this week — ${lever}.`
          : `Coin-flip week — ${lever}.`
  }
})

const teamLogo = (abbr?: string) => nflTeamLogo(abbr)
const round = (n: number) => Math.round(n)
/* Position rank always; flex rank only when the league's flex can actually take him, so a QB
   in a non-superflex league doesn't get a meaningless number beside his name. */
/* The weekly rankings board. Open by default: this is a reason to visit the page, not a
   footnote — the same reasoning that took The Wire's board out from behind a "+". */
const boardOpen = ref(true)
const boardPos = ref('RB')
const boardPositions = computed(() => board.value?.boardPositions ?? [])
watch(boardPositions, (avail) => {
  if (avail.length && !avail.includes(boardPos.value)) boardPos.value = avail[0]
}, { immediate: true })
/* Your own players are always shown, even when they fall outside the visible top of the
   list — a board that truncates away the guy you are deciding about answers nothing. */
const BOARD_LIMIT = 30
const boardRows = computed(() => {
  const rows = board.value?.board[boardPos.value] ?? []
  const head = rows.slice(0, BOARD_LIMIT)
  const mineBelow = rows.slice(BOARD_LIMIT).filter((r) => r.owner === 'me')
  return [...head, ...mineBelow]
})
const OWNER_BADGE: Record<string, { label: string; cls: string }> = {
  me: { label: 'you', cls: 'bg-primary/15 text-primary' },
  opp: { label: 'vs', cls: 'bg-[#e69a4a]/15 text-[#e69a4a]' },
  free: { label: 'free', cls: 'bg-[#4ade80]/15 text-[#4ade80]' },
  other: { label: '', cls: '' },
}

const rankLabel = (r: { position: string; posRank: number; flexRank: number }): string => {
  const parts: string[] = []
  if (r.posRank) parts.push(`${(r.position || '').toUpperCase().split(/[,/|]/)[0]}${r.posRank}`)
  if (r.flexRank) parts.push(`FLX${r.flexRank}`)
  return parts.join(' · ')
}
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
              <div class="font-mono text-lg font-extrabold leading-none text-primary">{{ myTotal }}</div>
            </div>
          </div>
          <div class="shrink-0 text-center">
            <div class="font-mono text-[10px] text-dark-textMuted">projected</div>
            <div class="font-mono text-[11px] font-bold" :class="margin >= 0 ? 'text-primary' : 'text-[#FF5C5C]'">
              {{ margin >= 0 ? 'you +' : 'them +' }}{{ Math.abs(margin) }}
            </div>
            <div class="font-mono text-[10px] text-dark-textMuted">{{ winPct }}% to win</div>
          </div>
          <div class="flex min-w-0 items-center justify-end gap-2 text-right">
            <div class="min-w-0">
              <div class="truncate text-[13px] font-bold text-dark-text">{{ board.matchup.opponentName }}</div>
              <div class="font-mono text-lg font-extrabold leading-none text-[#e69a4a]">{{ oppTotal }}</div>
            </div>
            <img v-if="board.matchup.opponentLogo" :src="board.matchup.opponentLogo" alt="" @error="onLogoErr" class="h-9 w-9 shrink-0 rounded-lg bg-dark-border object-cover" />
          </div>
        </div>
      </section>

      <!--
        The rest of what the Matchup page held: their lineup, the season read, and the empty-slot
        warning. All of it was stranded when that tab was hidden for football, including fixes
        written for it days earlier. Closed by default — the page is still your lineup, and this
        is the evidence behind the scoreboard above.
      -->
      <section v-if="board.matchup" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <button class="flex w-full items-center justify-between" @click="matchupOpen = !matchupOpen">
          <span class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            The matchup
            <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
              · {{ board.matchup.opponentName }}'s lineup{{ stakes ? ' · what the week is worth' : '' }}
            </span>
          </span>
          <span class="font-mono text-dark-textMuted">{{ matchupOpen ? '−' : '+' }}</span>
        </button>

        <div v-if="matchupOpen" class="mt-3">
          <!-- Their idle starters: you can't change their lineup, but this is your real margin. -->
          <p v-if="board.matchup.oppByes.length" class="mb-3 rounded-lg bg-primary/10 px-3 py-2 font-mono text-[11px] text-primary">
            {{ board.matchup.oppByes.length }} of their starters {{ board.matchup.oppByes.length > 1 ? 'are' : 'is' }} on bye
            ({{ board.matchup.oppByes.map((o) => o.name).join(' · ') }}) — your edge is bigger than the projection says.
          </p>

          <p v-if="stakes" class="mb-1 font-mono text-[11px] text-dark-textSecondary">{{ stakes.reasoning }}</p>
          <p v-if="path" class="mb-3 text-sm text-dark-text">{{ path }}</p>

          <p v-if="board.emptySlots > 0" class="mb-3 rounded-lg bg-[#FF5C5C]/10 px-3 py-2 text-sm text-[#FF5C5C]">
            You're leaving {{ board.emptySlots }} starting slot{{ board.emptySlots > 1 ? 's' : '' }} empty —
            that's points forfeited, not lost. Plug a body before kickoff.
          </p>

          <p class="mb-2 font-mono text-[10px] uppercase tracking-wider text-dark-textMuted">
            {{ board.matchup.opponentName }} — projected starters
          </p>
          <div v-for="(o, i) in board.matchup.oppStarters" :key="'os-' + i"
               class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm last:border-0">
            <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ o.slot }}</span>
            <img v-if="o.headshot" :src="o.headshot" :alt="o.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
            <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
            <span class="min-w-0 flex-1 truncate text-dark-textSecondary">
              {{ o.name }} <span class="text-[11px] text-dark-textMuted">{{ o.position }}</span>
              <span v-if="o.bye" class="ml-1 font-mono text-[9px] uppercase text-[#FF5C5C]">bye</span>
            </span>
            <span class="w-10 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(o.weekPoints) }}</span>
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
          Best lineup
          <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
            · week {{ currentWeek }} · pts/wk · rank among rostered players and free agents
          </span>
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
            <span class="w-20 shrink-0 text-right">
              <span class="block font-mono text-sm text-dark-text">{{ round(s.weekPoints) }}</span>
              <span class="block font-mono text-[9px] text-dark-textMuted/70">{{ rankLabel(s) }}</span>
            </span>
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
              <span class="font-mono text-[11px] text-dark-textMuted"> {{ c.startPoints.toFixed(1) }}</span>
              <span class="mx-1.5 text-dark-textMuted">over</span>
              <span class="text-dark-textMuted">{{ c.sitName }}</span>
              <span class="font-mono text-[11px] text-dark-textMuted"> {{ c.sitPoints.toFixed(1) }}</span>
            </span>
            <span class="shrink-0 text-right font-mono text-[11px] text-dark-textMuted">by {{ c.gap.toFixed(1) }}</span>
          </div>
        </template>
      </section>

      <!-- 3. BENCH -->
      <section v-if="board.bench.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Bench</h2>
        <template v-for="b in board.bench" :key="'bn-' + b.playerKey">
          <div class="flex items-center gap-2.5 border-b border-dark-border/40 py-1 text-sm last:border-0">
            <span class="min-w-0 flex-1 truncate text-dark-textMuted">
              {{ b.name }} <span class="text-[11px]">{{ b.position }}</span>
              <span v-if="b.bye" class="ml-1 text-[10px] text-[#FF5C5C]">BYE</span>
            </span>
            <!-- One line, not a stacked block: the bench is a reference list, and five
                 two-line rows took as much room as the lineup they support. -->
            <span class="shrink-0 font-mono text-[9px] text-dark-textMuted/60">{{ rankLabel(b) }}</span>
            <span class="w-8 shrink-0 text-right font-mono text-xs text-dark-textMuted">{{ round(b.weekPoints) }}</span>
          </div>
        </template>
      </section>

      <!--
        The weekly rankings board. Same shape as The Wire's, different clock — and the clock is
        stated loudly on both, because two identically-shaped tables are otherwise just one
        table shown twice. The badges are what make it answer three questions at once: where
        my guys sit, what's free, and what my opponent is holding.
      -->
      <section v-if="board.boardPositions.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <button class="flex w-full items-center justify-between" @click="boardOpen = !boardOpen">
          <span class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            This week's rankings
            <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">· your roster, the wire and the league</span>
          </span>
          <span class="font-mono text-dark-textMuted">{{ boardOpen ? '−' : '+' }}</span>
        </button>

        <div v-if="boardOpen" class="mt-3">
          <div class="mb-2 flex flex-wrap gap-1.5">
            <button
              v-for="pos in board.boardPositions"
              :key="'bp-' + pos"
              class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
              :class="boardPos === pos ? 'bg-primary/20 text-primary' : 'bg-dark-bg text-dark-textMuted hover:text-dark-text'"
              @click="boardPos = pos"
            >{{ pos }}</button>
          </div>
          <p class="mb-2 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted/70">
            <span class="text-primary">you</span> ·
            <span class="text-[#e69a4a]">vs</span> = {{ board.matchup ? board.matchup.opponentName : 'your opponent' }} ·
            <span class="text-[#4ade80]">free</span> = on waivers
          </p>

          <template v-for="(row, i) in boardRows" :key="'bw-' + row.playerKey">
            <div
              class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm last:border-0"
              :class="row.owner === 'me' ? 'text-dark-text' : row.owner === 'free' ? 'text-dark-textSecondary' : 'text-dark-textMuted'"
            >
              <span class="w-6 shrink-0 text-right font-mono text-[10px] text-dark-textMuted/60">{{ i + 1 }}</span>
              <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onLogoErr" class="h-6 w-6 shrink-0 rounded-full bg-dark-border object-cover" />
              <span v-else class="h-6 w-6 shrink-0 rounded-full bg-dark-border" />
              <span class="min-w-0 flex-1 truncate">
                {{ row.name }}
                <span v-if="row.bye" class="ml-1 font-mono text-[9px] uppercase text-[#FF5C5C]">bye</span>
              </span>
              <span
                v-if="OWNER_BADGE[row.owner].label"
                class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase"
                :class="OWNER_BADGE[row.owner].cls"
              >{{ OWNER_BADGE[row.owner].label }}</span>
              <span v-else-if="row.ownerName" class="hidden shrink-0 truncate font-mono text-[9px] text-dark-textMuted/50 sm:inline" style="max-width:8rem">{{ row.ownerName }}</span>
              <img v-if="row.team" :src="teamLogo(row.team)" alt="" @error="onLogoErr" class="h-3.5 w-3.5 shrink-0 object-contain" />
              <span class="w-10 shrink-0 text-right font-mono text-xs">{{ round(row.weekPoints) }}</span>
            </div>
          </template>
          <p class="mt-2 font-mono text-[9px] text-dark-textMuted">
            week {{ currentWeek }} projections · top {{ BOARD_LIMIT }}, plus any of your players below it
          </p>
        </div>
      </section>

      <!-- 4. STREAMERS -->
      <section v-if="board.streamers.length" class="rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">Streamers</h2>
        <p class="mb-3 font-mono text-[10px] text-dark-textMuted">
          one-week adds for week {{ currentWeek }} — the drop is the other half of the decision
        </p>
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
            <span class="w-24 shrink-0 text-right">
              <span class="block font-mono text-sm text-dark-text">{{ round(r.weekPoints) }}</span>
              <span class="block font-mono text-[9px] text-dark-textMuted/70">{{ rankLabel({ position: r.player.position, posRank: r.posRank, flexRank: r.flexRank }) }}</span>
              <span v-if="r.dropName" class="block font-mono text-[9px] text-primary">
                drop {{ r.dropName }} &middot; +{{ round(r.gain) }}
              </span>
              <span v-else class="block font-mono text-[9px] text-dark-textMuted/70">no upgrade</span>
            </span>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>
